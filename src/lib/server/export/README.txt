Tierdom export
==============

This archive was produced by the Tierdom admin Export tool. The contents you
get depend on which boxes you ticked in the wizard; not every export contains
every section listed here.

manifest.json
-------------
Always present. Machine-readable summary of what's inside:

  - schemaVersion : integer; bumped only on breaking changes to data.json
  - appVersion    : version of Tierdom that produced this archive
  - exportedAt    : ISO-8601 UTC timestamp
  - contents      : list of paths actually included in this archive
  - counts        : per-section row / file counts (when included)

When restoring or importing, always look at manifest.json first.

data.json
---------
Structured JSON export of the editable content (when "JSON content" was
ticked). Top-level shape:

  {
    "schemaVersion": 1,
    "appVersion": "...",
    "exportedAt": "...",
    "data": {
      "pages":         [ ... ],     // CMS pages
      "siteSettings":  [ ... ],     // site-wide settings (e.g. footer)
      "categories":    [ ... ]      // each with its items nested as children
    }
  }

  - Excludes soft-deleted (Trash) rows. If you need those too, also include
    the SQLite snapshot.
  - Excludes user accounts, sessions and password hashes.
  - Stable IDs are preserved so future imports can match by id or slug.
  - Timestamps are ISO-8601 strings.
  - Image references are by hash filename only (e.g. "abc123.webp"); pair
    with the images/ directory below to get the bytes.

db/db.sqlite
------------
A clean, online SQLite snapshot of the entire database (when "SQLite
database" was ticked). Produced via SQLite's VACUUM INTO so it's a single
file with no -wal / -shm sidecars and opens in any SQLite tool.

Includes everything: pages, site settings, categories, items, AND
soft-deleted Trash rows, AND user accounts / sessions / password hashes.
Treat it as sensitive.

To restore from this snapshot:
  1. Stop the Tierdom container.
  2. Replace $DATA_PATH/db.sqlite with db/db.sqlite from this archive.
     (Also delete any leftover db.sqlite-wal / db.sqlite-shm files.)
  3. Restart the container.

images/
-------
All tier-list item images as .webp files (when "Images" was ticked),
named by their content hash. The data.json item entries reference
these by their imageHash field.

Restoration: copy these files into $DATA_PATH/images/ alongside the
existing ones (filenames are content-addressed, so duplicates are safe
to skip).

markdown/
---------
One Markdown file per category (when "Markdown" was ticked), named
<category-slug>.md. Each file is a tier-list table sorted S → F,
with one row per tier even when a tier is empty (placeholder dashes).
Categories with zero items omit the table entirely.

Items that have an image carry their content hash as an HTML comment
immediately before the Name cell, e.g. "<!-- abc123.webp --> Inception".
The images themselves live in the sibling images/ folder when that
option is also ticked.

Export-only: this format is not used for re-import. Use data.json or
db/db.sqlite if you need to restore content.
