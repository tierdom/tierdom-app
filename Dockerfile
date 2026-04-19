# Stage 1: Build the SvelteKit application
FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN mkdir -p build-data && DATA_PATH=./build-data npm run build && rm -rf build-data

# Stage 2: Production runtime
FROM node:24-alpine

RUN apk add --no-cache caddy tini curl

WORKDIR /app

# Copy build output and migration files
COPY --from=build /app/build ./build
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/package.json /app/package-lock.json ./

# Install production dependencies (native binaries for Alpine)
# Remove prepare script (svelte-kit sync + husky are dev-only) before installing
RUN npm pkg delete scripts.prepare && npm ci --omit=dev

# Caddy configuration
COPY Caddyfile /etc/caddy/Caddyfile

# Entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Default database path for zero-config trial — override at runtime
ENV DATA_PATH=/app/data

VOLUME /app/data
EXPOSE 3000 443 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["/docker-entrypoint.sh"]
