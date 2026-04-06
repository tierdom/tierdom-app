#!/bin/sh
set -e

# Generate Caddyfile from env vars when TLS_DOMAIN is set
if [ -n "$TLS_DOMAIN" ]; then
	cat > /etc/caddy/Caddyfile <<EOF
$TLS_DOMAIN {
	reverse_proxy localhost:3001
	encode gzip
	log {
		output stderr
		format json
	}
}
EOF
fi

# Default ORIGIN for SvelteKit CSRF protection
if [ -z "$ORIGIN" ]; then
	if [ -n "$TLS_DOMAIN" ]; then
		export ORIGIN="https://$TLS_DOMAIN"
	else
		export ORIGIN="http://localhost:3000"
	fi
fi

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
	PORT=3001 HOST=127.0.0.1 node build &
	NODE_PID=$!
	wait "$NODE_PID" || true
	echo "[entrypoint] Node.js exited, restarting in 2s..." >&2
	sleep 2
done
