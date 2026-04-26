import { scoreToTier, type Tier } from '$lib/tier';
import type { ExportedCategory, ExportedItem } from './json-schema';

const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];

export function renderCategoryMarkdown(category: ExportedCategory): string {
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
    '',
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

  // Categories with no items render as front matter + heading (+ description) only.
  // A bare table header with placeholder rows for every tier would just be noise.
  const tableBlock = ranked.length === 0 ? '' : '\n' + renderTable(ranked) + '\n';

  return `${frontMatter}${heading}${description}${tableBlock}`;
}

function renderTable(ranked: { item: ExportedItem; tier: Tier }[]): string {
  const headerRow = '| Tier | Name | Score | Description |';
  const separatorRow = '|------|------|-------|-------------|';

  const byTier = new Map<Tier, ExportedItem[]>(TIERS.map((t) => [t, []]));
  for (const { item, tier } of ranked) {
    byTier.get(tier)!.push(item);
  }

  const rows: string[] = [];
  for (const tier of TIERS) {
    const items = byTier.get(tier)!;
    if (items.length === 0) {
      // Sparse-tier placeholder: keep every tier row visible so the structure
      // matches the public tier-list layout even when a tier has no entries.
      rows.push(`| ${tier} | - | - |   |`);
      continue;
    }
    for (const item of items) {
      const imageComment = item.imageHash ? `<!-- ${item.imageHash}.webp --> ` : '';
      const description = escapeCell(item.description ?? '');
      rows.push(
        `| ${tier} | ${imageComment}${escapeCell(item.name)} | ${item.score} | ${description} |`
      );
    }
  }

  return [headerRow, separatorRow, ...rows].join('\n');
}

function escapeCell(s: string): string {
  return s.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
}

function yamlString(s: string): string {
  return JSON.stringify(s);
}
