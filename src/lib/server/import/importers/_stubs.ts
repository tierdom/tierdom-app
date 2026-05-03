import type { Importer } from '../types';

const ISSUE_BASE = 'https://github.com/tierdom/tierdom-app/issues';

export const metacriticImporter: Importer = {
  id: 'metacritic',
  label: 'Metacritic',
  description: 'Import scored films, shows, or games from a Metacritic profile.',
  status: 'stub',
  stubInfo: {
    sampleNeeded: true,
    issueUrl: `${ISSUE_BASE}?q=is%3Aissue%20metacritic`,
  },
};

export const tmdbImporter: Importer = {
  id: 'tmdb',
  label: 'TMDb',
  description: 'Import a watchlist or rated list from The Movie Database.',
  status: 'stub',
  stubInfo: {
    sampleNeeded: true,
    issueUrl: `${ISSUE_BASE}?q=is%3Aissue%20tmdb`,
  },
};

export const rottenTomatoesImporter: Importer = {
  id: 'rotten-tomatoes',
  label: 'Rotten Tomatoes',
  description: 'Import scored films and shows from a Rotten Tomatoes profile.',
  status: 'stub',
  stubInfo: {
    sampleNeeded: true,
    issueUrl: `${ISSUE_BASE}?q=is%3Aissue%20rotten%20tomatoes`,
  },
};
