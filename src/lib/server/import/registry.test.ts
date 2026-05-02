import { describe, expect, it } from 'vitest';
import { importers, getImporter, getImporterSummaries } from './registry';

describe('import registry', () => {
  it('exposes all known importers in the expected order', () => {
    expect(importers.map((i) => i.id)).toEqual(['json', 'goodreads', 'bgg', 'imdb']);
  });

  it('marks the JSON and IMDb importers as available and the rest as stubs', () => {
    for (const id of ['json', 'imdb']) {
      expect(getImporter(id)?.status).toBe('available');
    }
    for (const id of ['goodreads', 'bgg']) {
      expect(getImporter(id)?.status).toBe('stub');
    }
  });

  it('every stub points at the issue search page for that source', () => {
    for (const importer of importers) {
      if (importer.status !== 'stub') continue;
      expect(importer.stubInfo?.issueUrl).toMatch(
        /^https:\/\/github\.com\/tierdom\/tierdom-app\/issues\?q=/,
      );
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
