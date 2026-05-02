import { randomUUID } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { db as defaultDb } from '$lib/server/db';
import { categoryTable, tierListItemTable } from '$lib/server/db/schema';
import type { Prop, PropKeyConfig } from '$lib/props';
import type { CategoryMapping, ImportResult, MergeStrategy } from './types';

type DB = typeof defaultDb;
type Tx = Parameters<Parameters<DB['transaction']>[0]>[0];

/**
 * Subset of category fields needed when materialising a "create-new" mapping.
 * Importers shape their incoming category record into this and let the helper
 * deal with slug-clash bookkeeping.
 */
export interface IncomingCategory {
  slug: string;
  description: string | null;
  order: number;
  cutoffS: number | null;
  cutoffA: number | null;
  cutoffB: number | null;
  cutoffC: number | null;
  cutoffD: number | null;
  cutoffE: number | null;
  cutoffF: number | null;
  propKeys: PropKeyConfig[];
}

export interface IncomingItem {
  slug: string;
  name: string;
  description: string | null;
  score: number;
  order: number;
  placeholder: string | null;
  props: Prop[];
}

export function applyCategoryMapping(
  tx: Tx,
  category: IncomingCategory,
  mapping: Exclude<CategoryMapping, { action: 'skip' }>,
  result: ImportResult,
): string | null {
  if (mapping.action === 'use-existing') {
    const exists = tx
      .select({ id: categoryTable.id })
      .from(categoryTable)
      .where(and(eq(categoryTable.id, mapping.targetId), isNull(categoryTable.deletedAt)))
      .get();
    if (!exists) {
      result.errors.push(
        `Target category ${mapping.targetId} for "${category.slug}" no longer exists.`,
      );
      result.skipped.categories++;
      result.details.skipped.push(`categories/${category.slug}`);
      return null;
    }
    return mapping.targetId;
  }

  const targetSlug = mapping.slug;
  const slugClash = tx
    .select({ id: categoryTable.id })
    .from(categoryTable)
    .where(and(eq(categoryTable.slug, targetSlug), isNull(categoryTable.deletedAt)))
    .get();
  if (slugClash) {
    result.errors.push(
      `Cannot create category "${targetSlug}": slug already in use by ${slugClash.id}.`,
    );
    result.skipped.categories++;
    result.details.skipped.push(`categories/${targetSlug}`);
    return null;
  }

  const newId = randomUUID();
  tx.insert(categoryTable)
    .values({
      id: newId,
      slug: targetSlug,
      name: mapping.name,
      description: category.description,
      order: category.order,
      cutoffS: category.cutoffS,
      cutoffA: category.cutoffA,
      cutoffB: category.cutoffB,
      cutoffC: category.cutoffC,
      cutoffD: category.cutoffD,
      cutoffE: category.cutoffE,
      cutoffF: category.cutoffF,
      propKeys: category.propKeys,
    })
    .run();
  result.inserted.categories++;
  result.details.inserted.push(`categories/${targetSlug}`);
  return newId;
}

export function applyItem(
  tx: Tx,
  item: IncomingItem,
  fileCategorySlug: string,
  targetCategoryId: string,
  strategy: MergeStrategy,
  result: ImportResult,
) {
  const path = `categories/${fileCategorySlug}/items/${item.slug}`;
  const existing = tx
    .select({ id: tierListItemTable.id })
    .from(tierListItemTable)
    .where(
      and(
        eq(tierListItemTable.categoryId, targetCategoryId),
        eq(tierListItemTable.slug, item.slug),
        isNull(tierListItemTable.deletedAt),
      ),
    )
    .get();

  if (existing && strategy === 'skip') {
    result.skipped.items++;
    result.details.skipped.push(path);
    return;
  }

  // imageHash deliberately not copied: it references an image file in the
  // exporter's data dir, which doesn't exist on this server. Importing it
  // would leave the item pointing at a missing image. See ADR-0024
  // ("No image imports").
  const values = {
    categoryId: targetCategoryId,
    slug: item.slug,
    name: item.name,
    description: item.description,
    score: item.score,
    order: item.order,
    placeholder: item.placeholder,
    props: item.props,
  };

  if (existing) {
    tx.update(tierListItemTable).set(values).where(eq(tierListItemTable.id, existing.id)).run();
    result.updated.items++;
    result.details.updated.push(path);
  } else {
    tx.insert(tierListItemTable)
      .values({ id: randomUUID(), ...values })
      .run();
    result.inserted.items++;
    result.details.inserted.push(path);
  }
}
