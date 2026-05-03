import { describe, expect, it } from 'vitest';
import { suggestUnique } from './suggest-unique';

describe('suggestUnique', () => {
  it('returns the input unchanged when the slug is free', () => {
    expect(suggestUnique('books', 'Books', new Set())).toEqual({
      slug: 'books',
      name: 'Books',
    });
  });

  it('appends -2 / " 2" when the slug is taken', () => {
    expect(suggestUnique('books', 'Books', new Set(['books']))).toEqual({
      slug: 'books-2',
      name: 'Books 2',
    });
  });

  it('skips numbered slots that are already taken', () => {
    expect(suggestUnique('books', 'Books', new Set(['books', 'books-2', 'books-3']))).toEqual({
      slug: 'books-4',
      name: 'Books 4',
    });
  });

  it('does not mistakenly treat unrelated slugs as taken', () => {
    expect(suggestUnique('books', 'Books', new Set(['movies', 'tv-series']))).toEqual({
      slug: 'books',
      name: 'Books',
    });
  });
});
