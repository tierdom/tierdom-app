import { describe, expect, it } from 'vitest';
import { importers, getImporter, getImporterSummaries } from './registry';

describe('import registry', () => {
  it('exposes all known importers in the expected order', () => {
    expect(importers.map((i) => i.id)).toEqual(['json', 'goodreads', 'bgg', 'imdb', 'storygraph']);
  });

  it('marks every importer as available', () => {
    for (const id of ['json', 'imdb', 'goodreads', 'bgg', 'storygraph']) {
      expect(getImporter(id)?.status).toBe('available');
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
