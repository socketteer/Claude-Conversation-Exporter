# Claude Exporter - TODO List

## Completed ✅

- **Artifact format conversion** (v1.3.0)
  - Support for Original/Markdown/Text/JSON formats
  - Code files always kept in original format
  - Non-code markdown documents convert to selected format

- **Flat artifacts export** (v1.4.0)
  - Independent from nested artifacts option
  - Both can be enabled simultaneously for dual export
  - Flat: exports with `ConversationName_filename` prefix

- **UI reorganization** (v1.5.0-1.5.1)
  - Header 1: Title (left), Search (moved from center), Stats (right)
  - Header 2: Projects dropdown (left), Search (center), Export controls (right)
  - Removed Model filter dropdown (use column sorting instead)

- **Artifact extraction fixes** (v1.5.2)
  - Added support for `code_block` display format (newer artifacts)
  - Maintained support for `json_block` format (older artifacts)
  - Fixed missing artifacts in newer conversations

- **Nested/Flat independence** (v1.5.3)
  - Made nested and flat artifact exports independent options
  - Can export in one or both formats simultaneously

- **Export filename improvements** (v1.5.4)
  - Changed from date to datetime format
  - Format: `claude-conversations-2025-10-31_14-30-45.zip`
  - Prevents file collisions on same-day exports

- **Progress bar accuracy** (v1.5.4)
  - Fixed to count all scanned conversations
  - Includes skipped conversations (no artifacts when chats disabled)

## Pending 🔄

- **Filter bash tool uses from artifact extraction**
  - Sometimes simple bash calls create artifact.sh files
  - Need to better distinguish real artifacts from tool use results
  - Check for additional indicators beyond just `filename` field

- **Projects API research**
  - Investigate Claude.ai projects API endpoints
  - Understand data structure for projects
  - Determine how to filter conversations by project

- **Projects support implementation**
  - Populate Projects dropdown with user's actual projects
  - Implement filtering by selected project
  - Update export to respect project filter
  - Add project metadata to exports

## Current Version: 1.5.4

## Notes

- Version bumping helps track changes and catch branch mix-ups
- Projects dropdown UI is in place, ready for backend implementation
- All artifact export features are functional and tested
