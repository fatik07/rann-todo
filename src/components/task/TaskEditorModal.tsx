import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarPlus } from 'lucide-react'
import type { Task } from '@/db/schema'
import { useUpdateTask } from '@/features/tasks'
import { formatDateTime } from '@/lib/dates'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'

type TaskEditorModalProps = {
  open: boolean
  task?: Task | null
  onClose: () => void
  /**
   * Called when creating a new task. The parent injects workspace context
   * (e.g. current workspaceId) so the modal stays workspace-agnostic.
   */
  onCreate: (input: {
    title: string
    description?: string
    dueDate?: string
  }) => void
}

export function TaskEditorModal({
  open,
  task,
  onClose,
  onCreate,
}: TaskEditorModalProps) {
  const isEdit = !!task
  const update = useUpdateTask()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setDescription(task?.description ?? '')
  }, [open, task])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    if (isEdit) {
      update.mutate(
        {
          id: task.id,
          title: trimmedTitle,
          description: description.trim() || null,
        },
        { onSuccess: onClose },
      )
    } else {
      onCreate({
        title: trimmedTitle,
        description: description.trim() || undefined,
      })
      onClose()
    }
  }

  const isPending = update.isPending

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Task' : 'New Task'}
    >
      <form onSubmit={handleSubmit} className="flex w-md flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted dark:text-dark-muted">
            Title
          </span>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            autoFocus
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted dark:text-dark-muted">
            Note (optional)
          </span>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add some details..."
            rows={6}
            className="resize-y"
          />
        </label>

        <div className="mt-2 flex items-center justify-end gap-2">
          {isEdit && (
            <p className="mr-auto flex items-center gap-1.5 text-xs text-muted dark:text-dark-muted">
              <CalendarPlus className="h-3.5 w-3.5" />
              Created{' '}
              <time
                dateTime={new Date(task.createdAt).toISOString()}
                className="font-medium text-ink dark:text-dark-ink"
              >
                {formatDateTime(task.createdAt)}
              </time>
            </p>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!title.trim() || isPending}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
