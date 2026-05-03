import Papa from 'papaparse';
import { and, eq, isNull } from 'drizzle-orm';
import { db as defaultDb } from '$lib/server/db';
import { categoryTable } from '$lib/server/db/schema';
import { formatGradient } from '$lib/server/gradient';
import { slugify } from '$lib/server/slugify';
import type { PropKeyConfig } from '$lib/props';
import {
  deleteImportTemp,
  readImportTemp,
  sweepImportTemp,
  writeImportTemp,
} from '../temp-storage';
import { applyCategoryMapping, applyItem } from '../apply';
import type { IncomingItem } from '../apply';
import { MAX_IMPORT_BYTES } from '../validate';
import type {
  CategoryMapping,
  ImportPlan,
  ImportResult,
  Importer,
  ImporterOption,
  ImporterOptions,
  MergeStrategy,
} from '../types';
import { emptyPlan, emptyResult } from '../types';

type DB = typeof defaultDb;

const REQUIRED_HEADERS = [
  'Book Id',
  'Title',
  'Author',
  'ISBN',
  'ISBN13',
  'My Rating',
  'Binding',
  'Year Published',
  'Original Publication Year',
  'Date Added',
] as const;

// 0–5 star ratings map onto 0/20/40/60/80/100. Cutoffs map each integer rating
// to a tier with D left deliberately empty (5★→S, 4★→A, 3★→B, 2★→C, 1★→E,
// 0★→F) — leaving the gap at D matches how readers tend to think about a
// 5-star scale (a 1★ book is bad, not just below average).
const GOODREADS_TIER_CUTOFFS: {
  cutoffS: number;
  cutoffA: number;
  cutoffB: number;
  cutoffC: number;
  cutoffD: number;
  cutoffE: number;
  cutoffF: number;
} = {
  cutoffS: 91,
  cutoffA: 71,
  cutoffB: 51,
  cutoffC: 31,
  cutoffD: 21,
  cutoffE: 11,
  cutoffF: 0,
};

type GoodreadsCsvRow = Record<string, string>;

const GOODREADS_OPTIONS: ImporterOption[] = [
  {
    id: 'isbnMode',
    type: 'radio',
    label: 'ISBN field to import',
    help: 'Goodreads exports both an ISBN-10 ("ISBN") and an ISBN-13 ("ISBN13") column. Pick which you want surfaced as item properties.',
    default: 'isbn13',
    choices: [
      { value: 'isbn13', label: 'ISBN13 only' },
      { value: 'isbn10', label: 'ISBN only' },
      { value: 'both', label: 'Import both ISBN fields' },
    ],
  },
  {
    id: 'importAuthor',
    type: 'checkbox',
    label: 'Author',
    help: 'Add the primary author as an item property.',
    default: true,
  },
  {
    id: 'importBinding',
    type: 'checkbox',
    label: 'Binding',
    help: 'Add the binding (e.g. Hardcover, Kindle Edition) as an item property.',
    default: false,
  },
  {
    id: 'pubYear',
    type: 'radio',
    label: 'Publication year',
    help: 'Surfaced as a "Year" property on each item.',
    default: 'original',
    choices: [
      { value: 'original', label: 'Use Original Publication Year' },
      { value: 'edition', label: 'Use Year Published (this edition)' },
      { value: 'none', label: "Don't import a year" },
    ],
  },
  {
    id: 'sortBy',
    type: 'radio',
    label: 'Order tie-breaker',
    help: '"My Rating" is always the primary sort. The choice below decides the order among items that share the same rating; "Book Id" is the final tie-breaker.',
    default: 'title',
    choices: [
      { value: 'title', label: 'Alphabetical by Title' },
      { value: 'dateAddedDesc', label: 'By Date Added, newest first' },
      { value: 'dateAddedAsc', label: 'By Date Added, oldest first' },
    ],
  },
  {
    id: 'unratedRows',
    type: 'radio',
    label: 'Rows without a "My Rating" value',
    default: 'skip',
    choices: [
      { value: 'skip', label: 'Skip them' },
      { value: 'import', label: 'Import them with a score of 0' },
    ],
  },
  {
    id: 'placeholders',
    type: 'checkbox',
    label: 'Generate gradient placeholders',
    help: 'Each imported book gets a deterministic random gradient as its background, so the empty-image fallback looks varied instead of flat.',
    default: true,
  },
];

interface GoodreadsStashedPlan {
  fileSlug: string;
  fileName: string;
  items: IncomingItem[];
  propKeys: PropKeyConfig[];
}

const SYNTHETIC_SLUG = 'books';
const SYNTHETIC_NAME = 'Books';

export const goodreadsImporter: Importer = {
  id: 'goodreads',
  label: 'Goodreads',
  description: 'Import a books library exported from Goodreads (CSV).',
  status: 'available',
  accept: 'text/csv,.csv',
  options: GOODREADS_OPTIONS,
  plan: (file, options) => planGoodreadsImport(file, options),
  commit: (planId, mappings, strategy) => commitGoodreadsImport(planId, mappings, strategy),
};

export async function planGoodreadsImport(
  file: File,
  options: ImporterOptions,
): Promise<ImportPlan> {
  sweepImportTemp();
  if (file.size > MAX_IMPORT_BYTES) {
    return emptyPlan('', [`File is ${file.size} bytes; maximum is ${MAX_IMPORT_BYTES}.`]);
  }

  const text = await file.text();
  const parsed = Papa.parse<GoodreadsCsvRow>(text, {
    header: true,
    skipEmptyLines: true,
  });
  /* v8 ignore start -- @preserve papaparse rarely emits errors when
     `header: true` and the input is non-empty; we keep the branch in place
     to surface anything truly malformed (e.g. a binary blob masquerading as
     CSV) but the unit suite uses well-formed inputs. */
  if (parsed.errors.length > 0) {
    return emptyPlan(
      '',
      parsed.errors.slice(0, 5).map((e) => `CSV parse error: ${e.message}`),
    );
  }
  /* v8 ignore stop */
  const headers = parsed.meta.fields ?? [];
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return emptyPlan('', [
      `Missing required Goodreads columns: ${missing.join(', ')}. Re-export your library from Goodreads and try again.`,
    ]);
  }

  const isbnMode = String(options.isbnMode ?? 'isbn13');
  const pubYear = String(options.pubYear ?? 'original');
  const unratedRows = String(options.unratedRows ?? 'skip');
  const importAuthor = options.importAuthor !== false;
  const importBinding = options.importBinding === true;
  const placeholders = options.placeholders !== false;

  const filtered = parsed.data.filter((row) => {
    if (unratedRows === 'skip' && !isRated(row)) return false;
    return true;
  });

  const sorted = sortRows(filtered, String(options.sortBy ?? 'title'));

  // After header validation passes, papaparse (with `header: true`) guarantees
  // every required column is present on every row as a string — blank cells
  // come through as ''. The `!` assertions below lean on that contract;
  // dropping them would just count as extra unreachable branches.
  const usedSlugs = new Set<string>();
  const items: IncomingItem[] = sorted.map((row, index) => {
    const title = row['Title']!;
    const bookId = row['Book Id']!;
    let slug = slugify(title) || `goodreads-${bookId}`;
    if (usedSlugs.has(slug)) {
      slug = `${slug}-${bookId}`;
    }
    usedSlugs.add(slug);

    const score = isRated(row) ? Number(row['My Rating']) * 20 : 0;
    const props = [];
    if (importAuthor && row['Author']) {
      props.push({ key: 'Author', value: row['Author']! });
    }
    const year = pubYearForRow(row, pubYear);
    if (year) props.push({ key: 'Year', value: year });
    if (importBinding && row['Binding']) {
      props.push({ key: 'Binding', value: row['Binding']! });
    }
    const isbn10 = unwrapIsbn(row['ISBN']!);
    const isbn13 = unwrapIsbn(row['ISBN13']!);
    if ((isbnMode === 'isbn13' || isbnMode === 'both') && isbn13) {
      props.push({ key: 'ISBN13', value: isbn13 });
    }
    if ((isbnMode === 'isbn10' || isbnMode === 'both') && isbn10) {
      props.push({ key: 'ISBN', value: isbn10 });
    }

    return {
      slug,
      name: title,
      description: '',
      score,
      order: index,
      placeholder: placeholders ? gradientFromSeed(bookId || slug) : null,
      props,
    };
  });

  const propKeys: PropKeyConfig[] = [];
  if (importAuthor) propKeys.push({ key: 'Author', showOnCard: true });
  if (pubYear !== 'none') propKeys.push({ key: 'Year', showOnCard: true });
  if (importBinding) propKeys.push({ key: 'Binding' });
  if (isbnMode === 'isbn13' || isbnMode === 'both') propKeys.push({ key: 'ISBN13' });
  if (isbnMode === 'isbn10' || isbnMode === 'both') propKeys.push({ key: 'ISBN' });

  const stash: GoodreadsStashedPlan = {
    fileSlug: SYNTHETIC_SLUG,
    fileName: SYNTHETIC_NAME,
    items,
    propKeys,
  };
  const planId = writeImportTemp(JSON.stringify(stash));

  return {
    planId,
    categories: [
      {
        fileSlug: SYNTHETIC_SLUG,
        fileName: SYNTHETIC_NAME,
        itemCount: items.length,
        matchedExistingId: null,
        matchedExistingName: null,
      },
    ],
    errors: [],
  };
}

export async function commitGoodreadsImport(
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

  let stash: GoodreadsStashedPlan;
  try {
    stash = JSON.parse(bytes.toString('utf8')) as GoodreadsStashedPlan;
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
          ...GOODREADS_TIER_CUTOFFS,
          propKeys: stash.propKeys,
        },
        mapping,
        result,
      );
      if (!targetId) return;
      if (mapping.action === 'use-existing') {
        if (stash.propKeys.length > 0) ensurePropKeys(tx, targetId, stash.propKeys);
        ensureTierCutoffs(tx, targetId);
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

type Tx = Parameters<Parameters<DB['transaction']>[0]>[0];

function ensurePropKeys(tx: Tx, categoryId: string, incoming: PropKeyConfig[]): void {
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

function ensureTierCutoffs(tx: Tx, categoryId: string): void {
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
  const updates: Partial<typeof GOODREADS_TIER_CUTOFFS> = {};
  for (const [key, value] of Object.entries(GOODREADS_TIER_CUTOFFS) as [
    keyof typeof GOODREADS_TIER_CUTOFFS,
    number,
  ][]) {
    if (existing[key] == null) updates[key] = value;
  }
  if (Object.keys(updates).length === 0) return;
  tx.update(categoryTable).set(updates).where(eq(categoryTable.id, categoryId)).run();
}

// Goodreads exports ISBN cells as `="9781234567890"` so spreadsheet apps
// don't autoconvert them into numbers. Strip the wrapper to get the raw value
// (or empty string for `=""`).
export function unwrapIsbn(raw: string): string {
  const m = /^="(.*)"$/.exec(raw.trim());
  return m ? m[1]! : raw.trim();
}

function pubYearForRow(row: GoodreadsCsvRow, mode: string): string {
  if (mode === 'none') return '';
  if (mode === 'edition') return row['Year Published']!.trim();
  const original = row['Original Publication Year']!.trim();
  if (original) return original;
  // Original Publication Year is often blank for the user's own edition;
  // fall back to Year Published so the prop isn't dropped just because the
  // primary source is missing.
  return row['Year Published']!.trim();
}

function isRated(row: GoodreadsCsvRow): boolean {
  const v = row['My Rating'];
  if (v == null || v === '') return false;
  const n = Number(v);
  return !Number.isNaN(n) && n > 0;
}

function sortRows(rows: GoodreadsCsvRow[], sortBy: string): GoodreadsCsvRow[] {
  return rows.slice().sort((a, b) => {
    const ra = isRated(a) ? Number(a['My Rating']) : -Infinity;
    const rb = isRated(b) ? Number(b['My Rating']) : -Infinity;
    if (ra !== rb) return rb - ra;
    const tie = compareTie(a, b, sortBy);
    /* v8 ignore next 2 -- @preserve final Book Id tie-breaker only fires when
       two rows share both rating and the chosen secondary key, which for the
       default 'title' sort is impossible (titles differ). Covered indirectly
       by the dateAddedAsc test where two rows share Date Added. */
    if (tie !== 0) return tie;
    return a['Book Id']!.localeCompare(b['Book Id']!);
  });
}

function compareTie(a: GoodreadsCsvRow, b: GoodreadsCsvRow, sortBy: string): number {
  switch (sortBy) {
    case 'dateAddedDesc':
      return b['Date Added']!.localeCompare(a['Date Added']!);
    case 'dateAddedAsc':
      return a['Date Added']!.localeCompare(b['Date Added']!);
    case 'title':
    default:
      return a['Title']!.localeCompare(b['Title']!);
  }
}

// HSL palette mirrors the SVG used by `generate-image.ts` so import
// placeholders look at home next to seeded ones. The format is centralised
// in `gradient.ts`; we just supply three colour stops.
function gradientFromSeed(seed: string): string {
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
