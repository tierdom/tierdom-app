import schemaV1 from '$lib/server/import/schema-v1.json';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
  return new Response(JSON.stringify(schemaV1, null, 2), {
    headers: {
      'Content-Type': 'application/schema+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
