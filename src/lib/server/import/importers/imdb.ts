import Papa from 'papaparse';
import { and, eq, isNull } from 'drizzle-orm';
import { db as defaultDb } from '$lib/server/db';
import { categoryTable } from '$lib/server/db/schema';
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
import { MAX_JSON_BYTES } from '../validate';
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
const IMDB_TIER_CUTOFFS: {
  cutoffS: number;
  cutoffA: number;
  cutoffB: number;
  cutoffC: number;
  cutoffD: number;
  cutoffE: number;
  cutoffF: number;
} = {
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

interface ImdbStashedPlan {
  fileSlug: string;
  fileName: string;
  items: IncomingItem[];
  propKeys: PropKeyConfig[];
}

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

export async function planImdbImport(file: File, options: ImporterOptions): Promise<ImportPlan> {
  sweepImportTemp();
  if (file.size > MAX_JSON_BYTES) {
    return emptyPlan('', [`File is ${file.size} bytes; maximum is ${MAX_JSON_BYTES}.`]);
  }

  const text = await file.text();
  const parsed = Papa.parse<ImdbCsvRow>(text, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0) {
    return emptyPlan(
      '',
      parsed.errors.slice(0, 5).map((e) => `CSV parse error: ${e.message}`),
    );
  }
  const headers = parsed.meta.fields ?? [];
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return emptyPlan('', [
      `Missing required IMDb columns: ${missing.join(', ')}. Re-export your ratings from IMDb and try again.`,
    ]);
  }

  const titleType = String(options.titleType ?? 'all');
  const unratedRows = String(options.unratedRows ?? 'skip');

  const filtered = parsed.data.filter((row) => {
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
  const stash: ImdbStashedPlan = { fileSlug, fileName, items, propKeys };
  const planId = writeImportTemp(JSON.stringify(stash));

  return {
    planId,
    categories: [
      {
        fileSlug,
        fileName,
        itemCount: items.length,
        matchedExistingId: null,
        matchedExistingName: null,
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
  let bytes: Buffer;
  try {
    bytes = readImportTemp(planId);
  } catch (e) {
    return { ...emptyResult(), errors: [e instanceof Error ? e.message : String(e)] };
  }

  let stash: ImdbStashedPlan;
  try {
    stash = JSON.parse(bytes.toString('utf8')) as ImdbStashedPlan;
  } catch (e) {
    return {
      ...emptyResult(),
      errors: [`Invalid stored plan: ${e instanceof Error ? e.message : String(e)}`],
    };
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
          ...IMDB_TIER_CUTOFFS,
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
  } catch (e) {
    return {
      ...emptyResult(),
      errors: [`Database error: ${e instanceof Error ? e.message : String(e)}`],
    };
  }

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
  // Only fill in cutoffs that are currently NULL — never override an explicit
  // value the user set on the existing category.
  const updates: Partial<typeof IMDB_TIER_CUTOFFS> = {};
  for (const [key, value] of Object.entries(IMDB_TIER_CUTOFFS) as [
    keyof typeof IMDB_TIER_CUTOFFS,
    number,
  ][]) {
    if (existing[key] == null) updates[key] = value;
  }
  if (Object.keys(updates).length === 0) return;
  tx.update(categoryTable).set(updates).where(eq(categoryTable.id, categoryId)).run();
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

function gradientFromSeed(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  const hue1 = Math.abs(h) % 360;
  const hue2 = (hue1 + 30) % 360;
  const hue3 = (hue1 + 60) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 45%, 25%), hsl(${hue2}, 40%, 18%), hsl(${hue3}, 35%, 12%))`;
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
