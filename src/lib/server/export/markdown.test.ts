import { describe, expect, it } from 'vitest';
import { renderCategoryMarkdown } from './markdown';
import type { ExportedCategory, ExportedItem } from './json-schema';

function makeItem(overrides: Partial<ExportedItem> = {}): ExportedItem {
  return {
    id: 'item-id',
    slug: 'item-slug',
    name: 'Item',
    description: null,
    score: 50,
    order: 0,
    imageHash: null,
    placeholder: null,
    props: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

function makeCategory(
  items: ExportedItem[],
  overrides: Partial<ExportedCategory> = {}
): ExportedCategory {
  return {
    id: 'cat-id',
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
    propKeys: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    items,
    ...overrides
  };
}

describe('renderCategoryMarkdown', () => {
  it('emits front matter, heading, and a tier-list table', () => {
    const md = renderCategoryMarkdown(
      makeCategory([
        makeItem({ id: 'a', slug: 'inception', name: 'Inception', score: 95, order: 0 })
      ]),
      { includeImages: false }
    );

    expect(md).toContain('---\ntitle: "Movies"\nslug: "movies"\nitemCount: 1\n---');
    expect(md).toContain('# Movies');
    expect(md).toContain('| Tier | Image | Name | Score | Description |');
    expect(md).toContain('|------|-------|------|-------|-------------|');
    expect(md).toContain('| S |  | Inception | 95 |  |');
  });

  it('renders an image link relative to ../images/ when includeImages is true', () => {
    const md = renderCategoryMarkdown(
      makeCategory([makeItem({ name: 'Hades', score: 92, imageHash: 'abc123def456' })]),
      { includeImages: true }
    );

    expect(md).toContain('![Hades](../images/abc123def456.webp)');
  });

  it('omits image links when includeImages is false even if imageHash is set', () => {
    const md = renderCategoryMarkdown(
      makeCategory([makeItem({ name: 'Hades', score: 92, imageHash: 'abc123def456' })]),
      { includeImages: false }
    );

    expect(md).not.toContain('../images/');
  });

  it('omits image cell content when imageHash is null even with includeImages on', () => {
    const md = renderCategoryMarkdown(
      makeCategory([makeItem({ name: 'No image', score: 50, imageHash: null })]),
      { includeImages: true }
    );

    expect(md).toContain('| D |  | No image | 50 |  |');
  });

  it('orders rows by tier S→F, then by item.order, then by id', () => {
    const md = renderCategoryMarkdown(
      makeCategory([
        makeItem({ id: '3', name: 'F-thing', score: 5, order: 0 }),
        makeItem({ id: '2', name: 'S-second', score: 95, order: 1 }),
        makeItem({ id: '1', name: 'S-first', score: 95, order: 0 }),
        makeItem({ id: '4', name: 'A-thing', score: 85, order: 0 })
      ]),
      { includeImages: false }
    );

    const rows = md
      .split('\n')
      .filter((line) => line.startsWith('| ') && !line.startsWith('| Tier'));
    // First row is the header separator already filtered above, so these are data rows.
    expect(rows.map((r) => r.split(' | ')[2])).toEqual([
      'S-first',
      'S-second',
      'A-thing',
      'F-thing'
    ]);
  });

  it('sorts ties on identical order by id ascending', () => {
    const md = renderCategoryMarkdown(
      makeCategory([
        makeItem({ id: 'b', name: 'B-name', score: 95, order: 0 }),
        makeItem({ id: 'a', name: 'A-name', score: 95, order: 0 })
      ]),
      { includeImages: false }
    );
    const rows = md
      .split('\n')
      .filter((line) => line.startsWith('| ') && !line.startsWith('| Tier'));
    expect(rows.map((r) => r.split(' | ')[2])).toEqual(['A-name', 'B-name']);
  });

  it('escapes pipe characters and collapses newlines in cell text', () => {
    const md = renderCategoryMarkdown(
      makeCategory([
        makeItem({
          name: 'Pipe|name',
          score: 50,
          description: 'Line one\nLine two | with pipe'
        })
      ]),
      { includeImages: false }
    );
    expect(md).toContain('Pipe\\|name');
    expect(md).toContain('Line one Line two \\| with pipe');
    // Description must not introduce a newline mid-row
    const dataRow = md
      .split('\n')
      .find((line) => line.startsWith('| C |') || line.startsWith('| D |'));
    expect(dataRow).toBeDefined();
    expect(dataRow!.includes('\n')).toBe(false);
  });

  it('respects per-category cutoffs when present', () => {
    const md = renderCategoryMarkdown(
      makeCategory([makeItem({ name: 'Mid', score: 60 })], {
        cutoffS: 50,
        cutoffA: 40,
        cutoffB: 30,
        cutoffC: 20,
        cutoffD: 10,
        cutoffE: 5,
        cutoffF: 0
      }),
      { includeImages: false }
    );
    expect(md).toContain('| S |  | Mid | 60 |');
  });

  it('renders a category description as a blockquote above the table', () => {
    const md = renderCategoryMarkdown(
      makeCategory([], { description: 'Top picks of the year.\nUpdated quarterly.' }),
      { includeImages: false }
    );
    expect(md).toContain('> Top picks of the year.\n> Updated quarterly.');
    // Heading still precedes the blockquote
    expect(md.indexOf('# Movies')).toBeLessThan(md.indexOf('> Top picks'));
    expect(md.indexOf('> Updated quarterly.')).toBeLessThan(md.indexOf('| Tier |'));
  });

  it('renders an empty category as a header + table with no data rows', () => {
    const md = renderCategoryMarkdown(makeCategory([]), { includeImages: false });
    expect(md).toContain('itemCount: 0');
    expect(md).toContain('| Tier | Image | Name | Score | Description |');
    const dataRows = md
      .split('\n')
      .filter(
        (line) => line.startsWith('| ') && !line.startsWith('| Tier') && !line.startsWith('|---')
      );
    expect(dataRows).toEqual([]);
  });
});
