#!/usr/bin/env bash
#
# Publish a multi-arch Docker image to Docker Hub.
#
# Usage: ./scripts/publish.sh <version>
#   e.g. ./scripts/publish.sh v0.1.0-alpha.1
#
# Credentials are isolated in a temporary directory and wiped after use.
# No persistent Docker login is created on your machine.
#
# Prerequisites (one-time, for multi-arch builds):
#   docker buildx create --name multiarch --use
#   docker run --privileged --rm tonistiigi/binfmt --install all
#
set -euo pipefail

IMAGE="tierdom/tierdom-app"

# --- Helpers ---
die()     { echo "Error: $*" >&2; exit 1; }
confirm() {
	printf "\n%s [y/N] " "$1"
	read -r answer
	case "$answer" in
		[yY]|[yY][eE][sS]) return 0 ;;
		*) echo "Aborted."; exit 1 ;;
	esac
}

# --- Validate arguments ---
VERSION="${1:-}"
[ -z "$VERSION" ] && die "Usage: $0 <version>  (e.g. v0.1.0-alpha.1)"

# Strip leading 'v' for Docker tag
TAG="${VERSION#v}"

# --- Check prerequisites ---
command -v docker >/dev/null 2>&1 || die "docker is not installed"
docker buildx version >/dev/null 2>&1 || die "docker buildx is not available"

# Check for a builder with multi-platform support
if ! docker buildx inspect --bootstrap 2>/dev/null | grep -q "linux/arm64"; then
	echo ""
	echo "Your current buildx builder does not support linux/arm64."
	echo "Set up multi-platform support with:"
	echo ""
	echo "  docker buildx create --name multiarch --use"
	echo "  docker run --privileged --rm tonistiigi/binfmt --install all"
	echo ""
	die "Multi-platform buildx builder required"
fi

# --- Ephemeral Docker credentials ---
DOCKER_CONFIG="$(mktemp -d)"
export DOCKER_CONFIG

cleanup_credentials() {
	echo ""
	echo "Wiping temporary Docker credentials..."
	rm -rf "$DOCKER_CONFIG"
}
trap cleanup_credentials EXIT

echo ""
echo "Logging in to Docker Hub (credentials are temporary and will be wiped after use)..."
echo ""
docker login

# --- Summary ---
echo ""
echo "=== Tierdom Docker Publish ==="
echo ""
echo "  Image:     ${IMAGE}:${TAG}"
echo "  Also tag:  ${IMAGE}:latest"
echo "  Platforms: linux/amd64, linux/arm64"
echo ""

confirm "Build and push ${IMAGE}:${TAG} to Docker Hub?"

# --- Build and push ---
echo ""
echo "Building multi-arch image and pushing to Docker Hub..."
echo ""

docker buildx build \
	--platform linux/amd64,linux/arm64 \
	--tag "${IMAGE}:${TAG}" \
	--tag "${IMAGE}:latest" \
	--push \
	.

echo ""
echo "=== Published successfully ==="
echo ""
echo "  docker pull ${IMAGE}:${TAG}"
echo "  docker pull ${IMAGE}:latest"
echo ""
echo "Remember to update the Docker Hub description if README.md changed:"
echo "  https://hub.docker.com/repository/docker/${IMAGE}/general"
echo ""
