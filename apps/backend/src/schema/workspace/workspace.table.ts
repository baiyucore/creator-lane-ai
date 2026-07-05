import { index, pgEnum, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const workspaceStatusValues = ['draft', 'active', 'archived'] as const;
export const workspaceStatusEnum = pgEnum('workspace_status', workspaceStatusValues);

export const workspaces = pgTable(
  'workspaces',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    name: varchar('name', { length: 120 }).notNull(), // 工作空间名称
    trackKey: varchar('track_key', { length: 64 }).notNull(), // 跟踪键，用于跟踪工作空间的状态
    description: text('description'),
    status: workspaceStatusEnum('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('workspaces_track_key_idx').on(table.trackKey),
    index('workspaces_status_idx').on(table.status),
    index('workspaces_updated_at_idx').on(table.updatedAt),
  ],
);
