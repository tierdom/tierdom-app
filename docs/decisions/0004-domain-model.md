# ADR-0004: Domain Model

## Status

Accepted

## Context

Before any database schema or UI is built, the core domain needs to be defined.
The app is a personal tier list aggregator — a replacement for fragmented tools
like Goodreads, Letterboxd, and BoardGameGeek — so the domain must be flexible
enough to cover very different types of content (books, games, films, etc.) while
staying simple to maintain and extend.

## Decision

See the full domain model in [domain.md](../domain.md).

**Category** is the top-level grouping (e.g. _Games_, _Books_). It owns a set of
tier list items and controls the score-to-tier mapping for that topic.

**TierListItem** is the core record. It holds a numeric score rather than a direct
tier assignment, so items can be re-tiered automatically when cutoffs change
without touching every record individually.

**Props** are per-item key-value pairs stored as an ordered JSON array on
`TierListItem`. They replace the earlier Tag entity (see [ADR-0017](0017-replace-tags-with-item-props.md)).

**Tier** is a hardcoded enum (S → A → B → C → D → E → F). This is the community
standard tier list vocabulary and should not be user-configurable. Each tier has
a hardcoded pair of CSS color variables (background + foreground) as its visual
identity.

**TierCutoffs** are per-category numeric thresholds. Different content types need
different scales (a 1–10 book score feels different from a 0–100 game score), so
cutoffs live on the category rather than globally. A set of sensible defaults is
provided and can be overridden per category.

**Order** is an explicit integer field on both `Category` and `TierListItem`.
Within a tier, items are sorted by this field. This gives the admin full control
over the display sequence without relying on timestamps or score proximity.

## Consequences

- Scores decouple the rating act from the tier assignment. Adjusting a category's
  cutoffs re-tiers everything automatically — no data migration needed.
- Per-category cutoffs mean the domain can naturally handle different scoring
  conventions across content types.
- Hardcoding the tier enum keeps the UI and data model simple. Adding a new tier
  later would be a deliberate schema and UI change, not an accident.
- The explicit `order` field requires the admin interface to manage ordering.
  This is intentional: order carries editorial meaning and should not be implicit.
- Props are item-local key-value pairs, not shared across items. This trades
  normalization for simplicity and category-specific metadata support.
