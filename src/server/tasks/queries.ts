import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { subtasks, tasks } from '@/db/schema'
import type { Subtask, TaskWithSubtasks } from '@/db/schema'
import { getCurrentUserId } from '@/server/auth'

const inputSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS']).optional(),
  workspaceId: z.string().uuid().nullable().optional(),
})

/**
 * Fetch active dashboard tasks (TODO + IN_PROGRESS).
 *
 * Intentionally does NOT run auto-archive as a side-effect.
 * Archive is handled separately so the first paint is not blocked by a write.
 *
 * `workspaceId` semantics:
 *  - `null` / omitted → tasks in the user's "default" workspace (workspace_id IS NULL)
 *  - uuid string    → tasks in that specific workspace (verified by user_id at write time)
 */
export const getTasks = createServerFn({ method: 'GET' })
  .inputValidator(inputSchema)
  .handler(async ({ data }): Promise<TaskWithSubtasks[]> => {
    const userId = await getCurrentUserId()
    const workspaceId = data.workspaceId ?? null

    const workspaceClause =
      workspaceId === null
        ? isNull(tasks.workspaceId)
        : eq(tasks.workspaceId, workspaceId)

    const conditions = [
      eq(tasks.userId, userId),
      workspaceClause,
      inArray(tasks.status, ['TODO', 'IN_PROGRESS']),
    ]
    if (data.status) {
      conditions.push(eq(tasks.status, data.status))
    }

    const rows = await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(asc(tasks.position))

    if (rows.length === 0) return []

    const subtaskRows = await db
      .select()
      .from(subtasks)
      .where(
        inArray(
          subtasks.taskId,
          rows.map((task) => task.id),
        ),
      )
      .orderBy(asc(subtasks.position))

    const byTask = new Map<string, Subtask[]>()
    for (const subtask of subtaskRows) {
      const list = byTask.get(subtask.taskId) ?? []
      list.push(subtask)
      byTask.set(subtask.taskId, list)
    }

    return rows.map((task) => ({
      ...task,
      subtasks: byTask.get(task.id) ?? [],
    }))
  })
