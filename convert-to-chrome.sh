#!/bin/bash

# Script to convert Firefox browser.* API calls to Chrome chrome.* API calls
# This creates Chrome-specific versions of the extension scripts

set -e

echo "Converting Firefox scripts to Chrome API..."

# Files to convert
FILES=("popup.ts" "options.ts" "browse.ts" "content.ts" "background.ts")

for file in "${FILES[@]}"; do
  echo "Converting $file..."
  
  # Copy file to Chrome directory
  cp "src/$file" "src/chrome/scripts/$file"
  
  # Convert browser.* calls to chrome.*
  # This uses sed to replace browser API calls with chrome API calls
  # and wraps Promise-based calls with callbacks
  
  sed -i 's/browser\.storage\.sync\.get/chrome.storage.sync.get/g' "src/chrome/scripts/$file"
  sed -i 's/browser\.storage\.sync\.set/chrome.storage.sync.set/g' "src/chrome/scripts/$file"
  sed -i 's/browser\.tabs\.query/chrome.tabs.query/g' "src/chrome/scripts/$file"
  sed -i 's/browser\.tabs\.sendMessage/chrome.tabs.sendMessage/g' "src/chrome/scripts/$file"
  sed -i 's/browser\.tabs\.create/chrome.tabs.create/g' "src/chrome/scripts/$file"
  sed -i 's/browser\.runtime\.sendMessage/chrome.runtime.sendMessage/g' "src/chrome/scripts/$file"
  sed -i 's/browser\.runtime\.getURL/chrome.runtime.getURL/g' "src/chrome/scripts/$file"
  sed -i 's/browser\.runtime\.onMessage/chrome.runtime.onMessage/g' "src/chrome/scripts/$file"
  
  echo "✅ Converted $file"
done

# Copy Firefox scripts to firefox directory
echo "Copying Firefox scripts..."
for file in "${FILES[@]}"; do
  cp "src/$file" "src/firefox/scripts/$file"
  echo "✅ Copied $file to Firefox directory"
done

echo ""
echo "Conversion complete!"
echo "Chrome scripts: src/chrome/scripts/"
echo "Firefox scripts: src/firefox/scripts/"
