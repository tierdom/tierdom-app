import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { db as defaultDb } from '$lib/server/db';
import { categoryTable, tierListItemTable, page, siteSetting } from '$lib/server/db/schema';
import { invalidateAllSiteContent } from '$lib/server/site-content';
import { and, eq, isNull } from 'drizzle-orm';
import schemaV1 from '../schema-v1.json';
import type {
  ExportData,
  ExportedCategory,
  ExportedItem,
  ExportedPage,
  ExportedSiteSetting
} from '$lib/server/export/json-schema';
import type { Importer, ImportResult, MergeStrategy } from '../types';
import { emptyResult } from '../types';

type DB = typeof defaultDb;
type Tx = Parameters<Parameters<DB['transaction']>[0]>[0];

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate: ValidateFunction<ExportData> = ajv.compile<ExportData>(schemaV1);

export const MAX_JSON_BYTES = 10 * 1024 * 1024;

export const tierdomJsonImporter: Importer = {
  id: 'json',
  label: 'Tierdom JSON',
  description:
    "Round-trip our own export format. Drop in the data.json from a Tierdom export ZIP, or any file matching the published schema. Doubles as a 'generic' importer: wrangle your data into our format and you can import any data!",
  status: 'available',
  accept: 'application/json,.json',
  run: (file, opts) => runTierdomJsonImport(file, opts)
};

export async function runTierdomJsonImport(
  file: File,
  opts: { strategy: MergeStrategy },
  conn: DB = defaultDb
): Promise<ImportResult> {
  if (file.size > MAX_JSON_BYTES) {
    return {
      ...emptyResult(),
      errors: [`File is ${file.size} bytes; maximum is ${MAX_JSON_BYTES}.`]
    };
  }

  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return {
      ...emptyResult(),
      errors: [`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`]
    };
  }

  if (!validate(parsed)) {
    const errors = (validate.errors ?? []).map(
      (e) => `${e.instancePath || '/'} ${e.message ?? 'invalid'}`
    );
    return { ...emptyResult(), errors };
  }

  const data = parsed as ExportData;
  const result = emptyResult();

  try {
    conn.transaction((tx) => {
      for (const pageData of data.data.pages) applyPage(tx, pageData, opts.strategy, result);
      for (const setting of data.data.siteSettings)
        applySetting(tx, setting, opts.strategy, result);
      for (const category of data.data.categories) {
        applyCategory(tx, category, opts.strategy, result);
        // If the file's category UUID isn't in the DB now (skipped due to slug clash),
        // its items would FK-fail. Skip them with the same accounting.
        const parentExists = tx
          .select({ id: categoryTable.id })
          .from(categoryTable)
          .where(eq(categoryTable.id, category.id))
          .get();
        if (!parentExists) {
          result.skipped.items += category.items.length;
          for (const item of category.items) {
            result.details.skipped.push(`categories/${category.slug}/items/${item.slug}`);
          }
          continue;
        }
        for (const item of category.items) {
          applyItem(tx, item, category, opts.strategy, result);
        }
      }
    });
  } catch (e) {
    return {
      ...emptyResult(),
      errors: [`Database error: ${e instanceof Error ? e.message : String(e)}`]
    };
  }

  // Site-content reads (e.g. footer) are cached in-process; bulk writes here
  // bypass setSiteContent, so flush the cache or callers see stale values
  // until the next process restart.
  if (
    result.inserted.siteSettings +
      result.updated.siteSettings +
      result.inserted.pages +
      result.updated.pages >
    0
  ) {
    invalidateAllSiteContent();
  }

  return result;
}

function applyPage(tx: Tx, pageData: ExportedPage, strategy: MergeStrategy, result: ImportResult) {
  const path = `pages/${pageData.slug}`;
  const existing = tx
    .select({ slug: page.slug })
    .from(page)
    .where(eq(page.slug, pageData.slug))
    .get();
  if (existing && strategy === 'skip') {
    result.skipped.pages++;
    result.details.skipped.push(path);
    return;
  }
  const values = {
    slug: pageData.slug,
    title: pageData.title,
    content: pageData.content,
    createdAt: pageData.createdAt,
    updatedAt: pageData.updatedAt
  };
  if (existing) {
    tx.update(page).set(values).where(eq(page.slug, pageData.slug)).run();
    result.updated.pages++;
    result.details.updated.push(path);
  } else {
    tx.insert(page).values(values).run();
    result.inserted.pages++;
    result.details.inserted.push(path);
  }
}

function applySetting(
  tx: Tx,
  setting: ExportedSiteSetting,
  strategy: MergeStrategy,
  result: ImportResult
) {
  const path = `siteSettings/${setting.key}`;
  const existing = tx
    .select({ key: siteSetting.key })
    .from(siteSetting)
    .where(eq(siteSetting.key, setting.key))
    .get();
  if (existing && strategy === 'skip') {
    result.skipped.siteSettings++;
    result.details.skipped.push(path);
    return;
  }
  const values = {
    key: setting.key,
    value: setting.value,
    createdAt: setting.createdAt,
    updatedAt: setting.updatedAt
  };
  if (existing) {
    tx.update(siteSetting).set(values).where(eq(siteSetting.key, setting.key)).run();
    result.updated.siteSettings++;
    result.details.updated.push(path);
  } else {
    tx.insert(siteSetting).values(values).run();
    result.inserted.siteSettings++;
    result.details.inserted.push(path);
  }
}

function applyCategory(
  tx: Tx,
  category: ExportedCategory,
  strategy: MergeStrategy,
  result: ImportResult
) {
  const path = `categories/${category.slug}`;
  const existing = tx
    .select({ id: categoryTable.id })
    .from(categoryTable)
    .where(eq(categoryTable.id, category.id))
    .get();
  if (existing && strategy === 'skip') {
    result.skipped.categories++;
    result.details.skipped.push(path);
    return;
  }
  if (!existing) {
    const slugClash = tx
      .select({ id: categoryTable.id })
      .from(categoryTable)
      .where(and(eq(categoryTable.slug, category.slug), isNull(categoryTable.deletedAt)))
      .get();
    if (slugClash) {
      if (strategy === 'skip') {
        result.skipped.categories++;
        result.details.skipped.push(path);
        return;
      }
      result.skipped.categories++;
      result.details.skipped.push(path);
      result.errors.push(
        `Category "${category.slug}" (${category.id}): slug already used by another category (${slugClash.id}); upsert keys on UUID, not slug.`
      );
      return;
    }
  }
  const values = {
    id: category.id,
    slug: category.slug,
    name: category.name,
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
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    // Upsert clears soft-delete: importing a row resurrects it from trash.
    deletedAt: null
  };
  if (existing) {
    tx.update(categoryTable).set(values).where(eq(categoryTable.id, category.id)).run();
    result.updated.categories++;
    result.details.updated.push(path);
  } else {
    tx.insert(categoryTable).values(values).run();
    result.inserted.categories++;
    result.details.inserted.push(path);
  }
}

function applyItem(
  tx: Tx,
  item: ExportedItem,
  category: ExportedCategory,
  strategy: MergeStrategy,
  result: ImportResult
) {
  const path = `categories/${category.slug}/items/${item.slug}`;
  const categoryId = category.id;
  const existing = tx
    .select({ id: tierListItemTable.id })
    .from(tierListItemTable)
    .where(eq(tierListItemTable.id, item.id))
    .get();
  if (existing && strategy === 'skip') {
    result.skipped.items++;
    result.details.skipped.push(path);
    return;
  }
  if (!existing) {
    const slugClash = tx
      .select({ id: tierListItemTable.id })
      .from(tierListItemTable)
      .where(
        and(
          eq(tierListItemTable.categoryId, categoryId),
          eq(tierListItemTable.slug, item.slug),
          isNull(tierListItemTable.deletedAt)
        )
      )
      .get();
    if (slugClash) {
      if (strategy === 'skip') {
        result.skipped.items++;
        result.details.skipped.push(path);
        return;
      }
      result.skipped.items++;
      result.details.skipped.push(path);
      result.errors.push(
        `Item "${item.slug}" (${item.id}): slug already used by another item (${slugClash.id}) in this category; upsert keys on UUID, not slug.`
      );
      return;
    }
  }
  const values = {
    id: item.id,
    categoryId,
    slug: item.slug,
    name: item.name,
    description: item.description,
    score: item.score,
    order: item.order,
    imageHash: item.imageHash,
    placeholder: item.placeholder,
    props: item.props,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    deletedAt: null,
    deletedWithCascade: null
  };
  if (existing) {
    tx.update(tierListItemTable).set(values).where(eq(tierListItemTable.id, item.id)).run();
    result.updated.items++;
    result.details.updated.push(path);
  } else {
    tx.insert(tierListItemTable).values(values).run();
    result.inserted.items++;
    result.details.inserted.push(path);
  }
}
