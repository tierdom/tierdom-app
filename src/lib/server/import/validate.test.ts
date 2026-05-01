import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_JSON_BYTES, formatAjvErrors, validateExport } from './validate';

const FIXTURES_DIR = 'tests/fixtures/imports';

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, name), 'utf8'));
}

describe('validateExport', () => {
  it('accepts the canonical good fixture', () => {
    expect(validateExport(loadFixture('tierdom-json-001-good.json'))).toBe(true);
  });

  it('accepts the kitchen-sink fixture (pages + settings + categories)', () => {
    expect(validateExport(loadFixture('tierdom-json-004-full.json'))).toBe(true);
  });

  it('rejects the deliberately malformed fixture', () => {
    expect(validateExport(loadFixture('tierdom-json-003-malformed.json'))).toBe(false);
    const errors = formatAjvErrors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('score'))).toBe(true);
    expect(errors.some((e) => e.includes('required'))).toBe(true);
  });

  it('rejects entirely unrelated shapes', () => {
    expect(validateExport({ hello: 'world' })).toBe(false);
  });

  it('rejects null and primitive inputs', () => {
    expect(validateExport(null)).toBe(false);
    expect(validateExport(42)).toBe(false);
    expect(validateExport('string')).toBe(false);
  });

  it('enforces the uuid format on category ids', () => {
    const data = loadFixture('tierdom-json-001-good.json') as {
      data: { categories: { id: string }[] };
    };
    data.data.categories[0].id = 'not-a-uuid';
    expect(validateExport(data)).toBe(false);
    expect(formatAjvErrors().some((e) => /uuid/i.test(e) || /format/i.test(e))).toBe(true);
  });

  it('enforces the date-time format on timestamps', () => {
    const data = loadFixture('tierdom-json-001-good.json') as {
      data: { categories: { createdAt: string }[] };
    };
    data.data.categories[0].createdAt = '2026-01-01 00:00:00'; // missing T + Z
    expect(validateExport(data)).toBe(false);
    expect(formatAjvErrors().some((e) => /date-time/i.test(e) || /format/i.test(e))).toBe(true);
  });

  it('rejects extra properties (additionalProperties: false)', () => {
    const data = loadFixture('tierdom-json-001-good.json') as Record<string, unknown> & {
      data: Record<string, unknown>;
    };
    data.data.somethingExtra = true;
    expect(validateExport(data)).toBe(false);
  });
});

describe('formatAjvErrors', () => {
  it('returns an empty array after a successful validation', () => {
    validateExport(loadFixture('tierdom-json-001-good.json'));
    expect(formatAjvErrors()).toEqual([]);
  });

  it('uses "/" for root-level errors when instancePath is empty', () => {
    validateExport(null);
    const errors = formatAjvErrors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].startsWith('/ ')).toBe(true);
  });

  it('falls back to "invalid" when an AJV error has no message', () => {
    // Inject a synthetic error to exercise the `?? 'invalid'` fallback —
    // AJV always sets `message` in practice, but we stay defensive.
    validateExport(null);
    const original = validateExport.errors;
    validateExport.errors = [
      { keyword: 'x', instancePath: '/foo', schemaPath: '#', params: {} },
    ] as unknown as typeof validateExport.errors;
    try {
      expect(formatAjvErrors()).toEqual(['/foo invalid']);
    } finally {
      validateExport.errors = original;
    }
  });
});

describe('MAX_JSON_BYTES', () => {
  it('is exactly 10 MiB', () => {
    expect(MAX_JSON_BYTES).toBe(10 * 1024 * 1024);
  });
});
