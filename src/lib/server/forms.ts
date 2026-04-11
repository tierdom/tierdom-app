import { slugify } from '$lib/server/slugify';
import type { Tier } from '$lib/tier';

type ReturnTarget = 'categories' | 'items';

export type CategoryFormResult =
  | { error: string }
  | {
      name: string;
      slug: string;
      description: string | null;
      cutoffs: Record<`cutoff${Tier}`, number | null>;
    };

export function parseCategoryForm(data: FormData): CategoryFormResult {
  const name = data.get('name')?.toString()?.trim();
  if (!name) return { error: 'Name is required' };

  const slug = data.get('slug')?.toString()?.trim() || slugify(name);
  const description = data.get('description')?.toString()?.trim() || null;

  const cutoffs = {} as Record<`cutoff${Tier}`, number | null>;
  for (const tier of ['S', 'A', 'B', 'C', 'D', 'E', 'F'] as Tier[]) {
    const raw = data.get(`cutoff${tier}`)?.toString()?.trim();
    cutoffs[`cutoff${tier}`] = raw ? Number(raw) : null;
  }

  return { name, slug, description, cutoffs };
}

export type ItemFormResult =
  | { error: string }
  | {
      name: string;
      slug: string;
      score: number;
      categoryId: string;
      description: string | null;
      tagSlugs: string[];
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

  return {
    name,
    slug,
    score,
    categoryId,
    description: data.get('description')?.toString()?.trim() || null,
    tagSlugs: data.getAll('tags').map((s) => s.toString()),
    returnTarget: (data.get('_returnTarget')?.toString() === 'categories'
      ? 'categories'
      : 'items') as ReturnTarget
  };
}
