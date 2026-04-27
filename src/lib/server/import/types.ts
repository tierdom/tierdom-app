export type MergeStrategy = 'skip' | 'upsert';

export type ImporterStatus = 'available' | 'stub';

export interface ImportResult {
  inserted: { categories: number; items: number; pages: number; siteSettings: number };
  updated: { categories: number; items: number; pages: number; siteSettings: number };
  skipped: { categories: number; items: number; pages: number; siteSettings: number };
  errors: string[];
}

export interface Importer {
  id: string;
  label: string;
  description: string;
  status: ImporterStatus;
  accept?: string;
  run?: (file: File, opts: { strategy: MergeStrategy }) => Promise<ImportResult>;
  stubInfo?: {
    sampleNeeded: boolean;
    issueUrl: string;
  };
}

export interface ImporterSummary {
  id: string;
  label: string;
  description: string;
  status: ImporterStatus;
  stubInfo?: Importer['stubInfo'];
}

export function emptyResult(): ImportResult {
  return {
    inserted: { categories: 0, items: 0, pages: 0, siteSettings: 0 },
    updated: { categories: 0, items: 0, pages: 0, siteSettings: 0 },
    skipped: { categories: 0, items: 0, pages: 0, siteSettings: 0 },
    errors: []
  };
}
