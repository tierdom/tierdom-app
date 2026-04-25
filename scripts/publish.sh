#!/usr/bin/env bash
#
# Publish a multi-arch Docker image to Docker Hub.
#
# Usage: ./scripts/publish.sh [version]
#   - With no arg, the version is taken from package.json and 'v' is prepended.
#   - With an arg (e.g. v0.1.0-alpha.6), it is validated against package.json.
#
# Bump the version BEFORE running this script. Recommended:
#   npm version prerelease --preid=alpha    # 0.1.0-alpha.5 -> 0.1.0-alpha.6
#   npm version patch                       # 0.1.0         -> 0.1.1
#   npm version minor                       # 0.1.0         -> 0.2.0
# `npm version` updates package.json + package-lock.json, makes a commit, and
# tags it as v<version>. Refuses to run if the working tree is dirty.
#
# After publish, push the tag:
#   git push && git push --tags
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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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

# --- Determine version ---
PKG_VERSION="$(node -p "require('$REPO_ROOT/package.json').version")"
[ -z "$PKG_VERSION" ] && die "Could not read version from package.json"

ARG_VERSION="${1:-}"
if [ -z "$ARG_VERSION" ]; then
  VERSION="v${PKG_VERSION}"
  echo "No version argument given — using v${PKG_VERSION} from package.json."
else
  VERSION="$ARG_VERSION"
  ARG_TAG="${ARG_VERSION#v}"
  if [ "$ARG_TAG" != "$PKG_VERSION" ]; then
    die "Version mismatch: argument is '${ARG_TAG}' but package.json is '${PKG_VERSION}'. Bump package.json first (npm version ...)."
  fi
fi

# Strip leading 'v' for Docker tag
TAG="${VERSION#v}"

# --- Refuse to publish from a dirty working tree ---
# A dirty tree means the artifact won't match what's in git — bad for traceability.
if ! git -C "$REPO_ROOT" diff --quiet || ! git -C "$REPO_ROOT" diff --cached --quiet; then
  die "Working tree is dirty. Commit or stash changes before publishing."
fi

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
echo "Remember to push the matching git tag:"
echo "  git push && git push --tags"
echo ""
echo "And update the Docker Hub description if README.md changed:"
echo "  https://hub.docker.com/repository/docker/${IMAGE}/general"
echo ""
