import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Check, Plus, X } from 'lucide-react'
import type { SubtaskInput } from '@/db/schema'

import { Input } from '@/components/ui/Input'

/** Editable subtask row. `key` keeps React identity stable for unsaved rows. */
export type SubtaskDraft = SubtaskInput & { key: string }

type SubtaskListProps = {
  items: SubtaskDraft[]
  onChange: (items: SubtaskDraft[]) => void
}

export function SubtaskList({ items, onChange }: SubtaskListProps) {
  const [newTitle, setNewTitle] = useState('')

  const patchItem = (key: string, patch: Partial<SubtaskInput>) =>
    onChange(
      items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    )

  const removeItem = (key: string) =>
    onChange(items.filter((item) => item.key !== key))

  const addItem = () => {
    const title = newTitle.trim()
    if (!title) return
    onChange([...items, { key: crypto.randomUUID(), title, done: false }])
    setNewTitle('')
  }

  const handleNewKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Enter adds a subtask instead of submitting the whole task form.
    if (e.key !== 'Enter') return
    e.preventDefault()
    addItem()
  }

  return (
    <div className="flex flex-col gap-2">
      {items.length > 0 && (
        <ul className="flex max-h-60 flex-col gap-1.5 overflow-y-auto">
          {items.map((item) => (
            <li key={item.key} className="group flex items-center gap-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={item.done}
                aria-label={
                  item.done ? 'Tandai belum selesai' : 'Tandai selesai'
                }
                onClick={() => patchItem(item.key, { done: !item.done })}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-ink transition-colors dark:border-dark-ink ${
                  item.done
                    ? 'bg-sage text-white dark:bg-dark-sage dark:text-dark-ink'
                    : 'bg-warm dark:bg-dark-warm'
                }`}
              >
                {item.done && <Check className="h-3 w-3" strokeWidth={4} />}
              </button>
              <input
                value={item.title}
                onChange={(e) => patchItem(item.key, { title: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                aria-label="Judul subtask"
                className={`min-w-0 flex-1 rounded-brutal-sm border-2 border-transparent bg-transparent px-2 py-1 text-sm outline-none transition-colors focus:border-pink dark:focus:border-dark-pink ${
                  item.done
                    ? 'text-muted line-through decoration-1 dark:text-dark-muted'
                    : 'text-ink dark:text-dark-ink'
                }`}
              />
              <button
                type="button"
                onClick={() => removeItem(item.key)}
                aria-label="Hapus subtask"
                className="text-muted opacity-0 transition-all hover:text-rose focus:opacity-100 group-hover:opacity-100 dark:text-dark-muted dark:hover:text-dark-rose"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Plus className="h-4 w-4 shrink-0 text-muted dark:text-dark-muted" />
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleNewKeyDown}
          onBlur={addItem}
          placeholder="Tambah subtask..."
          className="flex-1 py-1.5 text-sm"
        />
      </div>
    </div>
  )
}
