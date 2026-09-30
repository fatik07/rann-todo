import { useQuery } from '@tanstack/react-query'
import { getStatistics } from '@/server/statistics/queries'
import { statisticsKeys } from './api'
import type { StatisticsListFilters } from './api'

export function useStatistics(filters?: StatisticsListFilters) {
  return useQuery({
    queryKey: statisticsKeys.list(filters),
    queryFn: () => getStatistics({ data: filters ?? {} }),
  })
}
