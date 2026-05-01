# Tierdom App

A self-hosted personal tier list aggregator.
Replace scattered tools like Goodreads, IMDB, BoardGameGeek, and others with a single app you own and run yourself.

> ⚠️🤖 This project has been created relying heavily on GenAI, including Agentic workflows and even Vibe Coding. This has both upsides (the project coming to life as quickly as it did, for one), and many downsides (that come along with using GenAI). We place this disclaimer here so anyone can make their own judgement about whether they want to use this project or not.

**Another warning**: the project is still in early alpha phase.
Consider it a preview version.
Try it out through the repository or Docker Hub, at your own risk.

## What it is

**Tierdom App** has two sides:

- **Public site** — A read-only view for anyone to browse your tier lists, organized by topic (Games, Books, Movies, Board Games, etc.).
  Each section shows items you've consumed or experienced, ranked in tiers.
  Also includes a home page and about page managed via a lightweight built-in CMS.
- **Admin back-office** — A private, authenticated interface for adding and editing entries, managing sections, and updating CMS content.

The entire app ships as a single Docker image.
The database is a SQLite file mounted as a volume, so it lives outside the container and can be backed up independently.

## Features

- Topic sections (Games, Books, Movies, Board Games, and more — fully configurable)
- Tier list view per section with customizable tier labels
- Item images with placeholder gradients
- Key/value props per item with category-default keys and icon-set support ([ADR-0019](docs/decisions/0019-prop-keys-with-icon-set-support.md))
- Soft-delete with trash and recovery ([ADR-0022](docs/decisions/0022-soft-delete-and-trash.md))
- Database export to streaming ZIP (markdown / JSON) ([ADR-0023](docs/decisions/0023-export-tooling-streaming-zip.md))
- Import from the project's own export format ([ADR-0024](docs/decisions/0024-import-tooling-architecture.md))
- Lightweight built-in CMS for static pages (Home, About) with customizable footer ([ADR-0020](docs/decisions/0020-customizable-site-content.md))
- Admin interface protected behind single-user authentication
- Self-contained: no external services required
- Single Docker image — runs on any VPS

For open roadmap items and known issues, see [TODO.md](TODO.md).

## Self-hosting

See [docs/hosting.md](docs/hosting.md) for quick-trial, server, and HTTPS setup.

## Tech stack

| Layer      | Choice                                  |
| ---------- | --------------------------------------- |
| Framework  | SvelteKit + Svelte (TypeScript)         |
| Database   | SQLite via Drizzle ORM (better-sqlite3) |
| Styling    | Tailwind CSS                            |
| Testing    | Vitest + Playwright                     |
| Runtime    | Node.js 24 LTS (Alpine)                 |
| Deployment | Single Docker image                     |

## Architecture Decision Records

Architectural decisions are documented as ADRs in [`docs/decisions/`](docs/decisions/). All are Accepted unless noted.

| ADR                                                                     | Title                                         |
| ----------------------------------------------------------------------- | --------------------------------------------- |
| [0001](docs/decisions/0001-use-architecture-decision-records.md)        | Use Architecture Decision Records             |
| [0002](docs/decisions/0002-system-architecture.md)                      | System Architecture                           |
| [0003](docs/decisions/0003-tooling-and-developer-experience.md)         | Tooling and Developer Experience              |
| [0004](docs/decisions/0004-domain-model.md)                             | Domain Model                                  |
| [0005](docs/decisions/0005-frontend-styling.md)                         | Frontend Styling                              |
| [0006](docs/decisions/0006-admin-interface.md)                          | Admin Interface                               |
| [0007](docs/decisions/0007-markdown-rendering.md)                       | Markdown Rendering                            |
| [0008](docs/decisions/0008-use-lucide-svelte-for-icons.md)              | Use lucide-svelte for Icons                   |
| [0009](docs/decisions/0009-add-created-at-and-updated-at-timestamps.md) | Add created_at and updated_at Timestamps      |
| [0010](docs/decisions/0010-authentication-and-authorization.md)         | Authentication and Authorization              |
| [0011](docs/decisions/0011-image-support.md)                            | Image Support for Tier List Items             |
| [0012](docs/decisions/0012-docker-packaging-and-publishing.md)          | Docker Packaging and Publishing               |
| [0013](docs/decisions/0013-uuid-primary-keys.md)                        | UUID Primary Keys                             |
| [0014](docs/decisions/0014-end-to-end-testing-strategy.md)              | End-to-End Testing Strategy                   |
| [0015](docs/decisions/0015-unit-testing-strategy.md)                    | Unit Testing Strategy                         |
| [0016](docs/decisions/0016-accessibility-and-semantic-html.md)          | Accessibility and Semantic HTML               |
| [0017](docs/decisions/0017-replace-tags-with-item-props.md)             | Replace Tags with Item Props                  |
| [0018](docs/decisions/0018-category-prop-keys.md)                       | Category Prop Keys                            |
| [0019](docs/decisions/0019-prop-keys-with-icon-set-support.md)          | Prop Keys with Icon Set Support               |
| [0020](docs/decisions/0020-customizable-site-content.md)                | Customizable Site Content via Generalized CMS |
| [0021](docs/decisions/0021-admin-confirmation-dialog.md)                | Admin Confirmation Dialog                     |
| [0022](docs/decisions/0022-soft-delete-and-trash.md)                    | Soft Delete and Trash                         |
| [0023](docs/decisions/0023-export-tooling-streaming-zip.md)             | Export Tooling — Streaming ZIP (fflate)       |
| [0024](docs/decisions/0024-import-tooling-architecture.md)              | Import Tooling Architecture                   |

## References

| Document                                 | Description                                  |
| ---------------------------------------- | -------------------------------------------- |
| [docs/domain.md](docs/domain.md)         | Core domain model — entities, tiers, scoring |
| [CONTRIBUTING.md](CONTRIBUTING.md)       | How to contribute, including AI-usage policy |
| [SECURITY.md](SECURITY.md)               | Reporting security issues                    |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community standards                          |
| [CLAUDE.md](CLAUDE.md)                   | AI assistant instructions for this repo      |
