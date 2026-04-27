import { error, fail } from '@sveltejs/kit';
import { getImporter } from '$lib/server/import/registry';
import { MAX_JSON_BYTES } from '$lib/server/import/importers/json';
import type { MergeStrategy } from '$lib/server/import/types';
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
    if (!importer || importer.status !== 'available' || !importer.run) {
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

    const strategy: MergeStrategy = strategyRaw === 'upsert' ? 'upsert' : 'skip';
    const result = await importer.run(file, { strategy });

    return { result, strategy, filename: file.name };
  }
};
