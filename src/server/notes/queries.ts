import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, desc, eq, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { notes } from '@/db/schema'
import { getCurrentUserId } from '@/server/auth'

const inputSchema = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
})

/** Notes in the current workspace, most recently edited first. */
export const getNotes = createServerFn({ method: 'GET' })
  .validator(inputSchema)
  .handler(async ({ data }) => {
    const userId = await getCurrentUserId()
    const workspaceId = data.workspaceId ?? null

    const workspaceClause =
      workspaceId === null
        ? isNull(notes.workspaceId)
        : eq(notes.workspaceId, workspaceId)

    return db
      .select()
      .from(notes)
      .where(and(eq(notes.userId, userId), workspaceClause))
      .orderBy(desc(notes.updatedAt))
  })
