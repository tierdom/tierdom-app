import { getImporterSummaries } from '#lib/server/import/registry.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
  return { importers: getImporterSummaries() };
};
