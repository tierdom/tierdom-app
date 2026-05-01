import type { Importer } from '../types';

export const bggImporter: Importer = {
  id: 'bgg',
  label: 'BoardGameGeek',
  description: 'Import a board game collection exported from BoardGameGeek (CSV).',
  status: 'stub',
  stubInfo: {
    sampleNeeded: true,
    issueUrl: 'https://github.com/tierdom/tierdom-app/issues?q=is%3Aissue%20BoardGameGeek',
  },
};
