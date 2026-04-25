import { integer, sqliteTable, sqliteView, text } from 'drizzle-orm/sqlite-core';
import { isNull, relations, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Prop, PropKeyConfig } from '$lib/props';

// The "Table" suffix makes explicit that it is for 'write' operations, with a
// view for 'read' operations that account for soft-deleted items.
// See ADR-0022.

export const categoryTable = sqliteTable('category', {
  id: text('id').primaryKey().$defaultFn(randomUUID),
  slug: text('slug').notNull(), // Uniqueness handled in category_active_slug index
  name: text('name').notNull(),
  description: text('description'),
  propKeys: text('prop_keys', { mode: 'json' }).$type<PropKeyConfig[]>().notNull().default([]),
  order: integer('order').notNull().default(0),
  // Per-category tier cutoffs — null means use the global default
  cutoffS: integer('cutoff_s'),
  cutoffA: integer('cutoff_a'),
  cutoffB: integer('cutoff_b'),
  cutoffC: integer('cutoff_c'),
  cutoffD: integer('cutoff_d'),
  cutoffE: integer('cutoff_e'),
  cutoffF: integer('cutoff_f'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at')
});

export const category = sqliteView('category_active').as((qb) =>
  qb.select().from(categoryTable).where(isNull(categoryTable.deletedAt))
);

export const tierListItemTable = sqliteTable('tier_list_item', {
  id: text('id').primaryKey().$defaultFn(randomUUID),
  categoryId: text('category_id')
    .notNull()
    .references(() => categoryTable.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(), // uniqueness handled in item_active_category_slug index
  name: text('name').notNull(),
  description: text('description'),
  score: integer('score').notNull(),
  order: integer('order').notNull().default(0),
  imageHash: text('image_hash'),
  placeholder: text('placeholder'),
  props: text('props', { mode: 'json' }).$type<Prop[]>().notNull().default([]),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
  // Set to true when an item is soft-deleted as part of a category cascade,
  // null otherwise. Lets restoreCategory bring back exactly the items it
  // cascaded — items the user trashed independently keep their state.
  deletedWithCascade: integer('deleted_with_cascade', { mode: 'boolean' })
});

export const tierListItem = sqliteView('tier_list_item_active').as((qb) =>
  qb.select().from(tierListItemTable).where(isNull(tierListItemTable.deletedAt))
);

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  totpSecret: text('totp_secret'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`)
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`)
});

export const page = sqliteTable('page', {
  slug: text('slug').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`)
});

export const siteSetting = sqliteTable('site_setting', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`)
});

// Signal table: when a row is present, updated_at triggers are suppressed.
// Used by reorder operations to avoid bumping timestamps on order-only changes.
export const suppressUpdatedAt = sqliteTable('_suppress_updated_at', {
  flag: integer('flag')
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const categoryRelations = relations(categoryTable, ({ many }) => ({
  items: many(tierListItemTable)
}));

export const tierListItemRelations = relations(tierListItemTable, ({ one }) => ({
  category: one(categoryTable, {
    fields: [tierListItemTable.categoryId],
    references: [categoryTable.id]
  })
}));

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session)
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] })
}));
