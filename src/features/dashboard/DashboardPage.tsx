import { useMemo, useState } from 'react'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { ListTodo, Plus } from 'lucide-react'
import type { Task } from '@/db/schema'

import {
  useArchiveOnMount,
  useCreateTask,
  useDashboardTasks,
  useReorderTasks,
} from '@/features/tasks'
import { useCurrentWorkspace } from '@/features/workspaces'
import { StressMeter } from '@/features/stress'
import { Board } from '@/components/task/Board'
import type { BoardStatus } from '@/components/task/Board'
import { EmptyState } from '@/components/shared/EmptyState'
import { TaskCard } from '@/components/task/TaskCard'
import { TaskEditorModal } from '@/components/task/TaskEditorModal'

type ReorderItem = {
  id: string
  position: number
  status: BoardStatus
  workspaceId: string | null
}

function byPosition(a: Task, b: Task) {
  return a.position - b.position
}

export function DashboardPage() {
  const { workspaceId } = useCurrentWorkspace()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Single network request for both boards (Phase 1)
  const { data: allTasks = [] } = useDashboardTasks(workspaceId)
  const reorder = useReorderTasks()
  const create = useCreateTask()

  // Non-blocking archive on mount (Phase 2) — does not block first paint
  useArchiveOnMount(workspaceId)

  const todoTasks = useMemo(
    () => allTasks.filter((t) => t.status === 'TODO').sort(byPosition),
    [allTasks],
  )
  const inProgressTasks = useMemo(
    () => allTasks.filter((t) => t.status === 'IN_PROGRESS').sort(byPosition),
    [allTasks],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const tasksByStatus = useMemo<Record<BoardStatus, Task[]>>(
    () => ({
      TODO: todoTasks,
      IN_PROGRESS: inProgressTasks,
    }),
    [todoTasks, inProgressTasks],
  )

  const findTask = (id: string): Task | undefined =>
    tasksByStatus.TODO.find((t) => t.id === id) ??
    tasksByStatus.IN_PROGRESS.find((t) => t.id === id)

  const computeUpdates = (
    sourceId: string,
    sourceStatus: BoardStatus,
    destStatus: BoardStatus,
    sourceIndex: number,
    destIndex: number,
  ): ReorderItem[] => {
    const sourceBoard = [...tasksByStatus[sourceStatus]]

    if (sourceStatus === destStatus) {
      const reordered = arrayMove(sourceBoard, sourceIndex, destIndex)
      const updates: ReorderItem[] = []
      reordered.forEach((task, idx) => {
        if (task.position !== idx) {
          updates.push({
            id: task.id,
            position: idx,
            status: sourceStatus,
            workspaceId,
          })
        }
      })
      return updates
    }

    const moved = sourceBoard[sourceIndex]
    const destBoard = [...tasksByStatus[destStatus]]
    const newDest = [...destBoard]
    newDest.splice(destIndex, 0, { ...moved, status: destStatus })

    const newSource = sourceBoard.filter((_, i) => i !== sourceIndex)

    const updates: ReorderItem[] = []
    newSource.forEach((task, idx) => {
      if (task.position !== idx) {
        updates.push({
          id: task.id,
          position: idx,
          status: sourceStatus,
          workspaceId,
        })
      }
    })
    newDest.forEach((task, idx) => {
      const isMoved = task.id === sourceId
      if (task.position !== idx || isMoved) {
        updates.push({
          id: task.id,
          position: idx,
          status: destStatus,
          workspaceId,
        })
      }
    })
    return updates
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const draggedId = active.id as string
    const overId = over.id as string

    if (draggedId === overId) return

    const sourceTask = findTask(draggedId)
    if (!sourceTask) return

    const sourceStatus = sourceTask.status as BoardStatus
    const sourceIndex = tasksByStatus[sourceStatus].findIndex(
      (t: Task) => t.id === draggedId,
    )

    let destStatus: BoardStatus
    let destIndex: number

    if (overId === 'TODO' || overId === 'IN_PROGRESS') {
      destStatus = overId
      destIndex = tasksByStatus[destStatus].length
    } else {
      const overTask = findTask(overId)
      if (!overTask) return
      destStatus = overTask.status as BoardStatus
      destIndex = tasksByStatus[destStatus].findIndex(
        (t: Task) => t.id === overId,
      )
    }

    const updates = computeUpdates(
      draggedId,
      sourceStatus,
      destStatus,
      sourceIndex,
      destIndex,
    )
    if (updates.length === 0) return

    reorder.mutate({ items: updates })
  }

  const handleDragCancel = () => setActiveId(null)

  const activeTask = activeId ? findTask(activeId) : null
  const modalOpen = createOpen || editingTask !== null
  const closeModal = () => {
    setCreateOpen(false)
    setEditingTask(null)
  }

  const handleCreate = () => setCreateOpen(true)

  const handleSubmitFromModal = (input: {
    title: string
    description?: string
    dueDate?: string
  }) => {
    create.mutate({ ...input, workspaceId })
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-6">
      <header className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold uppercase tracking-widest text-pink-deep dark:text-dark-pink-deep">
          Today's Checklist
        </h1>
        <div className="text-sm font-medium text-muted dark:text-dark-muted">
          <span className="text-ink dark:text-dark-ink">0</span> /{' '}
          <span className="text-ink dark:text-dark-ink">
            {todoTasks.length + inProgressTasks.length}
          </span>
        </div>
      </header>

      <StressMeter workspaceId={workspaceId} />

      <button
        type="button"
        onClick={handleCreate}
        className="mb-4 flex w-full items-center gap-3 rounded-brutal border-2 border-dashed border-ink/15 bg-warm/60 px-4 py-3 text-left text-muted transition-colors hover:border-pink hover:text-ink dark:border-dark-ink/15 dark:bg-dark-warm/60 dark:text-dark-muted dark:hover:border-dark-pink dark:hover:text-dark-ink"
      >
        <Plus className="h-4 w-4" />
        <span>Add a task...</span>
      </button>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex flex-col gap-6">
          <Board
            status="TODO"
            title="Todo"
            count={todoTasks.length}
            itemIds={todoTasks.map((t) => t.id)}
          >
            {todoTasks.length === 0 ? (
              <EmptyState
                icon={<ListTodo className="h-6 w-6" />}
                title="Nothing to do"
                description="Add a task above to get started"
              />
            ) : (
              todoTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={setEditingTask}
                  workspaceId={workspaceId}
                />
              ))
            )}
          </Board>

          <Board
            status="IN_PROGRESS"
            title="In Progress"
            count={inProgressTasks.length}
            itemIds={inProgressTasks.map((t) => t.id)}
          >
            {inProgressTasks.length === 0 ? (
              <EmptyState
                icon={<ListTodo className="h-6 w-6" />}
                title="Nothing in progress"
                description="Start working on a task from your list"
              />
            ) : (
              inProgressTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={setEditingTask}
                  workspaceId={workspaceId}
                />
              ))
            )}
          </Board>
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      <TaskEditorModal
        open={modalOpen}
        task={editingTask}
        onClose={closeModal}
        onCreate={handleSubmitFromModal}
      />
    </div>
  )
}
