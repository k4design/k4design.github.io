#!/bin/bash
#
# Build the Mac app in Release and install it into /Applications.
#
# Run this whenever the Swift code changes and you want the installed copy
# updated. It replaces the app in place, so its settings, saved access key and
# window position all carry over — nothing to reconfigure.
#
#   ./install-mac-app.sh
#
set -euo pipefail

cd "$(dirname "$0")"

PROJECT="CreativeDirection.xcodeproj"
SCHEME="CreativeDirection"
DEST="/Applications/Creative Direction.app"
BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "$BUILD_DIR"' EXIT

echo "▸ Building Release…"
xcodebuild -project "$PROJECT" -scheme "$SCHEME" \
  -configuration Release -destination 'platform=macOS,arch=arm64' \
  -derivedDataPath "$BUILD_DIR" build \
  > "$BUILD_DIR/build.log" 2>&1 || {
    echo "✗ Build failed. Last 30 lines:"
    tail -30 "$BUILD_DIR/build.log"
    exit 1
  }

APP="$BUILD_DIR/Build/Products/Release/CreativeDirection.app"
[ -d "$APP" ] || { echo "✗ No app at $APP"; exit 1; }

# Quit the running copy first, or the replace lands under a live process.
if pgrep -x CreativeDirection > /dev/null; then
  echo "▸ Quitting the running app…"
  osascript -e 'quit app "CreativeDirection"' 2>/dev/null || pkill -x CreativeDirection || true
  sleep 2
fi

echo "▸ Installing to $DEST…"
rm -rf "$DEST"
cp -R "$APP" "$DEST"
# Locally built, never downloaded — make sure no stale quarantine flag remains.
xattr -dr com.apple.quarantine "$DEST" 2>/dev/null || true

echo "▸ Verifying signature…"
codesign -v "$DEST" && echo "  signature OK"

echo "✓ Installed. Open it from Launchpad or Spotlight (“Creative Direction”)."
