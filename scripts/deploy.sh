#!/usr/bin/env bash
#
# Install the latest scratchpad release into Caddy's site directory.
#
#   sudo ./deploy.sh

set -euo pipefail

SITE_DIR="${SITE_DIR:-/var/www/scratchpad}"

release=$(curl -fsSL https://api.github.com/repos/jasonrdsouza/scratchpad/releases/latest)
url=$(grep -m1 -o '"browser_download_url": *"[^"]*"' <<<"$release" | cut -d'"' -f4)
echo "Downloading $url"

# Download first, so a failed download doesn't leave the site empty
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
curl -fsSL -o "$tmp" "$url"

rm -rf "$SITE_DIR"
mkdir -p "$SITE_DIR"
tar --no-same-owner -xzf "$tmp" -C "$SITE_DIR"
chmod -R a+rX "$SITE_DIR"

echo "Installed into $SITE_DIR"
