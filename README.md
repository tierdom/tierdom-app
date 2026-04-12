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

### Features

- Topic sections (Games, Books, Movies, Board Games, and more — fully configurable)
- Tier list view per section with customizable tier labels
- Lightweight built-in CMS for static pages (Home, About)
- Admin interface protected behind single-user authentication
- Self-contained: no external services required
- Single Docker image — runs on any VPS

### Roadmap

High level features:

- [x] Core tier list sections (Games, Books, Movies, Board Games)
- [x] Tier list display (public)
- [x] Admin interface (add/edit entries, manage sections)
- [x] Built-in CMS (Home, About pages)
- [x] Authentication and authorization
- [x] Item images with placeholder gradients
- [x] Create and publish Docker image
- [x] Add significant unit test coverage where sensible ([ADR-0015](docs/decisions/0015-unit-testing-strategy.md))
- [x] Add a few end-to-end test cases for safety ([ADR-0014](docs/decisions/0014-end-to-end-testing-strategy.md))
- [x] Complete accessibility review + all fixes ([ADR-0016](docs/decisions/0016-accessibility-and-semantic-html.md))
- [ ] Option to add more static cms pages
- [ ] Option to customize the footer
- [ ] Import from our own export format
- [ ] Import from external sources (Goodreads CSV, etc.)
- [ ] Export database to basic formats (markdown, json or yaml, etc.)
- [ ] Soft-delete for items + trash (and recover) feature + housekeeping to clean up later

Known issues, bugs, and small TODO's:

- [ ] SortableList keyboard reordering (a11y follow-up)
- [ ] Full color contrast audit with manual verification (a11y follow-up)
- [ ] `aria-live` regions for loading states and form feedback (a11y follow-up)
- [ ] Improve image upload (better checks on file type and limit, UX improvements)
- [ ] Require double-confirmation for heavy deletes (e.g. category)
- [ ] Add `eslint-plugin-better-tailwindcss` to catch deprecated Tailwind v4 classes in lint
- [ ] Session cookies are missing `httpOnly` and `secure` flags
- [ ] Security headers (CSP, X-Frame-Options, X-Content-Type-Options) not yet configured

## Self-hosting

> **Early alpha** — expect breaking changes between versions.
> Back up your `/app/data` directory before upgrading.

### Requirements

- A VPS or any machine that can run Docker

### Quick trial

```bash
docker run -p 3000:3000 tierdom/tierdom-app
```

Open [http://localhost:3000](http://localhost:3000).
Log in at `/admin` with username `admin` and password `admin`.
Data is ephemeral — it lives inside the container and is lost when you remove it.

### Running on a server

Create a `docker-compose.yml` on your server:

```yaml
services:
  tierdom:
    image: tierdom/tierdom-app:latest
    ports:
      - '3000:3000'
    volumes:
      - ./data:/app/data
    environment:
      DATA_PATH: /app/data
      ADMIN_USERNAME: your_username
      ADMIN_PASSWORD: your_password # only used on first boot
      ORIGIN: https://your-domain.com
      LOG_VERBOSE: false # Set to true for full request/response headers in logs
    restart: unless-stopped
```

Then start it:

```bash
docker compose up -d
```

The SQLite database is stored in `/app/data/db.sqlite` and uploaded images in `/app/data/images/`.
`ADMIN_USERNAME` and `ADMIN_PASSWORD` create the admin account on first boot only — changing them later has no effect.
`ORIGIN` should match the URL users visit (needed for SvelteKit's CSRF protection).

### Automatic HTTPS

If you expose the container directly to the internet (no reverse proxy), set `TLS_DOMAIN` to get automatic Let's Encrypt certificates:

```yaml
services:
  tierdom:
    image: tierdom/tierdom-app:latest
    ports:
      - '443:443'
      - '80:80'
    volumes:
      - ./data:/app/data
    environment:
      DATA_PATH: /app/data
      ADMIN_USERNAME: your_username
      ADMIN_PASSWORD: your_password
      TLS_DOMAIN: tierdom.example.com
      LOG_VERBOSE: false # Set to true for full request/response headers in logs
    restart: unless-stopped
```

Caddy handles certificate provisioning and renewal automatically.
Ports 80 and 443 must be reachable from the internet for the ACME challenge.
`ORIGIN` is inferred from `TLS_DOMAIN` when not set explicitly.

### Backup

The `data/` directory on the host contains everything: the database and all uploaded images.

```bash
cp -r ./data /your/backup/path/tierdom-$(date +%Y%m%d)
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
| Runtime    | Node.js 24 LTS (Alpine)                 |
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
| [0010](docs/decisions/0010-authentication-and-authorization.md)         | Authentication and Authorization         | Accepted |
| [0011](docs/decisions/0011-image-support.md)                            | Image Support for Tier List Items        | Accepted |
| [0012](docs/decisions/0012-docker-packaging-and-publishing.md)          | Docker Packaging and Publishing          | Accepted |
| [0013](docs/decisions/0013-uuid-primary-keys.md)                        | UUID Primary Keys                        | Accepted |
| [0014](docs/decisions/0014-end-to-end-testing-strategy.md)              | End-to-End Testing Strategy              | Accepted |
| [0015](docs/decisions/0015-unit-testing-strategy.md)                    | Unit Testing Strategy                    | Accepted |
| [0016](docs/decisions/0016-accessibility-and-semantic-html.md)          | Accessibility and Semantic HTML          | Accepted |

## References

| Document               | Description                                  |
| ---------------------- | -------------------------------------------- |
| [DOMAIN.md](DOMAIN.md) | Core domain model — entities, tiers, scoring |
| [CLAUDE.md](CLAUDE.md) | Development guidelines and AI instructions   |
