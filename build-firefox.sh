#!/bin/bash
set -e

cd /home/jasonross/workspace/Claude-Conversation-Exporter-Firefox-TS

echo "Building content script separately..."
npx vite build --config vite.content-firefox.config.ts

echo "Building main extension..."
npx vite build --mode firefox

echo "Copying content script to dist..."
cp dist-temp-content-firefox/content.js dist/firefox/src/firefox/scripts/content.js
rm -rf dist-temp-content-firefox

echo "Copying icon files..."
mkdir -p dist/firefox/src
cp src/icon16.png dist/firefox/src/
cp src/icon48.png dist/firefox/src/
cp src/icon128.png dist/firefox/src/

echo "Copying popup header..."
mkdir -p dist/firefox/src/firefox/scripts
cp src/popup-header.png dist/firefox/src/firefox/scripts/

echo ""
echo "Checking content script..."
CONTENT_SIZE=$(stat -c%s dist/firefox/src/firefox/scripts/content.js 2>/dev/null || stat -f%z dist/firefox/src/firefox/scripts/content.js)
echo "Content script size: $CONTENT_SIZE bytes"

if [ "$CONTENT_SIZE" -gt 1000 ]; then
    echo "✅ Content script built successfully!"
else
    echo "❌ ERROR: Content script is too small"
fi

echo ""
echo "Build complete!"
