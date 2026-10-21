import type { MouseEvent } from 'react'
import { Trash2 } from 'lucide-react'
import type { Note } from '@/db/schema'
import { useDeleteNote } from '@/features/notes'
import { formatDateTime } from '@/lib/dates'

type NoteCardProps = {
  note: Note
  onOpen: (note: Note) => void
}

export function NoteCard({ note, onOpen }: NoteCardProps) {
  const remove = useDeleteNote()

  const handleDelete = (e: MouseEvent) => {
    e.stopPropagation()
    remove.mutate({ id: note.id })
  }

  return (
    <div className="group relative flex min-w-0 flex-col rounded-brutal-sm border-2 border-ink/15 bg-warm transition-all hover:border-ink/30 hover:shadow-brutal-soft dark:border-dark-ink/15 dark:bg-dark-warm dark:hover:border-dark-ink/30 dark:hover:shadow-brutal-soft-dark">
      <button
        type="button"
        onClick={() => onOpen(note)}
        className="flex min-w-0 flex-1 flex-col items-start gap-2 px-4 py-3 text-left"
      >
        {note.title && (
          <span className="w-full truncate pr-6 font-bold text-ink dark:text-dark-ink">
            {note.title}
          </span>
        )}
        <p className="line-clamp-5 w-full whitespace-pre-wrap break-words text-sm text-ink/80 dark:text-dark-ink/80">
          {note.content}
        </p>
        <time
          dateTime={new Date(note.updatedAt).toISOString()}
          className="mt-auto text-xs text-muted dark:text-dark-muted"
        >
          {formatDateTime(note.updatedAt)}
        </time>
      </button>
      <button
        type="button"
        onClick={handleDelete}
        aria-label="Hapus catatan"
        className="absolute right-3 top-3 text-muted opacity-0 transition-all hover:text-rose focus:opacity-100 group-hover:opacity-100 dark:text-dark-muted dark:hover:text-dark-rose"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
