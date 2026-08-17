#!/bin/bash
# Build Webmer.app from the Swift package.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -x "Resources/ffmpeg" ]; then
  echo "error: Resources/ffmpeg missing. Run ./fetch-ffmpeg.sh first." >&2
  exit 1
fi

echo "Building (release)…"
swift build -c release

APP="Webmer.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

cp .build/release/WebMConverter "$APP/Contents/MacOS/WebMConverter"
cp Resources/ffmpeg "$APP/Contents/Resources/ffmpeg"
chmod +x "$APP/Contents/Resources/ffmpeg"
cp Resources/AppIcon.icns "$APP/Contents/Resources/AppIcon.icns"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleName</key><string>Webmer</string>
	<key>CFBundleDisplayName</key><string>Webmer</string>
	<key>CFBundleIdentifier</key><string>com.k4design.webmer</string>
	<key>CFBundleExecutable</key><string>WebMConverter</string>
	<key>CFBundlePackageType</key><string>APPL</string>
	<key>CFBundleShortVersionString</key><string>1.0</string>
	<key>CFBundleVersion</key><string>1</string>
	<key>CFBundleIconFile</key><string>AppIcon</string>
	<key>LSMinimumSystemVersion</key><string>14.0</string>
	<key>NSHighResolutionCapable</key><true/>
	<key>LSApplicationCategoryType</key><string>public.app-category.video</string>
</dict>
</plist>
PLIST

# Pick the best available signing identity: Developer ID > Apple Development > ad-hoc
IDENTITIES=$(security find-identity -v -p codesigning || true)
IDENTITY=$(echo "$IDENTITIES" | grep -o '"Developer ID Application: [^"]*"' | head -1 | tr -d '"' || true)
if [ -z "$IDENTITY" ]; then
  IDENTITY=$(echo "$IDENTITIES" | grep -o '"Apple Development: [^"]*"' | head -1 | tr -d '"' || true)
fi
IDENTITY="${IDENTITY:--}"
echo "Signing with: $IDENTITY"

# Sign the bundled ffmpeg first, then the app, with hardened runtime (required for notarization)
codesign --force --options runtime --timestamp --sign "$IDENTITY" "$APP/Contents/Resources/ffmpeg"
codesign --force --options runtime --timestamp --sign "$IDENTITY" "$APP"
codesign --verify --deep --strict "$APP" && echo "Signature OK"
echo "Done: $PWD/$APP"
