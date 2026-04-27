import { randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { env } from '$env/dynamic/private';

const TTL_MS = 30 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

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

export function sweepImportTemp(): void {
  const dir = getTempDir();
  if (!existsSync(dir)) return;
  const cutoff = Date.now() - TTL_MS;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    try {
      const stat = statSync(path);
      if (stat.mtimeMs < cutoff) {
        rmSync(path, { force: true });
      }
    } catch {
      // Ignore — file may have been removed in a parallel sweep.
    }
  }
}
