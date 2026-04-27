import { error } from '@sveltejs/kit';
import { getImporter } from '$lib/server/import/registry';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
  const importer = getImporter(params.importerId);
  if (!importer) {
    error(404, `No importer with id "${params.importerId}".`);
  }
  const { id, label, description, status, accept, stubInfo } = importer;
  return {
    importer: { id, label, description, status, accept, stubInfo }
  };
};
