import { integer, primaryKey, real, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const category = sqliteTable('category', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	description: text('description'),
	order: integer('order').notNull().default(0),
	// Per-category tier cutoffs — null means use the global default
	cutoffS: integer('cutoff_s'),
	cutoffA: integer('cutoff_a'),
	cutoffB: integer('cutoff_b'),
	cutoffC: integer('cutoff_c'),
	cutoffD: integer('cutoff_d'),
	cutoffE: integer('cutoff_e'),
	cutoffF: integer('cutoff_f')
});

export const tierListItem = sqliteTable(
	'tier_list_item',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		categoryId: integer('category_id')
			.notNull()
			.references(() => category.id, { onDelete: 'cascade' }),
		slug: text('slug').notNull(),
		name: text('name').notNull(),
		description: text('description'),
		score: integer('score').notNull(),
		order: integer('order').notNull().default(0)
	},
	(t) => [unique('item_category_slug').on(t.categoryId, t.slug)]
);

export const tag = sqliteTable('tag', {
	slug: text('slug').primaryKey(),
	label: text('label').notNull()
});

export const itemTag = sqliteTable(
	'item_tag',
	{
		itemId: integer('item_id')
			.notNull()
			.references(() => tierListItem.id, { onDelete: 'cascade' }),
		tagSlug: text('tag_slug')
			.notNull()
			.references(() => tag.slug, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.itemId, t.tagSlug] })]
);

export const page = sqliteTable('page', {
	slug: text('slug').primaryKey(),
	title: text('title').notNull(),
	content: text('content').notNull()
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const categoryRelations = relations(category, ({ many }) => ({
	items: many(tierListItem)
}));

export const tierListItemRelations = relations(tierListItem, ({ one, many }) => ({
	category: one(category, { fields: [tierListItem.categoryId], references: [category.id] }),
	tags: many(itemTag)
}));

export const itemTagRelations = relations(itemTag, ({ one }) => ({
	item: one(tierListItem, { fields: [itemTag.itemId], references: [tierListItem.id] }),
	tag: one(tag, { fields: [itemTag.tagSlug], references: [tag.slug] })
}));

export const tagRelations = relations(tag, ({ many }) => ({
	items: many(itemTag)
}));
