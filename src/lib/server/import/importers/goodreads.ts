import type { Importer } from '../types';

export const goodreadsImporter: Importer = {
  id: 'goodreads',
  label: 'Goodreads',
  description: 'Import a books library exported from Goodreads (CSV).',
  status: 'stub',
  stubInfo: {
    sampleNeeded: true,
    issueUrl: 'https://github.com/tierdom/tierdom-app/issues?q=is%3Aissue%20Goodreads'
  }
};
