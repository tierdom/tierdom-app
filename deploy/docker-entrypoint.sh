#!/bin/sh
set -e

# Determine Caddy listen address
if [ -n "$TLS_DOMAIN" ]; then
  CADDY_ADDRESS="$TLS_DOMAIN"
else
  CADDY_ADDRESS=":3000"
fi

# Log format: compact by default, full headers with LOG_VERBOSE=true
if [ "$LOG_VERBOSE" = "true" ]; then
  LOG_FORMAT="format json"
else
  LOG_FORMAT="format filter {
      wrap json
      fields {
        request>headers delete
        resp_headers delete
      }
    }"
fi

# Public origin for SvelteKit CSRF protection. adapter-node 6 dropped its
# ORIGIN env var, so Caddy pins Host + X-Forwarded-Proto to ORIGIN instead.
# Without ORIGIN the origin is derived per request (any host port works).
if [ -z "$ORIGIN" ] && [ -n "$TLS_DOMAIN" ]; then
  ORIGIN="https://$TLS_DOMAIN"
fi
if [ -n "$ORIGIN" ]; then
  ORIGIN_SCHEME="${ORIGIN%%://*}"
  ORIGIN_HOST="${ORIGIN#*://}"
  ORIGIN_HOST="${ORIGIN_HOST%%/*}"
  PROXY_HEADERS="header_up Host $ORIGIN_HOST
    header_up X-Forwarded-Proto $ORIGIN_SCHEME"
else
  PROXY_HEADERS=""
fi

# Generate Caddyfile
cat > /etc/caddy/Caddyfile <<EOF
$CADDY_ADDRESS {
  reverse_proxy localhost:3001 {
    $PROXY_HEADERS
  }
  encode gzip
  log {
    output stderr
    $LOG_FORMAT
  }
}
EOF

# Defaults for zero-config trial — override these at runtime
: "${ADMIN_USERNAME:=admin}"
: "${ADMIN_PASSWORD:=admin}"
export ADMIN_USERNAME ADMIN_PASSWORD

# Start Caddy
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &
CADDY_PID=$!

# Trap signals for clean shutdown
cleanup() {
  kill "$NODE_PID" "$CADDY_PID" 2>/dev/null
  wait "$CADDY_PID" 2>/dev/null
  exit 0
}
trap cleanup TERM INT

# Start Node.js with restart loop (inline, not a subshell, so NODE_PID is visible to trap)
while true; do
  PORT=3001 HOST=127.0.0.1 PROTOCOL_HEADER=x-forwarded-proto node build &
  NODE_PID=$!
  wait "$NODE_PID" || true
  echo "[entrypoint] Node.js exited, restarting in 2s..." >&2
  sleep 2
done
