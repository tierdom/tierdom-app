import type { Importer, ImporterSummary } from './types';
import { jsonImporter } from './importers/json';
import { goodreadsImporter } from './importers/goodreads';
import { bggImporter } from './importers/bgg';
import { imdbImporter } from './importers/imdb';

export const importers: Importer[] = [jsonImporter, goodreadsImporter, bggImporter, imdbImporter];

export function getImporter(id: string): Importer | undefined {
  return importers.find((i) => i.id === id);
}

export function getImporterSummaries(): ImporterSummary[] {
  return importers.map(({ id, label, description, status, stubInfo }) => ({
    id,
    label,
    description,
    status,
    stubInfo
  }));
}
