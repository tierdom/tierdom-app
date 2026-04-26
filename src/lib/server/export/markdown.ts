import { scoreToTier, type Tier } from '$lib/tier';
import type { ExportedCategory } from './json-schema';

const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];

export interface RenderMarkdownOptions {
  /** When true, the Image column links each row to `../images/<hash>.webp`. */
  includeImages: boolean;
}

export function renderCategoryMarkdown(
  category: ExportedCategory,
  options: RenderMarkdownOptions
): string {
  const cutoffs = {
    S: category.cutoffS,
    A: category.cutoffA,
    B: category.cutoffB,
    C: category.cutoffC,
    D: category.cutoffD,
    E: category.cutoffE,
    F: category.cutoffF
  };

  const ranked = category.items
    .map((item) => ({ item, tier: scoreToTier(item.score, cutoffs) }))
    .sort((a, b) => {
      const tierDiff = TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier);
      if (tierDiff !== 0) return tierDiff;
      if (a.item.order !== b.item.order) return a.item.order - b.item.order;
      return a.item.id.localeCompare(b.item.id);
    });

  const frontMatter = [
    '---',
    `title: ${yamlString(category.name)}`,
    `slug: ${yamlString(category.slug)}`,
    `itemCount: ${ranked.length}`,
    '---',
    ''
  ].join('\n');

  const heading = `# ${category.name}\n`;

  const description = category.description?.trim()
    ? '\n' +
      category.description
        .trim()
        .split(/\r?\n/)
        .map((line) => `> ${line}`.trimEnd())
        .join('\n') +
      '\n'
    : '';

  const headerRow = '| Tier | Image | Name | Score | Description |';
  const separatorRow = '|------|-------|------|-------|-------------|';

  const rows = ranked.map(({ item, tier }) => {
    const image =
      options.includeImages && item.imageHash
        ? `![${escapeCell(item.name)}](../images/${item.imageHash}.webp)`
        : '';
    const descriptionCell = escapeCell(item.description ?? '');
    return `| ${tier} | ${image} | ${escapeCell(item.name)} | ${item.score} | ${descriptionCell} |`;
  });

  const table = [headerRow, separatorRow, ...rows].join('\n');

  return `${frontMatter}${heading}${description}\n${table}\n`;
}

function escapeCell(s: string): string {
  return s.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
}

function yamlString(s: string): string {
  return JSON.stringify(s);
}
