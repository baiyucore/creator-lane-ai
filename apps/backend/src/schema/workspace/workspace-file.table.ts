import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { workspaces } from './workspace.table';

export const workspaceFileKindValues = ['file', 'folder'] as const;
export const workspaceFileKindEnum = pgEnum('workspace_file_kind', workspaceFileKindValues);

export const workspaceFiles = pgTable(
  'workspace_files',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: varchar('workspace_id', { length: 64 })
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),
    name: varchar('name', { length: 160 }).notNull(),
    kind: workspaceFileKindEnum('kind').notNull(),
    path: text('path').notNull(),
    content: jsonb('content'),
    contentText: text('content_text'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('workspace_files_path_uq').on(table.workspaceId, table.path),
    uniqueIndex('workspace_files_parent_id_name_uq').on(
      table.parentId,
      table.name,
      table.workspaceId,
    ),
    index('workspace_files_workspace_kind_idx').on(table.workspaceId, table.kind),
    index('workspace_files_workspace_parent_idx').on(table.workspaceId, table.parentId),
  ],
);
