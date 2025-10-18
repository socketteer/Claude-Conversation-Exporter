#!/bin/bash
set -e

echo "Building Firefox extension..."
cd /home/jasonross/workspace/Claude-Conversation-Exporter-Firefox-TS

# Run TypeScript compiler
echo "Running TypeScript compiler..."
npx tsc --noEmit

# Run Vite build
echo "Running Vite build..."
npx vite build --mode firefox

# Check if content script was built correctly
echo ""
echo "Checking content script..."
CONTENT_SIZE=$(stat -f%z dist/firefox/src/content.js 2>/dev/null || stat -c%s dist/firefox/src/content.js 2>/dev/null)
echo "Content script size: $CONTENT_SIZE bytes"

if [ "$CONTENT_SIZE" -lt 100 ]; then
    echo "❌ ERROR: Content script is too small! ($CONTENT_SIZE bytes)"
    echo "Content of content.js:"
    cat dist/firefox/src/content.js
else
    echo "✅ Content script built successfully"
fi

echo ""
echo "Build complete!"
ls -lh dist/firefox/src/*.js
