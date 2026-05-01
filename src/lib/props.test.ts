import { describe, expect, it } from 'vitest';
import {
  validateProps,
  validatePropKeys,
  findDuplicateKeys,
  filterSuggestions,
  isNonStandardKey,
  MAX_PROPS,
  MAX_PROP_KEYS,
  MAX_KEY_LENGTH,
  MAX_VALUE_LENGTH,
} from './props';

describe('validateProps', () => {
  it('accepts an empty array', () => {
    expect(validateProps([])).toEqual([]);
  });

  it('accepts valid props', () => {
    const result = validateProps([
      { key: 'Platform', value: 'PC' },
      { key: 'Year', value: '2024' },
    ]);
    expect(result).toEqual([
      { key: 'Platform', value: 'PC' },
      { key: 'Year', value: '2024' },
    ]);
  });

  it('trims keys and values', () => {
    const result = validateProps([{ key: '  Platform  ', value: '  PC  ' }]);
    expect(result).toEqual([{ key: 'Platform', value: 'PC' }]);
  });

  it('rejects non-array input', () => {
    expect(validateProps('not an array')).toBe('Props must be an array');
    expect(validateProps(null)).toBe('Props must be an array');
    expect(validateProps(42)).toBe('Props must be an array');
    expect(validateProps({})).toBe('Props must be an array');
  });

  it(`rejects more than ${MAX_PROPS} props`, () => {
    const tooMany = Array.from({ length: MAX_PROPS + 1 }, (_, i) => ({
      key: `k${i}`,
      value: `v${i}`,
    }));
    expect(validateProps(tooMany)).toBe(`Maximum ${MAX_PROPS} props allowed`);
  });

  it(`accepts exactly ${MAX_PROPS} props`, () => {
    const exact = Array.from({ length: MAX_PROPS }, (_, i) => ({
      key: `k${i}`,
      value: `v${i}`,
    }));
    const result = validateProps(exact);
    expect(Array.isArray(result)).toBe(true);
    expect((result as unknown[]).length).toBe(MAX_PROPS);
  });

  it('rejects non-object entries', () => {
    expect(validateProps(['string'])).toBe('Each prop must be an object');
    expect(validateProps([null])).toBe('Each prop must be an object');
    expect(validateProps([42])).toBe('Each prop must be an object');
  });

  it('rejects empty key', () => {
    expect(validateProps([{ key: '', value: 'v' }])).toBe('Each prop must have a non-empty key');
  });

  it('rejects whitespace-only key', () => {
    expect(validateProps([{ key: '   ', value: 'v' }])).toBe('Each prop must have a non-empty key');
  });

  it('rejects non-string key', () => {
    expect(validateProps([{ key: 123, value: 'v' }])).toBe('Each prop must have a non-empty key');
  });

  it('rejects empty value', () => {
    expect(validateProps([{ key: 'k', value: '' }])).toBe('Each prop must have a non-empty value');
  });

  it('rejects whitespace-only value', () => {
    expect(validateProps([{ key: 'k', value: '   ' }])).toBe(
      'Each prop must have a non-empty value',
    );
  });

  it('rejects non-string value', () => {
    expect(validateProps([{ key: 'k', value: 42 }])).toBe('Each prop must have a non-empty value');
  });

  it(`rejects key exceeding ${MAX_KEY_LENGTH} characters`, () => {
    const longKey = 'k'.repeat(MAX_KEY_LENGTH + 1);
    expect(validateProps([{ key: longKey, value: 'v' }])).toBe(
      `Key "${longKey}" exceeds ${MAX_KEY_LENGTH} characters`,
    );
  });

  it(`accepts key at exactly ${MAX_KEY_LENGTH} characters`, () => {
    const exactKey = 'k'.repeat(MAX_KEY_LENGTH);
    const result = validateProps([{ key: exactKey, value: 'v' }]);
    expect(Array.isArray(result)).toBe(true);
  });

  it(`rejects value exceeding ${MAX_VALUE_LENGTH} characters`, () => {
    const longValue = 'v'.repeat(MAX_VALUE_LENGTH + 1);
    expect(validateProps([{ key: 'k', value: longValue }])).toBe(
      `Value for "k" exceeds ${MAX_VALUE_LENGTH} characters`,
    );
  });

  it(`accepts value at exactly ${MAX_VALUE_LENGTH} characters`, () => {
    const exactValue = 'v'.repeat(MAX_VALUE_LENGTH);
    const result = validateProps([{ key: 'k', value: exactValue }]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('rejects duplicate keys (case-insensitive)', () => {
    expect(
      validateProps([
        { key: 'Platform', value: 'PC' },
        { key: 'platform', value: 'Switch' },
      ]),
    ).toBe('Duplicate key "platform"');
  });

  it('allows different keys', () => {
    const result = validateProps([
      { key: 'Platform', value: 'PC' },
      { key: 'Year', value: '2024' },
    ]);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('validatePropKeys', () => {
  function pk(key: string, iconSet?: string): { key: string; iconSet?: string } {
    return iconSet ? { key, iconSet } : { key };
  }

  it('accepts an empty array', () => {
    expect(validatePropKeys([])).toEqual([]);
  });

  it('accepts valid keys', () => {
    const result = validatePropKeys([pk('Platform'), pk('Genre')]);
    expect(result).toEqual([{ key: 'Platform' }, { key: 'Genre' }]);
  });

  it('accepts keys with iconSet', () => {
    const knownSets = new Set(['gaming-platforms']);
    const result = validatePropKeys([pk('Platform', 'gaming-platforms'), pk('Genre')], knownSets);
    expect(result).toEqual([{ key: 'Platform', iconSet: 'gaming-platforms' }, { key: 'Genre' }]);
  });

  it('trims keys', () => {
    expect(validatePropKeys([pk('  Platform  ')])).toEqual([{ key: 'Platform' }]);
  });

  it('rejects non-array input', () => {
    expect(validatePropKeys('nope')).toBe('Prop keys must be an array');
    expect(validatePropKeys(null)).toBe('Prop keys must be an array');
  });

  it(`rejects more than ${MAX_PROP_KEYS} keys`, () => {
    const tooMany = Array.from({ length: MAX_PROP_KEYS + 1 }, (_, i) => pk(`k${i}`));
    expect(validatePropKeys(tooMany)).toBe(`Maximum ${MAX_PROP_KEYS} prop keys allowed`);
  });

  it('rejects non-object entries', () => {
    expect(validatePropKeys([42])).toBe('Each prop key must be a { key, iconSet? } object');
    expect(validatePropKeys(['Platform'])).toBe('Each prop key must be a { key, iconSet? } object');
  });

  it('rejects entries without a string key', () => {
    expect(validatePropKeys([{ key: 42 }])).toBe('Each prop key must have a string key');
  });

  it('rejects empty key strings', () => {
    expect(validatePropKeys([pk('')])).toBe('Prop keys must not be empty');
  });

  it('rejects whitespace-only key strings', () => {
    expect(validatePropKeys([pk('  ')])).toBe('Prop keys must not be empty');
  });

  it(`rejects key exceeding ${MAX_KEY_LENGTH} characters`, () => {
    const longKey = 'k'.repeat(MAX_KEY_LENGTH + 1);
    expect(validatePropKeys([pk(longKey)])).toBe(
      `Key "${longKey}" exceeds ${MAX_KEY_LENGTH} characters`,
    );
  });

  it('rejects duplicate keys (case-insensitive)', () => {
    expect(validatePropKeys([pk('Platform'), pk('platform')])).toBe('Duplicate key "platform"');
  });

  it('rejects unknown icon set slug when known sets provided', () => {
    const knownSets = new Set(['gaming-platforms']);
    expect(validatePropKeys([pk('Platform', 'nonexistent')], knownSets)).toBe(
      'Unknown icon set "nonexistent" for key "Platform"',
    );
  });

  it('allows any icon set slug when no known sets provided', () => {
    const result = validatePropKeys([pk('Platform', 'anything')]);
    expect(result).toEqual([{ key: 'Platform', iconSet: 'anything' }]);
  });

  it('strips empty iconSet values', () => {
    const result = validatePropKeys([{ key: 'Platform', iconSet: '' }]);
    expect(result).toEqual([{ key: 'Platform' }]);
  });

  it('strips null iconSet values', () => {
    const result = validatePropKeys([{ key: 'Platform', iconSet: null }]);
    expect(result).toEqual([{ key: 'Platform' }]);
  });
});

describe('findDuplicateKeys', () => {
  it('returns empty set when no duplicates', () => {
    const result = findDuplicateKeys([
      { key: 'Platform', value: 'PC' },
      { key: 'Year', value: '2024' },
    ]);
    expect(result.size).toBe(0);
  });

  it('returns empty set for empty array', () => {
    expect(findDuplicateKeys([]).size).toBe(0);
  });

  it('detects case-insensitive duplicates', () => {
    const result = findDuplicateKeys([
      { key: 'Platform', value: 'PC' },
      { key: 'platform', value: 'Switch' },
    ]);
    expect(result.has('platform')).toBe(true);
    expect(result.size).toBe(1);
  });

  it('ignores empty keys', () => {
    const result = findDuplicateKeys([
      { key: '', value: 'a' },
      { key: '', value: 'b' },
    ]);
    expect(result.size).toBe(0);
  });

  it('ignores whitespace-only keys', () => {
    const result = findDuplicateKeys([
      { key: '  ', value: 'a' },
      { key: '  ', value: 'b' },
    ]);
    expect(result.size).toBe(0);
  });

  it('trims keys before comparing', () => {
    const result = findDuplicateKeys([
      { key: ' Platform ', value: 'PC' },
      { key: 'platform', value: 'Switch' },
    ]);
    expect(result.has('platform')).toBe(true);
  });
});

describe('filterSuggestions', () => {
  const keys = ['Platform', 'Genre', 'Year'];

  it('returns all keys when query is empty and none are used', () => {
    expect(filterSuggestions(keys, '', [])).toEqual(['Platform', 'Genre', 'Year']);
  });

  it('filters by substring match (case-insensitive)', () => {
    expect(filterSuggestions(keys, 'plat', [])).toEqual(['Platform']);
  });

  it('excludes already-used keys (case-insensitive)', () => {
    expect(filterSuggestions(keys, '', ['platform'])).toEqual(['Genre', 'Year']);
  });

  it('combines query filter and used-key exclusion', () => {
    expect(filterSuggestions(keys, 'e', ['genre'])).toEqual(['Year']);
  });

  it('returns empty array when no suggestions match', () => {
    expect(filterSuggestions(keys, 'zzz', [])).toEqual([]);
  });

  it('returns empty array when suggestedKeys is empty', () => {
    expect(filterSuggestions([], 'anything', [])).toEqual([]);
  });

  it('trims used keys before comparing', () => {
    expect(filterSuggestions(keys, '', ['  Platform  '])).toEqual(['Genre', 'Year']);
  });

  it('ignores empty used keys', () => {
    expect(filterSuggestions(keys, '', ['', '  '])).toEqual(['Platform', 'Genre', 'Year']);
  });
});

describe('isNonStandardKey', () => {
  const keys = ['Platform', 'Genre'];

  it('returns false for a matching key (case-insensitive)', () => {
    expect(isNonStandardKey('Platform', keys)).toBe(false);
    expect(isNonStandardKey('platform', keys)).toBe(false);
    expect(isNonStandardKey('GENRE', keys)).toBe(false);
  });

  it('returns true for a non-matching key', () => {
    expect(isNonStandardKey('Year', keys)).toBe(true);
    expect(isNonStandardKey('Custom', keys)).toBe(true);
  });

  it('returns false for empty key', () => {
    expect(isNonStandardKey('', keys)).toBe(false);
    expect(isNonStandardKey('  ', keys)).toBe(false);
  });

  it('returns false when suggestedKeys is empty', () => {
    expect(isNonStandardKey('anything', [])).toBe(false);
  });

  it('trims key before comparing', () => {
    expect(isNonStandardKey('  Platform  ', keys)).toBe(false);
    expect(isNonStandardKey('  Custom  ', keys)).toBe(true);
  });
});
