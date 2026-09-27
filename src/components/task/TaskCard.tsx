import type { CSSProperties, MouseEvent } from 'react'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { Check, ListChecks, Play, Trash2, Undo2 } from 'lucide-react'
import type { TaskWithSubtasks } from '@/db/schema'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/shared/Tooltip'
import { useCompleteTask, useDeleteTask, useMoveTask } from '@/features/tasks'

type TaskCardProps = {
  task: TaskWithSubtasks
  onEdit?: (task: TaskWithSubtasks) => void
  workspaceId: string | null
}

export function TaskCard({ task, onEdit, workspaceId }: TaskCardProps) {
  const remove = useDeleteTask()
  const complete = useCompleteTask()
  const move = useMoveTask()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const handleStart = () => {
    move.mutate({
      id: task.id,
      targetStatus: 'IN_PROGRESS',
      workspaceId,
    })
  }
  const handleComplete = () => {
    complete.mutate({ id: task.id })
  }
  const handleMoveBack = () => {
    move.mutate({ id: task.id, targetStatus: 'TODO', workspaceId })
  }
  const handleDelete = (e: MouseEvent) => {
    e.stopPropagation()
    remove.mutate({ id: task.id })
  }

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const isInProgress = task.status === 'IN_PROGRESS'
  const subtaskTotal = task.subtasks.length
  const subtaskDone = task.subtasks.filter((s) => s.completedAt).length

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 rounded-brutal-sm border-2 bg-warm px-4 py-3 transition-all hover:border-ink/30 hover:shadow-brutal-soft dark:bg-dark-warm dark:hover:border-dark-ink/30 dark:hover:shadow-brutal-soft-dark ${
        isDragging
          ? 'border-pink shadow-brutal dark:border-dark-pink dark:shadow-brutal-dark'
          : 'border-ink/15 dark:border-dark-ink/15'
      }`}
    >
      {isInProgress ? (
        <div className="flex shrink-0 items-center gap-2">
          <Tooltip label="Selesaikan">
            <Button
              type="button"
              size="xs"
              variant="primary"
              onClick={handleComplete}
              aria-label="Selesaikan tugas"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </Button>
          </Tooltip>
          <Tooltip label="Kembali">
            <Button
              type="button"
              size="xs"
              variant="secondary"
              onClick={handleMoveBack}
              aria-label="Kembalikan ke todo"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          </Tooltip>
        </div>
      ) : (
        <Tooltip label="Mulai">
          <Button
            type="button"
            size="xs"
            variant="primary"
            onClick={handleStart}
            aria-label="Mulai tugas"
          >
            <Play className="h-3.5 w-3.5" />
          </Button>
        </Tooltip>
      )}
      <button
        type="button"
        onClick={() => onEdit?.(task)}
        {...attributes}
        {...listeners}
        className="flex min-w-0 flex-1 cursor-grab flex-col items-start gap-0.5 text-left active:cursor-grabbing"
      >
        <span className="w-full truncate text-base text-ink dark:text-dark-ink">
          {task.title}
        </span>
      </button>
      {subtaskTotal > 0 && (
        <span
          aria-label={`${subtaskDone} dari ${subtaskTotal} subtask selesai`}
          className={`flex shrink-0 items-center gap-1 rounded-md border-2 px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
            subtaskDone === subtaskTotal
              ? 'border-ink bg-sage text-white dark:border-dark-ink dark:bg-dark-sage dark:text-dark-ink'
              : 'border-ink/15 text-muted dark:border-dark-ink/15 dark:text-dark-muted'
          }`}
        >
          <ListChecks className="h-3.5 w-3.5" />
          {subtaskDone}/{subtaskTotal}
        </span>
      )}
      <button
        type="button"
        onClick={handleDelete}
        aria-label="Delete task"
        className="text-muted opacity-0 transition-all hover:text-rose group-hover:opacity-100 dark:text-dark-muted dark:hover:text-dark-rose"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
