import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, eq, isNull, notInArray, sql } from 'drizzle-orm'

import { db } from '@/db'
import { subtasks, tasks } from '@/db/schema'
import { getCurrentUserId } from '@/server/auth'

const MAX_SUBTASKS = 50

const subtaskInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(500),
  done: z.boolean(),
})

const createSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  dueDate: z.string().datetime().optional(),
  workspaceId: z.string().uuid().nullable().optional(),
  subtasks: z
    .array(subtaskInputSchema.omit({ id: true }))
    .max(MAX_SUBTASKS)
    .optional(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  subtasks: z.array(subtaskInputSchema).max(MAX_SUBTASKS).optional(),
})

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * Replace a task's checklist with `items` (list order = position).
 * Items with an id update the existing row, items without one are inserted,
 * and rows missing from the list are deleted. `completedAt` is preserved for
 * items that were already done so history timestamps stay stable.
 */
async function syncSubtasks(
  tx: Tx,
  taskId: string,
  items: z.infer<typeof subtaskInputSchema>[],
) {
  const keepIds = items.flatMap((item) => (item.id ? [item.id] : []))

  await tx
    .delete(subtasks)
    .where(
      keepIds.length > 0
        ? and(eq(subtasks.taskId, taskId), notInArray(subtasks.id, keepIds))
        : eq(subtasks.taskId, taskId),
    )

  const now = new Date()
  const inserts: Array<typeof subtasks.$inferInsert> = []

  for (const [position, item] of items.entries()) {
    if (!item.id) {
      inserts.push({
        taskId,
        title: item.title,
        position,
        completedAt: item.done ? now : null,
      })
      continue
    }
    await tx
      .update(subtasks)
      .set({
        title: item.title,
        position,
        completedAt: item.done
          ? sql`COALESCE(${subtasks.completedAt}, ${now})`
          : null,
      })
      .where(and(eq(subtasks.id, item.id), eq(subtasks.taskId, taskId)))
  }

  if (inserts.length > 0) {
    await tx.insert(subtasks).values(inserts)
  }
}

const deleteSchema = z.object({
  id: z.string().uuid(),
})

export const createTask = createServerFn({ method: 'POST' })
  .inputValidator(createSchema)
  .handler(async ({ data }) => {
    const userId = await getCurrentUserId()
    const workspaceId = data.workspaceId ?? null

    const workspaceClause =
      workspaceId === null
        ? isNull(tasks.workspaceId)
        : eq(tasks.workspaceId, workspaceId)

    const [{ max }] = await db
      .select({ max: sql<number>`MAX(${tasks.position})` })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          workspaceClause,
          eq(tasks.status, 'TODO'),
        ),
      )

    const position = (max ?? -1) + 1

    return db.transaction(async (tx) => {
      const [created] = await tx
        .insert(tasks)
        .values({
          userId,
          workspaceId,
          title: data.title,
          description: data.description ?? null,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          status: 'TODO',
          position,
        })
        .returning()

      if (data.subtasks?.length) {
        await syncSubtasks(tx, created.id, data.subtasks)
      }

      return created
    })
  })

export const updateTask = createServerFn({ method: 'POST' })
  .inputValidator(updateSchema)
  .handler(async ({ data }) => {
    const userId = await getCurrentUserId()
    const { id, subtasks: subtaskItems, ...updates } = data

    const setValues: Record<string, unknown> = {}
    if (updates.title !== undefined) setValues.title = updates.title
    if (updates.description !== undefined) {
      setValues.description = updates.description
    }
    if (updates.dueDate !== undefined) {
      setValues.dueDate = updates.dueDate ? new Date(updates.dueDate) : null
    }
    if (Object.keys(setValues).length === 0 && subtaskItems === undefined) {
      throw new Error('No fields to update')
    }

    return db.transaction(async (tx) => {
      // Touch updatedAt even for subtask-only edits; this also verifies ownership.
      const [updated] = await tx
        .update(tasks)
        .set({ ...setValues, updatedAt: new Date() })
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
        .returning()

      if (!updated) {
        throw new Error('Task not found')
      }

      if (subtaskItems !== undefined) {
        await syncSubtasks(tx, id, subtaskItems)
      }

      return updated
    })
  })

export const deleteTask = createServerFn({ method: 'POST' })
  .inputValidator(deleteSchema)
  .handler(async ({ data }) => {
    const userId = await getCurrentUserId()

    const [deleted] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, data.id), eq(tasks.userId, userId)))
      .returning()

    if (!deleted) {
      throw new Error('Task not found')
    }

    return { id: data.id }
  })
