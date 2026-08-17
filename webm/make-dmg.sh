#!/bin/bash
# Package Webmer.app into a distributable DMG.
set -euo pipefail
cd "$(dirname "$0")"

APP="Webmer.app"
DMG="Webmer-1.0.dmg"
STAGE=$(mktemp -d)

[ -d "$APP" ] || { echo "error: $APP not found — run ./build-app.sh first" >&2; exit 1; }

cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"

cat > "$STAGE/READ ME FIRST.txt" <<'TXT'
Webmer — install instructions

1. Drag "Webmer" onto the Applications folder shortcut.

2. First launch only: macOS will warn that it can't verify the app
   (it isn't notarized with Apple). To open it:

   • Right-click (or Control-click) the app in Applications
     and choose "Open", then click "Open" in the dialog.

   • If that doesn't work: open System Settings > Privacy & Security,
     scroll down, and click "Open Anyway" next to the Webmer
     message, then launch the app again.

   This is only needed once — afterwards it opens normally.

Drop video files in, adjust settings, press Convert.
TXT

rm -f "$DMG"
hdiutil create -volname "Webmer" -srcfolder "$STAGE" -ov -format UDZO "$DMG"
rm -rf "$STAGE"
echo "Created: $PWD/$DMG"
