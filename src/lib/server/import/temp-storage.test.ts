import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, readdirSync, rmSync, utimesSync } from 'node:fs';
import { join } from 'node:path';

const { TMP_ROOT } = vi.hoisted(() => ({
  TMP_ROOT: `/tmp/tierdom-import-temp-test-${process.pid}-${Date.now()}`
}));

vi.mock('$env/dynamic/private', () => ({ env: { DATA_PATH: TMP_ROOT } }));

import { deleteImportTemp, readImportTemp, sweepImportTemp, writeImportTemp } from './temp-storage';

const IMPORTS_DIR = join(TMP_ROOT, 'tmp', 'imports');

beforeAll(() => mkdirSync(TMP_ROOT, { recursive: true }));
afterAll(() => rmSync(TMP_ROOT, { recursive: true, force: true }));
beforeEach(() => rmSync(IMPORTS_DIR, { recursive: true, force: true }));

describe('temp-storage', () => {
  it('round-trips bytes by plan id', () => {
    const planId = writeImportTemp(Buffer.from('{"hello":"world"}'));
    expect(readImportTemp(planId).toString()).toBe('{"hello":"world"}');
  });

  it('deletes a plan file', () => {
    const planId = writeImportTemp('payload');
    deleteImportTemp(planId);
    expect(() => readImportTemp(planId)).toThrow(/not found or expired/);
  });

  it.each([
    '../../etc/passwd',
    '------------------------------------', // 36 dashes — passed the old loose regex
    '0000000000000000000000000000000000000', // 37 hex chars
    'ZZZZZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZZZZZZZZZ', // non-hex
    '00000000-0000-0000-0000-00000000000', // too short
    '00000000/0000/0000/0000/000000000000', // slashes instead of dashes
    '',
    'not-a-uuid'
  ])('rejects malicious or malformed plan id %j', (id) => {
    expect(() => readImportTemp(id)).toThrow(/Invalid plan id/);
    expect(() => deleteImportTemp(id)).toThrow(/Invalid plan id/);
  });

  it('rejects non-string plan ids', () => {
    // @ts-expect-error — runtime guard, callers may smuggle in non-strings via form data
    expect(() => readImportTemp(undefined)).toThrow(/Invalid plan id/);
    // @ts-expect-error — runtime guard, callers may smuggle in non-strings via form data
    expect(() => readImportTemp(123)).toThrow(/Invalid plan id/);
  });

  it('treats files older than the TTL as expired', () => {
    const planId = writeImportTemp('payload');
    const path = join(IMPORTS_DIR, `${planId}.json`);
    const ancient = new Date(Date.now() - 60 * 60 * 1000);
    utimesSync(path, ancient, ancient);
    expect(() => readImportTemp(planId)).toThrow(/expired/);
    expect(existsSync(path)).toBe(false);
  });

  it('sweep removes expired files and keeps fresh ones', () => {
    const fresh = writeImportTemp('fresh');
    const stale = writeImportTemp('stale');
    const stalePath = join(IMPORTS_DIR, `${stale}.json`);
    const ancient = new Date(Date.now() - 60 * 60 * 1000);
    utimesSync(stalePath, ancient, ancient);

    sweepImportTemp();

    const remaining = readdirSync(IMPORTS_DIR);
    expect(remaining).toEqual([`${fresh}.json`]);
  });

  it('sweep is a no-op when the directory does not exist', () => {
    rmSync(join(TMP_ROOT, 'tmp'), { recursive: true, force: true });
    expect(() => sweepImportTemp()).not.toThrow();
  });
});
