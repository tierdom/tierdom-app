import { error } from '@sveltejs/kit';
import { buildExport } from '$lib/server/export/build-export';
import { APP_VERSION } from '$lib/server/app-version';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const includeDb = url.searchParams.has('db');
  const includeJson = url.searchParams.has('json');
  const includeImages = url.searchParams.has('images');

  if (!includeDb && !includeJson && !includeImages) {
    error(400, 'Pick at least one item to include in the export.');
  }

  const { stream, filename } = buildExport(
    { includeDb, includeJson, includeImages },
    { appVersion: APP_VERSION }
  );

  // No Content-Length: total size is unknown until the ZIP is fully composed,
  // and the response is chunked. Cache-Control: no-store keeps the snapshot
  // out of any intermediary cache (the archive embeds the DB).
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store'
    }
  });
};
