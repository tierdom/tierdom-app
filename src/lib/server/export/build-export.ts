import { Zip, ZipDeflate, ZipPassThrough } from 'fflate';
import { readFile, readdir, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { asc } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { env } from '$env/dynamic/private';
import { db as defaultDb, backupDatabaseTo } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { category, tierListItem, page, siteSetting } from '$lib/server/db/schema';
import {
  EXPORT_SCHEMA_VERSION,
  type ExportData,
  type ExportManifest,
  type ExportedCategory,
  type ExportedItem
} from './json-schema';
import readmeText from './README.txt?raw';
import { renderCategoryMarkdown } from './markdown';

// Names allowed inside images/. Defense-in-depth against zip-slip on the
// extraction side: even though `readdir` on POSIX/Windows can never return
// a name containing `/` or `\`, a name containing `..` would still produce
// a zip entry path that naive extractors might resolve outside the target
// directory. Restrict to the shapes we actually produce (12-char SHA-256
// hex hashes per src/lib/server/images.ts), with a small headroom.
const SAFE_IMAGE_NAME = /^[A-Za-z0-9_-]{1,128}\.webp$/;

type DB = BetterSQLite3Database<typeof schema>;

export interface BuildExportOptions {
  includeDb: boolean;
  includeJson: boolean;
  includeImages: boolean;
  includeMarkdown: boolean;
}

export interface BuildExportContext {
  appVersion: string;
  /** Override for deterministic tests; defaults to `new Date()`. */
  exportedAt?: Date;
  /** Override the directory enumerated for image entries; defaults to `$DATA_PATH/images`. */
  imagesDir?: string;
}

export interface ExportArtifact {
  stream: ReadableStream<Uint8Array>;
  filename: string;
  /** Idempotent safety net for the caller; the builder also cleans up internally. */
  cleanup: () => Promise<void>;
}

export function buildExport(
  opts: BuildExportOptions,
  ctx: BuildExportContext,
  db: DB = defaultDb
): ExportArtifact {
  const exportedAt = ctx.exportedAt ?? new Date();
  const iso = exportedAt.toISOString();
  // Filesystem-safe slug from the ISO timestamp: drop milliseconds, replace
  // colons (illegal in Windows filenames) with dashes. Including the time
  // means multiple exports on the same day don't collide.
  // e.g. 2026-04-26T12:00:00.000Z -> 2026-04-26T12-00-00Z
  const stamp = iso.replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-');
  const filename = `tierdom-backup-${stamp}.zip`;
  const folder = `tierdom-backup-${stamp}`;
  const imagesDir = ctx.imagesDir ?? join(env.DATA_PATH ?? '', 'images');

  let snapshotPath: string | null = null;
  const cleanup = async (): Promise<void> => {
    if (!snapshotPath) return;
    const path = snapshotPath;
    snapshotPath = null;
    try {
      await unlink(path);
    } catch {
      // already gone — fine
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const zip = new Zip((err, chunk, final) => {
          if (err) {
            controller.error(err);
            return;
          }
          controller.enqueue(chunk);
          if (final) controller.close();
        });

        const entries: { name: string; bytes: Uint8Array; deflate: boolean }[] = [];

        // Markdown reuses the same category/item data as JSON, so collect it
        // whenever either format needs it.
        const needsCategoryData = opts.includeJson || opts.includeMarkdown;
        const exportData = needsCategoryData ? collectExportData(db, ctx.appVersion, iso) : null;
        const imageNames = opts.includeImages ? await listImages(imagesDir) : [];
        const markdownFiles =
          opts.includeMarkdown && exportData
            ? exportData.data.categories.map((c) => ({
                name: `${c.slug}.md`,
                content: renderCategoryMarkdown(c)
              }))
            : [];

        entries.push({
          name: `${folder}/README.txt`,
          bytes: encode(readmeText),
          deflate: true
        });

        const manifest: ExportManifest = {
          schemaVersion: EXPORT_SCHEMA_VERSION,
          appVersion: ctx.appVersion,
          exportedAt: iso,
          contents: contentsList(opts),
          counts: {
            ...(opts.includeJson &&
              exportData && {
                pages: exportData.data.pages.length,
                siteSettings: exportData.data.siteSettings.length,
                categories: exportData.data.categories.length,
                items: exportData.data.categories.reduce((sum, c) => sum + c.items.length, 0)
              }),
            ...(opts.includeImages && { images: imageNames.length }),
            ...(opts.includeMarkdown && { markdownFiles: markdownFiles.length })
          }
        };
        entries.push({
          name: `${folder}/manifest.json`,
          bytes: encode(JSON.stringify(manifest, null, 2)),
          deflate: true
        });

        if (opts.includeJson && exportData) {
          entries.push({
            name: `${folder}/data.json`,
            bytes: encode(JSON.stringify(exportData, null, 2)),
            deflate: true
          });
        }

        if (opts.includeDb) {
          // os.tmpdir() resolves per-platform: /tmp on Linux/macOS (and Alpine
          // in Docker), %TEMP% on Windows. SQLite VACUUM INTO accepts native
          // paths on both — backslashes are literal in SQL string literals,
          // so a Windows path like C:\Users\...\file.sqlite passes through
          // as-is once single quotes are escaped.
          // Trade-off: tmpdir may live on a different volume from $DATA_PATH
          // in some Docker setups, costing one cross-volume copy per export.
          // Fine at our scale; revisit if snapshots grow into multi-GB.
          snapshotPath = join(tmpdir(), `tierdom-export-${randomUUID()}.sqlite`);
          backupDatabaseTo(snapshotPath, db);
          entries.push({
            name: `${folder}/db/db.sqlite`,
            bytes: await readFile(snapshotPath),
            deflate: true
          });
        }

        for (const name of imageNames) {
          entries.push({
            name: `${folder}/images/${name}`,
            bytes: await readFile(join(imagesDir, name)),
            deflate: false
          });
        }

        for (const file of markdownFiles) {
          entries.push({
            name: `${folder}/markdown/${file.name}`,
            bytes: encode(file.content),
            deflate: true
          });
        }

        // Deterministic ordering — same input produces same byte layout.
        entries.sort((a, b) => a.name.localeCompare(b.name));

        for (const entry of entries) {
          const zipEntry = entry.deflate
            ? new ZipDeflate(entry.name, { level: 6 })
            : new ZipPassThrough(entry.name);
          zip.add(zipEntry);
          zipEntry.push(entry.bytes, true);
        }

        zip.end();
      } catch (err) {
        controller.error(err);
      } finally {
        await cleanup();
      }
    },
    async cancel() {
      await cleanup();
    }
  });

  return { stream, filename, cleanup };
}

function encode(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function contentsList(opts: BuildExportOptions): string[] {
  const out: string[] = ['README.txt', 'manifest.json'];
  if (opts.includeJson) out.push('data.json');
  if (opts.includeDb) out.push('db/db.sqlite');
  if (opts.includeImages) out.push('images/');
  if (opts.includeMarkdown) out.push('markdown/');
  return out;
}

async function listImages(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && SAFE_IMAGE_NAME.test(e.name))
      .map((e) => e.name)
      .sort();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

// SQLite's `datetime('now')` produces UTC timestamps in `YYYY-MM-DD HH:MM:SS`,
// which is RFC 3339 close-but-not-quite. The export schema declares
// `format: "date-time"` (strict ISO 8601 / RFC 3339), so we normalise on the
// way out. Strings that already carry `T` and `Z`/offset are passed through.
function toIsoDateTime(value: string): string {
  if (value.includes('T') && /(?:Z|[+-]\d\d:?\d\d)$/.test(value)) return value;
  const withT = value.includes('T') ? value : value.replace(' ', 'T');
  return /(?:Z|[+-]\d\d:?\d\d)$/.test(withT) ? withT : `${withT}Z`;
}

function collectExportData(db: DB, appVersion: string, exportedAt: string): ExportData {
  // Active views (ADR-0022) — soft-deleted rows are excluded from the JSON.
  const pages = db
    .select()
    .from(page)
    .orderBy(asc(page.slug))
    .all()
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      content: p.content,
      createdAt: toIsoDateTime(p.createdAt),
      updatedAt: toIsoDateTime(p.updatedAt)
    }));

  const siteSettings = db
    .select()
    .from(siteSetting)
    .orderBy(asc(siteSetting.key))
    .all()
    .map((s) => ({
      key: s.key,
      value: s.value,
      createdAt: toIsoDateTime(s.createdAt),
      updatedAt: toIsoDateTime(s.updatedAt)
    }));

  const categoryRows = db
    .select()
    .from(category)
    .orderBy(asc(category.order), asc(category.id))
    .all();
  const itemRows = db
    .select()
    .from(tierListItem)
    .orderBy(asc(tierListItem.categoryId), asc(tierListItem.order), asc(tierListItem.id))
    .all();

  const itemsByCategoryId = new Map<string, ExportedItem[]>();
  for (const i of itemRows) {
    const list = itemsByCategoryId.get(i.categoryId) ?? [];
    list.push({
      id: i.id,
      slug: i.slug,
      name: i.name,
      description: i.description,
      score: i.score,
      order: i.order,
      imageHash: i.imageHash,
      placeholder: i.placeholder,
      props: i.props,
      createdAt: toIsoDateTime(i.createdAt),
      updatedAt: toIsoDateTime(i.updatedAt)
    });
    itemsByCategoryId.set(i.categoryId, list);
  }

  const categories: ExportedCategory[] = categoryRows.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    order: c.order,
    cutoffS: c.cutoffS,
    cutoffA: c.cutoffA,
    cutoffB: c.cutoffB,
    cutoffC: c.cutoffC,
    cutoffD: c.cutoffD,
    cutoffE: c.cutoffE,
    cutoffF: c.cutoffF,
    propKeys: c.propKeys,
    createdAt: toIsoDateTime(c.createdAt),
    updatedAt: toIsoDateTime(c.updatedAt),
    items: itemsByCategoryId.get(c.id) ?? []
  }));

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    appVersion,
    exportedAt,
    data: { pages, siteSettings, categories }
  };
}

export async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}
