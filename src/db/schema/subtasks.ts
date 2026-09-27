import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'

import { tasks } from './tasks'
import type { Task } from './tasks'

export const subtasks = pgTable(
  'subtasks',
  {
    id: uuid().primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    completedAt: timestamp('completed_at'),
    position: integer().notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('subtasks_task_position_idx').on(table.taskId, table.position),
  ],
)

export type Subtask = typeof subtasks.$inferSelect
export type NewSubtask = typeof subtasks.$inferInsert

/** Active dashboard task with its (optional) checklist. */
export type TaskWithSubtasks = Task & { subtasks: Subtask[] }

/** Lightweight subtask summary for history views. */
export type SubtaskProgress = { subtaskTotal: number; subtaskDone: number }

/** Client-side subtask shape sent on create/update. No id = new subtask. */
export type SubtaskInput = { id?: string; title: string; done: boolean }
