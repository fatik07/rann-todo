import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createNote as createNoteFn,
  deleteNote as deleteNoteFn,
  getNotes,
  updateNote as updateNoteFn,
} from '@/server'
import { noteKeys } from './api'

export type NoteInput = {
  title: string | null
  content: string
}

export function useNotes(workspaceId: string | null) {
  return useQuery({
    queryKey: noteKeys.list({ workspaceId }),
    queryFn: () => getNotes({ data: { workspaceId } }),
  })
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NoteInput & { workspaceId: string | null }) =>
      createNoteFn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: noteKeys.lists() })
    },
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (variables: NoteInput & { id: string }) =>
      updateNoteFn({ data: variables }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: noteKeys.lists() })
    },
  })
}

export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (variables: { id: string }) =>
      deleteNoteFn({ data: variables }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: noteKeys.lists() })
    },
  })
}
