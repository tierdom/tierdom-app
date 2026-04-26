import type { Prop, PropKeyConfig } from '$lib/props';

export const EXPORT_SCHEMA_VERSION = 1;

export interface ExportedPage {
  slug: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportedSiteSetting {
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportedItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  score: number;
  order: number;
  imageHash: string | null;
  placeholder: string | null;
  props: Prop[];
  createdAt: string;
  updatedAt: string;
}

export interface ExportedCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  order: number;
  cutoffS: number | null;
  cutoffA: number | null;
  cutoffB: number | null;
  cutoffC: number | null;
  cutoffD: number | null;
  cutoffE: number | null;
  cutoffF: number | null;
  propKeys: PropKeyConfig[];
  createdAt: string;
  updatedAt: string;
  items: ExportedItem[];
}

export interface ExportData {
  schemaVersion: typeof EXPORT_SCHEMA_VERSION;
  appVersion: string;
  exportedAt: string;
  data: {
    pages: ExportedPage[];
    siteSettings: ExportedSiteSetting[];
    categories: ExportedCategory[];
  };
}

export interface ExportManifest {
  schemaVersion: typeof EXPORT_SCHEMA_VERSION;
  appVersion: string;
  exportedAt: string;
  contents: string[];
  counts: {
    pages?: number;
    siteSettings?: number;
    categories?: number;
    items?: number;
    images?: number;
    markdownFiles?: number;
  };
}
