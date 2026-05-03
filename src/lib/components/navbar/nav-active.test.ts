import { describe, expect, it } from 'vitest';
import { isActiveNavLink } from './nav-active';

describe('isActiveNavLink', () => {
  it('matches the home link only on exact "/"', () => {
    expect(isActiveNavLink('/', '/')).toBe(true);
    expect(isActiveNavLink('/', '/category/books')).toBe(false);
  });

  it('matches an exact pathname', () => {
    expect(isActiveNavLink('/category/books', '/category/books')).toBe(true);
  });

  it('matches a deeper path under the link', () => {
    expect(isActiveNavLink('/category/books', '/category/books/page/2')).toBe(true);
  });

  it('does NOT match a sibling slug that merely shares the prefix', () => {
    // The bug we are fixing: `/category/books-2` should not light up the
    // `/category/books` nav link.
    expect(isActiveNavLink('/category/books', '/category/books-2')).toBe(false);
    expect(isActiveNavLink('/category/books', '/category/books-3')).toBe(false);
    expect(isActiveNavLink('/admin', '/admin-tools')).toBe(false);
  });

  it('does not match an unrelated path', () => {
    expect(isActiveNavLink('/category/books', '/category/movies')).toBe(false);
  });
});
