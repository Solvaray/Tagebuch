#!/bin/bash

# Dieser Trick nutzt AppleScript, um ein GUI-App-Alias zu erstellen
# Das Skript erstellt eine .app-ähnliche Struktur auf dem Desktop

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_PY="$SCRIPT_DIR/deploy.py"
DESKTOP="$HOME/Desktop"
APP_DIR="$DESKTOP/Tagebuch Deploy.app"

mkdir -p "$APP_DIR/Contents/MacOS"

cat > "$APP_DIR/Contents/MacOS/run" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$SCRIPT_DIR"
python3 "$SCRIPT_DIR/deploy.py"
EOF

chmod +x "$APP_DIR/Contents/MacOS/run"

cat > "$APP_DIR/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>Tagebuch Deploy</string>
  <key>CFBundleExecutable</key>
  <string>run</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
</dict>
</plist>
EOF

echo "✅ Desktop-App erstellt: Tagebuch Deploy.app"
echo "Einfach doppelklicken zum Deployen!"
