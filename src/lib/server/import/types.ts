export type MergeStrategy = 'skip' | 'upsert';

export type ImporterStatus = 'available' | 'stub';

export interface ImportResult {
  inserted: { categories: number; items: number; pages: number; siteSettings: number };
  updated: { categories: number; items: number; pages: number; siteSettings: number };
  skipped: { categories: number; items: number; pages: number; siteSettings: number };
  /**
   * Human-readable paths for each row touched, grouped by action. Paths use
   * a slug-based convention so the importer's user can tell what landed
   * where without inspecting UUIDs. Examples:
   *   `pages/about`, `siteSettings/footer`,
   *   `categories/books`, `categories/books/items/influence-the-…`
   */
  details: {
    inserted: string[];
    updated: string[];
    skipped: string[];
  };
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
    details: { inserted: [], updated: [], skipped: [] },
    errors: []
  };
}
