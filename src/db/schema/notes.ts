import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'

import { users } from './users'
import { workspaces } from './workspaces'

export const notes = pgTable(
  'notes',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, {
      onDelete: 'set null',
    }),
    title: text(),
    content: text().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('notes_user_updated_at_idx').on(table.userId, table.updatedAt),
    index('notes_workspace_updated_at_idx').on(
      table.workspaceId,
      table.updatedAt,
    ),
  ],
)

export type Note = typeof notes.$inferSelect
export type NewNote = typeof notes.$inferInsert
