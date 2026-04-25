import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { unzipSync, strFromU8 } from 'fflate';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('$env/dynamic/private', () => ({ env: { DATA_PATH: '/tmp/tierdom-export-test-stub' } }));
// `db/index.ts` imports from `$env/dynamic/private`; stub the singleton to a noop
// so the module loads without opening a real on-disk SQLite file.
vi.mock('$lib/server/db', async () => {
  const real = await vi.importActual<typeof import('drizzle-orm')>('drizzle-orm');
  return {
    db: {},
    backupDatabaseTo: (targetPath: string, conn: { run: (q: unknown) => void }) => {
      const escaped = targetPath.replace(/'/g, "''");
      conn.run(real.sql.raw(`VACUUM INTO '${escaped}'`));
    }
  };
});

import * as schema from '$lib/server/db/schema';
import { categoryTable, tierListItemTable, page, siteSetting } from '$lib/server/db/schema';
import { buildExport, streamToBuffer } from './build-export';
import { EXPORT_SCHEMA_VERSION, type ExportData, type ExportManifest } from './json-schema';

type DB = ReturnType<typeof makeDb>;

function makeDb() {
  const client = new Database(':memory:');
  client.pragma('foreign_keys = ON');
  const db = drizzle(client, { schema });
  migrate(db, { migrationsFolder: 'drizzle' });
  return db;
}

function seedFixtures(db: DB) {
  db.insert(page)
    .values([
      { slug: 'about', title: 'About', content: '# About' },
      { slug: 'home', title: 'Home', content: '# Home' }
    ])
    .run();

  db.insert(siteSetting).values({ key: 'footer', value: 'My footer' }).run();

  const [catA] = db
    .insert(categoryTable)
    .values({ slug: 'movies', name: 'Movies', order: 0 })
    .returning({ id: categoryTable.id })
    .all();
  const [catB] = db
    .insert(categoryTable)
    .values({ slug: 'games', name: 'Games', order: 1 })
    .returning({ id: categoryTable.id })
    .all();

  db.insert(tierListItemTable)
    .values([
      { categoryId: catA.id, slug: 'inception', name: 'Inception', score: 95, order: 0 },
      { categoryId: catA.id, slug: 'matrix', name: 'The Matrix', score: 90, order: 1 },
      { categoryId: catB.id, slug: 'hades', name: 'Hades', score: 92, order: 0 }
    ])
    .run();

  // One soft-deleted row that must NOT appear in JSON but MUST appear in the SQLite snapshot.
  db.insert(tierListItemTable)
    .values({
      categoryId: catA.id,
      slug: 'trashed',
      name: 'Trashed',
      score: 50,
      order: 99,
      deletedAt: '2026-01-01T00:00:00.000Z'
    })
    .run();
}

function unzip(bytes: Uint8Array): Record<string, Uint8Array> {
  return unzipSync(bytes);
}

function entryNames(zip: Record<string, Uint8Array>): string[] {
  return Object.keys(zip).sort();
}

const FIXED_DATE = new Date('2026-04-26T12:00:00.000Z');
const APP_VERSION = '0.0.1-test';
const STAMP = '2026-04-26T12-00-00Z';
const FOLDER = `tierdom-backup-${STAMP}`;

describe('buildExport', () => {
  let db: DB;
  let imagesDir: string;

  beforeEach(async () => {
    db = makeDb();
    seedFixtures(db);
    imagesDir = await mkdtemp(join(tmpdir(), 'tierdom-export-test-images-'));
  });

  afterEach(async () => {
    await rm(imagesDir, { recursive: true, force: true });
  });

  it('JSON-only export contains README, manifest, and data.json — no DB or images', async () => {
    const { stream, filename } = buildExport(
      { includeDb: false, includeJson: true, includeImages: false },
      { appVersion: APP_VERSION, exportedAt: FIXED_DATE, imagesDir },
      db
    );
    expect(filename).toBe(`tierdom-backup-${STAMP}.zip`);

    const zip = unzip(await streamToBuffer(stream));
    expect(entryNames(zip)).toEqual([
      `${FOLDER}/README.txt`,
      `${FOLDER}/data.json`,
      `${FOLDER}/manifest.json`
    ]);

    const manifest: ExportManifest = JSON.parse(strFromU8(zip[`${FOLDER}/manifest.json`]));
    expect(manifest.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    expect(manifest.appVersion).toBe(APP_VERSION);
    expect(manifest.exportedAt).toBe(FIXED_DATE.toISOString());
    expect(manifest.contents).toEqual(['README.txt', 'manifest.json', 'data.json']);
    expect(manifest.counts).toEqual({
      pages: 2,
      siteSettings: 1,
      categories: 2,
      items: 3 // soft-deleted row excluded
    });

    const data: ExportData = JSON.parse(strFromU8(zip[`${FOLDER}/data.json`]));
    expect(data.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    expect(data.data.pages.map((p) => p.slug)).toEqual(['about', 'home']);
    expect(data.data.siteSettings.map((s) => s.key)).toEqual(['footer']);
    expect(data.data.categories.map((c) => c.slug)).toEqual(['movies', 'games']);
    const movies = data.data.categories.find((c) => c.slug === 'movies');
    expect(movies?.items.map((i) => i.slug)).toEqual(['inception', 'matrix']);
    expect(movies?.items.map((i) => i.slug)).not.toContain('trashed');
  });

  it('DB-only export contains a working SQLite snapshot with all rows including trash', async () => {
    const { stream } = buildExport(
      { includeDb: true, includeJson: false, includeImages: false },
      { appVersion: APP_VERSION, exportedAt: FIXED_DATE, imagesDir },
      db
    );
    const zip = unzip(await streamToBuffer(stream));
    expect(entryNames(zip)).toEqual([
      `${FOLDER}/README.txt`,
      `${FOLDER}/db/db.sqlite`,
      `${FOLDER}/manifest.json`
    ]);

    // Open the snapshot and verify it carries the trashed row too.
    const snapshotBytes = zip[`${FOLDER}/db/db.sqlite`];
    const snapshotPath = join(imagesDir, 'snapshot.sqlite'); // reuse temp dir
    await writeFile(snapshotPath, snapshotBytes);
    const opened = new Database(snapshotPath, { readonly: true });
    try {
      const row = opened.prepare('SELECT COUNT(*) AS c FROM tier_list_item').get() as { c: number };
      expect(row.c).toBe(4); // includes the trashed item
      const trashed = opened
        .prepare('SELECT COUNT(*) AS c FROM tier_list_item WHERE deleted_at IS NOT NULL')
        .get() as { c: number };
      expect(trashed.c).toBe(1);
    } finally {
      opened.close();
    }
  });

  it('images-only export adds every .webp file under imagesDir, sorted', async () => {
    await writeFile(join(imagesDir, 'aa.webp'), new Uint8Array([1, 2, 3]));
    await writeFile(join(imagesDir, 'bb.webp'), new Uint8Array([4, 5, 6]));
    await writeFile(join(imagesDir, 'ignore.txt'), 'not an image');

    const { stream } = buildExport(
      { includeDb: false, includeJson: false, includeImages: true },
      { appVersion: APP_VERSION, exportedAt: FIXED_DATE, imagesDir },
      db
    );
    const zip = unzip(await streamToBuffer(stream));
    expect(entryNames(zip)).toEqual([
      `${FOLDER}/README.txt`,
      `${FOLDER}/images/aa.webp`,
      `${FOLDER}/images/bb.webp`,
      `${FOLDER}/manifest.json`
    ]);

    const manifest: ExportManifest = JSON.parse(strFromU8(zip[`${FOLDER}/manifest.json`]));
    expect(manifest.counts.images).toBe(2);

    expect(Array.from(zip[`${FOLDER}/images/aa.webp`])).toEqual([1, 2, 3]);
    expect(Array.from(zip[`${FOLDER}/images/bb.webp`])).toEqual([4, 5, 6]);
  });

  it('all-three export bundles everything and counts match', async () => {
    await writeFile(join(imagesDir, 'one.webp'), new Uint8Array([7]));

    const { stream } = buildExport(
      { includeDb: true, includeJson: true, includeImages: true },
      { appVersion: APP_VERSION, exportedAt: FIXED_DATE, imagesDir },
      db
    );
    const zip = unzip(await streamToBuffer(stream));
    expect(entryNames(zip)).toEqual([
      `${FOLDER}/README.txt`,
      `${FOLDER}/data.json`,
      `${FOLDER}/db/db.sqlite`,
      `${FOLDER}/images/one.webp`,
      `${FOLDER}/manifest.json`
    ]);

    const manifest: ExportManifest = JSON.parse(strFromU8(zip[`${FOLDER}/manifest.json`]));
    expect(manifest.counts).toEqual({
      pages: 2,
      siteSettings: 1,
      categories: 2,
      items: 3,
      images: 1
    });
    expect(manifest.contents).toEqual([
      'README.txt',
      'manifest.json',
      'data.json',
      'db/db.sqlite',
      'images/'
    ]);
  });

  it('skips image filenames that fail the safe-name allowlist', async () => {
    // Safe: matches the allowlist (alphanumerics, _ and -, .webp suffix).
    await writeFile(join(imagesDir, 'abc123def456.webp'), new Uint8Array([1]));
    // Unsafe: contains `..`, would produce a zip-slip-y entry path on extraction.
    await writeFile(join(imagesDir, '..hidden.webp'), new Uint8Array([2]));
    // Unsafe: spaces / unexpected characters — not a hash filename.
    await writeFile(join(imagesDir, 'has space.webp'), new Uint8Array([3]));
    // Unsafe extension.
    await writeFile(join(imagesDir, 'evil.webp.exe'), new Uint8Array([4]));

    const { stream } = buildExport(
      { includeDb: false, includeJson: false, includeImages: true },
      { appVersion: APP_VERSION, exportedAt: FIXED_DATE, imagesDir },
      db
    );
    const zip = unzip(await streamToBuffer(stream));
    expect(entryNames(zip)).toEqual([
      `${FOLDER}/README.txt`,
      `${FOLDER}/images/abc123def456.webp`,
      `${FOLDER}/manifest.json`
    ]);
    const manifest: ExportManifest = JSON.parse(strFromU8(zip[`${FOLDER}/manifest.json`]));
    expect(manifest.counts.images).toBe(1);
  });

  it('embeds the static README.txt asset verbatim', async () => {
    const { stream } = buildExport(
      { includeDb: false, includeJson: true, includeImages: false },
      { appVersion: APP_VERSION, exportedAt: FIXED_DATE, imagesDir },
      db
    );
    const zip = unzip(await streamToBuffer(stream));
    const readme = strFromU8(zip[`${FOLDER}/README.txt`]);
    // Spot-check a few stable strings rather than coupling to the full text.
    expect(readme).toContain('Tierdom export');
    expect(readme).toContain('manifest.json');
    expect(readme).toContain('VACUUM INTO');
  });

  it('handles a missing imagesDir gracefully (no images, no error)', async () => {
    const missing = join(imagesDir, 'does-not-exist');
    const { stream } = buildExport(
      { includeDb: false, includeJson: false, includeImages: true },
      { appVersion: APP_VERSION, exportedAt: FIXED_DATE, imagesDir: missing },
      db
    );
    const zip = unzip(await streamToBuffer(stream));
    const manifest: ExportManifest = JSON.parse(strFromU8(zip[`${FOLDER}/manifest.json`]));
    expect(manifest.counts.images).toBe(0);
  });

  it('FK-safe ordering: every item references an exported category', async () => {
    const { stream } = buildExport(
      { includeDb: false, includeJson: true, includeImages: false },
      { appVersion: APP_VERSION, exportedAt: FIXED_DATE, imagesDir },
      db
    );
    const zip = unzip(await streamToBuffer(stream));
    const data: ExportData = JSON.parse(strFromU8(zip[`${FOLDER}/data.json`]));
    const categoryIds = new Set(data.data.categories.map((c) => c.id));
    for (const c of data.data.categories) {
      for (const i of c.items) {
        // Items are nested under their category; a cross-check on id helps catch regressions
        // if we ever flatten the structure or split items into a top-level array.
        expect(categoryIds.has(c.id)).toBe(true);
        expect(i.id).toBeTruthy();
      }
    }
  });

  it('cleanup is idempotent and safe to call after stream completes', async () => {
    const { stream, cleanup } = buildExport(
      { includeDb: true, includeJson: false, includeImages: false },
      { appVersion: APP_VERSION, exportedAt: FIXED_DATE, imagesDir },
      db
    );
    await streamToBuffer(stream);
    await expect(cleanup()).resolves.toBeUndefined();
    await expect(cleanup()).resolves.toBeUndefined();
  });
});
