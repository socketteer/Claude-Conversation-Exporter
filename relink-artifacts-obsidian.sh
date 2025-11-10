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

# Counter for statistics
total_files=0
files_modified=0
links_replaced=0

# Find all markdown files in the chats directory
find "$CHATS_DIR" -name "*.md" -type f | while read -r chat_file; do
    total_files=$((total_files + 1))

    # Count matches before replacing
    matches=$(grep -c "computer:///mnt/user-data/outputs/" "$chat_file" 2>/dev/null || echo "0")

    if [ "$matches" -gt 0 ]; then
        # Create backup
        cp "$chat_file" "$chat_file.bak"

        # Replace artifact links with Obsidian wikilinks
        # Pattern: [View filename.ext](computer:///mnt/user-data/outputs/filename.ext)
        # becomes: [[Artifacts/filename.ext]]
        sed -i 's|\[View \([^]]*\)\](computer:///mnt/user-data/outputs/\([^)]*\))|[[Artifacts/\2]]|g' "$chat_file"

        # Pattern: [text](computer:///mnt/user-data/outputs/filename.ext)
        # becomes: [[Artifacts/filename.ext|text]]
        sed -i 's|\[\([^]]*\)\](computer:///mnt/user-data/outputs/\([^)]*\))|[[Artifacts/\2|\1]]|g' "$chat_file"

        # Check if file actually changed
        if ! cmp -s "$chat_file" "$chat_file.bak"; then
            files_modified=$((files_modified + 1))
            links_replaced=$((links_replaced + matches))
            echo -e "${GREEN}✓ Updated: $(basename "$chat_file") ($matches links)${NC}"
            rm "$chat_file.bak"
        else
            # No changes, restore backup
            mv "$chat_file.bak" "$chat_file"
        fi
    fi
done

echo ""
echo "================================"
echo -e "${GREEN}Summary:${NC}"
echo "  Total chat files processed: $total_files"
echo "  Files modified: $files_modified"
echo "  Artifact links replaced: $links_replaced"
echo ""

if [ $files_modified -gt 0 ]; then
    echo -e "${GREEN}✓ Relinking complete!${NC}"
    echo -e "${YELLOW}Note: Links now use Obsidian wikilink format [[Artifacts/filename]]${NC}"
else
    echo -e "${YELLOW}No artifact links found to relink.${NC}"
fi
