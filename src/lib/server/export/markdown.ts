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
    ''
  ].join('\n');

  const heading = `# ${sanitizeHeadingLine(category.name)}\n`;

  const description = category.description?.trim()
    ? '\n' + category.description.replace(/\s+$/g, '') + '\n'
    : '';

  // Empty category: front matter + H1 (+ blockquote) only — no tier sections.
  if (ranked.length === 0) {
    return `${frontMatter}\n${heading}${description}`;
  }

  const byTier = new Map<Tier, ExportedItem[]>(TIERS.map((t) => [t, []]));
  for (const { item, tier } of ranked) {
    byTier.get(tier)!.push(item);
  }

  const tierSections = TIERS.map((tier) => renderTier(tier, byTier.get(tier)!)).join('\n');

  return `${frontMatter}\n${heading}${description}\n${tierSections}`;
}

function renderTier(tier: Tier, items: ExportedItem[]): string {
  const heading = `## ${tier} tier\n`;
  if (items.length === 0) {
    return `${heading}\nNo items in this tier.\n`;
  }
  return heading + items.map((item) => '\n' + renderItem(item)).join('');
}

function renderItem(item: ExportedItem): string {
  const lines: string[] = [];
  lines.push(`### ${sanitizeHeadingLine(item.name)}`);

  if (item.imageHash) {
    lines.push('');
    lines.push(`<!-- ${item.imageHash}.webp -->`);
  }

  // Score always renders as the first entry on the props line, so every item
  // has at least one body line under its heading even when the user added no
  // properties or description.
  const propsLine = [
    `Score: ${item.score}`,
    ...item.props.map((p) => `${flattenLine(p.key)}: ${flattenLine(p.value)}`)
  ].join('. ');
  lines.push('');
  lines.push(propsLine);

  const description = item.description?.replace(/\s+$/g, '');
  if (description) {
    lines.push('');
    lines.push(description);
  }

  return lines.join('\n') + '\n';
}

// Used for H1 / H3 lines so the output stays single-line and the next
// "<!-- HASH.webp -->" stanza can't be closed early by user-supplied "-->".
function sanitizeHeadingLine(s: string): string {
  return flattenLine(s).replace(/-->/g, '--&gt;');
}

function flattenLine(s: string): string {
  return s
    .replace(/\r\n|\r|\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function yamlString(s: string): string {
  return JSON.stringify(s);
}
