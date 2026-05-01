import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { readImage } from '$lib/server/images';

const HASH_PATTERN = /^[0-9a-f]{12}$/;

export const GET: RequestHandler = ({ params }) => {
  const hash = params.hash;

  if (!HASH_PATTERN.test(hash)) {
    error(400, 'Invalid image hash');
  }

  const buffer = readImage(hash);
  if (!buffer) {
    error(404, 'Image not found');
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: `"${hash}"`,
    },
  });
};
