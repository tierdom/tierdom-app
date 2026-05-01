# ADR-0011: Image Support for Tier List Items

## Status

Accepted

## Context

Each tier list item needs a small square image (250px) for visual identity in the tier grid and item detail dialog.
Self-hosted on a small VPS with SQLite — no external services. Images must back up alongside the database. Bandwidth and storage are at a premium, so images must be compact and cacheable.
A modern progressive-loading placeholder (similar to Instagram/Twitter) is desired.

### Requirements

1. **Single 250px square image per item**, shown in tier grid and item dialog.
2. **Self-hostable, no external services** (no Cloudflare/S3/etc.); single-container compatible.
3. **Backup-friendly** — `cp -r data/ backup/` captures everything.
4. **Bandwidth-efficient** — small (WebP), aggressive cache headers, automatic cache busting.
5. **Progressive placeholder** while the full image loads.
6. **CDN-ready** — drop a CDN in front later without code changes.

### Research findings

**Storage:**

| Approach      | Pros                                                 | Cons                                                |
| ------------- | ---------------------------------------------------- | --------------------------------------------------- |
| Files on disk | Simple, fast, standard HTTP serving, easy to inspect | Directory management; separate from DB              |
| SQLite BLOBs  | Single-file backup, atomic with DB                   | Bloats DB, slows WAL checkpointing, harder to serve |

At our scale (hundreds, not millions of items), files on disk in `data/images/` alongside the SQLite file is the pragmatic choice. Same Docker volume → trivial backup.

**Image processing.** `sharp` (v0.34.5) is the standard Node image library (resize, crop, WebP). 250×250 WebP at quality 80 is 8–15 KB per image; ~10 MB for 1000 items — negligible on any VPS. Originals are not preserved — re-upload if a different crop or higher resolution is needed.

**Placeholder:**

| Approach     | DB storage | Client payload | Client JS | Notes                                                 |
| ------------ | ---------- | -------------- | --------- | ----------------------------------------------------- |
| ThumbHash    | ~40 chars  | ~5 KB / item   | ~2 KB lib | Decoded data URI is huge relative to the WebP itself. |
| BlurHash     | ~30 chars  | ~5 KB / item   | ~1 KB lib | Same issue.                                           |
| CSS gradient | ~70 chars  | ~70 bytes      | none      | Lightweight, no extra dep.                            |

ThumbHash/BlurHash were rejected: their decoded data URIs (~5 KB) are disproportionate when the WebP itself is only ~15 KB. Instead, `sharp` extracts three representative colors by resizing the image to 3×1, stored as a `linear-gradient(...)` string (~70 chars). No client lib needed — render directly as a `background-image`.

**Cache busting.** SHA-256 of the processed WebP (first 12 hex chars) is the filename. URL is the cache key (`/assets/images/{hash}.webp`); changed image → new URL → safe to send `Cache-Control: public, max-age=31536000, immutable`.

## Decision

**Store images as WebP files on disk in `data/images/`, process uploads with `sharp`, store CSS gradient placeholders in SQLite, and serve via a SvelteKit route with content-hash cache busting.**

- **Schema.** Two nullable columns on `tier_list_item` — `image_hash` (12-hex of WebP), `thumb_hash` (CSS gradient string).
- **Pipeline.** Validate MIME + size (max 1 MB) → `sharp` resize 250×250 cover-crop → WebP quality 80 → `SHA-256(buffer)[0:12]` becomes the filename → extract 3×1 colors for the gradient → write `data/images/{hash}.webp` (content-addressed; duplicates are free) → store both columns.
- **Serving.** `GET /assets/images/[hash].webp` returns the file with `Cache-Control: public, max-age=31536000, immutable` and `ETag`. Auth hook skips cookie handling for `/assets/` paths so responses are cookie-free (CDN-cacheable).
- **Placeholder.** The gradient string passes through to the frontend as a `background-image` value — no client decoding.

## Consequences

- One new prod dep: `sharp` (native binaries; needs platform-appropriate install in Docker — well-documented for Node Alpine).
- Images live alongside the database in the `data/` volume; one volume backup captures both.
- Storage is negligible (~10 MB for 1000 items at 8–15 KB each).
- No external services required; CDN drops in front later with zero code changes.
- Content-hash URLs eliminate cache invalidation logic.
- CSS gradient adds ~70 bytes per row and zero client JS.
- Originals not preserved — deliberate trade-off for simplicity and disk space.
- Image cleanup on item/category delete needs explicit file removal — FK CASCADE only handles rows.
