import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { notes } from '@/db/schema'
import { getCurrentUserId } from '@/server/auth'

const createSchema = z.object({
  title: z.string().max(200).nullable().optional(),
  content: z.string().min(1).max(20000),
  workspaceId: z.string().uuid().nullable().optional(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().max(200).nullable().optional(),
  content: z.string().min(1).max(20000).optional(),
})

const deleteSchema = z.object({
  id: z.string().uuid(),
})

export const createNote = createServerFn({ method: 'POST' })
  .inputValidator(createSchema)
  .handler(async ({ data }) => {
    const userId = await getCurrentUserId()

    const [created] = await db
      .insert(notes)
      .values({
        userId,
        workspaceId: data.workspaceId ?? null,
        title: data.title ?? null,
        content: data.content,
      })
      .returning()

    return created
  })

export const updateNote = createServerFn({ method: 'POST' })
  .inputValidator(updateSchema)
  .handler(async ({ data }) => {
    const userId = await getCurrentUserId()
    const { id, ...updates } = data

    const setValues: Record<string, unknown> = {}
    if (updates.title !== undefined) setValues.title = updates.title
    if (updates.content !== undefined) setValues.content = updates.content
    if (Object.keys(setValues).length === 0) {
      throw new Error('No fields to update')
    }

    const [updated] = await db
      .update(notes)
      .set(setValues)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning()

    if (!updated) {
      throw new Error('Note not found')
    }

    return updated
  })

export const deleteNote = createServerFn({ method: 'POST' })
  .inputValidator(deleteSchema)
  .handler(async ({ data }) => {
    const userId = await getCurrentUserId()

    const [deleted] = await db
      .delete(notes)
      .where(and(eq(notes.id, data.id), eq(notes.userId, userId)))
      .returning()

    if (!deleted) {
      throw new Error('Note not found')
    }

    return { id: data.id }
  })
