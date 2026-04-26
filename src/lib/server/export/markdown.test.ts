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
  it('emits front matter, blank line, heading, and a tier-list table', () => {
    const md = renderCategoryMarkdown(
      makeCategory([
        makeItem({ id: 'a', slug: 'inception', name: 'Inception', score: 95, order: 0 })
      ])
    );

    expect(md).toContain('---\ntitle: "Movies"\nslug: "movies"\nitemCount: 1\n---\n\n# Movies');
    expect(md).toContain('| Tier | Name | Score | Description |');
    expect(md).toContain('|------|------|-------|-------------|');
    expect(md).toContain('| S | Inception | 95 |');
  });

  it('embeds an HTML image-hash comment in front of the Name cell when imageHash is set', () => {
    const md = renderCategoryMarkdown(
      makeCategory([makeItem({ name: 'Hades', score: 92, imageHash: 'abc123def456' })])
    );

    expect(md).toContain('| S | <!-- abc123def456.webp --> Hades | 92 |');
    expect(md).not.toContain('| Image |');
    expect(md).not.toContain('../images/');
    expect(md).not.toContain('![');
  });

  it('omits the comment when imageHash is null', () => {
    const md = renderCategoryMarkdown(makeCategory([makeItem({ name: 'No image', score: 50 })]));
    expect(md).toContain('| D | No image | 50 |  |');
    expect(md).not.toContain('<!--');
  });

  it('renders a placeholder row for tiers that have no items', () => {
    const md = renderCategoryMarkdown(
      makeCategory([makeItem({ id: 'a', name: 'Top', score: 95 })])
    );
    // S has the item; A through F should each have a "tier | - | - |  " row.
    expect(md).toContain('| S | Top | 95 |  |');
    for (const tier of ['A', 'B', 'C', 'D', 'E', 'F']) {
      expect(md).toContain(`| ${tier} | - | - |   |`);
    }
  });

  it('omits the table entirely when the category has zero items', () => {
    const md = renderCategoryMarkdown(makeCategory([]));
    expect(md).toContain('itemCount: 0');
    expect(md).toContain('# Movies');
    expect(md).not.toContain('| Tier |');
    expect(md).not.toContain('|------|');
  });

  it('orders rows by tier S→F, then by item.order, then by id', () => {
    const md = renderCategoryMarkdown(
      makeCategory([
        makeItem({ id: '3', name: 'F-thing', score: 5, order: 0 }),
        makeItem({ id: '2', name: 'S-second', score: 95, order: 1 }),
        makeItem({ id: '1', name: 'S-first', score: 95, order: 0 }),
        makeItem({ id: '4', name: 'A-thing', score: 85, order: 0 })
      ])
    );

    const dataRows = md
      .split('\n')
      .filter(
        (line) => line.startsWith('| ') && !line.startsWith('| Tier') && !line.startsWith('|---')
      );
    // Pull the second pipe-separated cell (the Name column).
    const names = dataRows.map((r) => r.split(' | ')[1]);
    expect(names).toEqual([
      'S-first',
      'S-second',
      'A-thing',
      '-', // B placeholder
      '-', // C placeholder
      '-', // D placeholder
      '-', // E placeholder
      'F-thing'
    ]);
  });

  it('escapes pipe characters and collapses newlines in cell text', () => {
    const md = renderCategoryMarkdown(
      makeCategory([
        makeItem({
          name: 'Pipe|name',
          score: 50,
          description: 'Line one\nLine two | with pipe'
        })
      ])
    );
    expect(md).toContain('Pipe\\|name');
    expect(md).toContain('Line one Line two \\| with pipe');
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
      })
    );
    expect(md).toContain('| S | Mid | 60 |');
  });

  it('renders a category description as a blockquote above the table', () => {
    const md = renderCategoryMarkdown(
      makeCategory([makeItem({ name: 'Top', score: 95 })], {
        description: 'Top picks of the year.\nUpdated quarterly.'
      })
    );
    expect(md).toContain('> Top picks of the year.\n> Updated quarterly.');
    expect(md.indexOf('# Movies')).toBeLessThan(md.indexOf('> Top picks'));
    expect(md.indexOf('> Updated quarterly.')).toBeLessThan(md.indexOf('| Tier |'));
  });
});
