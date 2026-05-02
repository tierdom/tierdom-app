import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '$env/dynamic/private';
import { extractGradient, rgbToHex } from './gradient';

// Re-exported so existing callers (and tests) keep their `from './images'`
// imports working; the implementations live in `gradient.ts`.
export { extractGradient, rgbToHex };

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);
const MAX_FILE_SIZE = 1024 * 1024; // 1 MB
const IMAGE_SIZE = 250;
const WEBP_QUALITY = 80;
const HASH_LENGTH = 12;

function getImagesDir(): string {
  return join(env.DATA_PATH!, 'images');
}

export function getImagePath(hash: string): string {
  return join(getImagesDir(), `${hash}.webp`);
}

export function ensureImageDir(): void {
  const dir = getImagesDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function validateUpload(file: File): void {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(`Unsupported image type: ${file.type}`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large (max ${MAX_FILE_SIZE / 1024 / 1024} MB)`);
  }
}

export async function processUpload(file: File): Promise<{ hash: string; gradient: string }> {
  validateUpload(file);

  const buffer = Buffer.from(await file.arrayBuffer());

  const webpBuffer = await sharp(buffer)
    .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'cover', position: 'centre' })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const hash = createHash('sha256').update(webpBuffer).digest('hex').slice(0, HASH_LENGTH);
  const gradient = await extractGradient(buffer);

  const filePath = getImagePath(hash);
  if (!existsSync(filePath)) {
    ensureImageDir();
    writeFileSync(filePath, webpBuffer);
  }

  return { hash, gradient };
}

export function deleteImage(hash: string): void {
  const filePath = getImagePath(hash);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}

export function readImage(hash: string): Buffer | null {
  const filePath = getImagePath(hash);
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath);
}
