import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatRelativeDate } from './format-date';

describe('formatRelativeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-12T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for the current moment', () => {
    expect.assertions(1);
    expect(formatRelativeDate('2026-04-12 12:00:00')).toBe('just now');
  });

  it('returns "just now" for less than a minute ago', () => {
    expect.assertions(1);
    expect(formatRelativeDate('2026-04-12 11:59:30')).toBe('just now');
  });

  it('returns minutes ago', () => {
    expect.assertions(1);
    expect(formatRelativeDate('2026-04-12 11:57:00')).toBe('3m ago');
  });

  it('returns 59m ago at the hour boundary', () => {
    expect.assertions(1);
    expect(formatRelativeDate('2026-04-12 11:01:00')).toBe('59m ago');
  });

  it('returns hours ago', () => {
    expect.assertions(1);
    expect(formatRelativeDate('2026-04-12 10:00:00')).toBe('2h ago');
  });

  it('returns 23h ago at the day boundary', () => {
    expect.assertions(1);
    expect(formatRelativeDate('2026-04-11 13:00:00')).toBe('23h ago');
  });

  it('returns days ago', () => {
    expect.assertions(1);
    expect(formatRelativeDate('2026-04-11 12:00:00')).toBe('1d ago');
  });

  it('returns 6d ago at the week boundary', () => {
    expect.assertions(1);
    expect(formatRelativeDate('2026-04-06 12:00:00')).toBe('6d ago');
  });

  it('returns absolute date for 7+ days in the same year', () => {
    expect.assertions(1);
    expect(formatRelativeDate('2026-04-05 12:00:00')).toBe('Apr 5');
  });

  it('includes year for dates in a different year', () => {
    expect.assertions(1);
    expect(formatRelativeDate('2025-12-25 12:00:00')).toBe('Dec 25, 2025');
  });

  it('returns "just now" for future dates', () => {
    expect.assertions(1);
    // Future dates produce negative diffMins, which is < 1
    expect(formatRelativeDate('2026-04-13 12:00:00')).toBe('just now');
  });

  it('handles ISO strings that already end with Z without double-appending', () => {
    expect.assertions(2);
    // Equivalent to '2026-04-12 11:57:00' but in `Date.toISOString()` shape —
    // soft-delete uses SQLite's datetime('now') today, but defensiveness here
    // keeps the helper callable from anywhere that produces a UTC ISO string.
    expect(formatRelativeDate('2026-04-12T11:57:00.000Z')).toBe('3m ago');
    expect(formatRelativeDate('2026-04-12T11:57:00Z')).toBe('3m ago');
  });
});
