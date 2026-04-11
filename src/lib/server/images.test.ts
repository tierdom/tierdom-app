import { describe, expect, it, vi } from 'vitest';

// Stub $env/dynamic/private so the module can be imported
vi.mock('$env/dynamic/private', () => ({ env: { DATA_PATH: '/tmp/test' } }));
// Stub sharp — we only test pure functions, not image processing
vi.mock('sharp', () => ({ default: vi.fn() }));

import { rgbToHex, validateUpload } from './images';

describe('rgbToHex', () => {
  it.each([
    [0, 0, 0, '#000000'],
    [255, 255, 255, '#ffffff'],
    [255, 0, 0, '#ff0000'],
    [0, 255, 0, '#00ff00'],
    [0, 0, 255, '#0000ff'],
    [18, 52, 86, '#123456']
  ])('rgbToHex(%d, %d, %d) → %s', (r, g, b, expected) => {
    expect.assertions(1);
    expect(rgbToHex(r, g, b)).toBe(expected);
  });
});

describe('validateUpload', () => {
  it('accepts valid MIME types', () => {
    expect.assertions(5);
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']) {
      const file = new File(['x'], 'test', { type });
      expect(() => validateUpload(file)).not.toThrow();
    }
  });

  it('rejects unsupported MIME types', () => {
    expect.assertions(1);
    const file = new File(['x'], 'test.pdf', { type: 'application/pdf' });
    expect(() => validateUpload(file)).toThrow('Unsupported image type');
  });

  it('rejects files larger than 1 MB', () => {
    expect.assertions(1);
    const content = new Uint8Array(1024 * 1024 + 1);
    const file = new File([content], 'big.png', { type: 'image/png' });
    expect(() => validateUpload(file)).toThrow('File too large');
  });

  it('accepts files at exactly 1 MB', () => {
    expect.assertions(1);
    const content = new Uint8Array(1024 * 1024);
    const file = new File([content], 'ok.png', { type: 'image/png' });
    expect(() => validateUpload(file)).not.toThrow();
  });
});
