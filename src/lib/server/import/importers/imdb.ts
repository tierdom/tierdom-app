import type { Importer } from '../types';

export const imdbImporter: Importer = {
  id: 'imdb',
  label: 'IMDb',
  description: 'Import a watchlist or ratings export from IMDb (CSV).',
  status: 'stub',
  stubInfo: {
    sampleNeeded: true,
    issueUrl: 'https://github.com/tierdom/tierdom-app/issues?q=is%3Aissue%20IMDb'
  }
};
