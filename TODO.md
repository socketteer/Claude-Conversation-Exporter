# Claude Exporter - TODO List

## Completed ✅

### Core Export Features
- **Artifact format conversion** (v1.3.0)
  - Support for Original/Markdown/Text/JSON formats
  - Code files always kept in original format
  - Non-code markdown documents convert to selected format

- **Flat artifacts export** (v1.4.0)
  - Independent from nested artifacts option
  - Both can be enabled simultaneously for dual export
  - Flat: exports with `ConversationName_filename` prefix

- **Nested/Flat independence** (v1.5.3)
  - Made nested and flat artifact exports independent options
  - Can export in one or both formats simultaneously

- **Flat-only artifacts export** (v1.7.0)
  - When ONLY 'Artifacts flat' is checked (no chats, no nested):
    - Export all artifacts from all conversations into single root folder
    - No conversation subfolders - everything in one big folder
    - Each artifact prefixed with conversation name
    - Filename: `claude-artifacts-{timestamp}.zip` (distinguishes from other exports)

- **Flat export restructuring** (v1.8.0)
  - Reorganized flat exports to use top-level Chats/ and Artifacts/ folders
  - All chat files in Chats/ folder
  - All artifacts in Artifacts/ folder with conversation name prefix
  - Cleaner structure for Obsidian vault integration

### UI Improvements
- **UI reorganization** (v1.5.0-1.5.1)
  - Header 1: Title (left), Stats (right)
  - Header 2: Search (center), Export controls (right)
  - Removed Model filter dropdown (use column sorting instead)
  - Wider search bar (400px → 500px)
  - Wider table container (1400px → 1600px)

- **Projects column** (v1.6.2)
  - Added 'Project' column after 'Name' column
  - Display project name or '-' if no project assigned
  - Full sorting capability for Project column
  - Multi-level sorting with shift+click

- **Project filter removed** (v1.8.0)
  - Removed project filter dropdown to simplify UI
  - Project information still shown in table column
  - Use search and sorting instead

- **Artifact indicator column** (v1.8.0)
  - Added 📎 column to show which conversations contain artifacts
  - Displays artifact count badge after exporting
  - Lazy loading - updates as conversations are fetched

### New Features
- **Extended thinking export** (v1.8.0)
  - Toggle option to include/exclude extended thinking blocks
  - Available for Markdown, Plain Text, and CSV formats
  - Unchecked by default
  - Labeled "Extended Thinking" in popup, "Thinking" in browse page

- **CSV export format** (v1.8.0)
  - New export format option alongside JSON/Markdown/Text
  - Columns: Timestamp, Speaker, Type, Content
  - Proper CSV escaping for special characters
  - Separate rows for messages, thinking blocks, and artifacts
  - Perfect for data analysis and spreadsheet apps

- **Memory export** (v1.8.0)
  - Standalone feature separate from chat/artifact exports
  - Export global organizational memory
  - Export all project-specific memories
  - Formats: JSON, Markdown, Plain Text
  - Fetches from all projects in organization

### Bug Fixes
- **Artifact extraction fixes** (v1.5.2)
  - Added support for `code_block` display format (newer artifacts)
  - Maintained support for `json_block` format (older artifacts)
  - Fixed missing artifacts in newer conversations

- **Flat artifacts bug fix** (v1.6.1)
  - Fixed: artifacts only extracted if 'Artifacts nested' was checked
  - Now extracts artifacts if EITHER nested OR flat is checked

- **Export filename improvements** (v1.5.4)
  - Changed from date to datetime format
  - Format: `claude-exports-2025-10-31_14-30-45.zip`
  - Prevents file collisions on same-day exports

- **Progress bar accuracy** (v1.5.4)
  - Fixed to count all scanned conversations
  - Includes skipped conversations (no artifacts when chats disabled)

- **Memory export fixes** (v1.8.0)
  - Fixed fetchMemory to fetch all project memories
  - Updated format functions to handle projects array
  - Proper validation for memory data

### API Integration
- **Projects API support** (v1.6.0)
  - Fetch projects from `/api/organizations/{orgId}/projects`
  - Populate Projects dropdown with user's projects
  - Filter conversations by selected project
  - Renamed export files from 'claude-conversations-*' to 'claude-exports-*'

## Pending 🔄

### Nice to Have
- **PDF export for non-code artifacts**
  - Export documents, markdown, and text artifacts as PDFs
  - Would require adding a PDF generation library (jsPDF/pdfmake)
  - Adds ~100-200KB to extension size
  - Low priority

### Potential Improvements
- **Filter bash tool uses from artifact extraction**
  - Sometimes simple bash calls create artifact.sh files
  - Need to better distinguish real artifacts from tool use results
  - Check for additional indicators beyond just `filename` field

- **Proactive artifact scanning in conversation browser**
  - Currently artifact indicators (📎 column) appear lazily after export
  - Add user-triggered scan button to search all visible conversations for artifacts
  - Would require fetching full conversation data for filtered results
  - Considerations:
    - Button-triggered (not automatic on launch) to keep extension lighter by default
    - Add indicator column after Memory column, before Actions column (currently showing paperclip)
    - Would need rate limiting/batching to avoid API throttling
    - Display artifact count badge once scanned
    - Could show progress during scan

## Current Version: 1.8.0

## Version History
- **1.8.0**: CSV export, Extended thinking, Memory export, Flat restructure, Artifact indicators
- **1.7.0**: Flat-only artifacts mode
- **1.6.2**: Projects column with sorting
- **1.6.1**: Flat artifacts bug fix
- **1.6.0**: Projects API integration
- **1.5.4**: Export filename improvements, Progress bar fixes
- **1.5.3**: Nested/Flat independence
- **1.5.2**: Artifact extraction fixes
- **1.5.1**: UI reorganization
- **1.4.0**: Flat artifacts export
- **1.3.0**: Artifact format conversion

## Notes
- Version bumping helps track changes and catch branch mix-ups
- All core features are functional and tested
- Focus on clean, maintainable code
- Obsidian vault integration scripts available separately
