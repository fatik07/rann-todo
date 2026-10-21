import { useState } from 'react'
import { Plus, StickyNote } from 'lucide-react'
import type { Note } from '@/db/schema'

import { EmptyState } from '@/components/shared/EmptyState'
import { NoteCard } from '@/components/note/NoteCard'
import { NoteEditorModal } from '@/components/note/NoteEditorModal'
import { useCurrentWorkspace } from '@/features/workspaces'
import { useCreateNote, useNotes } from './hooks'
import type { NoteInput } from './hooks'

export function NotesPage() {
  const { workspaceId } = useCurrentWorkspace()
  const { data: notes = [], isLoading } = useNotes(workspaceId)
  const create = useCreateNote()

  const [createOpen, setCreateOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)

  const modalOpen = createOpen || editingNote !== null
  const closeModal = () => {
    setCreateOpen(false)
    setEditingNote(null)
  }

  const handleCreate = (input: NoteInput) => {
    create.mutate({ ...input, workspaceId })
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-6">
      <header className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold uppercase tracking-widest text-pink-deep dark:text-dark-pink-deep">
          Notes
        </h1>
        <div className="text-sm font-medium text-muted dark:text-dark-muted">
          <span className="text-ink dark:text-dark-ink">{notes.length}</span>{' '}
          catatan
        </div>
      </header>

      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="mb-4 flex w-full items-center gap-3 rounded-brutal border-2 border-dashed border-ink/15 bg-warm/60 px-4 py-3 text-left text-muted transition-colors hover:border-pink hover:text-ink dark:border-dark-ink/15 dark:bg-dark-warm/60 dark:text-dark-muted dark:hover:border-dark-pink dark:hover:text-dark-ink"
      >
        <Plus className="h-4 w-4" />
        <span>Add a note...</span>
      </button>

      {!isLoading && notes.length === 0 ? (
        <EmptyState
          icon={<StickyNote className="h-6 w-6" />}
          title="Belum ada catatan"
          description="Simpan ide, referensi, atau apa pun yang perlu diingat"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onOpen={setEditingNote} />
          ))}
        </div>
      )}

      <NoteEditorModal
        open={modalOpen}
        note={editingNote}
        onClose={closeModal}
        onCreate={handleCreate}
      />
    </div>
  )
}
