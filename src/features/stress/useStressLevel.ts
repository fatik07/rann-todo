import { useMemo } from 'react'

import { useDashboardTasks } from '@/features/tasks'
import { useHistory } from '@/features/history'
import { computeStress, computeStressHistory } from './computeStress'

/**
 * Derives the stress score from queries the app already caches
 * (dashboard tasks + history), so it costs no extra requests on the dashboard.
 */
export function useStressLevel(workspaceId: string | null) {
  const activeQuery = useDashboardTasks(workspaceId)
  const historyQuery = useHistory(workspaceId)

  const result = useMemo(() => {
    const active = activeQuery.data ?? []
    const completed = (historyQuery.data ?? []).flatMap((g) => g.tasks)
    const now = new Date()
    return {
      ...computeStress(active, completed, now),
      history: computeStressHistory(active, completed, 14, now),
    }
  }, [activeQuery.data, historyQuery.data])

  return {
    ...result,
    isLoading: activeQuery.isLoading || historyQuery.isLoading,
  }
}
