import { createFileRoute, redirect } from '@tanstack/react-router'

import { StatisticsPage } from '@/features/statistics/StatisticsPage'

export const Route = createFileRoute('/w/$workspaceId/statistics')({
  beforeLoad: ({ params }) => {
    if (!params.workspaceId) {
      throw redirect({
        to: '/w/$workspaceId/statistics',
        params: { workspaceId: 'default' },
      })
    }
  },
  component: StatisticsPage,
})
