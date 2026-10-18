# ADR-0012: Docker Packaging and Publishing

## Status

Accepted

## Context

The app is ready for early-alpha publishing. Self-hosters should be able to `docker pull tierdom/tierdom-app` and start with a single command. Drivers:

- **HTTP/2 multiplexing** for the dozens of small WebP thumbnails on tier-list pages — HTTP/1.1's six-connection-per-domain limit creates a waterfall.
- **TLS for self-hosters** exposing the app directly to the internet, without manual cert management.
- **Crash resilience** — a Node crash should not require manual intervention.
- **Logging** — structured logs available via `docker logs` with no extra config.
- **Secret safety** — this project is AI-assisted ("vibe coding"); secrets must never live in repo, CI config, or any automation file (no prompt-injection leak surface).

ADR-0002 established the single-process / single-image architecture. This ADR layers concrete packaging, reverse proxy, and publishing strategy on top.

## Decision

### Caddy reverse proxy inside the container

Caddy is the externally facing server, reverse-proxying to Node on an internal port.

| Concern         | Caddy                               | Nginx                                |
| --------------- | ----------------------------------- | ------------------------------------ |
| HTTP/2          | On by default when TLS is active    | Requires TLS or special module flags |
| Automatic HTTPS | Built-in Let's Encrypt, zero config | Needs certbot + cron + reload        |
| Configuration   | 3-line Caddyfile                    | ~20-line nginx.conf                  |
| Binary          | Single static binary                | Multiple files + modules             |

Caddy listens on `:3000` (matching the documented `docker run` interface) and proxies to Node on `localhost:3001`.

**HTTP/2 caveat:** the spec requires TLS for browsers, so plain `:3000` traffic is HTTP/1.1. HTTP/2 activates when `TLS_DOMAIN` is set (Caddy terminates TLS) or when an HTTP/2-speaking reverse proxy fronts the container — both are common production paths.

### TLS via `TLS_DOMAIN`

- **Default (unset):** Caddy serves plain HTTP on `:3000`; the self-hoster fronts it with their own TLS-terminating proxy.
- **Set:** the entrypoint rewrites the Caddyfile to use the domain as the address; Caddy auto-provisions Let's Encrypt and serves HTTPS on 443. User maps `-p 443:443 -p 80:80` instead of `-p 3000:3000`.

### Multi-stage Dockerfile

- **Build:** `node:24-alpine`, `npm ci`, `npm run build`.
- **Runtime:** `node:24-alpine` + `caddy`, `tini`, `curl` via `apk`. Copies `build/` and `drizzle/` from the build stage, then `npm ci --omit=dev` to install native binaries (`better-sqlite3`, `sharp`) for Alpine.

`tini` is PID 1 — handles signal forwarding and zombie reaping for the two child processes (Caddy + Node).

### Deployment file layout

`Caddyfile` and `docker-entrypoint.sh` live in `deploy/` at the repo root, copied into the image by the Dockerfile. Keeps deployment-only artefacts out of the project root.

### Crash resilience

- `/health` endpoint runs `SELECT 1` and returns 200 or 503.
- Docker `HEALTHCHECK` polls `localhost:3001/health` every 30s; container is unhealthy after 3 consecutive failures.
- Entrypoint runs Node in `while true` with a 2-second restart pause. Caddy stays up across Node restarts, so Docker doesn't see a container exit.
- `--restart unless-stopped` is documented in the `docker run` examples for whole-container recovery.

### Logging

Caddy writes structured JSON access logs to stderr; Node sends startup/errors to stdout/stderr. Docker captures both via `docker logs`. No file logging, no OpenTelemetry — self-hosters can pipe to any aggregator (Loki, ELK, CloudWatch).

### Local-only publish script

`scripts/publish.sh` builds and pushes multi-arch images (linux/amd64, linux/arm64) to Docker Hub as `tierdom/tierdom-app`.

- Requires a version arg.
- Requires interactive `docker login` beforehand.
- Prompts for explicit confirmation before pushing.
- No CI/CD, no GitHub Actions secrets, no stored credentials. Manual publishing is slower but eliminates leak risk through repo, CI, or AI workflows.

### Environment variable contract

| Variable         | Required | Default                                              | Purpose                                         |
| ---------------- | -------- | ---------------------------------------------------- | ----------------------------------------------- |
| `DATA_PATH`      | Yes      | `/app/data`                                          | Directory for database and images               |
| `ADMIN_PASSWORD` | No       | —                                                    | Creates admin account on first boot if set      |
| `ADMIN_USERNAME` | No       | `admin`                                              | Username for the bootstrapped admin             |
| `ORIGIN`         | No       | Inferred from `TLS_DOMAIN`, else derived per request | SvelteKit CSRF protection origin (via Caddy)    |
| `TLS_DOMAIN`     | No       | —                                                    | Domain for automatic Let's Encrypt HTTPS        |
| `LOG_VERBOSE`    | No       | —                                                    | `true` to include full request/response headers |

### Volume contract

`/app/data` holds all persistent state: the SQLite file and `images/`. `cp -r /app/data /backup/` captures everything.

## Consequences

- Two processes (Caddy + Node) under `tini` — small departure from ADR-0002's single-process ideal. Acceptable: Caddy is a static binary with no shared state and the entrypoint manages both lifecycles.
- Image is large (~500 MB), dominated by production `node_modules` (`lucide-svelte` ships all icon sources despite tree-shaking at build time). Optimizable later by pruning unused packages from the production stage.
- Multi-arch arm64 builds are slow under QEMU emulation on amd64 hosts (~10–15 min). Affects publishing only, not runtime.
- Publishing is manual by design — no automated release pipeline.
- Self-hosters running directly on a public IP get automatic HTTPS with one extra env var.
- Caddy's structured logs give queryable access logs with zero setup.

## Amendment 1: `ORIGIN` enforced by Caddy

SvelteKit 3 (adapter-node 6) dropped the `ORIGIN` env var; its replacement `paths.origin` is build-time and can't vary per deployment of one published image.
`ORIGIN` remains our runtime contract: the entrypoint makes Caddy pin `Host` and `X-Forwarded-Proto` to it, and Node runs with `PROTOCOL_HEADER=x-forwarded-proto`.
When neither `ORIGIN` nor `TLS_DOMAIN` is set, the origin is derived per request instead of defaulting to `http://localhost:3000`, so any host port mapping works.
