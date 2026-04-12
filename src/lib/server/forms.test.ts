import { describe, expect, it } from 'vitest';
import { parseCategoryForm, parseItemForm } from './forms';

function form(entries: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    if (Array.isArray(value)) {
      for (const v of value) fd.append(key, v);
    } else {
      fd.set(key, value);
    }
  }
  return fd;
}

describe('parseCategoryForm', () => {
  it('parses a valid category form', () => {
    expect.assertions(5);
    const result = parseCategoryForm(form({ name: 'Games', cutoffS: '95', cutoffA: '80' }));
    expect(result).not.toHaveProperty('error');
    if ('error' in result) return;
    expect(result.name).toBe('Games');
    expect(result.propKeys).toEqual([]);
    expect(result.cutoffs.cutoffS).toBe(95);
    expect(result.cutoffs.cutoffA).toBe(80);
  });

  it('requires a name', () => {
    expect.assertions(1);
    const result = parseCategoryForm(form({}));
    expect(result).toEqual({ error: 'Name is required' });
  });

  it('rejects whitespace-only name', () => {
    expect.assertions(1);
    const result = parseCategoryForm(form({ name: '   ' }));
    expect(result).toEqual({ error: 'Name is required' });
  });

  it('auto-generates slug from name', () => {
    expect.assertions(1);
    const result = parseCategoryForm(form({ name: 'Board Games' }));
    expect(result).toHaveProperty('slug', 'board-games');
  });

  it('uses explicit slug when provided', () => {
    expect.assertions(1);
    const result = parseCategoryForm(form({ name: 'Games', slug: 'custom-slug' }));
    expect(result).toHaveProperty('slug', 'custom-slug');
  });

  it('sets empty cutoffs to null', () => {
    expect.assertions(7);
    const result = parseCategoryForm(form({ name: 'Test' }));
    if ('error' in result) return;
    for (const tier of ['S', 'A', 'B', 'C', 'D', 'E', 'F'] as const) {
      expect(result.cutoffs[`cutoff${tier}`]).toBeNull();
    }
  });

  it('parses description', () => {
    expect.assertions(1);
    const result = parseCategoryForm(form({ name: 'X', description: 'A category' }));
    expect(result).toHaveProperty('description', 'A category');
  });

  it('sets empty description to null', () => {
    expect.assertions(1);
    const result = parseCategoryForm(form({ name: 'X' }));
    expect(result).toHaveProperty('description', null);
  });

  it('parses valid propKeys JSON', () => {
    expect.assertions(1);
    const propKeys = JSON.stringify(['Platform', 'Genre']);
    const result = parseCategoryForm(form({ name: 'Games', propKeys }));
    expect(result).toHaveProperty('propKeys', ['Platform', 'Genre']);
  });

  it('defaults propKeys to empty array when absent', () => {
    expect.assertions(1);
    const result = parseCategoryForm(form({ name: 'Games' }));
    expect(result).toHaveProperty('propKeys', []);
  });

  it('rejects malformed propKeys JSON', () => {
    expect.assertions(1);
    const result = parseCategoryForm(form({ name: 'Games', propKeys: 'not json' }));
    expect(result).toEqual({ error: 'Invalid prop keys format' });
  });

  it('rejects duplicate propKeys', () => {
    expect.assertions(1);
    const propKeys = JSON.stringify(['Platform', 'platform']);
    const result = parseCategoryForm(form({ name: 'Games', propKeys }));
    expect(result).toHaveProperty('error');
  });

  it('rejects empty propKey strings', () => {
    expect.assertions(1);
    const propKeys = JSON.stringify(['Platform', '']);
    const result = parseCategoryForm(form({ name: 'Games', propKeys }));
    expect(result).toHaveProperty('error');
  });
});

describe('parseItemForm', () => {
  const valid = { name: 'Elden Ring', score: '95', categoryId: 'cat-1' };

  it('parses a valid item form', () => {
    expect.assertions(4);
    const result = parseItemForm(form(valid));
    if ('error' in result) return;
    expect(result.name).toBe('Elden Ring');
    expect(result.slug).toBe('elden-ring');
    expect(result.score).toBe(95);
    expect(result.categoryId).toBe('cat-1');
  });

  it('requires a name', () => {
    expect.assertions(1);
    const result = parseItemForm(form({ score: '50', categoryId: 'cat-1' }));
    expect(result).toEqual({ error: 'Name is required' });
  });

  it('requires a category', () => {
    expect.assertions(1);
    const result = parseItemForm(form({ name: 'Test', score: '50' }));
    expect(result).toEqual({ error: 'Category is required' });
  });

  it('rejects score below 0', () => {
    expect.assertions(1);
    const result = parseItemForm(form({ ...valid, score: '-1' }));
    expect(result).toEqual({ error: 'Score must be an integer 0-100' });
  });

  it('rejects score above 100', () => {
    expect.assertions(1);
    const result = parseItemForm(form({ ...valid, score: '101' }));
    expect(result).toEqual({ error: 'Score must be an integer 0-100' });
  });

  it('rejects non-numeric score', () => {
    expect.assertions(1);
    const result = parseItemForm(form({ ...valid, score: 'abc' }));
    expect(result).toEqual({ error: 'Score must be an integer 0-100' });
  });

  it('rounds fractional scores to integers', () => {
    expect.assertions(1);
    const result = parseItemForm(form({ ...valid, score: '72.6' }));
    expect(result).toHaveProperty('score', 73);
  });

  it('accepts boundary scores 0 and 100', () => {
    expect.assertions(2);
    const low = parseItemForm(form({ ...valid, score: '0' }));
    const high = parseItemForm(form({ ...valid, score: '100' }));
    expect(low).toHaveProperty('score', 0);
    expect(high).toHaveProperty('score', 100);
  });

  it('uses explicit slug when provided', () => {
    expect.assertions(1);
    const result = parseItemForm(form({ ...valid, slug: 'my-slug' }));
    expect(result).toHaveProperty('slug', 'my-slug');
  });

  it('defaults returnTarget to items', () => {
    expect.assertions(1);
    const result = parseItemForm(form(valid));
    expect(result).toHaveProperty('returnTarget', 'items');
  });

  it('respects returnTarget categories', () => {
    expect.assertions(1);
    const result = parseItemForm(form({ ...valid, _returnTarget: 'categories' }));
    expect(result).toHaveProperty('returnTarget', 'categories');
  });

  it('defaults props to empty array when absent', () => {
    expect.assertions(1);
    const result = parseItemForm(form(valid));
    expect(result).toHaveProperty('props', []);
  });

  it('parses valid props JSON', () => {
    expect.assertions(1);
    const props = JSON.stringify([{ key: 'Platform', value: 'PC' }]);
    const result = parseItemForm(form({ ...valid, props }));
    expect(result).toHaveProperty('props', [{ key: 'Platform', value: 'PC' }]);
  });

  it('rejects malformed props JSON', () => {
    expect.assertions(1);
    const result = parseItemForm(form({ ...valid, props: 'not json' }));
    expect(result).toEqual({ error: 'Invalid props format' });
  });

  it('rejects invalid props structure', () => {
    expect.assertions(1);
    const props = JSON.stringify([{ key: '', value: 'v' }]);
    const result = parseItemForm(form({ ...valid, props }));
    expect(result).toHaveProperty('error');
  });
});
