/**
 * Gradient placeholders.
 *
 * Three call sites used to build their own copy of the same template:
 * - `processUpload` (images.ts) — derives stops from a real uploaded image
 * - `generateImage` (generate-image.ts) — derives stops from a deterministic SVG
 * - the IMDb importer — derives stops from a hash of the row's Const
 *
 * They all write the same column (`tier_list_item.placeholder`) and the UI
 * renders that string verbatim as `style:background-image`. Centralising the
 * format here keeps the on-disk shape consistent — change `formatGradient`
 * once and every placeholder generator follows.
 *
 * No SvelteKit imports so this module can run from standalone scripts that
 * also pull in `generate-image.ts`.
 */
import sharp from 'sharp';

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/**
 * Build the `linear-gradient(...)` string used as a placeholder background.
 * Stops can be any CSS colour value (hex, hsl, rgb, named).
 */
export function formatGradient(c1: string, c2: string, c3: string): string {
  return `linear-gradient(135deg, ${c1}, ${c2}, ${c3})`;
}

/**
 * Sample three colours along a 3×1 downsample of `source` and return them as
 * a `linear-gradient(...)` string. Used for both real uploads and the
 * deterministic SVG placeholders.
 */
export async function extractGradient(source: Buffer): Promise<string> {
  const { data } = await sharp(source)
    .resize(3, 1, { fit: 'cover', position: 'centre' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  /* v8 ignore start */
  if (data.length < 9) {
    throw new Error(
      `extractGradient: expected 9 raw bytes from 3x1 sharp resize, got ${data.length}`,
    );
  }
  /* v8 ignore stop */
  const c1 = rgbToHex(data[0]!, data[1]!, data[2]!);
  const c2 = rgbToHex(data[3]!, data[4]!, data[5]!);
  const c3 = rgbToHex(data[6]!, data[7]!, data[8]!);
  return formatGradient(c1, c2, c3);
}
