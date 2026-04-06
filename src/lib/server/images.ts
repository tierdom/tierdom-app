import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { env } from '$env/dynamic/private';

const ALLOWED_MIME_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
	'image/avif'
]);
const MAX_FILE_SIZE = 1024 * 1024; // 1 MB
const IMAGE_SIZE = 250;
const WEBP_QUALITY = 80;
const HASH_LENGTH = 12;

function getDataDir(): string {
	return dirname(env.DATABASE_URL!);
}

function getImagesDir(): string {
	return join(getDataDir(), 'images');
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

export async function processUpload(file: File): Promise<{ hash: string; gradient: string }> {
	if (!ALLOWED_MIME_TYPES.has(file.type)) {
		throw new Error(`Unsupported image type: ${file.type}`);
	}
	if (file.size > MAX_FILE_SIZE) {
		throw new Error(`File too large (max ${MAX_FILE_SIZE / 1024 / 1024} MB)`);
	}

	const buffer = Buffer.from(await file.arrayBuffer());

	// Resize to 250x250 WebP
	const webpBuffer = await sharp(buffer)
		.resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'cover', position: 'centre' })
		.webp({ quality: WEBP_QUALITY })
		.toBuffer();

	// Content hash for cache busting
	const hash = createHash('sha256').update(webpBuffer).digest('hex').slice(0, HASH_LENGTH);

	// Extract 3 colors by resizing to 3x1 pixels
	const { data } = await sharp(buffer)
		.resize(3, 1, { fit: 'cover', position: 'centre' })
		.removeAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });

	const hex = (r: number, g: number, b: number) =>
		`#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
	const c1 = hex(data[0], data[1], data[2]);
	const c2 = hex(data[3], data[4], data[5]);
	const c3 = hex(data[6], data[7], data[8]);
	const gradient = `linear-gradient(135deg, ${c1}, ${c2}, ${c3})`;

	// Write to disk (content-addressed = safe to skip if exists)
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
