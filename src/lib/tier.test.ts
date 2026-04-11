import { describe, expect, it } from 'vitest';
import { scoreToTier, scoreToBarColor } from './tier';

describe('scoreToTier', () => {
  it('maps default boundaries correctly', () => {
    expect.assertions(8);
    expect(scoreToTier(100)).toBe('S');
    expect(scoreToTier(90)).toBe('S');
    expect(scoreToTier(89)).toBe('A');
    expect(scoreToTier(80)).toBe('A');
    expect(scoreToTier(70)).toBe('B');
    expect(scoreToTier(55)).toBe('C');
    expect(scoreToTier(40)).toBe('D');
    expect(scoreToTier(20)).toBe('E');
  });

  it('returns F for scores below the E cutoff', () => {
    expect.assertions(3);
    expect(scoreToTier(19)).toBe('F');
    expect(scoreToTier(0)).toBe('F');
    expect(scoreToTier(-1)).toBe('F');
  });

  it('respects custom cutoff overrides', () => {
    expect.assertions(2);
    // Raise S threshold — 91 is no longer S
    expect(scoreToTier(91, { S: 95 })).toBe('A');
    // Lower C threshold — 50 is now C
    expect(scoreToTier(50, { C: 50 })).toBe('C');
  });

  it('falls back to defaults for null cutoff values', () => {
    expect.assertions(1);
    expect(scoreToTier(90, { S: null })).toBe('S');
  });
});

describe('scoreToBarColor', () => {
  it('returns red hue for 0', () => {
    expect.assertions(1);
    expect(scoreToBarColor(0)).toBe('hsl(0, 70%, 45%)');
  });

  it('returns yellow hue for 50', () => {
    expect.assertions(1);
    expect(scoreToBarColor(50)).toBe('hsl(60, 70%, 45%)');
  });

  it('returns green hue for 100', () => {
    expect.assertions(1);
    expect(scoreToBarColor(100)).toBe('hsl(120, 70%, 45%)');
  });
});
