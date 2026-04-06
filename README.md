# Tierdom App

A self-hosted personal tier list aggregator.
Replace scattered tools like Goodreads, IMDB, BoardGameGeek, and others with a single app you own and run yourself.

> ⚠️🤖 This project has been created relying heavily on GenAI, including Agentic workflows and even Vibe Coding. This has both upsides (the project coming to life as quickly as it did, for one), and many downsides (that come along with using GenAI). We place this disclaimer here so anyone can make their own judgement about whether they want to use this project or not.

## What it is

**Tierdom App** has two sides:

- **Public site** — A read-only view for anyone to browse your tier lists, organized by topic (Games, Books, Movies, Board Games, etc.).
  Each section shows items you've consumed or experienced, ranked in tiers.
  Also includes a home page and about page managed via a lightweight built-in CMS.
- **Admin back-office** — A private, authenticated interface for adding and editing entries, managing sections, and updating CMS content.

The entire app ships as a single Docker image.
The database is a SQLite file mounted as a volume, so it lives outside the container and can be backed up independently.

### Features

- Topic sections (Games, Books, Movies, Board Games, and more — fully configurable)
- Tier list view per section with customizable tier labels
- Lightweight built-in CMS for static pages (Home, About)
- Admin interface protected behind single-user authentication
- Self-contained: no external services required
- Single Docker image — runs on any VPS

### Roadmap

- [x] Core tier list sections (Games, Books, Movies, Board Games)
- [x] Tier list display (public)
- [x] Admin interface (add/edit entries, manage sections)
- [x] Built-in CMS (Home, About pages)
- [ ] Authentication and authorization
- [ ] Create and publish Docker image
- [ ] Import from external sources (Goodreads CSV, etc.)
- [ ] Export database to basic formats (markdown, json or yaml, etc.)

### Known issues

- **Login form returns HTTP 200 for errors and redirects.**
  SvelteKit's `use:enhance` submits forms via fetch with `x-sveltekit-action: true`.
  The server responds with HTTP 200 and a JSON body containing the real status (e.g. 401, 303).
  The client-side enhance handler processes it correctly, but Chrome DevTools shows 200 for every POST.
  Fix options: remove `use:enhance` from the login form (trades SPA navigation for correct HTTP semantics), or accept this as SvelteKit's internal protocol.

## Self-hosting

### Requirements

- A VPS or any machine that can run Docker

### Running

```bash
docker run -d \
  -p 3000:3000 \
  -v /your/data/path:/app/data \
  -e DATABASE_URL=/app/data/db.sqlite \
  -e ADMIN_PASSWORD=your_password \
  ghcr.io/yourname/tierdom-pro:latest
```

The SQLite database is stored in `/app/data/db.sqlite` inside the container.
Mount `/app/data` to a host path to persist and back up your data independently of the container.

### Backup

```bash
cp /your/data/path/db.sqlite /your/backup/path/db-$(date +%Y%m%d).sqlite
```

## Development

To get started after cloning, simply run:

```sh
npm ci
npm run dev
```

A database with example data will be seeded.

### Tech stack

| Layer      | Choice                                  |
| ---------- | --------------------------------------- |
| Framework  | SvelteKit + Svelte (TypeScript)         |
| Database   | SQLite via Drizzle ORM (better-sqlite3) |
| Styling    | Tailwind CSS                            |
| Testing    | Vitest + Playwright                     |
| Runtime    | Node.js (Alpine)                        |
| Deployment | Single Docker image                     |

### Architecture Decision Records

Architectural decisions are documented as ADRs in [`docs/decisions/`](docs/decisions/).

| ADR                                                                     | Title                                    | Status   |
| ----------------------------------------------------------------------- | ---------------------------------------- | -------- |
| [0001](docs/decisions/0001-use-architecture-decision-records.md)        | Use Architecture Decision Records        | Accepted |
| [0002](docs/decisions/0002-system-architecture.md)                      | System Architecture                      | Accepted |
| [0003](docs/decisions/0003-tooling-and-developer-experience.md)         | Tooling and Developer Experience         | Accepted |
| [0004](docs/decisions/0004-domain-model.md)                             | Domain Model                             | Accepted |
| [0005](docs/decisions/0005-frontend-styling.md)                         | Frontend Styling                         | Accepted |
| [0006](docs/decisions/0006-admin-interface.md)                          | Admin Interface                          | Accepted |
| [0007](docs/decisions/0007-markdown-rendering.md)                       | Markdown Rendering                       | Accepted |
| [0008](docs/decisions/0008-use-lucide-svelte-for-icons.md)              | Use lucide-svelte for Icons              | Accepted |
| [0009](docs/decisions/0009-add-created-at-and-updated-at-timestamps.md) | Add created_at and updated_at Timestamps | Accepted |
| [0010](docs/decisions/0010-authentication-and-authorization.md)         | Authentication and Authorization         | Proposed |

## References

| Document               | Description                                  |
| ---------------------- | -------------------------------------------- |
| [DOMAIN.md](DOMAIN.md) | Core domain model — entities, tiers, scoring |
| [CLAUDE.md](CLAUDE.md) | Development guidelines and AI instructions   |
