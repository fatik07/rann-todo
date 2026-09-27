import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { subtasks, tasks } from '@/db/schema'
import type { SubtaskProgress, Task } from '@/db/schema'
import { getCurrentUserId } from '@/server/auth'

export type HistoryGroup = {
  date: string
  tasks: Array<Task & SubtaskProgress>
}

const historySchema = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
})

function formatDateKey(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export const getHistory = createServerFn({ method: 'GET' })
  .inputValidator(historySchema)
  .handler(async ({ data }): Promise<HistoryGroup[]> => {
    const userId = await getCurrentUserId()
    const workspaceId = data.workspaceId ?? null

    const workspaceClause =
      workspaceId === null
        ? isNull(tasks.workspaceId)
        : eq(tasks.workspaceId, workspaceId)

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
      .orderBy(desc(tasks.completedAt))

    const progressRows =
      rows.length === 0
        ? []
        : await db
            .select({
              taskId: subtasks.taskId,
              total: count(),
              done: count(subtasks.completedAt),
            })
            .from(subtasks)
            .where(
              inArray(
                subtasks.taskId,
                rows.map((task) => task.id),
              ),
            )
            .groupBy(subtasks.taskId)

    const progress = new Map(progressRows.map((row) => [row.taskId, row]))

    const groups = new Map<string, HistoryGroup>()
    for (const task of rows) {
      if (!task.completedAt) continue
      const dateKey = formatDateKey(task.completedAt)
      const group = groups.get(dateKey) ?? { date: dateKey, tasks: [] }
      const taskProgress = progress.get(task.id)
      group.tasks.push({
        ...task,
        subtaskTotal: taskProgress?.total ?? 0,
        subtaskDone: taskProgress?.done ?? 0,
      })
      groups.set(dateKey, group)
    }

    return Array.from(groups.values())
  })
