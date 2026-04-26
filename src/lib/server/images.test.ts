import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

// Hoisted so the path is computed before vi.mock's factory references it.
const { TMP_ROOT } = vi.hoisted(() => ({
  TMP_ROOT: `/tmp/tierdom-images-test-${process.pid}-${Date.now()}`
}));

vi.mock('$env/dynamic/private', () => ({ env: { DATA_PATH: TMP_ROOT } }));

import {
  deleteImage,
  ensureImageDir,
  extractGradient,
  getImagePath,
  processUpload,
  readImage,
  rgbToHex,
  validateUpload
} from './images';

const IMAGES_DIR = join(TMP_ROOT, 'images');

beforeAll(() => {
  mkdirSync(TMP_ROOT, { recursive: true });
});

afterAll(() => {
  rmSync(TMP_ROOT, { recursive: true, force: true });
});

beforeEach(() => {
  rmSync(IMAGES_DIR, { recursive: true, force: true });
});

async function makePngBuffer(r: number, g: number, b: number, size = 16): Promise<Buffer> {
  return sharp({
    create: { width: size, height: size, channels: 3, background: { r, g, b } }
  })
    .png()
    .toBuffer();
}

describe('rgbToHex', () => {
  it.each([
    [0, 0, 0, '#000000'],
    [255, 255, 255, '#ffffff'],
    [255, 0, 0, '#ff0000'],
    [0, 255, 0, '#00ff00'],
    [0, 0, 255, '#0000ff'],
    [18, 52, 86, '#123456']
  ])('rgbToHex(%d, %d, %d) → %s', (r, g, b, expected) => {
    expect(rgbToHex(r, g, b)).toBe(expected);
  });
});

describe('validateUpload', () => {
  it('accepts valid MIME types', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']) {
      const file = new File(['x'], 'test', { type });
      expect(() => validateUpload(file)).not.toThrow();
    }
  });

  it('rejects unsupported MIME types', () => {
    const file = new File(['x'], 'test.pdf', { type: 'application/pdf' });
    expect(() => validateUpload(file)).toThrow('Unsupported image type');
  });

  it('rejects files larger than 1 MB', () => {
    const content = new Uint8Array(1024 * 1024 + 1);
    const file = new File([content], 'big.png', { type: 'image/png' });
    expect(() => validateUpload(file)).toThrow('File too large');
  });

  it('accepts files at exactly 1 MB', () => {
    const content = new Uint8Array(1024 * 1024);
    const file = new File([content], 'ok.png', { type: 'image/png' });
    expect(() => validateUpload(file)).not.toThrow();
  });
});

describe('getImagePath', () => {
  it('joins DATA_PATH/images/<hash>.webp', () => {
    expect(getImagePath('abc123')).toBe(join(TMP_ROOT, 'images', 'abc123.webp'));
  });
});

describe('ensureImageDir', () => {
  it('creates the images directory when missing', () => {
    expect(existsSync(IMAGES_DIR)).toBe(false);
    ensureImageDir();
    expect(existsSync(IMAGES_DIR)).toBe(true);
  });

  it('is idempotent when the directory already exists', () => {
    ensureImageDir();
    expect(() => ensureImageDir()).not.toThrow();
    expect(existsSync(IMAGES_DIR)).toBe(true);
  });
});

describe('readImage', () => {
  it('returns null when the file does not exist', () => {
    expect(readImage('missing')).toBeNull();
  });

  it('returns the file contents when the file exists', () => {
    ensureImageDir();
    writeFileSync(getImagePath('h1'), Buffer.from([1, 2, 3]));
    expect(readImage('h1')).toEqual(Buffer.from([1, 2, 3]));
  });
});

describe('deleteImage', () => {
  it('removes the file when it exists', () => {
    ensureImageDir();
    const path = getImagePath('to-delete');
    writeFileSync(path, Buffer.from([0]));

    deleteImage('to-delete');
    expect(existsSync(path)).toBe(false);
  });

  it('is a no-op when the file does not exist', () => {
    expect(() => deleteImage('absent')).not.toThrow();
  });
});

describe('extractGradient', () => {
  it('returns a linear-gradient with three 6-digit hex stops', async () => {
    const buf = await makePngBuffer(255, 0, 0);
    const gradient = await extractGradient(buf);
    expect(gradient).toMatch(
      /^linear-gradient\(135deg, #[0-9a-f]{6}, #[0-9a-f]{6}, #[0-9a-f]{6}\)$/
    );
  });

  it('produces three identical stops for a solid-color image', async () => {
    const buf = await makePngBuffer(0, 128, 255);
    const gradient = await extractGradient(buf);
    const matches = gradient.match(/#[0-9a-f]{6}/g);
    expect(matches).toHaveLength(3);
    expect(matches![0]).toBe(matches![1]);
    expect(matches![1]).toBe(matches![2]);
  });
});

describe('processUpload', () => {
  async function makeFile(r: number, g: number, b: number): Promise<File> {
    const buf = await makePngBuffer(r, g, b, 64);
    return new File([new Uint8Array(buf)], 'in.png', { type: 'image/png' });
  }

  it('writes a webp file at the hashed path and returns hash + gradient', async () => {
    const file = await makeFile(50, 100, 150);
    const { hash, gradient } = await processUpload(file);

    expect(hash).toMatch(/^[0-9a-f]{12}$/);
    expect(gradient).toMatch(/^linear-gradient\(135deg, /);
    expect(existsSync(getImagePath(hash))).toBe(true);
  });

  it('produces a deterministic hash for identical input bytes', async () => {
    const f1 = await makeFile(10, 20, 30);
    const f2 = await makeFile(10, 20, 30);
    const r1 = await processUpload(f1);
    const r2 = await processUpload(f2);
    expect(r1.hash).toBe(r2.hash);
  });

  it('skips re-writing the file when the hash already exists', async () => {
    const file = await makeFile(99, 99, 99);
    const { hash } = await processUpload(file);
    const path = getImagePath(hash);

    // Tamper with the on-disk file. If processUpload re-wrote it, our bytes
    // would be replaced with the real webp output again.
    const sentinel = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
    writeFileSync(path, sentinel);

    const file2 = await makeFile(99, 99, 99);
    const { hash: hash2 } = await processUpload(file2);
    expect(hash2).toBe(hash);
    expect(readFileSync(path)).toEqual(sentinel);
  });

  it('rejects oversized files before touching sharp', async () => {
    const tooBig = new File([new Uint8Array(2 * 1024 * 1024)], 'big.png', {
      type: 'image/png'
    });
    await expect(processUpload(tooBig)).rejects.toThrow('File too large');
  });
});
