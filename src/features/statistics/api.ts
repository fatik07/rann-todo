export type StatisticsListFilters = {
  workspaceId?: string | null
  days?: number
}

export const statisticsKeys = {
  all: ['statistics'] as const,
  lists: () => [...statisticsKeys.all, 'list'] as const,
  list: (filters?: StatisticsListFilters) =>
    [...statisticsKeys.lists(), filters ?? {}] as const,
}
