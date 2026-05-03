import { describe, expect, it } from 'vitest';
import { importers, getImporter, getImporterSummaries } from './registry';

describe('import registry', () => {
  it('exposes all known importers in the expected order', () => {
    expect(importers.map((i) => i.id)).toEqual([
      'json',
      'imdb',
      'tmdb',
      'rotten-tomatoes',
      'goodreads',
      'storygraph',
      'bgg',
      'metacritic',
    ]);
  });

  it('marks the implemented importers as available', () => {
    for (const id of ['json', 'imdb', 'goodreads', 'bgg', 'storygraph']) {
      expect(getImporter(id)?.status).toBe('available');
    }
  });

  it('marks the not-yet-built importers as stubs with sample-needed issue links', () => {
    for (const id of ['metacritic', 'tmdb', 'rotten-tomatoes']) {
      const importer = getImporter(id);
      expect(importer?.status).toBe('stub');
      expect(importer?.stubInfo?.sampleNeeded).toBe(true);
      expect(importer?.stubInfo?.issueUrl).toMatch(/^https:\/\/github\.com\//);
      expect(importer?.plan).toBeUndefined();
      expect(importer?.commit).toBeUndefined();
    }
  });

  it('summaries strip the run function but preserve metadata', () => {
    const summaries = getImporterSummaries();
    expect(summaries).toHaveLength(importers.length);
    for (const summary of summaries) {
      expect(summary).not.toHaveProperty('run');
    }
    expect(summaries[0]?.id).toBe('json');
  });

  it('getImporter returns undefined for unknown ids', () => {
    expect(getImporter('nope')).toBeUndefined();
  });
});
