#!/usr/bin/env bash
#
# Install a scratchpad release from GitHub onto this server.
#
#   ./deploy.sh            # install the latest release
#   ./deploy.sh v1.0.3     # install (or roll back to) a specific release
#
# Each release is unpacked into its own directory under $RELEASES_DIR, and
# $SITE_DIR (Caddy's root) is a symlink that gets atomically switched to it.
# The most recent $KEEP releases are kept for quick rollbacks.

set -euo pipefail

REPO="jasonrdsouza/scratchpad"
SITE_DIR="${SITE_DIR:-/var/www/scratchpad}"
RELEASES_DIR="${RELEASES_DIR:-/var/www/scratchpad-releases}"
KEEP="${KEEP:-5}"

tag="${1:-}"
if [[ -z "$tag" ]]; then
    latest=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest")
    tag=$(grep -m1 '"tag_name"' <<<"$latest" |
        sed -E 's/.*"tag_name": *"([^"]+)".*/\1/')
fi
if [[ ! "$tag" =~ ^v[0-9A-Za-z.+-]+$ ]]; then
    echo "Couldn't determine a valid release tag (got '$tag')" >&2
    exit 1
fi

current=$(readlink "$SITE_DIR" 2>/dev/null || true)
target="$RELEASES_DIR/$tag"
if [[ "$current" == "$target" ]]; then
    echo "$tag is already installed"
    exit 0
fi

echo "Installing $tag..."
mkdir -p "$RELEASES_DIR"
tmp=$(mktemp -d "$RELEASES_DIR/.download.XXXXXX")
trap 'rm -rf "$tmp"' EXIT

curl -fsSL -o "$tmp/release.tar.gz" \
    "https://github.com/$REPO/releases/download/$tag/scratchpad-$tag.tar.gz"
mkdir "$tmp/site"
tar --no-same-owner -xzf "$tmp/release.tar.gz" -C "$tmp/site"

if [[ ! -f "$tmp/site/index.html" ]]; then
    echo "Release archive doesn't contain index.html; not installing" >&2
    exit 1
fi

# Caddy runs as its own user, so make sure it can read everything
chmod -R a+rX "$tmp/site"

rm -rf "$target"
mv "$tmp/site" "$target"
# tar keeps the archive's timestamps; use install time so pruning keeps the
# most recently installed releases
touch "$target"

# First run: move an existing plain directory out of the way
if [[ -d "$SITE_DIR" && ! -L "$SITE_DIR" ]]; then
    backup="$RELEASES_DIR/pre-symlink-$(date +%Y%m%d%H%M%S)"
    echo "Moving existing $SITE_DIR to $backup"
    mv "$SITE_DIR" "$backup"
fi

# Atomically point the site at the new release
ln -sfn "$target" "$SITE_DIR.new"
mv -T "$SITE_DIR.new" "$SITE_DIR"
echo "Now serving $tag from $target"

# Prune old releases, never removing the one being served
ls -1dt "$RELEASES_DIR"/v* 2>/dev/null | tail -n +"$((KEEP + 1))" |
    while read -r old; do
        if [[ "$old" != "$target" ]]; then
            echo "Removing old release $(basename "$old")"
            rm -rf "$old"
        fi
    done
