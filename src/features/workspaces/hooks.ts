import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createWorkspace as createWorkspaceFn,
  deleteWorkspace as deleteWorkspaceFn,
  getWorkspaces,
  renameWorkspace as renameWorkspaceFn,
} from '@/server'
import { taskKeys } from '@/features/tasks/api'
import { historyKeys } from '@/features/history/api'
import { noteKeys } from '@/features/notes/api'
import { workspaceKeys } from './api'

const WORKSPACES_STALE_TIME_MS = 30_000

export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: () => getWorkspaces(),
    staleTime: WORKSPACES_STALE_TIME_MS,
  })
}

export function useCreateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (variables: { name: string }) =>
      createWorkspaceFn({ data: variables }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workspaceKeys.lists() })
    },
  })
}

export function useRenameWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (variables: { id: string; name: string }) =>
      renameWorkspaceFn({ data: variables }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workspaceKeys.lists() })
    },
  })
}

export function useDeleteWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (variables: { id: string }) =>
      deleteWorkspaceFn({ data: variables }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workspaceKeys.lists() })
      qc.invalidateQueries({ queryKey: taskKeys.lists() })
      qc.invalidateQueries({ queryKey: historyKeys.lists() })
      qc.invalidateQueries({ queryKey: noteKeys.lists() })
    },
  })
}
