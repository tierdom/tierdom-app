# ADR-0011: Image Support for Tier List Items

## Status

Proposed

## Context

Each tier list item needs a small square image (250px) for visual identity in the tier grid and item detail dialog.
The app is self-hosted on a small VPS with SQLite --- no external services.
Images must be included in the same backup as the database.
Bandwidth and storage are at a premium, so images must be compact and served efficiently.

Additionally, a modern progressive loading experience is desired: a tiny placeholder that foreshadows the image content before the full image loads (similar to Instagram and Twitter).

### Requirements

1. **Single image per item.**
   Each tier list item gets one 250px square image.
   Displayed in the tier grid and the item detail dialog.

2. **Self-hostable, no external services.**
   No dependency on Cloudflare, S3, or any third-party image hosting.
   Must work with a single Docker container on a small VPS.

3. **Backup-friendly.**
   Images must be included in the same backup workflow as the SQLite database.
   A single `cp -r data/ backup/` should capture everything.

4. **Bandwidth-efficient.**
   Images should be small (WebP format) and served with aggressive cache headers.
   Cache busting must happen automatically when images change.

5. **Progressive loading placeholders.**
   A compact representation of each image (ThumbHash) is stored in the database and decoded client-side to show a blurred preview while the full image loads.

6. **CDN-ready.**
   Image serving must be compatible with a future Cloudflare or similar CDN layer without code changes.

### Research findings

#### Storage strategy

Two options were considered:

| Approach      | Pros                                                 | Cons                                                |
| ------------- | ---------------------------------------------------- | --------------------------------------------------- |
| Files on disk | Simple, fast, standard HTTP serving, easy to inspect | Requires directory management, separate from DB     |
| SQLite BLOBs  | Single-file backup, atomic with DB transactions      | Bloats DB, slows WAL checkpointing, harder to serve |

At tier-list scale (hundreds, not millions of items), files on disk in a `data/images/` directory alongside the SQLite database is the pragmatic choice.
The directory lives in the same Docker volume as the database, so backup is trivial.

#### Image processing

`sharp` (v0.34.5) is the standard Node.js image processing library.
It handles resize, crop, and WebP conversion with native performance.
A 250x250 WebP image at quality 80 averages 8--15 KB per image.
At 1000 items, total storage is roughly 10 MB --- negligible on any VPS.

Originals are not preserved.
The admin uploads an image, it is processed to the target size, and the processed version is the only copy stored.
Re-upload if a different crop or higher resolution is needed later.

#### Placeholder system

| Approach     | DB storage | Client payload | Client JS | Notes                                 |
| ------------ | ---------- | -------------- | --------- | ------------------------------------- |
| ThumbHash    | ~40 chars  | ~5 KB per item | ~2 KB lib | Blurred preview, but data URI is huge |
| BlurHash     | ~30 chars  | ~5 KB per item | ~1 KB lib | Similar issue with decoded size       |
| CSS gradient | ~70 chars  | ~70 bytes      | none      | Lightweight, no extra dependency      |

ThumbHash and BlurHash were initially considered but rejected: although the stored hash is compact, decoding it produces an uncompressed PNG data URI of ~5 KB per item --- disproportionate when the WebP image itself is only ~15 KB.

Instead, `sharp` extracts three representative colors by resizing the image to 3x1 pixels.
These are stored as a CSS gradient string (e.g. `linear-gradient(135deg, #a9735d, #ff860d, #a7735f)`) directly in the database (~70 characters).
No client-side library is needed --- the string is used as-is in a `background-image` CSS property.

#### Cache busting

The SHA-256 hash of the processed WebP file (first 12 hex characters) is used as the filename.
The URL is the cache key: `/assets/images/{hash}.webp`.
When an image changes, the hash changes, producing a new URL.
This allows `Cache-Control: public, max-age=31536000, immutable` --- browsers and CDNs cache forever, and new images get new URLs automatically.

#### Serving

A SvelteKit route (`GET /assets/images/[hash].webp`) reads from disk and returns with immutable cache headers.
The auth hook skips session cookie handling for `/assets/images/` paths, keeping responses cookie-free --- a requirement for CDN caching.
When Cloudflare is added later, it caches at the edge with zero configuration changes.

## Decision

**Store images as WebP files on disk in `data/images/`, process uploads with `sharp`, extract CSS gradient placeholders stored in SQLite, and serve via a SvelteKit route with content-hash-based cache busting.**

### Schema changes

Two nullable columns added to `tier_list_item`:

- `image_hash` (text) --- 12-character hex hash of the processed WebP file; null means no image.
- `thumb_hash` (text) --- CSS gradient string (~70 characters); null means no image.

### Processing pipeline

1. Admin uploads an image via the item edit form (multipart/form-data).
2. Server validates MIME type and size (max 1 MB).
3. `sharp` resizes to 250x250 (cover crop, centre) and converts to WebP quality 80.
4. SHA-256 of the output buffer, truncated to 12 hex characters, becomes the filename.
5. Three representative colors are extracted by resizing to 3x1 pixels with `sharp`.
6. A CSS gradient string is generated: `linear-gradient(135deg, #color1, #color2, #color3)`.
7. File is written to `data/images/{hash}.webp` (content-addressed, so duplicates are free).
8. `image_hash` and `thumb_hash` (the gradient string) are stored in the database row.

### Serving

- `GET /assets/images/[hash].webp` reads from disk, returns with `Cache-Control: public, max-age=31536000, immutable` and `ETag`.
- Auth hook skips cookie-setting for `/assets/` paths.
- Body parser limit set to 1 MB for upload support.

### Placeholders

The CSS gradient string from the database is passed directly to the frontend as a `background-image` value.
No client-side decoding or additional libraries required --- the gradient renders immediately while the real image loads.

## Consequences

- One new production dependency: `sharp` (0.34.5).
  `sharp` uses native binaries and requires platform-appropriate installation in Docker (well-documented for Node Alpine).
- Images live alongside the database in the `data/` volume.
  A single volume backup captures both database and images.
- At 250px WebP quality 80, storage is negligible (8--15 KB per image, ~10 MB for 1000 items).
- No external services required. CDN can be layered in front later without code changes.
- Content-hash URLs mean zero cache invalidation logic --- new image = new URL.
- CSS gradient placeholders add ~70 bytes per item to the database and zero client-side JS.
- Original images are not preserved. This is a deliberate trade-off for simplicity and disk space.
- Image cleanup on item/category deletion requires explicit file removal since SQLite cascade deletes only handle rows, not files.
