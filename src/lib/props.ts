export type Prop = { key: string; value: string };

export const MAX_PROPS = 10;
export const MAX_KEY_LENGTH = 64;
export const MAX_VALUE_LENGTH = 128;

export function findDuplicateKeys(props: Prop[]): Set<string> {
  const keys = props.map((p) => p.key.trim().toLowerCase()).filter(Boolean);
  return new Set(keys.filter((k, i) => keys.indexOf(k) !== i));
}

export function validateProps(raw: unknown): Prop[] | string {
  if (!Array.isArray(raw)) return 'Props must be an array';
  if (raw.length > MAX_PROPS) return `Maximum ${MAX_PROPS} props allowed`;

  const keys = new Set<string>();

  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) return 'Each prop must be an object';

    const { key, value } = entry as Record<string, unknown>;

    if (typeof key !== 'string' || !key.trim()) return 'Each prop must have a non-empty key';
    if (typeof value !== 'string' || !value.trim()) return 'Each prop must have a non-empty value';
    if (key.length > MAX_KEY_LENGTH) return `Key "${key}" exceeds ${MAX_KEY_LENGTH} characters`;
    if (value.length > MAX_VALUE_LENGTH)
      return `Value for "${key}" exceeds ${MAX_VALUE_LENGTH} characters`;

    const normalized = key.trim().toLowerCase();
    if (keys.has(normalized)) return `Duplicate key "${key}"`;
    keys.add(normalized);
  }

  return raw.map((e) => ({ key: (e as Prop).key.trim(), value: (e as Prop).value.trim() }));
}
