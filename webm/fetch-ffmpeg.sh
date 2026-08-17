#!/bin/bash
# Download a static arm64 ffmpeg build into Resources/ffmpeg.
# Source: osxexperts.net static builds (GPL, includes libvpx/libaom/libwebp/opus).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p Resources

URL="https://www.osxexperts.net/ffmpeg80arm.zip"
echo "Downloading $URL…"
curl -fL -o /tmp/ffmpeg-static.zip "$URL"
unzip -o /tmp/ffmpeg-static.zip -d /tmp/ffmpeg-static
BIN=$(find /tmp/ffmpeg-static -type f -name ffmpeg | head -1)
cp "$BIN" Resources/ffmpeg
chmod +x Resources/ffmpeg
xattr -d com.apple.quarantine Resources/ffmpeg 2>/dev/null || true
Resources/ffmpeg -version | head -1
echo "Saved to Resources/ffmpeg"
