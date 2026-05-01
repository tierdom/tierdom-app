import { describe, expect, it } from 'vitest';
import schema from './schema-v1.json';
import { EXPORT_SCHEMA_VERSION, type ExportData } from '$lib/server/export/json-schema';

const sampleExport: ExportData = {
  schemaVersion: EXPORT_SCHEMA_VERSION,
  appVersion: '0.0.0-test',
  exportedAt: '2026-04-27T00:00:00.000Z',
  data: {
    pages: [
      {
        slug: 'about',
        title: 'About',
        content: '# About',
        createdAt: '2026-04-27T00:00:00.000Z',
        updatedAt: '2026-04-27T00:00:00.000Z',
      },
    ],
    siteSettings: [
      {
        key: 'footer',
        value: 'My footer',
        createdAt: '2026-04-27T00:00:00.000Z',
        updatedAt: '2026-04-27T00:00:00.000Z',
      },
    ],
    categories: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        slug: 'movies',
        name: 'Movies',
        description: null,
        order: 0,
        cutoffS: null,
        cutoffA: null,
        cutoffB: null,
        cutoffC: null,
        cutoffD: null,
        cutoffE: null,
        cutoffF: null,
        propKeys: [{ key: 'Year' }],
        createdAt: '2026-04-27T00:00:00.000Z',
        updatedAt: '2026-04-27T00:00:00.000Z',
        items: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            slug: 'inception',
            name: 'Inception',
            description: null,
            score: 95,
            order: 0,
            imageHash: null,
            placeholder: null,
            props: [{ key: 'Year', value: '2010' }],
            createdAt: '2026-04-27T00:00:00.000Z',
            updatedAt: '2026-04-27T00:00:00.000Z',
          },
        ],
      },
    ],
  },
};

describe('schema-v1.json', () => {
  it('declares the canonical $id and JSON Schema dialect', () => {
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema.$id).toBe('https://tierdom.app/schemas/tierdom-import-v1.json');
    expect(schema.properties.schemaVersion.const).toBe(EXPORT_SCHEMA_VERSION);
  });

  it('every required key on a runtime ExportData is required by the schema', () => {
    const rootRequired = schema.required as string[];
    for (const key of rootRequired) {
      expect(sampleExport).toHaveProperty(key);
    }
    const dataRequired = schema.properties.data.required as string[];
    for (const key of dataRequired) {
      expect(sampleExport.data).toHaveProperty(key);
    }
    const catRequired = schema.$defs.Category.required as string[];
    for (const key of catRequired) {
      expect(sampleExport.data.categories[0]).toHaveProperty(key);
    }
    const itemRequired = schema.$defs.Item.required as string[];
    for (const key of itemRequired) {
      expect(sampleExport.data.categories[0].items[0]).toHaveProperty(key);
    }
    const pageRequired = schema.$defs.Page.required as string[];
    for (const key of pageRequired) {
      expect(sampleExport.data.pages[0]).toHaveProperty(key);
    }
    const settingRequired = schema.$defs.SiteSetting.required as string[];
    for (const key of settingRequired) {
      expect(sampleExport.data.siteSettings[0]).toHaveProperty(key);
    }
  });

  it('rejects unknown top-level keys via additionalProperties: false', () => {
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.data.additionalProperties).toBe(false);
    expect(schema.$defs.Item.additionalProperties).toBe(false);
    expect(schema.$defs.Category.additionalProperties).toBe(false);
  });
});
