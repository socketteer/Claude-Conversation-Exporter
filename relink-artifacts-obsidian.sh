#!/bin/bash

# Relink Claude artifacts in exported chat markdown files (Obsidian wikilink format)
# This script updates artifact links in chat markdown files to use Obsidian wikilinks

# Default paths (can be overridden with command line arguments)
VAULT_BASE="${1:-Claude Squad}"
CHATS_DIR="${VAULT_BASE}/_Archive/Export/Chats/md"
ARTIFACTS_DIR="${VAULT_BASE}/_Archive/Export/Artifacts"

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
    echo "Usage: $0 [vault_base_path]"
    echo "Example: $0 'Claude Squad'"
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
while IFS= read -r -d '' chat_file; do
    ((total_files++))
    file_modified=false

    # Create a temporary file
    temp_file=$(mktemp)

    # Process the file line by line
    while IFS= read -r line; do
        original_line="$line"

        # Check if line contains artifact link pattern: computer:///mnt/user-data/outputs/
        # This regex handles both inline links [text](computer://...) and standalone links
        while [[ "$line" =~ (.*)\[([^\]]*)\]\(computer:///mnt/user-data/outputs/([^)]+)\)(.*) ]]; do
            before="${BASH_REMATCH[1]}"
            link_text="${BASH_REMATCH[2]}"
            filename="${BASH_REMATCH[3]}"
            after="${BASH_REMATCH[4]}"

            # Use the filename as the link text if the original text is "View ..."
            if [[ "$link_text" == View* ]]; then
                # Create a wikilink with path
                new_link="[[Artifacts/$filename]]"
            else
                # Keep original link text with wikilink alias
                new_link="[[Artifacts/$filename|$link_text]]"
            fi

            # Reconstruct the line with the new link
            line="${before}${new_link}${after}"
            ((links_replaced++))
            file_modified=true
        done

        if [ "$line" != "$original_line" ]; then
            echo -e "${YELLOW}  Replaced links in line${NC}"
        fi

        echo "$line" >> "$temp_file"
    done < "$chat_file"

    # If file was modified, replace the original
    if [ "$file_modified" = true ]; then
        mv "$temp_file" "$chat_file"
        ((files_modified++))
        echo -e "${GREEN}✓ Updated: $(basename "$chat_file")${NC}"
    else
        rm "$temp_file"
    fi

done < <(find "$CHATS_DIR" -name "*.md" -type f -print0)

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
