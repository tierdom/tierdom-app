import { describe, expect, it } from 'vitest';
import { slugify } from './slugify';

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect.assertions(1);
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('collapses consecutive non-alphanumeric characters', () => {
    expect.assertions(1);
    expect(slugify('Foo  Bar!!Baz')).toBe('foo-bar-baz');
  });

  it('trims leading and trailing hyphens', () => {
    expect.assertions(1);
    expect(slugify('--Hello--')).toBe('hello');
  });

  it('strips unicode characters', () => {
    expect.assertions(1);
    expect(slugify('Café Résumé')).toBe('caf-r-sum');
  });

  it('returns empty string for empty input', () => {
    expect.assertions(1);
    expect(slugify('')).toBe('');
  });

  it('preserves numbers', () => {
    expect.assertions(1);
    expect(slugify('Item 42')).toBe('item-42');
  });

  it('passes through an existing slug unchanged', () => {
    expect.assertions(1);
    expect(slugify('already-a-slug')).toBe('already-a-slug');
  });

  it('converts underscores to hyphens', () => {
    expect.assertions(1);
    expect(slugify('hello_world')).toBe('hello-world');
  });

  it('trims leading and trailing whitespace', () => {
    expect.assertions(1);
    expect(slugify('  hello  ')).toBe('hello');
  });

  it('collapses input that already contains hyphens', () => {
    expect.assertions(1);
    expect(slugify('a--b')).toBe('a-b');
  });
});
