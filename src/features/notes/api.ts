export type NotesListFilters = {
  workspaceId?: string | null
}

export const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (filters?: NotesListFilters) =>
    [...noteKeys.lists(), filters ?? {}] as const,
}
