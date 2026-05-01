import { error, fail } from '@sveltejs/kit';
import { asc, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { categoryTable } from '$lib/server/db/schema';
import { getImporter } from '$lib/server/import/registry';
import { MAX_JSON_BYTES } from '$lib/server/import/validate';
import { deleteImportTemp } from '$lib/server/import/temp-storage';
import type { CategoryMapping, MergeStrategy } from '$lib/server/import/types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
  const importer = getImporter(params.importerId);
  if (!importer) {
    error(404, `No importer with id "${params.importerId}".`);
  }
  const { id, label, description, status, accept, stubInfo } = importer;
  const existingCategories =
    importer.status === 'available'
      ? db
          .select({ id: categoryTable.id, slug: categoryTable.slug, name: categoryTable.name })
          .from(categoryTable)
          .where(isNull(categoryTable.deletedAt))
          .orderBy(asc(categoryTable.slug))
          .all()
      : [];
  return {
    importer: { id, label, description, status, accept, stubInfo },
    maxBytes: MAX_JSON_BYTES,
    existingCategories,
  };
};

function requireImporter(importerId: string) {
  const importer = getImporter(importerId);
  if (!importer || importer.status !== 'available' || !importer.plan || !importer.commit) {
    error(404, `No importer with id "${importerId}".`);
  }
  return importer;
}

export const actions: Actions = {
  plan: async ({ params, request }) => {
    const importer = requireImporter(params.importerId);
    const data = await request.formData();
    const file = data.get('file');

    if (!(file instanceof File) || file.size === 0) {
      return fail(400, { message: 'Pick a file to import.' });
    }
    if (file.size > MAX_JSON_BYTES) {
      return fail(413, {
        message: `File is too large (${file.size} bytes). Maximum is ${MAX_JSON_BYTES} bytes.`,
      });
    }

    const plan = await importer.plan!(file);
    if (plan.errors.length > 0 || !plan.planId) {
      // Surface validation errors using the same `result` shape the result
      // page already understands — no need for a dedicated error widget.
      return {
        result: {
          inserted: { categories: 0, items: 0 },
          updated: { categories: 0, items: 0 },
          skipped: { categories: 0, items: 0 },
          details: { inserted: [], updated: [], skipped: [] },
          errors: plan.errors,
        },
        strategy: 'skip' as MergeStrategy,
        filename: file.name,
      };
    }

    return { plan, filename: file.name };
  },

  commit: async ({ params, request }) => {
    const importer = requireImporter(params.importerId);
    const data = await request.formData();
    const planId = String(data.get('planId') ?? '');
    const filename = String(data.get('filename') ?? '');
    const strategyRaw = data.get('strategy');
    const strategy: MergeStrategy = strategyRaw === 'overwrite' ? 'overwrite' : 'skip';

    const fileSlugs = data.getAll('fileSlug').map(String);
    const actions = data.getAll('action').map(String);
    const targetIds = data.getAll('targetId').map(String);
    const newSlugs = data.getAll('newSlug').map(String);
    const newNames = data.getAll('newName').map(String);

    if (
      fileSlugs.length === 0 ||
      fileSlugs.length !== actions.length ||
      fileSlugs.length !== targetIds.length ||
      fileSlugs.length !== newSlugs.length ||
      fileSlugs.length !== newNames.length
    ) {
      return fail(400, { message: 'Malformed mapping form data.' });
    }

    const mappings: CategoryMapping[] = fileSlugs.map((fileSlug, i) => {
      if (actions[i] === 'skip') {
        return { fileSlug, action: 'skip' };
      }
      if (actions[i] === 'use-existing') {
        return { fileSlug, action: 'use-existing', targetId: targetIds[i] };
      }
      return { fileSlug, action: 'create-new', slug: newSlugs[i], name: newNames[i] };
    });

    const result = await importer.commit!(planId, mappings, strategy);
    return { result, strategy, filename };
  },

  cancel: async ({ request }) => {
    const data = await request.formData();
    const planId = String(data.get('planId') ?? '');
    if (planId) {
      try {
        deleteImportTemp(planId);
      } catch {
        // Best-effort cleanup; an invalid id just means there's nothing to remove.
      }
    }
    return { cancelled: true };
  },
};
