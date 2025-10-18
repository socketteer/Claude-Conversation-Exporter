#!/bin/bash

# Build script for Chrome extension
# This script builds the content script separately as an IIFE to avoid
# the broken dynamic import loader that the vite-plugin-web-extension creates

set -e

echo "Building Chrome extension..."

# Step 1: Build content script separately as IIFE
echo "Step 1: Building content script..."
npx vite build --config vite.content-chrome.config.ts

# Step 2: Build main extension with vite-plugin-web-extension
echo "Step 2: Building main extension..."
BROWSER=chrome npx vite build --mode chrome

# Step 3: Copy the IIFE content script over the stub
echo "Step 3: Replacing content script stub with IIFE bundle..."
cp dist-temp-content-chrome/content.js dist/chrome/src/chrome/scripts/content.js

# Step 3.5: Fix serviceWorker.js import path (make it relative)
echo "Step 3.5: Fixing serviceWorker.js import path..."
sed -i 's|"/src/|"./src/|g' dist/chrome/serviceWorker.js

# Step 4: Copy icon files
echo "Step 4: Copying icon files..."
mkdir -p dist/chrome/src
cp src/icon16.png dist/chrome/src/
cp src/icon48.png dist/chrome/src/
cp src/icon128.png dist/chrome/src/

# Step 5: Copy popup header image
echo "Step 5: Copying popup header..."
mkdir -p dist/chrome/src/chrome/scripts
cp src/popup-header.png dist/chrome/src/chrome/scripts/

echo "Chrome build complete!"
echo "Load unpacked extension from: dist/chrome/"
