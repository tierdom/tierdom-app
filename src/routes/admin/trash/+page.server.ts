import { db } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import {
  SoftDeleteError,
  STALE_TRASH_DAYS,
  countStaleTrash,
  listTrashed,
  permanentlyDeleteCategory,
  permanentlyDeleteItem,
  restoreCategory,
  restoreItem
} from '$lib/server/db/soft-delete';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
  return {
    ...listTrashed(db),
    staleTrash: countStaleTrash(db),
    staleTrashDays: STALE_TRASH_DAYS
  };
};

function readId(data: FormData) {
  const id = data.get('id')?.toString();
  return id && id.length > 0 ? id : null;
}

export const actions: Actions = {
  restoreCategory: async ({ request }) => {
    const id = readId(await request.formData());
    if (!id) return fail(400, { error: 'Invalid id' });
    try {
      restoreCategory(db, id);
    } catch (e) {
      if (e instanceof SoftDeleteError) return fail(409, { error: e.message });
      throw e;
    }
    return { success: true };
  },

  restoreItem: async ({ request }) => {
    const id = readId(await request.formData());
    if (!id) return fail(400, { error: 'Invalid id' });
    try {
      restoreItem(db, id);
    } catch (e) {
      if (e instanceof SoftDeleteError) return fail(409, { error: e.message });
      throw e;
    }
    return { success: true };
  },

  permanentlyDeleteCategory: async ({ request }) => {
    const id = readId(await request.formData());
    if (!id) return fail(400, { error: 'Invalid id' });
    permanentlyDeleteCategory(db, id);
    return { success: true };
  },

  permanentlyDeleteItem: async ({ request }) => {
    const id = readId(await request.formData());
    if (!id) return fail(400, { error: 'Invalid id' });
    permanentlyDeleteItem(db, id);
    return { success: true };
  }
};
