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
  'objectname',
  'objectid',
  'rating',
  'numplays',
  'own',
  'fortrade',
  'want',
  'wanttobuy',
  'wanttoplay',
  'prevowned',
  'wishlist',
  'comment',
  'minplayers',
  'maxplayers',
  'yearpublished',
] as const;

// BGG ratings are 1–10 (decimals allowed, but typical exports are integers).
// Score = rating × 10. Cutoffs put 10→S, 9→A, 8→B, 7+6→C (a wider middle
// band), 5→D, 4→E, 0–3→F.
const BGG_TIER_CUTOFFS: TierCutoffs = {
  cutoffS: 91,
  cutoffA: 81,
  cutoffB: 71,
  cutoffC: 60,
  cutoffD: 50,
  cutoffE: 40,
  cutoffF: 0,
};

type BggCsvRow = Record<string, string>;

const BGG_OPTIONS: ImporterOption[] = [
  {
    id: 'collection',
    type: 'radio',
    label: 'Which entries to import',
    default: 'ownedOrPrev',
    choices: [
      { value: 'rated', label: 'Only rows with a rating' },
      { value: 'owned', label: 'Only owned games' },
      { value: 'ownedOrPrev', label: 'Owned or previously owned' },
      { value: 'wishlist', label: 'Wishlist / want-to-buy / want-to-play' },
      { value: 'all', label: 'Import every row' },
    ],
    footnote:
      'BGG exports your full collection in one CSV — owned games, expansions, wishlist, want-to-play, etc. Pick the slice you want to tier.',
  },
  {
    id: 'unratedRows',
    type: 'radio',
    label: 'Rows without a rating',
    help: 'BGG uses 0 to mean "unrated". Only matters when the collection filter above keeps unrated rows.',
    default: 'skip',
    choices: [
      { value: 'skip', label: 'Skip them' },
      { value: 'import', label: 'Import them with a score of 0' },
    ],
  },
  {
    id: 'importYear',
    type: 'checkbox',
    label: 'Year',
    help: 'Add the publication year as an item property.',
    default: true,
  },
  {
    id: 'importPlayers',
    type: 'checkbox',
    label: 'Players',
    help: 'Add the player count (e.g. "2-4") as an item property.',
    default: true,
  },
  {
    id: 'sortBy',
    type: 'radio',
    label: 'Order tie-breaker',
    help: '"Rating" is always the primary sort. The choice below decides the order among items that share the same rating; "objectid" is the final tie-breaker.',
    default: 'title',
    choices: [
      { value: 'title', label: 'Alphabetical by Title' },
      { value: 'yearDesc', label: 'By Year, newest first' },
      { value: 'yearAsc', label: 'By Year, oldest first' },
      { value: 'playsDesc', label: 'By Plays, most first' },
    ],
  },
  {
    id: 'placeholders',
    type: 'checkbox',
    label: 'Generate gradient placeholders',
    help: 'Each imported game gets a deterministic random gradient as its background, so the empty-image fallback looks varied instead of flat.',
    default: true,
  },
];

const SYNTHETIC_SLUG = 'board-games';
const SYNTHETIC_NAME = 'Board Games';

export const bggImporter: Importer = {
  id: 'bgg',
  label: 'BoardGameGeek',
  description: 'Import a board game collection exported from BoardGameGeek (CSV).',
  status: 'available',
  accept: 'text/csv,.csv',
  options: BGG_OPTIONS,
  plan: (file, options) => planBggImport(file, options),
  commit: (planId, mappings, strategy) => commitBggImport(planId, mappings, strategy),
};

export async function planBggImport(
  file: File,
  options: ImporterOptions,
  conn: DB = defaultDb,
): Promise<ImportPlan> {
  const parsed = await parseCsvWithHeaders<BggCsvRow>(
    file,
    REQUIRED_HEADERS,
    (missing) =>
      `Missing required BoardGameGeek columns: ${missing.join(', ')}. Re-export your collection from BoardGameGeek and try again.`,
  );
  if ('error' in parsed) return parsed.error;

  const collection = String(options.collection ?? 'rated');
  const unratedRows = String(options.unratedRows ?? 'skip');
  const importYear = options.importYear !== false;
  const importPlayers = options.importPlayers !== false;
  const placeholders = options.placeholders !== false;

  const filtered = parsed.rows.filter((row) => {
    if (!matchesCollection(row, collection)) return false;
    if (unratedRows === 'skip' && !isRated(row)) return false;
    return true;
  });

  const sorted = sortRows(filtered, String(options.sortBy ?? 'title'));

  // After header validation passes, papaparse (with `header: true`) guarantees
  // every required column is present on every row as a string — blank cells
  // come through as ''. The `!` assertions below lean on that contract.
  const usedSlugs = new Set<string>();
  const items: IncomingItem[] = sorted.map((row, index) => {
    const name = row['objectname']!.trim();
    const objectId = row['objectid']!;
    let slug = slugify(name) || `bgg-${objectId}`;
    if (usedSlugs.has(slug)) {
      slug = `${slug}-${objectId}`;
    }
    usedSlugs.add(slug);

    const score = isRated(row) ? Math.round(Number(row['rating']) * 10) : 0;
    const description = buildDescription(name, objectId, row['comment']!);
    const props = [];
    if (importYear && row['yearpublished']) {
      props.push({ key: 'Year', value: row['yearpublished']! });
    }
    if (importPlayers) {
      const players = formatPlayers(row['minplayers']!, row['maxplayers']!);
      if (players) props.push({ key: 'Players', value: players });
    }

    return {
      slug,
      name,
      description,
      score,
      order: index,
      placeholder: placeholders ? gradientFromSeed(objectId) : null,
      props,
    };
  });

  const propKeys: PropKeyConfig[] = [];
  if (importYear) propKeys.push({ key: 'Year', showOnCard: true });
  if (importPlayers) propKeys.push({ key: 'Players' });

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

export async function commitBggImport(
  planId: string,
  mappings: CategoryMapping[],
  strategy: MergeStrategy,
  conn: DB = defaultDb,
): Promise<ImportResult> {
  return runStashedCommit(planId, mappings, strategy, conn, BGG_TIER_CUTOFFS);
}

function matchesCollection(row: BggCsvRow, mode: string): boolean {
  switch (mode) {
    case 'owned':
      return row['own'] === '1';
    case 'ownedOrPrev':
      return row['own'] === '1' || row['prevowned'] === '1';
    case 'wishlist':
      return row['wishlist'] === '1' || row['wanttobuy'] === '1' || row['wanttoplay'] === '1';
    case 'all':
      return true;
    case 'rated':
    default:
      return isRated(row);
  }
}

function isRated(row: BggCsvRow): boolean {
  const v = row['rating'];
  if (v == null || v === '') return false;
  const n = Number(v);
  return !Number.isNaN(n) && n > 0;
}

export function formatPlayers(min: string, max: string): string {
  const lo = min.trim();
  const hi = max.trim();
  if (!lo && !hi) return '';
  if (!lo) return hi;
  if (!hi || lo === hi) return lo;
  return `${lo}-${hi}`;
}

export function buildDescription(name: string, objectId: string, comment: string): string {
  // `]` would terminate the markdown link text early; strip just to be safe.
  const safeName = name.replace(/]/g, '');
  const link = objectId
    ? `[BGG Link for '${safeName}'](https://boardgamegeek.com/boardgame/${objectId})`
    : '';
  const trimmedComment = comment.trim();
  if (trimmedComment && link) return `${trimmedComment}\n\n${link}`;
  if (trimmedComment) return trimmedComment;
  return link;
}

function sortRows(rows: BggCsvRow[], sortBy: string): BggCsvRow[] {
  return rows.slice().sort((a, b) => {
    const ra = isRated(a) ? Number(a['rating']) : -Infinity;
    const rb = isRated(b) ? Number(b['rating']) : -Infinity;
    if (ra !== rb) return rb - ra;
    const tie = compareTie(a, b, sortBy);
    /* v8 ignore next 2 -- @preserve final objectid tie-breaker only fires when
       two rows share both rating and the chosen secondary key. Covered
       indirectly by the playsDesc test where two rows share plays. */
    if (tie !== 0) return tie;
    return a['objectid']!.localeCompare(b['objectid']!);
  });
}

function compareTie(a: BggCsvRow, b: BggCsvRow, sortBy: string): number {
  switch (sortBy) {
    case 'yearDesc':
      return Number(b['yearpublished']) - Number(a['yearpublished']);
    case 'yearAsc':
      return Number(a['yearpublished']) - Number(b['yearpublished']);
    case 'playsDesc':
      return Number(b['numplays']) - Number(a['numplays']);
    case 'title':
    default:
      return a['objectname']!.localeCompare(b['objectname']!);
  }
}
