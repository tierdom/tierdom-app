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
    ...overrides,
  };
}

function makeCategory(
  items: ExportedItem[],
  overrides: Partial<ExportedCategory> = {},
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
    ...overrides,
  };
}

describe('renderCategoryMarkdown', () => {
  it('emits front matter, blank line, heading, description and tier sections', () => {
    const md = renderCategoryMarkdown(
      makeCategory([makeItem({ id: 'a', name: 'Inception', score: 95 })], {
        description: 'Top picks.\nUpdated quarterly.',
      }),
    );

    expect(md).toContain('---\ntitle: "Movies"\nslug: "movies"\nitemCount: 1\n---\n\n# Movies');
    // Description renders verbatim — no blockquote prefix.
    expect(md).toContain('# Movies\n\nTop picks.\nUpdated quarterly.\n');
    expect(md).not.toContain('> Top picks.');
    expect(md).toContain('## S tier');
    expect(md).toContain('### Inception');
  });

  it('renders multi-paragraph category descriptions verbatim, not as a blockquote', () => {
    const description = [
      'Paragraph one.',
      '',
      '- bullet a',
      '- bullet b',
      '',
      '```',
      'code',
      '```',
    ].join('\n');
    const md = renderCategoryMarkdown(makeCategory([], { description }));
    expect(md).toContain(description);
    expect(md).not.toContain('> ');
  });

  it('renders the per-item stanza in the documented order', () => {
    const md = renderCategoryMarkdown(
      makeCategory([
        makeItem({
          name: 'Hades',
          score: 92,
          imageHash: 'abc123def456',
          props: [
            { key: 'developer', value: 'Supergiant' },
            { key: 'year', value: '2020' },
          ],
          description: 'A roguelike with **incredible** writing.\n\nThe combat is tight.',
        }),
      ]),
    );

    expect(md).toContain(
      [
        '### Hades',
        '',
        '<!-- abc123def456.webp -->',
        '',
        'Score: 92. developer: Supergiant. year: 2020',
        '',
        'A roguelike with **incredible** writing.',
        '',
        'The combat is tight.',
      ].join('\n'),
    );
  });

  it('omits the image-comment line when imageHash is null but always emits the score line', () => {
    const md = renderCategoryMarkdown(
      makeCategory([makeItem({ name: 'No image', score: 50, description: 'Plain.' })]),
    );
    expect(md).not.toContain('<!--');
    expect(md).toContain('### No image\n\nScore: 50\n\nPlain.\n');
  });

  it('emits the score line alone when there are no other props', () => {
    const md = renderCategoryMarkdown(
      makeCategory([makeItem({ name: 'Bare', score: 50, imageHash: 'h', description: 'desc' })]),
    );
    expect(md).toContain('### Bare\n\n<!-- h.webp -->\n\nScore: 50\n\ndesc\n');
  });

  it('always emits the score line even when there are no props and no description', () => {
    const md = renderCategoryMarkdown(
      makeCategory([
        makeItem({ name: 'A', score: 95, description: null }),
        makeItem({ id: 'b', name: 'B', score: 88, description: '   ' }),
      ]),
    );
    expect(md).toContain('### A\n\nScore: 95\n');
    expect(md).toContain('### B\n\nScore: 88\n');
  });

  it('preserves multi-line markdown descriptions verbatim — lists, fences, embedded tables', () => {
    const description = [
      'Paragraph one.',
      '',
      '- bullet a',
      '- bullet b',
      '',
      '```ts',
      'const x = 1;',
      '```',
      '',
      '| col | col |',
      '|-----|-----|',
      '| a   | b   |',
    ].join('\n');

    const md = renderCategoryMarkdown(
      makeCategory([makeItem({ name: 'Rich', score: 95, description })]),
    );

    expect(md).toContain(description);
  });

  it('renders all seven tier sections; empty tiers contain a placeholder paragraph', () => {
    const md = renderCategoryMarkdown(
      makeCategory([makeItem({ id: 'a', name: 'Top', score: 95 })]),
    );
    expect(md).toContain('## S tier\n\n### Top\n');
    for (const tier of ['A', 'B', 'C', 'D', 'E', 'F']) {
      expect(md).toContain(`## ${tier} tier\n\nNo items in this tier.\n`);
    }
  });

  it('omits all tier sections when the category has zero items', () => {
    const md = renderCategoryMarkdown(makeCategory([]));
    expect(md).toContain('itemCount: 0');
    expect(md).toContain('# Movies');
    expect(md).not.toContain('## S tier');
    expect(md).not.toContain('No items in this tier.');
  });

  it('orders items within and across tiers by tier S→F, then order, then id', () => {
    const md = renderCategoryMarkdown(
      makeCategory([
        makeItem({ id: '3', name: 'F-thing', score: 5 }),
        makeItem({ id: '2', name: 'S-second', score: 95, order: 1 }),
        makeItem({ id: '1', name: 'S-first', score: 95, order: 0 }),
        makeItem({ id: '4', name: 'A-thing', score: 85 }),
      ]),
    );

    const headings = md.match(/^### .+$/gm) ?? [];
    expect(headings).toEqual(['### S-first', '### S-second', '### A-thing', '### F-thing']);
  });

  it('respects per-category cutoffs', () => {
    const md = renderCategoryMarkdown(
      makeCategory([makeItem({ name: 'Mid', score: 60 })], {
        cutoffS: 50,
        cutoffA: 40,
        cutoffB: 30,
        cutoffC: 20,
        cutoffD: 10,
        cutoffE: 5,
        cutoffF: 0,
      }),
    );
    expect(md).toContain('## S tier\n\n### Mid\n\nScore: 60');
  });

  it('flattens newlines and CRs in item names so the H3 stays single-line', () => {
    const md = renderCategoryMarkdown(
      makeCategory([makeItem({ name: 'Line one\nLine two\r\nLine three\rLine four', score: 95 })]),
    );
    expect(md).toContain('### Line one Line two Line three Line four\n');
  });

  it('neutralizes "-->" inside item names so the image comment cannot be closed early', () => {
    const md = renderCategoryMarkdown(
      makeCategory([makeItem({ name: 'Sneaky --> <script>', score: 95, imageHash: 'h' })]),
    );
    expect(md).toContain('### Sneaky --&gt; <script>\n');
    expect(md).toContain('<!-- h.webp -->');
    // No bare "-->" anywhere in the heading line.
    expect(md).not.toMatch(/^### .*-->/m);
  });

  it('flattens newlines in prop values', () => {
    const md = renderCategoryMarkdown(
      makeCategory([
        makeItem({
          name: 'P',
          score: 95,
          props: [{ key: 'note', value: 'line one\nline two' }],
        }),
      ]),
    );
    expect(md).toContain('Score: 95. note: line one line two');
  });

  it('flattens newlines and neutralizes "-->" in the category H1 too', () => {
    const md = renderCategoryMarkdown(makeCategory([], { name: 'Multi\nLine --> Title' }));
    expect(md).toContain('# Multi Line --&gt; Title\n');
  });
});
