/**
 * Deterministic image generation for seed data.
 *
 * Generates a unique 250x250 WebP per item using Sharp's SVG rasterizer.
 * Each image is a colour gradient with the item name as a rotated watermark.
 * The hash is derived from the processed WebP bytes (same pipeline as uploads),
 * so images behave identically to user-uploaded ones.
 */

import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { tierListItem } from './schema';
import type * as schema from './schema';

type DB = BetterSQLite3Database<typeof schema>;

const IMAGE_SIZE = 250;
const WEBP_QUALITY = 80;
const HASH_LENGTH = 12;

/** Simple deterministic hash from a string → integer. */
function nameHash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Escape XML special characters for SVG text content. */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;');
}

/** Word-wrap text into lines of at most `maxChars` characters. */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current && (current + ' ' + word).length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Build an SVG string for one item. */
function buildSvg(name: string): string {
  const h = nameHash(name);
  const hue = h % 360;
  const hue2 = (hue + 30) % 360;
  const hue3 = (hue + 60) % 360;

  const lines = wrapText(name, 10);
  const lineHeight = 42;
  const startY = IMAGE_SIZE / 2 - ((lines.length - 1) * lineHeight) / 2;
  const cx = IMAGE_SIZE / 2;
  const cy = IMAGE_SIZE / 2;

  const textElements = lines
    .map((line, i) => {
      const escaped = escapeXml(line);
      const y = startY + i * lineHeight;
      return `<text x="${cx}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="36" font-weight="900" fill="rgba(255,255,255,0.18)" transform="rotate(-12, ${cx}, ${cy})">${escaped}</text>`;
    })
    .join('\n');

  return `<svg width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="hsl(${hue}, 45%, 25%)"/>
      <stop offset="50%" stop-color="hsl(${hue2}, 40%, 18%)"/>
      <stop offset="100%" stop-color="hsl(${hue3}, 35%, 12%)"/>
    </linearGradient>
  </defs>
  <rect width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" fill="url(#bg)"/>
  ${textElements}
</svg>`;
}

/** Extract a CSS gradient from raw pixel data (matches images.ts extractGradient). */
async function extractGradient(source: Buffer): Promise<string> {
  const { data } = await sharp(source)
    .resize(3, 1, { fit: 'cover', position: 'centre' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const hex = (r: number, g: number, b: number) =>
    `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;

  const c1 = hex(data[0], data[1], data[2]);
  const c2 = hex(data[3], data[4], data[5]);
  const c3 = hex(data[6], data[7], data[8]);
  return `linear-gradient(135deg, ${c1}, ${c2}, ${c3})`;
}

/**
 * Generate seed images for all items that lack one.
 *
 * @param db      Drizzle database handle
 * @param dataPath  DATA_PATH root (images are written to `{dataPath}/images/`)
 * @returns       Number of images generated
 */
export async function generateSeedImages(db: DB, dataPath: string): Promise<number> {
  const imagesDir = join(dataPath, 'images');
  if (!existsSync(imagesDir)) {
    mkdirSync(imagesDir, { recursive: true });
  }

  const items = db
    .select({ id: tierListItem.id, name: tierListItem.name })
    .from(tierListItem)
    .all();

  let count = 0;
  for (const item of items) {
    const svg = Buffer.from(buildSvg(item.name));

    const webpBuffer = await sharp(svg)
      .resize(IMAGE_SIZE, IMAGE_SIZE)
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    const hash = createHash('sha256').update(webpBuffer).digest('hex').slice(0, HASH_LENGTH);
    const gradient = await extractGradient(svg);

    const filePath = join(imagesDir, `${hash}.webp`);
    if (!existsSync(filePath)) {
      writeFileSync(filePath, webpBuffer);
    }

    db.update(tierListItem)
      .set({ imageHash: hash, placeholder: gradient })
      .where(eq(tierListItem.id, item.id))
      .run();

    count++;
  }

  return count;
}
