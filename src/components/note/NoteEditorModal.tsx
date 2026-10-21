import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Note } from '@/db/schema'
import type { NoteInput } from '@/features/notes'
import { useUpdateNote } from '@/features/notes'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'

type NoteEditorModalProps = {
  open: boolean
  note?: Note | null
  onClose: () => void
  /** Called when creating a new note; the parent injects workspace context. */
  onCreate: (input: NoteInput) => void
}

export function NoteEditorModal({
  open,
  note,
  onClose,
  onCreate,
}: NoteEditorModalProps) {
  const isEdit = !!note
  const update = useUpdateNote()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(note?.title ?? '')
    setContent(note?.content ?? '')
  }, [open, note])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmedContent = content.trim()
    if (!trimmedContent) return

    const input = { title: title.trim() || null, content: trimmedContent }

    if (isEdit) {
      update.mutate({ id: note.id, ...input }, { onSuccess: onClose })
    } else {
      onCreate(input)
      onClose()
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Note' : 'New Note'}
    >
      <form
        onSubmit={handleSubmit}
        className="flex w-[min(36rem,calc(100vw-5rem))] flex-col gap-4"
      >
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted dark:text-dark-muted">
            Title (optional)
          </span>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul catatan"
            maxLength={200}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted dark:text-dark-muted">
            Note
          </span>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tulis catatanmu di sini..."
            rows={10}
            className="resize-y"
            autoFocus
            required
          />
        </label>

        <div className="mt-2 flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!content.trim() || update.isPending}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
