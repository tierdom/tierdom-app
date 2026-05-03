import { describe, expect, it } from 'vitest';
import { scoreToTier, scoreToBarColor } from './tier';

describe('scoreToTier', () => {
  it.each([
    [100, 'S'],
    [90, 'S'],
    [89, 'A'],
    [70, 'A'],
    [69, 'B'],
    [55, 'B'],
    [54, 'C'],
    [40, 'C'],
    [39, 'D'],
    [20, 'D'],
    [19, 'E'],
    [10, 'E'],
    [9, 'F'],
    [0, 'F'],
    [-1, 'F'],
  ] as const)('scoreToTier(%d) → %s', (score, expected) => {
    expect.assertions(1);
    expect(scoreToTier(score)).toBe(expected);
  });

  it('respects custom cutoff overrides', () => {
    expect.assertions(2);
    expect(scoreToTier(91, { S: 95 })).toBe('A');
    expect(scoreToTier(50, { C: 50 })).toBe('C');
  });

  it('falls back to defaults for null cutoff values', () => {
    expect.assertions(1);
    expect(scoreToTier(90, { S: null })).toBe('S');
  });
});

describe('scoreToBarColor', () => {
  it.each([
    [0, 0],
    [25, 30],
    [50, 60],
    [75, 90],
    [100, 120],
  ])('scoreToBarColor(%d) → hue %d', (score, expectedHue) => {
    expect.assertions(1);
    expect(scoreToBarColor(score)).toBe(`hsl(${expectedHue}, 70%, 45%)`);
  });
});
