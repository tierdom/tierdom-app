import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020';
import { db as defaultDb } from '$lib/server/db';
import { categoryTable, tierListItemTable, page, siteSetting } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import schemaV1 from '../schema-v1.json';
import type { ExportData, ExportedCategory, ExportedItem } from '$lib/server/export/json-schema';
import type { Importer, ImportResult, MergeStrategy } from '../types';
import { emptyResult } from '../types';

type DB = typeof defaultDb;
type Tx = Parameters<Parameters<DB['transaction']>[0]>[0];

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate: ValidateFunction<ExportData> = ajv.compile<ExportData>(schemaV1);

export const MAX_JSON_BYTES = 10 * 1024 * 1024;

export const jsonImporter: Importer = {
  id: 'json',
  label: 'Tierdom JSON',
  description:
    "Round-trip our own export format. Drop in the data.json from a Tierdom export ZIP, or any file matching the published schema. Doubles as a 'generic' importer: wrangle your data into our format and you can import any data!",
  status: 'available',
  accept: 'application/json,.json',
  run: (file, opts) => runJsonImport(file, opts)
};

export async function runJsonImport(
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
      for (const p of data.data.pages) applyPage(tx, p, opts.strategy, result);
      for (const s of data.data.siteSettings) applySetting(tx, s, opts.strategy, result);
      for (const cat of data.data.categories) {
        applyCategory(tx, cat, opts.strategy, result);
        // If the file's category UUID isn't in the DB now (skipped due to slug clash),
        // its items would FK-fail. Skip them with the same accounting.
        const parentExists = tx
          .select({ id: categoryTable.id })
          .from(categoryTable)
          .where(eq(categoryTable.id, cat.id))
          .get();
        if (!parentExists) {
          result.skipped.items += cat.items.length;
          continue;
        }
        for (const item of cat.items) applyItem(tx, item, cat.id, opts.strategy, result);
      }
    });
  } catch (e) {
    return {
      ...emptyResult(),
      errors: [`Database error: ${e instanceof Error ? e.message : String(e)}`]
    };
  }

  return result;
}

function applyPage(
  tx: Tx,
  p: ExportData['data']['pages'][number],
  strategy: MergeStrategy,
  r: ImportResult
) {
  const existing = tx.select({ slug: page.slug }).from(page).where(eq(page.slug, p.slug)).get();
  if (existing && strategy === 'skip') {
    r.skipped.pages++;
    return;
  }
  const values = {
    slug: p.slug,
    title: p.title,
    content: p.content,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
  };
  if (existing) {
    tx.update(page).set(values).where(eq(page.slug, p.slug)).run();
    r.updated.pages++;
  } else {
    tx.insert(page).values(values).run();
    r.inserted.pages++;
  }
}

function applySetting(
  tx: Tx,
  s: ExportData['data']['siteSettings'][number],
  strategy: MergeStrategy,
  r: ImportResult
) {
  const existing = tx
    .select({ key: siteSetting.key })
    .from(siteSetting)
    .where(eq(siteSetting.key, s.key))
    .get();
  if (existing && strategy === 'skip') {
    r.skipped.siteSettings++;
    return;
  }
  const values = {
    key: s.key,
    value: s.value,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt
  };
  if (existing) {
    tx.update(siteSetting).set(values).where(eq(siteSetting.key, s.key)).run();
    r.updated.siteSettings++;
  } else {
    tx.insert(siteSetting).values(values).run();
    r.inserted.siteSettings++;
  }
}

function applyCategory(tx: Tx, cat: ExportedCategory, strategy: MergeStrategy, r: ImportResult) {
  const existing = tx
    .select({ id: categoryTable.id })
    .from(categoryTable)
    .where(eq(categoryTable.id, cat.id))
    .get();
  if (existing && strategy === 'skip') {
    r.skipped.categories++;
    return;
  }
  if (!existing) {
    const slugClash = tx
      .select({ id: categoryTable.id })
      .from(categoryTable)
      .where(and(eq(categoryTable.slug, cat.slug), isNull(categoryTable.deletedAt)))
      .get();
    if (slugClash) {
      if (strategy === 'skip') {
        r.skipped.categories++;
        return;
      }
      r.skipped.categories++;
      r.errors.push(
        `Category "${cat.slug}" (${cat.id}): slug already used by another category (${slugClash.id}); upsert keys on UUID, not slug.`
      );
      return;
    }
  }
  const values = {
    id: cat.id,
    slug: cat.slug,
    name: cat.name,
    description: cat.description,
    order: cat.order,
    cutoffS: cat.cutoffS,
    cutoffA: cat.cutoffA,
    cutoffB: cat.cutoffB,
    cutoffC: cat.cutoffC,
    cutoffD: cat.cutoffD,
    cutoffE: cat.cutoffE,
    cutoffF: cat.cutoffF,
    propKeys: cat.propKeys,
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
    // Upsert clears soft-delete: importing a row resurrects it from trash.
    deletedAt: null
  };
  if (existing) {
    tx.update(categoryTable).set(values).where(eq(categoryTable.id, cat.id)).run();
    r.updated.categories++;
  } else {
    tx.insert(categoryTable).values(values).run();
    r.inserted.categories++;
  }
}

function applyItem(
  tx: Tx,
  item: ExportedItem,
  categoryId: string,
  strategy: MergeStrategy,
  r: ImportResult
) {
  const existing = tx
    .select({ id: tierListItemTable.id })
    .from(tierListItemTable)
    .where(eq(tierListItemTable.id, item.id))
    .get();
  if (existing && strategy === 'skip') {
    r.skipped.items++;
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
        r.skipped.items++;
        return;
      }
      r.skipped.items++;
      r.errors.push(
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
    r.updated.items++;
  } else {
    tx.insert(tierListItemTable).values(values).run();
    r.inserted.items++;
  }
}
