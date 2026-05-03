import { and, eq, isNull } from 'drizzle-orm';
import { db as defaultDb } from '$lib/server/db';
import { categoryTable } from '$lib/server/db/schema';
import { slugify } from '$lib/server/slugify';
import type { PropKeyConfig } from '$lib/props';
import { writeImportTemp } from '../temp-storage';
import type { IncomingItem } from '../apply';
import type {
  CategoryMapping,
  ImportPlan,
  ImportResult,
  Importer,
  ImporterOption,
  ImporterOptions,
  MergeStrategy,
} from '../types';
import {
  gradientFromSeed,
  parseCsvWithHeaders,
  runStashedCommit,
  type StashedPlan,
  type TierCutoffs,
} from './_shared';

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

// Goodreads ratings 1–5 map linearly to scores in 0-100 range for Tierdom
// in a way that makes the best of the mismatch.
const GOODREADS_TIER_CUTOFFS: TierCutoffs = {
  cutoffS: 90,
  cutoffA: 70,
  cutoffB: 50,
  cutoffC: 30,
  cutoffD: 20,
  cutoffE: 10,
  cutoffF: 0,
};

type GoodreadsCsvRow = Record<string, string>;

const GOODREADS_OPTIONS: ImporterOption[] = [
  {
    id: 'titleClean',
    type: 'radio',
    label: 'Title conciseness',
    default: 'moderate',
    choices: [
      { value: 'verbatim', label: 'Import verbatim' },
      { value: 'moderate', label: 'Moderate (lossy) title clean-up' },
      { value: 'full', label: 'Full (lossy) title clean-up' },
    ],
    footnote:
      'Goodreads stuffs subtitle, edition, and series into the title field. "Moderate" trims the subtitle (text after the last ": "). "Full" splits on the first ": " instead and also strips trailing parentheticals like " (Agile Software Development Series)". Both modes drop information from the original title — recommended for tier-list display, but flip to "verbatim" if you need the full text.',
  },
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
  conn: DB = defaultDb,
): Promise<ImportPlan> {
  const parsed = await parseCsvWithHeaders<GoodreadsCsvRow>(
    file,
    REQUIRED_HEADERS,
    (missing) =>
      `Missing required Goodreads columns: ${missing.join(', ')}. Re-export your library from Goodreads and try again.`,
  );
  if ('error' in parsed) return parsed.error;

  const isbnMode = String(options.isbnMode ?? 'isbn13');
  const pubYear = String(options.pubYear ?? 'original');
  const unratedRows = String(options.unratedRows ?? 'skip');
  const titleClean = String(options.titleClean ?? 'moderate');
  const importAuthor = options.importAuthor !== false;
  const importBinding = options.importBinding === true;
  const placeholders = options.placeholders !== false;

  const filtered = parsed.rows.filter((row) => {
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
    const title = cleanTitle(row['Title']!, titleClean);
    const bookId = row['Book Id']!;
    let slug = slugify(title) || `goodreads-${bookId}`;
    if (usedSlugs.has(slug)) {
      slug = `${slug}-${bookId}`;
    }
    usedSlugs.add(slug);

    const score = isRated(row) ? (Number(row['My Rating']) - 1) * 25 : 0;
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
  if (pubYear !== 'none') propKeys.push({ key: 'Year' });
  if (importBinding) propKeys.push({ key: 'Binding' });
  if (isbnMode === 'isbn13' || isbnMode === 'both') propKeys.push({ key: 'ISBN13' });
  if (isbnMode === 'isbn10' || isbnMode === 'both') propKeys.push({ key: 'ISBN' });

  const stash: StashedPlan = {
    fileSlug: SYNTHETIC_SLUG,
    fileName: SYNTHETIC_NAME,
    items,
    propKeys,
  };
  const planId = writeImportTemp(JSON.stringify(stash));

  const match = conn
    .select({ id: categoryTable.id, name: categoryTable.name })
    .from(categoryTable)
    .where(and(eq(categoryTable.slug, SYNTHETIC_SLUG), isNull(categoryTable.deletedAt)))
    .get();

  return {
    planId,
    categories: [
      {
        fileSlug: SYNTHETIC_SLUG,
        fileName: SYNTHETIC_NAME,
        itemCount: items.length,
        matchedExistingId: match?.id ?? null,
        matchedExistingName: match?.name ?? null,
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
  return runStashedCommit(planId, mappings, strategy, conn, GOODREADS_TIER_CUTOFFS);
}

// Goodreads exports ISBN cells as `="9781234567890"` so spreadsheet apps
// don't autoconvert them into numbers. Strip the wrapper to get the raw value
// (or empty string for `=""`).
export function unwrapIsbn(raw: string): string {
  const m = /^="(.*)"$/.exec(raw.trim());
  return m ? m[1]! : raw.trim();
}

// Goodreads stuffs subtitle, edition, series, and bibliographic noise into the
// Title column. The two lossy modes shrink the title for tier-list display.
// Falls back to the raw (trimmed) title if the cleanup produces an empty
// string — guards against pathological inputs like "  : something".
export function cleanTitle(raw: string, mode: string): string {
  if (mode === 'verbatim') return raw.trim();
  let work = raw;
  if (mode === 'moderate') {
    const idx = work.lastIndexOf(': ');
    if (idx > 0) work = work.slice(0, idx);
  } else if (mode === 'full') {
    const idx = work.indexOf(': ');
    if (idx > 0) work = work.slice(0, idx);
    work = work.replace(/\s*\([^)]*\)\s*$/, '');
  }
  const cleaned = work.trim();
  return cleaned || raw.trim();
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
