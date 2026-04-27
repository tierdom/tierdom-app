import { randomUUID } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { db as defaultDb } from '$lib/server/db';
import { categoryTable, tierListItemTable } from '$lib/server/db/schema';
import { MAX_JSON_BYTES, formatAjvErrors, validateExport } from '../validate';
import { deleteImportTemp, readImportTemp, writeImportTemp } from '../temp-storage';
import type { ExportData, ExportedCategory, ExportedItem } from '$lib/server/export/json-schema';
import type {
  CategoryMapping,
  ImportPlan,
  ImportResult,
  Importer,
  MergeStrategy,
  ProposedCategory
} from '../types';
import { emptyPlan, emptyResult } from '../types';

type DB = typeof defaultDb;
type Tx = Parameters<Parameters<DB['transaction']>[0]>[0];

export const tierdomJsonImporter: Importer = {
  id: 'json',
  label: 'Tierdom JSON',
  description:
    "Round-trip our own export format. Drop in the data.json from a Tierdom export ZIP, or any file matching the published schema. Doubles as a 'generic' importer: wrangle your data into our format and you can import any data!",
  status: 'available',
  accept: 'application/json,.json',
  plan: (file) => planTierdomJsonImport(file),
  commit: (planId, mappings, strategy) => commitTierdomJsonImport(planId, mappings, strategy)
};

export async function planTierdomJsonImport(file: File, conn: DB = defaultDb): Promise<ImportPlan> {
  if (file.size > MAX_JSON_BYTES) {
    return emptyPlan('', [`File is ${file.size} bytes; maximum is ${MAX_JSON_BYTES}.`]);
  }

  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return emptyPlan('', [`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`]);
  }

  if (!validateExport(parsed)) {
    return emptyPlan('', formatAjvErrors());
  }

  const data = parsed as ExportData;
  const planId = writeImportTemp(text);

  const categories: ProposedCategory[] = data.data.categories.map((category) => {
    const match = conn
      .select({ id: categoryTable.id, name: categoryTable.name })
      .from(categoryTable)
      .where(and(eq(categoryTable.slug, category.slug), isNull(categoryTable.deletedAt)))
      .get();
    return {
      fileSlug: category.slug,
      fileName: category.name,
      itemCount: category.items.length,
      matchedExistingId: match?.id ?? null,
      matchedExistingName: match?.name ?? null
    };
  });

  return { planId, categories, errors: [] };
}

export async function commitTierdomJsonImport(
  planId: string,
  mappings: CategoryMapping[],
  strategy: MergeStrategy,
  conn: DB = defaultDb
): Promise<ImportResult> {
  let bytes: Buffer;
  try {
    bytes = readImportTemp(planId);
  } catch (e) {
    return { ...emptyResult(), errors: [e instanceof Error ? e.message : String(e)] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString('utf8'));
  } catch (e) {
    return {
      ...emptyResult(),
      errors: [`Invalid JSON in stored plan: ${e instanceof Error ? e.message : String(e)}`]
    };
  }
  if (!validateExport(parsed)) {
    return { ...emptyResult(), errors: formatAjvErrors() };
  }

  const data = parsed as ExportData;
  const mappingBySlug = new Map(mappings.map((m) => [m.fileSlug, m]));
  const result = emptyResult();

  try {
    conn.transaction((tx) => {
      for (const category of data.data.categories) {
        const mapping = mappingBySlug.get(category.slug);
        if (!mapping || mapping.action === 'skip') {
          if (!mapping) {
            result.errors.push(`No mapping provided for category "${category.slug}".`);
          }
          result.skipped.categories++;
          result.details.skipped.push(`categories/${category.slug}`);
          for (const item of category.items) {
            result.skipped.items++;
            result.details.skipped.push(`categories/${category.slug}/items/${item.slug}`);
          }
          continue;
        }
        const targetId = applyCategoryMapping(tx, category, mapping, result);
        if (!targetId) continue;
        for (const item of category.items) {
          applyItem(tx, item, category.slug, targetId, strategy, result);
        }
      }
    });
  } catch (e) {
    return {
      ...emptyResult(),
      errors: [`Database error: ${e instanceof Error ? e.message : String(e)}`]
    };
  }

  deleteImportTemp(planId);
  return result;
}

function applyCategoryMapping(
  tx: Tx,
  category: ExportedCategory,
  mapping: Exclude<CategoryMapping, { action: 'skip' }>,
  result: ImportResult
): string | null {
  if (mapping.action === 'use-existing') {
    const exists = tx
      .select({ id: categoryTable.id })
      .from(categoryTable)
      .where(and(eq(categoryTable.id, mapping.targetId), isNull(categoryTable.deletedAt)))
      .get();
    if (!exists) {
      result.errors.push(
        `Target category ${mapping.targetId} for "${category.slug}" no longer exists.`
      );
      result.skipped.categories++;
      result.details.skipped.push(`categories/${category.slug}`);
      return null;
    }
    return mapping.targetId;
  }

  // create-new
  const targetSlug = mapping.slug;
  const slugClash = tx
    .select({ id: categoryTable.id })
    .from(categoryTable)
    .where(and(eq(categoryTable.slug, targetSlug), isNull(categoryTable.deletedAt)))
    .get();
  if (slugClash) {
    result.errors.push(
      `Cannot create category "${targetSlug}": slug already in use by ${slugClash.id}.`
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
      propKeys: category.propKeys
    })
    .run();
  result.inserted.categories++;
  result.details.inserted.push(`categories/${targetSlug}`);
  return newId;
}

function applyItem(
  tx: Tx,
  item: ExportedItem,
  fileCategorySlug: string,
  targetCategoryId: string,
  strategy: MergeStrategy,
  result: ImportResult
) {
  const path = `categories/${fileCategorySlug}/items/${item.slug}`;
  const existing = tx
    .select({ id: tierListItemTable.id })
    .from(tierListItemTable)
    .where(
      and(
        eq(tierListItemTable.categoryId, targetCategoryId),
        eq(tierListItemTable.slug, item.slug),
        isNull(tierListItemTable.deletedAt)
      )
    )
    .get();

  if (existing && strategy === 'skip') {
    result.skipped.items++;
    result.details.skipped.push(path);
    return;
  }

  const values = {
    categoryId: targetCategoryId,
    slug: item.slug,
    name: item.name,
    description: item.description,
    score: item.score,
    order: item.order,
    imageHash: item.imageHash,
    placeholder: item.placeholder,
    props: item.props
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
