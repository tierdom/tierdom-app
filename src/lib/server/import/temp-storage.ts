import { randomUUID } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { env } from '$env/dynamic/private';

const TTL_MS = 2 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// Sweep refuses to touch anything that doesn't match the exact filenames we
// write. Defence in depth against stray files in the temp dir (editor swap
// files, .gitkeep, leftover from another process) — see security note in
// sweepImportTemp.
const TEMP_FILE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/;

function getTempDir(): string {
  return join(env.DATA_PATH!, 'tmp', 'imports');
}

function ensureTempDir(): void {
  const dir = getTempDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function pathFor(planId: string): string {
  if (typeof planId !== 'string' || !UUID_RE.test(planId)) {
    throw new Error('Invalid plan id');
  }
  const root = resolve(getTempDir());
  const candidate = resolve(root, `${planId}.json`);
  // Belt-and-braces: refuse anything that doesn't sit directly inside the temp dir.
  if (candidate !== join(root, `${planId}.json`) || !candidate.startsWith(root + sep)) {
    throw new Error('Invalid plan id');
  }
  return candidate;
}

export function writeImportTemp(bytes: Buffer | string): string {
  ensureTempDir();
  const planId = randomUUID();
  writeFileSync(pathFor(planId), bytes);
  return planId;
}

export function readImportTemp(planId: string): Buffer {
  const path = pathFor(planId);
  if (!existsSync(path)) {
    throw new Error('Import plan not found or expired');
  }
  const stat = statSync(path);
  if (Date.now() - stat.mtimeMs > TTL_MS) {
    rmSync(path, { force: true });
    throw new Error('Import plan not found or expired');
  }
  return readFileSync(path);
}

export function deleteImportTemp(planId: string): void {
  const path = pathFor(planId);
  rmSync(path, { force: true });
}

/**
 * Delete temp files older than the TTL.
 *
 * Hardening:
 * - Only operates inside `${DATA_PATH}/tmp/imports/`. `readdirSync` returns
 *   basenames only, so no path traversal is possible from the listing.
 * - Filenames must match the exact `<uuid>.json` shape we write — anything
 *   else (`.gitkeep`, editor swap files, manually dropped files) is left
 *   alone.
 * - `lstatSync` is used (not `statSync`) so symlinks are detected and
 *   skipped without dereferencing — even if an attacker with write access
 *   to the temp dir created one pointing elsewhere.
 * - `rmSync` is non-recursive: directories that somehow ended up in the
 *   temp dir cannot be removed.
 *
 * Any error inside the loop is swallowed: a file vanishing between
 * readdir/stat/rm in a parallel sweep is expected, not an emergency.
 */
export function sweepImportTemp(): void {
  const dir = getTempDir();
  if (!existsSync(dir)) return;
  const cutoff = Date.now() - TTL_MS;
  for (const name of readdirSync(dir)) {
    if (!TEMP_FILE_RE.test(name)) continue;
    const path = join(dir, name);
    try {
      const stat = lstatSync(path);
      if (!stat.isFile()) continue;
      if (stat.mtimeMs < cutoff) {
        rmSync(path, { force: true });
      }
    } catch {
      // Ignore — file may have been removed in a parallel sweep.
    }
  }
}
