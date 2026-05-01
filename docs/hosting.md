# Self-hosting

> **Early alpha** — expect breaking changes between versions.
> Back up your `/app/data` directory before upgrading.

## Requirements

- A VPS or any machine that can run Docker

## Quick trial

```bash
docker run -p 3000:3000 tierdom/tierdom-app
```

Open [http://localhost:3000](http://localhost:3000).
An onboarding wizard will help you get set up, empty or with sample data.
Data with this quick setup is ephemeral — it lives inside the container and is lost when you remove it.

## Running on a server

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

## Automatic HTTPS

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

## Backup

The `data/` directory on the host contains everything: the database and all uploaded images.

```bash
cp -r ./data /your/backup/path/tierdom-$(date +%Y%m%d)
```

The `/admin` interface of the website also contains Export functionality.
This will not give you a full backup, but does provide a large chunk of it.
