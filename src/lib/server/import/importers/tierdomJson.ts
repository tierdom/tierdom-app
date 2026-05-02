import { and, eq, isNull } from 'drizzle-orm';
import { db as defaultDb } from '$lib/server/db';
import { categoryTable } from '$lib/server/db/schema';
import { MAX_JSON_BYTES, formatAjvErrors, validateExport } from '../validate';
import {
  deleteImportTemp,
  readImportTemp,
  sweepImportTemp,
  writeImportTemp,
} from '../temp-storage';
import { applyCategoryMapping, applyItem } from '../apply';
import type { ExportData } from '$lib/server/export/json-schema';
import type {
  CategoryMapping,
  ImportPlan,
  ImportResult,
  Importer,
  MergeStrategy,
  ProposedCategory,
} from '../types';
import { emptyPlan, emptyResult } from '../types';

type DB = typeof defaultDb;

export const tierdomJsonImporter: Importer = {
  id: 'json',
  label: 'Tierdom JSON',
  description:
    "Round-trip our own export format. Drop in the data.json from a Tierdom export ZIP, or any file matching the published schema. Doubles as a 'generic' importer: wrangle your data into our format and you can import any data!",
  status: 'available',
  accept: 'application/json,.json',
  plan: (file) => planTierdomJsonImport(file),
  commit: (planId, mappings, strategy) => commitTierdomJsonImport(planId, mappings, strategy),
};

export async function planTierdomJsonImport(file: File, conn: DB = defaultDb): Promise<ImportPlan> {
  // Opportunistic sweep: clears stale temp files from abandoned imports
  // (admin uploaded then navigated away without Cancel) on the natural cadence
  // of fresh import attempts. Cheap — readdir + stat over a tiny dir.
  sweepImportTemp();
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
      matchedExistingName: match?.name ?? null,
    };
  });

  return { planId, categories, errors: [] };
}

export async function commitTierdomJsonImport(
  planId: string,
  mappings: CategoryMapping[],
  strategy: MergeStrategy,
  conn: DB = defaultDb,
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
      errors: [`Invalid JSON in stored plan: ${e instanceof Error ? e.message : String(e)}`],
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
      errors: [`Database error: ${e instanceof Error ? e.message : String(e)}`],
    };
  }

  deleteImportTemp(planId);
  return result;
}
