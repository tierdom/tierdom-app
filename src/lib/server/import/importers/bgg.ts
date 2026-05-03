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
// Treat them like IMDb: rating × 10. Cutoffs mirror IMDb so adjacent integer
// ratings land in neighbouring tiers.
const BGG_TIER_CUTOFFS: {
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

type BggCsvRow = Record<string, string>;

const BGG_OPTIONS: ImporterOption[] = [
  {
    id: 'collection',
    type: 'radio',
    label: 'Which entries to import',
    default: 'rated',
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

interface BggStashedPlan {
  fileSlug: string;
  fileName: string;
  items: IncomingItem[];
  propKeys: PropKeyConfig[];
}

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
  sweepImportTemp();
  if (file.size > MAX_IMPORT_BYTES) {
    return emptyPlan('', [`File is ${file.size} bytes; maximum is ${MAX_IMPORT_BYTES}.`]);
  }

  const text = await file.text();
  const parsed = Papa.parse<BggCsvRow>(text, {
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
      `Missing required BoardGameGeek columns: ${missing.join(', ')}. Re-export your collection from BoardGameGeek and try again.`,
    ]);
  }

  const collection = String(options.collection ?? 'rated');
  const unratedRows = String(options.unratedRows ?? 'skip');
  const importYear = options.importYear !== false;
  const importPlayers = options.importPlayers !== false;
  const placeholders = options.placeholders !== false;

  const filtered = parsed.data.filter((row) => {
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
  if (importPlayers) propKeys.push({ key: 'Players', showOnCard: true });

  const stash: BggStashedPlan = {
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
  let bytes: Buffer;
  try {
    bytes = readImportTemp(planId);
  } catch (e) {
    return { ...emptyResult(), errors: [e instanceof Error ? e.message : String(e)] };
  }

  let stash: BggStashedPlan;
  try {
    stash = JSON.parse(bytes.toString('utf8')) as BggStashedPlan;
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
          ...BGG_TIER_CUTOFFS,
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
  const updates: Partial<typeof BGG_TIER_CUTOFFS> = {};
  for (const [key, value] of Object.entries(BGG_TIER_CUTOFFS) as [
    keyof typeof BGG_TIER_CUTOFFS,
    number,
  ][]) {
    if (existing[key] == null) updates[key] = value;
  }
  if (Object.keys(updates).length === 0) return;
  tx.update(categoryTable).set(updates).where(eq(categoryTable.id, categoryId)).run();
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
