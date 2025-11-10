#!/bin/bash

# Relink Claude artifacts in exported chat markdown files (Obsidian wikilink format)
# This script updates artifact links in chat markdown files to use Obsidian wikilinks
# Assumes script is located at: Claude Squad/_Code/CLI/

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default paths relative to script location (assumes script is in Claude Squad/_Code/CLI/)
CHATS_DIR="${SCRIPT_DIR}/../../_Archive/Export/Chats/md"
ARTIFACTS_DIR="${SCRIPT_DIR}/../../_Archive/Export/Artifacts"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Claude Artifact Relinker (Obsidian Wikilinks)${NC}"
echo "================================"
echo "Chats directory: $CHATS_DIR"
echo "Artifacts directory: $ARTIFACTS_DIR"
echo ""

# Check if directories exist
if [ ! -d "$CHATS_DIR" ]; then
    echo -e "${RED}Error: Chats directory not found: $CHATS_DIR${NC}"
    echo "Make sure this script is located at: Claude Squad/_Code/CLI/"
    exit 1
fi

if [ ! -d "$ARTIFACTS_DIR" ]; then
    echo -e "${RED}Error: Artifacts directory not found: $ARTIFACTS_DIR${NC}"
    exit 1
fi

# Find all markdown files in the chats directory
find "$CHATS_DIR" -name "*.md" -type f | while read -r chat_file; do
    # Get the chat filename without extension
    chat_name=$(basename "$chat_file" .md)

    # Count matches before replacing
    matches=$(grep -c "computer:///mnt/user-data/outputs/" "$chat_file" 2>/dev/null || echo "0")

    if [ "$matches" -gt 0 ]; then
        echo "Processing: $(basename "$chat_file") - Found $matches artifact links"

        # Create backup
        cp "$chat_file" "$chat_file.bak"

        # Use a temporary file for processing
        temp_file=$(mktemp)

        # Process line by line to avoid escaping issues
        while IFS= read -r line; do
            # Replace [View filename](computer:///mnt/user-data/outputs/filename) with [[Artifacts/chatname_filename]]
            line=$(echo "$line" | perl -pe 's|\[View ([^\]]*)\]\(computer:///mnt/user-data/outputs/([^\)]*)\)|[[Artifacts/'"${chat_name}"'_\2]]|g')
            # Replace [text](computer:///mnt/user-data/outputs/filename) with [[Artifacts/chatname_filename|text]]
            line=$(echo "$line" | perl -pe 's|\[([^\]]*)\]\(computer:///mnt/user-data/outputs/([^\)]*)\)|[[Artifacts/'"${chat_name}"'_\2|\1]]|g')
            echo "$line" >> "$temp_file"
        done < "$chat_file"

        # Replace original with processed file
        mv "$temp_file" "$chat_file"

        # Check if file actually changed
        if ! cmp -s "$chat_file" "$chat_file.bak"; then
            echo -e "${GREEN}✓ Updated: $(basename "$chat_file") ($matches links)${NC}"
            rm "$chat_file.bak"
        else
            # No changes, restore backup
            mv "$chat_file.bak" "$chat_file"
        fi
    fi
done

echo ""
echo -e "${GREEN}✓ Relinking complete!${NC}"
