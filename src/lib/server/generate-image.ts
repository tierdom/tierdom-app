/**
 * Deterministic procedural image generation.
 *
 * Produces a unique 250x250 WebP per item name — colour gradient background
 * with the name rendered as a rotated watermark. No SvelteKit imports so it
 * can run both inside the app and from standalone scripts (seed, tests).
 */

import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const IMAGE_SIZE = 250;
const WEBP_QUALITY = 80;
const HASH_LENGTH = 12;

function nameHash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;');
}

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
      return `<text x="${cx}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="serif" font-size="36" font-weight="900" fill="rgba(255,255,255,0.18)" transform="rotate(-12, ${cx}, ${cy})">${escaped}</text>`;
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
 * Generate a deterministic placeholder image from an item name.
 *
 * @param name       Item name used to derive colours and watermark text
 * @param imagesDir  Directory to write the WebP file into
 */
export async function generateImage(
  name: string,
  imagesDir: string,
): Promise<{ hash: string; gradient: string }> {
  const svg = Buffer.from(buildSvg(name));

  const webpBuffer = await sharp(svg)
    .resize(IMAGE_SIZE, IMAGE_SIZE)
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const hash = createHash('sha256').update(webpBuffer).digest('hex').slice(0, HASH_LENGTH);
  const gradient = await extractGradient(svg);

  if (!existsSync(imagesDir)) {
    mkdirSync(imagesDir, { recursive: true });
  }

  const filePath = join(imagesDir, `${hash}.webp`);
  if (!existsSync(filePath)) {
    writeFileSync(filePath, webpBuffer);
  }

  return { hash, gradient };
}
