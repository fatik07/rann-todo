import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { notes, tasks, workspaces } from '@/db/schema'
import { getCurrentUserId } from '@/server/auth'

const createSchema = z.object({
  name: z.string().min(1).max(80),
})

const renameSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),
})

const deleteSchema = z.object({
  id: z.string().uuid(),
})

export const createWorkspace = createServerFn({ method: 'POST' })
  .validator(createSchema)
  .handler(async ({ data }) => {
    const userId = await getCurrentUserId()

    const [created] = await db
      .insert(workspaces)
      .values({
        userId,
        name: data.name.trim(),
      })
      .returning()

    return created
  })

export const renameWorkspace = createServerFn({ method: 'POST' })
  .validator(renameSchema)
  .handler(async ({ data }) => {
    const userId = await getCurrentUserId()

    const [updated] = await db
      .update(workspaces)
      .set({ name: data.name.trim() })
      .where(and(eq(workspaces.id, data.id), eq(workspaces.userId, userId)))
      .returning()

    if (!updated) {
      throw new Error('Workspace not found')
    }

    return updated
  })

/**
 * Delete a workspace. Its tasks are first moved to the user's "default"
 * workspace (workspace_id = NULL), then the workspace row is removed.
 * The default workspace itself cannot be deleted — the client should never
 * call this with a default id, but we guard anyway by scoping to non-null ids.
 */
export const deleteWorkspace = createServerFn({ method: 'POST' })
  .validator(deleteSchema)
  .handler(async ({ data }) => {
    const userId = await getCurrentUserId()

    await db.transaction(async (tx) => {
      const [target] = await tx
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(and(eq(workspaces.id, data.id), eq(workspaces.userId, userId)))

      if (!target) {
        throw new Error('Workspace not found')
      }

      await tx
        .update(tasks)
        .set({ workspaceId: null })
        .where(and(eq(tasks.userId, userId), eq(tasks.workspaceId, data.id)))

      await tx
        .update(notes)
        .set({ workspaceId: null })
        .where(and(eq(notes.userId, userId), eq(notes.workspaceId, data.id)))

      await tx
        .delete(workspaces)
        .where(and(eq(workspaces.id, data.id), eq(workspaces.userId, userId)))
    })

    return { id: data.id }
  })
