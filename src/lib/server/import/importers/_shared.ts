import Papa from 'papaparse';
import { and, eq, isNull } from 'drizzle-orm';
import { db as defaultDb } from '$lib/server/db';
import { categoryTable } from '$lib/server/db/schema';
import { formatGradient } from '$lib/server/gradient';
import type { PropKeyConfig } from '$lib/props';
import { applyCategoryMapping, applyItem, type IncomingItem } from '../apply';
import { deleteImportTemp, readImportTemp, sweepImportTemp } from '../temp-storage';
import { MAX_IMPORT_BYTES } from '../validate';
import type { CategoryMapping, ImportPlan, ImportResult, MergeStrategy } from '../types';
import { emptyPlan, emptyResult } from '../types';

type DB = typeof defaultDb;
export type Tx = Parameters<Parameters<DB['transaction']>[0]>[0];

export interface TierCutoffs {
  cutoffS: number;
  cutoffA: number;
  cutoffB: number;
  cutoffC: number;
  cutoffD: number;
  cutoffE: number;
  cutoffF: number;
}

export interface StashedPlan {
  fileSlug: string;
  fileName: string;
  items: IncomingItem[];
  propKeys: PropKeyConfig[];
}

// HSL palette mirrors the SVG used by `generate-image.ts` so import
// placeholders look at home next to seeded ones. The format is centralised
// in `gradient.ts`; we just supply three colour stops.
export function gradientFromSeed(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  const hue1 = Math.abs(h) % 360;
  const hue2 = (hue1 + 30) % 360;
  const hue3 = (hue1 + 60) % 360;
  return formatGradient(
    `hsl(${hue1}, 45%, 25%)`,
    `hsl(${hue2}, 40%, 18%)`,
    `hsl(${hue3}, 35%, 12%)`,
  );
}

export function ensurePropKeys(tx: Tx, categoryId: string, incoming: PropKeyConfig[]): void {
  const existing = tx
    .select({ propKeys: categoryTable.propKeys })
    .from(categoryTable)
    .where(and(eq(categoryTable.id, categoryId), isNull(categoryTable.deletedAt)))
    .get();
  const current: PropKeyConfig[] = existing?.propKeys ?? [];
  const have = new Set(current.map((p) => p.key));
  const additions = incoming.filter((p) => !have.has(p.key));
  if (additions.length === 0) return;
  tx.update(categoryTable)
    .set({ propKeys: [...current, ...additions] })
    .where(eq(categoryTable.id, categoryId))
    .run();
}

// Only fills in cutoffs that are currently NULL — never overrides an explicit
// value the user set on the existing category.
export function ensureTierCutoffs(tx: Tx, categoryId: string, defaults: TierCutoffs): void {
  const existing = tx
    .select({
      cutoffS: categoryTable.cutoffS,
      cutoffA: categoryTable.cutoffA,
      cutoffB: categoryTable.cutoffB,
      cutoffC: categoryTable.cutoffC,
      cutoffD: categoryTable.cutoffD,
      cutoffE: categoryTable.cutoffE,
      cutoffF: categoryTable.cutoffF,
    })
    .from(categoryTable)
    .where(and(eq(categoryTable.id, categoryId), isNull(categoryTable.deletedAt)))
    .get();
  if (!existing) return;
  const updates: Partial<TierCutoffs> = {};
  for (const [key, value] of Object.entries(defaults) as [keyof TierCutoffs, number][]) {
    if (existing[key] == null) updates[key] = value;
  }
  if (Object.keys(updates).length === 0) return;
  tx.update(categoryTable).set(updates).where(eq(categoryTable.id, categoryId)).run();
}

// Shared CSV plan-phase preamble: sweep stale temps, size guard, papaparse,
// parse-error gate, required-headers check. Returns either the parsed rows
// or a plan with the appropriate error filled in.
export async function parseCsvWithHeaders<T extends Record<string, string>>(
  file: File,
  requiredHeaders: readonly string[],
  missingMessage: (missing: string[]) => string,
): Promise<{ rows: T[] } | { error: ImportPlan }> {
  sweepImportTemp();
  if (file.size > MAX_IMPORT_BYTES) {
    return {
      error: emptyPlan('', [`File is ${file.size} bytes; maximum is ${MAX_IMPORT_BYTES}.`]),
    };
  }
  const text = await file.text();
  const parsed = Papa.parse<T>(text, { header: true, skipEmptyLines: true });
  /* v8 ignore start -- @preserve papaparse rarely emits errors when
     `header: true` and the input is non-empty; we keep the branch in place
     to surface anything truly malformed (e.g. a binary blob masquerading as
     CSV) but the unit suite uses well-formed inputs. */
  if (parsed.errors.length > 0) {
    return {
      error: emptyPlan(
        '',
        parsed.errors.slice(0, 5).map((e) => `CSV parse error: ${e.message}`),
      ),
    };
  }
  /* v8 ignore stop */
  const headers = parsed.meta.fields ?? [];
  const missing = requiredHeaders.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return { error: emptyPlan('', [missingMessage(missing)]) };
  }
  return { rows: parsed.data };
}

// Shared commit skeleton used by all stash-based importers. Reads the stash,
// handles the skip-mapping path, applies the category + items in a single
// transaction, and cleans up the temp.
export async function runStashedCommit(
  planId: string,
  mappings: CategoryMapping[],
  strategy: MergeStrategy,
  conn: DB,
  cutoffs: TierCutoffs,
): Promise<ImportResult> {
  let bytes: Buffer;
  try {
    bytes = readImportTemp(planId);
  } catch (e) {
    return { ...emptyResult(), errors: [e instanceof Error ? e.message : String(e)] };
  }

  let stash: StashedPlan;
  try {
    stash = JSON.parse(bytes.toString('utf8')) as StashedPlan;
    /* v8 ignore start -- @preserve defensive: temp-storage round-trip writes
       the same JSON we parse here. Only triggered if something corrupts the
       stash file between writeImportTemp and readImportTemp. */
  } catch (e) {
    return {
      ...emptyResult(),
      errors: [`Invalid stored plan: ${e instanceof Error ? e.message : String(e)}`],
    };
    /* v8 ignore stop */
  }

  const mapping = mappings.find((m) => m.fileSlug === stash.fileSlug);
  const result = emptyResult();

  if (!mapping || mapping.action === 'skip') {
    if (!mapping) {
      result.errors.push(`No mapping provided for category "${stash.fileSlug}".`);
    }
    result.skipped.categories++;
    result.details.skipped.push(`categories/${stash.fileSlug}`);
    for (const item of stash.items) {
      result.skipped.items++;
      result.details.skipped.push(`categories/${stash.fileSlug}/items/${item.slug}`);
    }
    deleteImportTemp(planId);
    return result;
  }

  try {
    conn.transaction((tx) => {
      const targetId = applyCategoryMapping(
        tx,
        {
          slug: stash.fileSlug,
          description: null,
          order: 0,
          ...cutoffs,
          propKeys: stash.propKeys,
        },
        mapping,
        result,
      );
      if (!targetId) return;
      if (mapping.action === 'use-existing') {
        if (stash.propKeys.length > 0) ensurePropKeys(tx, targetId, stash.propKeys);
        ensureTierCutoffs(tx, targetId, cutoffs);
      }
      for (const item of stash.items) {
        applyItem(tx, item, stash.fileSlug, targetId, strategy, result);
      }
    });
    /* v8 ignore start -- @preserve defensive: drizzle errors are surfaced
       through this catch only on a hard SQLite failure (disk full, schema
       drift). Not triggered by the unit suite. */
  } catch (e) {
    return {
      ...emptyResult(),
      errors: [`Database error: ${e instanceof Error ? e.message : String(e)}`],
    };
  }
  /* v8 ignore stop */

  deleteImportTemp(planId);
  return result;
}
