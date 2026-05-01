import { describe, expect, it } from 'vitest';
import { scoreToTier, scoreToBarColor } from './tier';

describe('scoreToTier', () => {
  it.each([
    [100, 'S'],
    [90, 'S'],
    [89, 'A'],
    [80, 'A'],
    [79, 'B'],
    [70, 'B'],
    [69, 'C'],
    [55, 'C'],
    [54, 'D'],
    [40, 'D'],
    [39, 'E'],
    [20, 'E'],
    [19, 'F'],
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
