import { describe, expect, it } from 'vitest';
import { validateProps, MAX_PROPS, MAX_KEY_LENGTH, MAX_VALUE_LENGTH } from './props';

describe('validateProps', () => {
  it('accepts an empty array', () => {
    expect(validateProps([])).toEqual([]);
  });

  it('accepts valid props', () => {
    const result = validateProps([
      { key: 'Platform', value: 'PC' },
      { key: 'Year', value: '2024' }
    ]);
    expect(result).toEqual([
      { key: 'Platform', value: 'PC' },
      { key: 'Year', value: '2024' }
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
      value: `v${i}`
    }));
    expect(validateProps(tooMany)).toBe(`Maximum ${MAX_PROPS} props allowed`);
  });

  it(`accepts exactly ${MAX_PROPS} props`, () => {
    const exact = Array.from({ length: MAX_PROPS }, (_, i) => ({
      key: `k${i}`,
      value: `v${i}`
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
      'Each prop must have a non-empty value'
    );
  });

  it('rejects non-string value', () => {
    expect(validateProps([{ key: 'k', value: 42 }])).toBe('Each prop must have a non-empty value');
  });

  it(`rejects key exceeding ${MAX_KEY_LENGTH} characters`, () => {
    const longKey = 'k'.repeat(MAX_KEY_LENGTH + 1);
    expect(validateProps([{ key: longKey, value: 'v' }])).toBe(
      `Key "${longKey}" exceeds ${MAX_KEY_LENGTH} characters`
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
      `Value for "k" exceeds ${MAX_VALUE_LENGTH} characters`
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
        { key: 'platform', value: 'Switch' }
      ])
    ).toBe('Duplicate key "platform"');
  });

  it('allows different keys', () => {
    const result = validateProps([
      { key: 'Platform', value: 'PC' },
      { key: 'Year', value: '2024' }
    ]);
    expect(Array.isArray(result)).toBe(true);
  });
});
