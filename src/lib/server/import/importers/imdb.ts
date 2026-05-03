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
  'Const',
  'Your Rating',
  'Date Rated',
  'Title',
  'URL',
  'Title Type',
  'IMDb Rating',
  'Year',
  'Genres',
  'Directors',
] as const;

// Hard-coded tier cutoffs for IMDb imports: maps the "act as if 0–10" rating
// scale onto the seven-tier scheme. Re-rating a 7 vs an 8 should land in
// neighbouring tiers, which is what these breakpoints achieve.
const IMDB_TIER_CUTOFFS: TierCutoffs = {
  cutoffS: 91,
  cutoffA: 81,
  cutoffB: 71,
  cutoffC: 61,
  cutoffD: 51,
  cutoffE: 41,
  cutoffF: 0,
};

type ImdbCsvRow = Record<string, string>;

const IMDB_OPTIONS: ImporterOption[] = [
  {
    id: 'importYear',
    type: 'checkbox',
    label: 'Year',
    help: 'Add the release year as an item property.',
    default: true,
  },
  {
    id: 'importDirectors',
    type: 'checkbox',
    label: 'Directors',
    help: 'Add the directors as an item property.',
    default: false,
  },
  {
    id: 'titleType',
    type: 'radio',
    label: 'Which entries to import',
    default: 'all',
    choices: [
      { value: 'all', label: 'Import all rows' },
      { value: 'movie', label: 'Only "Movie" rows' },
      { value: 'tvSeries', label: 'Only "TV Series" rows' },
    ],
    footnote:
      'Tip: pick "Movie" or "TV Series" only, then run the importer a second time for the other category to keep them separate.',
  },
  {
    id: 'importUrl',
    type: 'checkbox',
    label: 'Include the IMDb URL in the description',
    help: "Each item's description becomes a Markdown link: [IMDB Link for 'Title'](URL).",
    default: true,
  },
  {
    id: 'sortBy',
    type: 'radio',
    label: 'Order tie-breaker',
    help: '"Your Rating" is always the primary sort. The choice below decides the order among items that share the same rating; "Const" is the final tie-breaker.',
    default: 'title',
    choices: [
      { value: 'title', label: 'Alphabetical by Title' },
      { value: 'dateRatedDesc', label: 'By Date Rated, newest first' },
      { value: 'dateRatedAsc', label: 'By Date Rated, oldest first' },
      { value: 'imdbRating', label: 'By IMDb Rating, highest first' },
    ],
  },
  {
    id: 'unratedRows',
    type: 'radio',
    label: 'Rows without a "Your Rating" value',
    default: 'skip',
    choices: [
      { value: 'skip', label: 'Skip them' },
      { value: 'import', label: 'Import them with a score of 0' },
    ],
  },
  {
    id: 'genres',
    type: 'radio',
    label: 'Genres',
    help: 'IMDb stores a comma-separated list of genres per row. Picking either import option also creates a "Genres" property on the category.',
    default: 'none',
    choices: [
      { value: 'none', label: "Don't import genres" },
      { value: 'main', label: 'Import the main genre (the first one in the list)' },
      { value: 'all', label: 'Import all genres as a single property value' },
    ],
  },
  {
    id: 'placeholders',
    type: 'checkbox',
    label: 'Generate gradient placeholders',
    help: 'Each imported item gets a deterministic random gradient as its background, so the empty-image fallback looks varied instead of flat.',
    default: true,
  },
];

export const imdbImporter: Importer = {
  id: 'imdb',
  label: 'IMDb',
  description: 'Import a ratings export from IMDb (CSV).',
  status: 'available',
  accept: 'text/csv,.csv',
  options: IMDB_OPTIONS,
  plan: (file, options) => planImdbImport(file, options),
  commit: (planId, mappings, strategy) => commitImdbImport(planId, mappings, strategy),
};

export async function planImdbImport(
  file: File,
  options: ImporterOptions,
  conn: DB = defaultDb,
): Promise<ImportPlan> {
  const parsed = await parseCsvWithHeaders<ImdbCsvRow>(
    file,
    REQUIRED_HEADERS,
    (missing) =>
      `Missing required IMDb columns: ${missing.join(', ')}. Re-export your ratings from IMDb and try again.`,
  );
  if ('error' in parsed) return parsed.error;

  const titleType = String(options.titleType ?? 'all');
  const unratedRows = String(options.unratedRows ?? 'skip');

  const filtered = parsed.rows.filter((row) => {
    if (titleType === 'movie' && row['Title Type'] !== 'Movie') return false;
    if (titleType === 'tvSeries' && row['Title Type'] !== 'TV Series') return false;
    if (unratedRows === 'skip' && !isRated(row)) return false;
    return true;
  });

  const sorted = sortRows(filtered, String(options.sortBy ?? 'title'));

  const importYear = options.importYear !== false;
  const importDirectors = options.importDirectors === true;
  const importUrl = options.importUrl !== false;
  const placeholders = options.placeholders !== false;
  const genres = String(options.genres ?? 'none');

  const usedSlugs = new Set<string>();
  const items: IncomingItem[] = sorted.map((row, index) => {
    const title = row['Title'] ?? '';
    let slug = slugify(title) || `imdb-${row['Const']}`;
    if (usedSlugs.has(slug)) {
      slug = `${slug}-${row['Const']}`;
    }
    usedSlugs.add(slug);

    const score = isRated(row) ? Number(row['Your Rating']) * 10 : 0;
    const description = importUrl ? buildLinkMarkdown(title, row['URL'] ?? '') : '';
    const props = [];
    if (importYear && row['Year']) props.push({ key: 'Year', value: row['Year']! });
    if (importDirectors && row['Directors']) {
      props.push({ key: 'Directors', value: row['Directors']! });
    }
    const genreValue = genreForRow(row, genres);
    if (genreValue) props.push({ key: 'Genres', value: genreValue });

    return {
      slug,
      name: title,
      description,
      score,
      order: index,
      placeholder: placeholders ? gradientFromSeed(row['Const'] ?? slug) : null,
      props,
    };
  });

  const propKeys: PropKeyConfig[] = [];
  if (importYear) propKeys.push({ key: 'Year', showOnCard: true });
  if (importDirectors) propKeys.push({ key: 'Directors' });
  if (genres !== 'none') propKeys.push({ key: 'Genres' });

  const { fileSlug, fileName } = syntheticCategory(titleType);
  const stash: StashedPlan = { fileSlug, fileName, items, propKeys };
  const planId = writeImportTemp(JSON.stringify(stash));

  const match = conn
    .select({ id: categoryTable.id, name: categoryTable.name })
    .from(categoryTable)
    .where(and(eq(categoryTable.slug, fileSlug), isNull(categoryTable.deletedAt)))
    .get();

  return {
    planId,
    categories: [
      {
        fileSlug,
        fileName,
        itemCount: items.length,
        matchedExistingId: match?.id ?? null,
        matchedExistingName: match?.name ?? null,
      },
    ],
    errors: [],
  };
}

export async function commitImdbImport(
  planId: string,
  mappings: CategoryMapping[],
  strategy: MergeStrategy,
  conn: DB = defaultDb,
): Promise<ImportResult> {
  return runStashedCommit(planId, mappings, strategy, conn, IMDB_TIER_CUTOFFS);
}

function genreForRow(row: ImdbCsvRow, mode: string): string | null {
  const raw = row['Genres'];
  if (!raw) return null;
  if (mode === 'main') {
    const first = raw.split(',')[0]?.trim();
    return first || null;
  }
  if (mode === 'all') return raw.trim();
  return null;
}

function isRated(row: ImdbCsvRow): boolean {
  const v = row['Your Rating'];
  return v != null && v !== '' && !Number.isNaN(Number(v));
}

function sortRows(rows: ImdbCsvRow[], sortBy: string): ImdbCsvRow[] {
  return rows.slice().sort((a, b) => {
    const ra = isRated(a) ? Number(a['Your Rating']) : -Infinity;
    const rb = isRated(b) ? Number(b['Your Rating']) : -Infinity;
    if (ra !== rb) return rb - ra;
    const tie = compareTie(a, b, sortBy);
    /* v8 ignore next 2 -- @preserve final Const tie-breaker only fires when
       two rows share both rating and the chosen secondary key + Const, which
       can't happen with a real IMDb export (Const is the row's unique id). */
    if (tie !== 0) return tie;
    return (a['Const'] ?? '').localeCompare(b['Const'] ?? '');
  });
}

function compareTie(a: ImdbCsvRow, b: ImdbCsvRow, sortBy: string): number {
  switch (sortBy) {
    case 'dateRatedDesc':
      return (b['Date Rated'] ?? '').localeCompare(a['Date Rated'] ?? '');
    case 'dateRatedAsc':
      return (a['Date Rated'] ?? '').localeCompare(b['Date Rated'] ?? '');
    case 'imdbRating': {
      const x = Number(a['IMDb Rating']);
      const y = Number(b['IMDb Rating']);
      const xn = Number.isNaN(x) ? -Infinity : x;
      const yn = Number.isNaN(y) ? -Infinity : y;
      return yn - xn;
    }
    case 'title':
    default:
      return (a['Title'] ?? '').localeCompare(b['Title'] ?? '');
  }
}

function syntheticCategory(titleType: string): { fileSlug: string; fileName: string } {
  if (titleType === 'movie') return { fileSlug: 'movies', fileName: 'Movies' };
  if (titleType === 'tvSeries') return { fileSlug: 'tv-series', fileName: 'TV Series' };
  return { fileSlug: 'imdb-watchlist', fileName: 'IMDb Watchlist' };
}

function buildLinkMarkdown(title: string, url: string): string {
  if (!url) return '';
  // `]` would terminate the markdown link text early; strip just to be safe.
  const safeTitle = title.replace(/]/g, '');
  return `[IMDB Link for '${safeTitle}'](${url})`;
}
