# ADR-0012: Docker Packaging and Publishing

## Status

Proposed

## Context

The application is ready for early alpha publishing.
Self-hosters should be able to run `docker pull tierdom/tierdom-app` and start the app with a single command.
Several concerns drive this decision:

- **HTTP/2 multiplexing:** The public tier list pages serve dozens of small WebP images (8-15 KB each).
  HTTP/1.1's six-connection-per-domain limit creates a waterfall.
  HTTP/2 multiplexes all requests over a single connection, eliminating the bottleneck.
- **TLS for self-hosters:** Users who expose the app directly to the internet need HTTPS without manually configuring certificates.
- **Crash resilience:** A crash in the Node.js process should not require manual intervention to recover.
- **Logging:** Container logs should be structured and available via `docker logs` without extra configuration.
- **Secret safety:** This project is explicitly developed with AI-assisted (vibe coding) workflows.
  Secrets must never exist in the repository, CI configuration, or any automation file to eliminate the risk of prompt injection leaking credentials.

ADR-0002 established the single-process, single-image architecture.
This ADR extends it with the concrete Docker packaging, reverse proxy, and publishing strategy.

## Decision

### Caddy reverse proxy inside the container

Caddy runs as the container's externally facing server and reverse-proxies to the Node.js SvelteKit app on an internal port.

**Why Caddy over Nginx:**

| Concern         | Caddy                               | Nginx                                |
| --------------- | ----------------------------------- | ------------------------------------ |
| HTTP/2          | On by default when TLS is active    | Requires TLS or special module flags |
| Automatic HTTPS | Built-in Let's Encrypt, zero config | Needs certbot + cron + reload        |
| Configuration   | 3-line Caddyfile                    | ~20-line nginx.conf                  |
| Binary          | Single static binary                | Multiple files + modules             |

Caddy listens on port 3000 (matching the documented `docker run` interface) and proxies to Node.js on `localhost:3001` (internal only).

**Note on HTTP/2:** Caddy requires TLS for HTTP/2 (the HTTP/2 spec mandates this for browsers).
In the default `:3000` plain-HTTP mode, connections use HTTP/1.1.
HTTP/2 activates in two scenarios: (1) `TLS_DOMAIN` is set, so Caddy terminates TLS itself, or (2) the container sits behind a TLS-terminating reverse proxy that speaks HTTP/2 to clients.
Both are the common production paths — direct plain-HTTP access is primarily for local development and testing.

### TLS via `TLS_DOMAIN` environment variable

- **Default (no `TLS_DOMAIN`):** Caddy listens on `:3000` with plain HTTP.
  The self-hoster puts their own reverse proxy (Caddy, Traefik, nginx) in front for TLS termination.
- **With `TLS_DOMAIN=example.com`:** The entrypoint script rewrites the Caddyfile to use the domain as the address.
  Caddy automatically provisions a Let's Encrypt certificate and serves HTTPS on port 443.
  The user maps `-p 443:443 -p 80:80` instead of `-p 3000:3000`.

### Multi-stage Dockerfile

- **Build stage:** `node:24-alpine`, `npm ci`, `npm run build`.
- **Production stage:** `node:24-alpine` with `caddy`, `tini`, and `curl` added via `apk`.
  Copies `build/` and `drizzle/` from the build stage, then runs `npm ci --omit=dev` to install native binaries (`better-sqlite3`, `sharp`) for the Alpine target.

`tini` is the init process (PID 1) to handle signal forwarding and zombie reaping for the two child processes (Caddy and Node).

### Crash resilience

- **`/health` endpoint:** A SvelteKit route that runs `SELECT 1` against the database and returns `200` or `503`.
- **Docker `HEALTHCHECK`:** Polls `http://localhost:3001/health` every 30 seconds.
  Docker marks the container as unhealthy after 3 consecutive failures.
- **Node restart loop:** The entrypoint script runs Node.js in a `while true` loop.
  If Node crashes, it restarts after a 2-second pause.
  Caddy stays up throughout, so Docker does not see a container exit.
- **`--restart unless-stopped`:** Documented in the `docker run` examples so Docker restarts the entire container if Caddy or the entrypoint exits.

### Logging

Caddy writes structured JSON access logs to stderr.
Node.js output (startup messages, errors) goes to stdout/stderr.
Docker captures both via `docker logs`.
No file-based logging or OpenTelemetry for the alpha — the standard Docker logging driver is sufficient, and self-hosters can pipe to any aggregator (Loki, ELK, CloudWatch).

### Local-only publish script

A `scripts/publish.sh` Bash script builds and pushes multi-arch images (linux/amd64, linux/arm64) to Docker Hub as `tierdom/tierdom-app`.

- Requires a version argument (e.g., `v0.1.0-alpha.1`).
- Requires the user to have run `docker login` interactively beforehand.
- Prompts for explicit confirmation before building and pushing.
- No CI/CD pipeline, no GitHub Actions secrets, no stored credentials.

This is a deliberate trade-off: manual publishing is slower but eliminates the risk of credential leakage through the codebase, CI configuration, or AI-assisted workflows.

### Environment variable contract

| Variable         | Required | Default                                             | Purpose                                                    |
| ---------------- | -------- | --------------------------------------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`   | Yes      | —                                                   | Path to SQLite database file (e.g., `/app/data/db.sqlite`) |
| `ADMIN_PASSWORD` | No       | —                                                   | Creates admin account on first boot if set                 |
| `ADMIN_USERNAME` | No       | `admin`                                             | Username for the bootstrapped admin account                |
| `ORIGIN`         | No       | Inferred from TLS_DOMAIN or `http://localhost:3000` | SvelteKit CSRF protection origin                           |
| `TLS_DOMAIN`     | No       | —                                                   | Domain name for automatic Let's Encrypt HTTPS              |
| `LOG_VERBOSE`    | No       | —                                                   | Set to `true` to include full request/response headers     |

### Volume contract

`/app/data` holds all persistent state: the SQLite database and the `images/` directory.
A single `cp -r /app/data /backup/` captures everything.

## Consequences

- The container runs two processes (Caddy + Node) under `tini`, which is a small departure from the single-process ideal in ADR-0002.
  This is acceptable because Caddy is a static binary with no shared state and the entrypoint manages both lifecycles.
- Image size is ~500 MB, dominated by production `node_modules` (lucide-svelte ships all icon sources on disk despite tree-shaking at build time). Optimizable later by pruning unused packages from the production stage.
- Multi-arch arm64 builds are slow under QEMU emulation on amd64 hosts (~10-15 minutes) but this only affects publishing, not runtime.
- Publishing requires manual intervention by design — there is no automated release pipeline.
- Self-hosters who run the container directly on a public IP get automatic HTTPS with one extra environment variable.
- Caddy's structured JSON logs give self-hosters queryable access logs without any setup.
