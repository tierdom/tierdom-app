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
<category-slug>.md. Each file uses a heading hierarchy:

  # <Category>           -- H1, with the category description rendered
                            verbatim underneath as authored markdown
  ## <Tier> tier         -- H2 per tier S → F (every tier renders;
                            empty ones contain "No items in this tier.")
  ### <Item>             -- H3 per item, sorted within tier by
                            order then id

  <!-- <hash>.webp -->   -- HTML comment with the image hash, when set
  Score: <n>. key: value. key: value
                         -- always present; score is the first entry,
                            user props follow in array order
  <description>          -- the user's markdown, emitted verbatim

Categories with zero items omit the tier sections entirely.

Item / category names have newlines collapsed to spaces and any "-->"
neutralized, so the heading line stays single-line and can't close
the image-hash comment that follows.

Export-only: this format is not used for re-import. Use data.json or
db/db.sqlite if you need to restore content. Images themselves live
in the sibling images/ folder when that option is also ticked.
