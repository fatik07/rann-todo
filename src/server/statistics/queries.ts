import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, eq, inArray, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { tasks } from '@/db/schema'
import { getCurrentUserId } from '@/server/auth'

export type DailyStats = {
    date: string
    count: number
}

const statsSchema = z.object({
    workspaceId: z.string().uuid().nullable().optional(),
    days: z.number().min(1).max(365).default(365),
})

function formatDateKey(date: Date): string {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

export const getStatistics = createServerFn({ method: 'GET' })
    .inputValidator(statsSchema)
    .handler(async ({ data }): Promise<DailyStats[]> => {
        const userId = await getCurrentUserId()
        const workspaceId = data.workspaceId ?? null
        const days = data.days

        const workspaceClause =
            workspaceId === null
                ? isNull(tasks.workspaceId)
                : eq(tasks.workspaceId, workspaceId)

        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)

        const rows = await db
            .select()
            .from(tasks)
            .where(
                and(
                    eq(tasks.userId, userId),
                    workspaceClause,
                    inArray(tasks.status, ['COMPLETED', 'ARCHIVED']),
                ),
            )

        const statsMap = new Map<string, number>()

        for (const task of rows) {
            if (!task.completedAt) continue
            const completedDate = new Date(task.completedAt)
            if (completedDate < cutoffDate) continue

            const dateKey = formatDateKey(completedDate)
            const current = statsMap.get(dateKey) ?? 0
            statsMap.set(dateKey, current + 1)
        }

        return Array.from(statsMap.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date))
    })
