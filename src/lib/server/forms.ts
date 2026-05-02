import { slugify } from '$lib/server/slugify';
import type { Tier } from '$lib/tier';
import { type Prop, type PropKeyConfig, validateProps, validatePropKeys } from '$lib/props';

type ReturnTarget = 'categories' | 'items';

export type CategoryFormResult =
  | { error: string }
  | {
      name: string;
      slug: string;
      description: string | null;
      propKeys: PropKeyConfig[];
      cutoffs: Record<`cutoff${Tier}`, number | null>;
    };

export function parseCategoryForm(
  data: FormData,
  knownIconSetSlugs?: Set<string>,
): CategoryFormResult {
  const name = data.get('name')?.toString()?.trim();
  if (!name) return { error: 'Name is required' };

  const slug = data.get('slug')?.toString()?.trim() || slugify(name);
  const description = data.get('description')?.toString()?.trim() || null;

  let propKeys: PropKeyConfig[] = [];
  const propKeysRaw = data.get('propKeys')?.toString()?.trim();
  if (propKeysRaw) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(propKeysRaw);
    } catch {
      return { error: 'Invalid properties format' };
    }
    const result = validatePropKeys(parsed, knownIconSetSlugs);
    if (typeof result === 'string') return { error: result };
    propKeys = result;
  }

  const cutoffs = {} as Record<`cutoff${Tier}`, number | null>;
  for (const tier of ['S', 'A', 'B', 'C', 'D', 'E', 'F'] as Tier[]) {
    const raw = data.get(`cutoff${tier}`)?.toString()?.trim();
    cutoffs[`cutoff${tier}`] = raw ? Number(raw) : null;
  }

  return { name, slug, description, propKeys, cutoffs };
}

export type ItemFormResult =
  | { error: string }
  | {
      name: string;
      slug: string;
      score: number;
      categoryId: string;
      description: string | null;
      props: Prop[];
      returnTarget: ReturnTarget;
    };

export function parseItemForm(data: FormData): ItemFormResult {
  const name = data.get('name')?.toString()?.trim();
  if (!name) return { error: 'Name is required' };

  const slug = data.get('slug')?.toString()?.trim() || slugify(name);
  const score = Math.round(Number(data.get('score')));
  if (isNaN(score) || score < 0 || score > 100) {
    return { error: 'Score must be an integer 0-100' };
  }

  const categoryId = data.get('categoryId')?.toString();
  if (!categoryId) {
    return { error: 'Category is required' };
  }

  let props: Prop[] = [];
  const propsRaw = data.get('props')?.toString()?.trim();
  if (propsRaw) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(propsRaw);
    } catch {
      return { error: 'Invalid props format' };
    }
    const result = validateProps(parsed);
    if (typeof result === 'string') return { error: result };
    props = result;
  }

  return {
    name,
    slug,
    score,
    categoryId,
    description: data.get('description')?.toString()?.trim() || null,
    props,
    returnTarget: (data.get('_returnTarget')?.toString() === 'categories'
      ? 'categories'
      : 'items') as ReturnTarget,
  };
}
