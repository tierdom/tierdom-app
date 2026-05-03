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
  'Title',
  'Authors',
  'ISBN/UID',
  'Format',
  'Read Status',
  'Date Added',
  'Star Rating',
] as const;

// StoryGraph ratings 1–5 (with 0.25 increments) map linearly to scores in the
// 0–100 range. Same cutoff shape as the Goodreads importer — both are book
// importers with a 1–5 scale.
const STORYGRAPH_TIER_CUTOFFS: TierCutoffs = {
  cutoffS: 90,
  cutoffA: 70,
  cutoffB: 50,
  cutoffC: 30,
  cutoffD: 20,
  cutoffE: 10,
  cutoffF: 0,
};

type StorygraphCsvRow = Record<string, string>;

const STORYGRAPH_OPTIONS: ImporterOption[] = [
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
      'StoryGraph stuffs subtitle, edition, and series into the title field. "Moderate" trims the subtitle (text after the last ": "). "Full" splits on the first ": " instead and also strips trailing parentheticals like " (Discworld, #5)". Both modes drop information from the original title — recommended for tier-list display, but flip to "verbatim" if you need the full text.',
  },
  {
    id: 'isbnKey',
    type: 'radio',
    label: 'ISBN/UID handling',
    help: 'StoryGraph stores either an ISBN (10 or 13 digits) or a platform UID (e.g. an Amazon ASIN) in the same column.',
    default: 'isbn',
    choices: [
      { value: 'isbn', label: 'Only import as ISBN when the value looks like an ISBN' },
      { value: 'uid', label: 'Always import under a "UID" property' },
      { value: 'skip', label: 'Skip the column entirely' },
    ],
  },
  {
    id: 'importAuthor',
    type: 'checkbox',
    label: 'Author',
    help: 'Add the primary author (first entry in the comma-separated Authors column) as an item property.',
    default: true,
  },
  {
    id: 'importFormat',
    type: 'checkbox',
    label: 'Format',
    help: 'Add the format (e.g. paperback, hardcover, digital, audio) as an item property.',
    default: false,
  },
  {
    id: 'readStatusFilter',
    type: 'radio',
    label: 'Which rows to import',
    help: 'StoryGraph tracks "to-read" and "currently-reading" entries that usually have no rating. Use this to trim them out.',
    default: 'all',
    choices: [
      { value: 'all', label: 'All rows' },
      { value: 'read', label: 'Only "read"' },
      { value: 'readAndDnf', label: '"read" and "did-not-finish"' },
    ],
  },
  {
    id: 'unratedRows',
    type: 'radio',
    label: 'Rows without a "Star Rating" value',
    default: 'skip',
    choices: [
      { value: 'skip', label: 'Skip them' },
      { value: 'import', label: 'Import them with a score of 0' },
    ],
  },
  {
    id: 'sortBy',
    type: 'radio',
    label: 'Order tie-breaker',
    help: '"Star Rating" is always the primary sort. The choice below decides the order among items that share the same rating; "ISBN/UID" is the final tie-breaker.',
    default: 'title',
    choices: [
      { value: 'title', label: 'Alphabetical by Title' },
      { value: 'dateAddedDesc', label: 'By Date Added, newest first' },
      { value: 'dateAddedAsc', label: 'By Date Added, oldest first' },
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

export const storygraphImporter: Importer = {
  id: 'storygraph',
  label: 'StoryGraph',
  description: 'Import a books library exported from The StoryGraph (CSV).',
  status: 'available',
  accept: 'text/csv,.csv',
  options: STORYGRAPH_OPTIONS,
  plan: (file, options) => planStorygraphImport(file, options),
  commit: (planId, mappings, strategy) => commitStorygraphImport(planId, mappings, strategy),
};

export async function planStorygraphImport(
  file: File,
  options: ImporterOptions,
  conn: DB = defaultDb,
): Promise<ImportPlan> {
  const parsed = await parseCsvWithHeaders<StorygraphCsvRow>(
    file,
    REQUIRED_HEADERS,
    (missing) =>
      `Missing required StoryGraph columns: ${missing.join(', ')}. Re-export your library from StoryGraph and try again.`,
  );
  if ('error' in parsed) return parsed.error;

  const titleClean = String(options.titleClean ?? 'moderate');
  const isbnKey = String(options.isbnKey ?? 'isbn');
  const readStatusFilter = String(options.readStatusFilter ?? 'all');
  const unratedRows = String(options.unratedRows ?? 'skip');
  const importAuthor = options.importAuthor !== false;
  const importFormat = options.importFormat === true;
  const placeholders = options.placeholders !== false;

  const filtered = parsed.rows.filter((row) => {
    if (!matchesReadStatus(row, readStatusFilter)) return false;
    if (unratedRows === 'skip' && !isRated(row)) return false;
    return true;
  });

  const sorted = sortRows(filtered, String(options.sortBy ?? 'title'));

  // After header validation passes, papaparse (with `header: true`) guarantees
  // every required column is present on every row as a string — blank cells
  // come through as ''. The `!` assertions below lean on that contract.
  const usedSlugs = new Set<string>();
  const items: IncomingItem[] = sorted.map((row, index) => {
    const title = cleanTitle(row['Title']!, titleClean);
    const id = row['ISBN/UID']!.trim();
    let slug = slugify(title) || `storygraph-${id || String(index)}`;
    if (usedSlugs.has(slug)) {
      slug = `${slug}-${id || String(index)}`;
    }
    usedSlugs.add(slug);

    const score = isRated(row) ? Number(row['Star Rating']) * 20 : 0;
    const props = [];
    if (importAuthor) {
      const author = primaryAuthor(row['Authors']!);
      if (author) props.push({ key: 'Author', value: author });
    }
    if (importFormat && row['Format']) {
      props.push({ key: 'Format', value: row['Format']! });
    }
    const isbnProp = isbnPropFor(id, isbnKey);
    if (isbnProp) props.push(isbnProp);

    return {
      slug,
      name: title,
      description: '',
      score,
      order: index,
      placeholder: placeholders ? gradientFromSeed(id || slug) : null,
      props,
    };
  });

  const propKeys: PropKeyConfig[] = [];
  if (importAuthor) propKeys.push({ key: 'Author', showOnCard: true });
  if (importFormat) propKeys.push({ key: 'Format' });
  const isbnKeyName = isbnPropKeyName(isbnKey);
  if (isbnKeyName) propKeys.push({ key: isbnKeyName });

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

export async function commitStorygraphImport(
  planId: string,
  mappings: CategoryMapping[],
  strategy: MergeStrategy,
  conn: DB = defaultDb,
): Promise<ImportResult> {
  return runStashedCommit(planId, mappings, strategy, conn, STORYGRAPH_TIER_CUTOFFS);
}

// StoryGraph stuffs subtitle, edition, and series into the Title column, just
// like Goodreads. Same two lossy modes, with a fallback to the trimmed raw
// title if the cleanup produces an empty string.
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

export function primaryAuthor(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const first = trimmed.split(',')[0]!.trim();
  return first;
}

// Returns the prop key name the importer will emit (or null) for `propKeys`
// declarations on the category. Keep in sync with `isbnPropFor`.
export function isbnPropKeyName(mode: string): string | null {
  if (mode === 'skip') return null;
  if (mode === 'uid') return 'UID';
  // 'isbn' — we won't know per-row whether ISBN13 or ISBN10 ahead of time, but
  // surfacing both potential columns is fine; rows just won't populate the one
  // they don't match.
  return null;
}

function isbnPropFor(value: string, mode: string): { key: string; value: string } | null {
  if (mode === 'skip' || !value) return null;
  if (mode === 'uid') return { key: 'UID', value };
  // 'isbn' mode — only emit when value looks like an ISBN.
  const digits = value.replace(/-/g, '');
  if (/^\d{13}$/.test(digits)) return { key: 'ISBN13', value: digits };
  if (/^\d{10}$/.test(digits)) return { key: 'ISBN', value: digits };
  return null;
}

function isRated(row: StorygraphCsvRow): boolean {
  const v = row['Star Rating'];
  if (v == null || v === '') return false;
  const n = Number(v);
  return !Number.isNaN(n) && n > 0;
}

function matchesReadStatus(row: StorygraphCsvRow, filter: string): boolean {
  if (filter === 'all') return true;
  const status = (row['Read Status'] ?? '').trim().toLowerCase();
  if (filter === 'read') return status === 'read';
  if (filter === 'readAndDnf') return status === 'read' || status === 'did-not-finish';
  /* v8 ignore next -- @preserve defensive: filter is constrained by the radio
     option choices in `STORYGRAPH_OPTIONS`. */
  return true;
}

function sortRows(rows: StorygraphCsvRow[], sortBy: string): StorygraphCsvRow[] {
  return rows.slice().sort((a, b) => {
    const ra = isRated(a) ? Number(a['Star Rating']) : -Infinity;
    const rb = isRated(b) ? Number(b['Star Rating']) : -Infinity;
    if (ra !== rb) return rb - ra;
    const tie = compareTie(a, b, sortBy);
    if (tie !== 0) return tie;
    return a['ISBN/UID']!.localeCompare(b['ISBN/UID']!);
  });
}

function compareTie(a: StorygraphCsvRow, b: StorygraphCsvRow, sortBy: string): number {
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
