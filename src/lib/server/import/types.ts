export type MergeStrategy = 'skip' | 'overwrite';

export type ImporterStatus = 'available' | 'stub';

export interface ProposedCategory {
  fileSlug: string;
  fileName: string;
  itemCount: number;
  matchedExistingId: string | null;
  matchedExistingName: string | null;
}

export interface ImportPlan {
  planId: string;
  categories: ProposedCategory[];
  errors: string[];
}

export type CategoryMapping =
  | { fileSlug: string; action: 'use-existing'; targetId: string }
  | { fileSlug: string; action: 'create-new'; slug: string; name: string }
  | { fileSlug: string; action: 'skip' };

export interface ImportResult {
  inserted: { categories: number; items: number };
  updated: { categories: number; items: number };
  skipped: { categories: number; items: number };
  /**
   * Human-readable slug-based paths for each row touched, grouped by action.
   * Example: `categories/books/items/influence-…`.
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
  plan?: (file: File) => Promise<ImportPlan>;
  commit?: (
    planId: string,
    mappings: CategoryMapping[],
    strategy: MergeStrategy
  ) => Promise<ImportResult>;
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
    inserted: { categories: 0, items: 0 },
    updated: { categories: 0, items: 0 },
    skipped: { categories: 0, items: 0 },
    details: { inserted: [], updated: [], skipped: [] },
    errors: []
  };
}

export function emptyPlan(planId: string, errors: string[] = []): ImportPlan {
  return { planId, categories: [], errors };
}
