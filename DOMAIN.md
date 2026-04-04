# Domain Model

This document describes the core domain concepts of tierdom-pro.
For the reasoning behind key decisions, see [ADR-0004](docs/decisions/0004-domain-model.md).

---

## Entities

### Category

A category groups a set of tier list items under a single topic.
Examples: _Games_, _Books_, _Movies_, _Board Games_.

| Field         | Type            | Notes                                                                                      |
| ------------- | --------------- | ------------------------------------------------------------------------------------------ |
| `id`          | integer         | Primary key                                                                                |
| `slug`        | string          | URL-safe identifier, e.g. `board-games`                                                    |
| `name`        | string          | Display name, e.g. `Board Games`                                                           |
| `description` | markdown string | Optional, shown on the category page                                                       |
| `order`       | integer         | Controls the order categories appear in navigation                                         |
| `tierCutoffs` | TierCutoffs     | Score thresholds that map this category's item scores to tiers (defaults apply if not set) |

A category contains many **TierListItems**. The order of items within a category is explicit and determines how they are rendered in the tier list.

---

### TierListItem

A single item inside a category — a book, game, movie, etc. that has been rated.

| Field         | Type            | Notes                                                           |
| ------------- | --------------- | --------------------------------------------------------------- |
| `id`          | integer         | Primary key                                                     |
| `categoryId`  | integer         | Foreign key → Category                                          |
| `slug`        | string          | URL-safe identifier, unique within a category                   |
| `name`        | string          | Display name                                                    |
| `description` | markdown string | Optional, supports full Markdown                                |
| `score`       | number          | Numeric rating; translated to a Tier via the category's cutoffs |
| `order`       | integer         | Explicit display order within the category                      |
| `tags`        | string[]        | List of tag slugs associated with this item                     |

---

### Tag

A minor entity that maps a slug to a human-readable label.
Tags are shared across all categories.

| Field   | Type   | Notes                        |
| ------- | ------ | ---------------------------- |
| `slug`  | string | Primary key, e.g. `sci-fi`   |
| `label` | string | Display label, e.g. `Sci-Fi` |

---

## Value Objects

### Tier

The standard tier list ranking, used community-wide.
Tiers are a hardcoded enum — they are not configurable by the user.

| Tier | Label  | Default meaning |
| ---- | ------ | --------------- |
| `S`  | S-tier | Perfection      |
| `A`  | A-tier | Fantastic       |
| `B`  | B-tier | Great           |
| `C`  | C-tier | Decent          |
| `D`  | D-tier | Meh             |
| `E`  | E-tier | Rubbish         |
| `F`  | F-tier | Abysmal         |

Each tier has a hardcoded pair of CSS color variables — a background color and a foreground (text) color — used consistently across the UI. These are the initial defaults; theming can extend them later.

| Tier | Background variable | Foreground variable |
| ---- | ------------------- | ------------------- |
| `S`  | `--tier-s-bg`       | `--tier-s-fg`       |
| `A`  | `--tier-a-bg`       | `--tier-a-fg`       |
| `B`  | `--tier-b-bg`       | `--tier-b-fg`       |
| `C`  | `--tier-c-bg`       | `--tier-c-fg`       |
| `D`  | `--tier-d-bg`       | `--tier-d-fg`       |
| `E`  | `--tier-e-bg`       | `--tier-e-fg`       |
| `F`  | `--tier-f-bg`       | `--tier-f-fg`       |

---

### TierCutoffs

Categories use a shared set of default cutoffs. Each category can override them individually.
A score is mapped to a tier by finding the highest tier whose minimum score the item meets.

Default cutoffs (used unless overridden per category):

| Tier | Minimum score |
| ---- | ------------- |
| `S`  | 90            |
| `A`  | 75            |
| `B`  | 60            |
| `C`  | 45            |
| `D`  | 30            |
| `E`  | 15            |
| `F`  | 0             |

Example: a score of `72` maps to **B-tier** with the defaults above.

---

## Relationships

```
Category 1 ────────── * TierListItem
                            │
                            * (tag slugs)
                            │
Tag (slug) ◄────────────────┘
```

- One **Category** has many **TierListItems**.
- Each **TierListItem** references zero or more **Tags** by slug.
- A **Tag** exists independently and can be referenced from any category.
- **Tiers** and **TierCutoffs** are derived from scores — they are not stored entities.

---

## Ordering

The `order` field on both `Category` and `TierListItem` is an explicit integer.
Within a tier list visualization, items are sorted first by their **tier** (S → F),
and then by their **order** field within each tier. This means:

- Two items in the same tier are ordered by their `order` field, not by their score. An item with a lower score but a lower `order` value appears first.
- The admin interface controls order directly.
