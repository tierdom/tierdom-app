# tierdom-pro

A self-hosted personal tier list aggregator. Replace scattered tools like Goodreads, Letterboxd, BoardGameGeek, and others with a single app you own and run yourself.

---

## What it is

**tierdom-pro** has two sides:

- **Public site** — A read-only view for anyone to browse your tier lists, organized by topic (Games, Books, Movies, Board Games, etc.). Each section shows items you've consumed or experienced, ranked in tiers. Also includes a home page and about page managed via a lightweight built-in CMS.
- **Admin back-office** — A private, authenticated interface for adding and editing entries, managing sections, and updating CMS content.

The entire app ships as a single Docker image. The database is a SQLite file mounted as a volume, so it lives outside the container and can be backed up independently.

---

## Documentation

| Document                           | Description                                  |
| ---------------------------------- | -------------------------------------------- |
| [DOMAIN.md](DOMAIN.md)             | Core domain model — entities, tiers, scoring |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Architecture decision records index          |
| [GUIDELINES.md](GUIDELINES.md)     | Development guidelines                       |

---

## Features

- Topic sections (Games, Books, Movies, Board Games, and more — fully configurable)
- Tier list view per section with customizable tier labels
- Lightweight built-in CMS for static pages (Home, About)
- Admin interface protected behind single-user authentication
- Self-contained: no external services required
- Single Docker image — runs on any VPS

---

## Self-hosting

### Requirements

- Docker
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

The SQLite database is stored in `/app/data/db.sqlite` inside the container. Mount `/app/data` to a host path to persist and back up your data independently of the container.

### Backup

```bash
cp /your/data/path/db.sqlite /your/backup/path/db-$(date +%Y%m%d).sqlite
```

---

## Development

```sh
npm install
npm run dev
```

To recreate this project scaffold from scratch:

```sh
npx sv@0.14.0 create --template minimal --types ts \
  --add prettier eslint 'vitest=usages:unit' playwright 'tailwindcss=plugins:none' \
  'drizzle=database:sqlite+sqlite:better-sqlite3' 'sveltekit-adapter=adapter:node' \
  'mcp=ide:claude-code+setup:local' \
  --no-download-check --install npm .
```

---

## Tech stack

| Layer      | Choice                                  |
| ---------- | --------------------------------------- |
| Framework  | SvelteKit 2 + Svelte 5 (TypeScript)     |
| Database   | SQLite via Drizzle ORM (better-sqlite3) |
| Styling    | Tailwind CSS v4                         |
| Testing    | Vitest + Playwright                     |
| Runtime    | Node.js (Alpine)                        |
| Deployment | Single Docker image                     |

---

## Roadmap

- [ ] Core tier list sections (Games, Books, Movies, Board Games)
- [ ] Tier list display (public)
- [ ] Admin interface (add/edit entries, manage sections)
- [ ] Built-in CMS (Home, About pages)
- [ ] Docker image
- [ ] Import from external sources (Goodreads CSV, etc.)
- [ ] RSS feed per section
