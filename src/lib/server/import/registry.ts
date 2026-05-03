import type { Importer, ImporterSummary } from './types';
import { tierdomJsonImporter } from './importers/tierdomJson';
import { goodreadsImporter } from './importers/goodreads';
import { bggImporter } from './importers/bgg';
import { imdbImporter } from './importers/imdb';
import { storygraphImporter } from './importers/storygraph';

export const importers: Importer[] = [
  tierdomJsonImporter,
  goodreadsImporter,
  bggImporter,
  imdbImporter,
  storygraphImporter,
];

export function getImporter(id: string): Importer | undefined {
  return importers.find((i) => i.id === id);
}

export function getImporterSummaries(): ImporterSummary[] {
  return importers.map(({ id, label, description, status, stubInfo }) => ({
    id,
    label,
    description,
    status,
    stubInfo,
  }));
}
