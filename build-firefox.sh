#!/bin/bash
set -e

cd /home/jasonross/workspace/Claude-Conversation-Exporter-Firefox-TS

echo "Building content script separately..."
npx vite build --config vite.content.config.ts

echo "Building main extension..."
npx tsc && npx vite build --mode firefox

echo "Copying content script to dist..."
cp dist-temp-content/content.js dist/firefox/src/content.js
rm -rf dist-temp-content

echo ""
echo "Checking content script..."
CONTENT_SIZE=$(stat -c%s dist/firefox/src/content.js 2>/dev/null || stat -f%z dist/firefox/src/content.js)
echo "Content script size: $CONTENT_SIZE bytes"

if [ "$CONTENT_SIZE" -gt 1000 ]; then
    echo "✅ Content script built successfully!"
else
    echo "❌ ERROR: Content script is too small"
fi

echo ""
echo "Build complete!"
