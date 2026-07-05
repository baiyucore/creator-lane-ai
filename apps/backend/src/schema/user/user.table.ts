import { index, pgTable, serial, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    githubId: varchar('github_id', { length: 128 }),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  },
  // 性能优化左右，索引定义
  (table) => [
    uniqueIndex('users_email_uq').on(table.email),
    uniqueIndex('users_github_id_uq').on(table.githubId),
    index('users_created_at_idx').on(table.createdAt),
  ],
);

export type UserModel = typeof users.$inferSelect;
export type NewUserModel = typeof users.$inferInsert;
