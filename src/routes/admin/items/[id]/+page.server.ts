import { db } from '$lib/server/db';
import { category, tierListItem } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { insertByScore } from '$lib/server/reorder';
import { join } from 'node:path';
import { env } from '$env/dynamic/private';
import { processUpload, deleteImage } from '$lib/server/images';
import { generateImage } from '$lib/server/generate-image';
import { parseItemForm } from '$lib/server/forms';
import type { PageServerLoad, Actions } from './$types';

type ReturnTarget = 'categories' | 'items';

function resolveReturnUrl(target: ReturnTarget, categoryId: string): string {
  return target === 'categories' ? `/admin/categories/${categoryId}` : '/admin/items';
}

async function handleImage(data: FormData) {
  const imageFile = data.get('image') as File | null;
  const wantsRemoveImage = data.get('removeImage') === '1';
  const wantsGenerate = data.get('generateImage') === '1';

  if (imageFile && imageFile.size > 0) {
    const result = await processUpload(imageFile);
    return { imageHash: result.hash, placeholder: result.gradient } as const;
  } else if (wantsGenerate) {
    const name = data.get('name')?.toString()?.trim();
    if (!name) return undefined;
    const result = await generateImage(name, join(env.DATA_PATH!, 'images'));
    return { imageHash: result.hash, placeholder: result.gradient } as const;
  } else if (wantsRemoveImage) {
    return { imageHash: null, placeholder: null } as const;
  }

  return undefined;
}

export const load: PageServerLoad = async ({ params, url }) => {
  const isNew = params.id === 'new-item';
  const returnTarget: ReturnTarget =
    url.searchParams.get('returnTo') === 'categories' ? 'categories' : 'items';
  const categories = await db
    .select({ id: category.id, name: category.name })
    .from(category)
    .orderBy(asc(category.order));

  if (isNew) {
    const prefillCategoryId = url.searchParams.get('category') || null;
    return {
      mode: 'create' as const,
      categories,
      prefillCategoryId,
      returnTarget,
      backUrl: prefillCategoryId
        ? resolveReturnUrl(returnTarget, prefillCategoryId)
        : '/admin/items'
    };
  }

  const id = params.id;
  const [item] = await db.select().from(tierListItem).where(eq(tierListItem.id, id)).limit(1);
  if (!item) error(404, 'Item not found');

  return {
    mode: 'edit' as const,
    item,
    categories,
    returnTarget,
    backUrl: resolveReturnUrl(returnTarget, item.categoryId)
  };
};

export const actions: Actions = {
  save: async ({ request, params }) => {
    const data = await request.formData();
    const parsed = parseItemForm(data);
    if ('error' in parsed) return fail(400, { error: parsed.error });

    const { name, slug, score, categoryId, description, returnTarget } = parsed;

    let image: { imageHash: string | null; placeholder: string | null } | undefined;
    try {
      image = await handleImage(data);
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : 'Image upload failed' });
    }

    if (params.id === 'new-item') {
      const [inserted] = await db
        .insert(tierListItem)
        .values({
          categoryId,
          slug,
          name,
          description,
          score,
          order: 0,
          ...(image && { imageHash: image.imageHash, placeholder: image.placeholder })
        })
        .returning({ id: tierListItem.id });

      const order = insertByScore(categoryId, score, name, inserted.id);
      await db.update(tierListItem).set({ order }).where(eq(tierListItem.id, inserted.id));

      redirect(303, resolveReturnUrl(returnTarget, categoryId));
    }

    // Update
    const id = params.id;
    const [item] = await db
      .select({ categoryId: tierListItem.categoryId, imageHash: tierListItem.imageHash })
      .from(tierListItem)
      .where(eq(tierListItem.id, id))
      .limit(1);

    if (image && item.imageHash && item.imageHash !== image.imageHash) {
      deleteImage(item.imageHash);
    }

    await db
      .update(tierListItem)
      .set({
        name,
        slug,
        score,
        description,
        categoryId,
        ...(image && { imageHash: image.imageHash, placeholder: image.placeholder })
      })
      .where(eq(tierListItem.id, id));

    if (categoryId !== item.categoryId) {
      const newOrder = insertByScore(categoryId, score, name, id);
      await db.update(tierListItem).set({ order: newOrder }).where(eq(tierListItem.id, id));
    }

    redirect(303, resolveReturnUrl(returnTarget, categoryId));
  },

  delete: async ({ request, params }) => {
    if (params.id === 'new-item') return fail(400, { error: 'Cannot delete a new item' });

    const id = params.id;
    const data = await request.formData();
    const returnTarget: ReturnTarget =
      data.get('_returnTarget')?.toString() === 'categories' ? 'categories' : 'items';

    const [item] = await db
      .select({ categoryId: tierListItem.categoryId, imageHash: tierListItem.imageHash })
      .from(tierListItem)
      .where(eq(tierListItem.id, id))
      .limit(1);

    if (item?.imageHash) deleteImage(item.imageHash);
    await db.delete(tierListItem).where(eq(tierListItem.id, id));
    redirect(303, resolveReturnUrl(returnTarget, item?.categoryId ?? ''));
  }
};
