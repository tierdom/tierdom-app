import { error, fail } from '@sveltejs/kit';
import { getImporter } from '$lib/server/import/registry';
import { MAX_JSON_BYTES } from '$lib/server/import/validate';
import type { CategoryMapping, MergeStrategy } from '$lib/server/import/types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
  const importer = getImporter(params.importerId);
  if (!importer) {
    error(404, `No importer with id "${params.importerId}".`);
  }
  const { id, label, description, status, accept, stubInfo } = importer;
  return {
    importer: { id, label, description, status, accept, stubInfo },
    maxBytes: MAX_JSON_BYTES
  };
};

export const actions: Actions = {
  default: async ({ params, request }) => {
    const importer = getImporter(params.importerId);
    if (!importer || importer.status !== 'available' || !importer.plan || !importer.commit) {
      error(404, `No importer with id "${params.importerId}".`);
    }

    const data = await request.formData();
    const file = data.get('file');
    const strategyRaw = data.get('strategy');

    if (!(file instanceof File) || file.size === 0) {
      return fail(400, { message: 'Pick a file to import.' });
    }
    if (file.size > MAX_JSON_BYTES) {
      return fail(413, {
        message: `File is too large (${file.size} bytes). Maximum is ${MAX_JSON_BYTES} bytes.`
      });
    }

    const strategy: MergeStrategy = strategyRaw === 'overwrite' ? 'overwrite' : 'skip';
    const plan = await importer.plan(file);
    if (plan.errors.length > 0 || !plan.planId) {
      return {
        result: {
          inserted: { categories: 0, items: 0 },
          updated: { categories: 0, items: 0 },
          skipped: { categories: 0, items: 0 },
          details: { inserted: [], updated: [], skipped: [] },
          errors: plan.errors
        },
        strategy,
        filename: file.name
      };
    }

    // M2 wires the form straight through with the natural-default mapping
    // (re-use any active match by slug; otherwise create new with file's slug
    // and name). M3 will introduce a review screen between plan and commit.
    const mappings: CategoryMapping[] = plan.categories.map((c) =>
      c.matchedExistingId
        ? { fileSlug: c.fileSlug, action: 'use-existing', targetId: c.matchedExistingId }
        : { fileSlug: c.fileSlug, action: 'create-new', slug: c.fileSlug, name: c.fileName }
    );
    const result = await importer.commit(plan.planId, mappings, strategy);
    return { result, strategy, filename: file.name };
  }
};
