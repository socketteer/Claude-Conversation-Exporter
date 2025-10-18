# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a cross-browser extension (Chrome & Firefox) that exports Claude.ai conversations. Both platforms are built from the **same TypeScript codebase** with strict type checking, differing only in manifest configuration and build output.

## Build Commands

### Essential Commands
```bash
# Install dependencies (must use pnpm, not npm)
pnpm install

# Build for specific platform
pnpm build:firefox    # Output: dist/firefox/
pnpm build:chrome     # Output: dist/chrome/
pnpm build            # Build both platforms

# Development with auto-rebuild
pnpm dev:firefox      # Watch mode for Firefox
pnpm dev:chrome       # Watch mode for Chrome

# Code quality checks
pnpm type-check       # TypeScript type checking (strict mode)
pnpm lint             # ESLint - check code style and errors
pnpm lint:fix         # ESLint - auto-fix issues
pnpm format           # Prettier - check formatting
pnpm format:fix       # Prettier - auto-fix formatting
pnpm check            # Run all checks: type-check + lint + format

# Test in browser
pnpm firefox:run      # Launch Firefox with extension loaded
pnpm chrome:run       # Instructions for Chrome (manual)

# Clean build artifacts
pnpm clean            # Remove dist/ folder
```

**Important**: Always run `pnpm check` before committing. All checks must pass (TypeScript strict mode, ESLint, Prettier).

## Architecture

### Shared Codebase Strategy

The project uses a **single TypeScript codebase** that compiles to both Chrome and Firefox extensions:

- **Source**: All `.ts` files in `/src/` are shared between platforms
- **Manifests**: Only `/src/chrome/manifest.json` and `/src/firefox/manifest.json` differ
- **Build Process**: Vite uses `--mode firefox` or `--mode chrome` to select the correct manifest
- **API Surface**: Code uses `browser.*` API (Firefox-native, Promise-based), which works in both browsers

### Platform Differences

**Firefox (Manifest V2)**
- Uses `background.scripts` (event pages, not service workers)
- `browser_action` for popup
- Permissions combined in single array
- Requires `browser_specific_settings.gecko.id` for addon ID
- Native `browser.*` Promise-based API

**Chrome (Manifest V3)**
- Uses `background.service_worker` (no DOM access)
- `action` for popup (replaces browser_action)
- Separate `permissions` and `host_permissions` arrays
- `chrome.*` API (but code uses `browser.*` which Chrome now supports)

### Browser Extension Components

The extension consists of 6 main components that communicate via message passing:

1. **background.ts** - Background script, handles extension lifecycle and content script injection
2. **popup.ts** - Extension popup UI, exports current conversation
3. **content.ts** - Content script injected into claude.ai pages, handles API calls and file downloads
4. **options.ts** - Options page for configuring Organization ID
5. **browse.ts** - Full-page conversation browser with search/filter, uses JSZip for bulk exports
6. **utils.ts** - Shared utilities for conversation processing and model inference

**Message Flow**:
```
popup.ts → content.ts → Claude API → content.ts → file download
       ↓
    browser.tabs.sendMessage
       ↓
    ExtensionMessage type (src/types.ts)
```

### Model Inference System

A unique feature is **inferring Claude model versions** for conversations where `model` is `null`:

- **Location**: `src/utils.ts` - `inferModel()` function
- **Timeline**: `DEFAULT_MODEL_TIMELINE` array maps dates to default models
- **Logic**: Uses conversation `created_at` date to determine which model was default at that time
- **Models**: Tracks all Claude versions from 3.0 Sonnet through 4.5 Sonnet

When adding new Claude models, update `DEFAULT_MODEL_TIMELINE` in `src/utils.ts` and `MODEL_DISPLAY_NAMES` in `src/browse.ts`.

### TypeScript Type System

All types are centralized in `src/types.ts`:

- **Conversation**: Full conversation data from Claude API
- **ConversationListItem**: Simplified list view
- **ChatMessage**: Individual message with branching support
- **ExtensionMessage**: Discriminated union for message passing between components
- **ExtensionResponse**: Standard response format

**Strict Mode Gotchas**:
- Use `result['organizationId']` not `result.organizationId` for dynamic storage keys (noPropertyAccessFromIndexSignature)
- All function parameters must be used or prefixed with `_` (noUnusedParameters)
- Array access requires null checks with `array[0]` → `array[0]` (noUncheckedIndexedAccess)

## Build System Details

### Vite Configuration

The build system uses `vite.config.ts` with `@samrum/vite-plugin-web-extension`:

- **Mode Selection**: `--mode firefox` or `--mode chrome` determines which manifest to load
- **Manifest Loading**: Reads JSON from `src/{target}/manifest.json` and passes to plugin
- **Output**: `dist/{target}/` with separate builds
- **Entry Points**: Plugin automatically discovers entries from manifest (background, content_scripts, popup, etc.)
- **Static Assets**: HTML files reference `.ts` sources (e.g., `<script type="module" src="popup.ts">`), Vite handles transformation

**Note**: Do NOT manually specify entry points in `rollupOptions.input` - the webExtension plugin handles this from the manifest.

### File Naming Constraints

The `@samrum/vite-plugin-web-extension` has strict naming requirements:

- **Conflict Issue**: Cannot have `content.ts` and `content.css` - they resolve to same output identifier
- **Solution**: CSS file is named `content-styles.css` to avoid conflict
- **Pattern**: If adding new content scripts, ensure `.ts` and `.css` files have different base names

## Claude.ai API Integration

The extension calls these Claude.ai API endpoints:

1. **GET** `/api/organizations/{orgId}/chat_conversations` - List all conversations
2. **GET** `/api/organizations/{orgId}/chat_conversations/{conversationId}?tree=True&rendering_mode=messages&render_all_tools=true` - Full conversation with message tree

**Authentication**: Uses existing browser session (`credentials: 'include'`)
**Organization ID**: User must configure their UUID from https://claude.ai/settings/account

## Development Workflow

### Adding New Features

1. Modify shared TypeScript code in `/src/`
2. If adding new Claude models: Update `DEFAULT_MODEL_TIMELINE` and `MODEL_DISPLAY_NAMES`
3. Run `pnpm type-check` to verify strict mode compliance
4. Test in both browsers: `pnpm dev:firefox` and load in Chrome manually
5. Only modify manifests if adding new permissions or entry points

### TypeScript Strict Mode

All code must pass strict mode checks:
- `strict: true` enables all strict type-checking options
- `noUnusedLocals`, `noUnusedParameters` require all declarations to be used
- `noImplicitReturns` requires explicit returns in all code paths
- `noUncheckedIndexedAccess` requires null checks for array/object access

Prefix unused function parameters with `_` (e.g., `_sender`) to satisfy `noUnusedParameters`.

### ESLint and Prettier

**ESLint Configuration** (`eslint.config.js`):
- Uses modern flat config format (ESLint 9+)
- Includes TypeScript-specific rules with type-aware linting
- Integrates with Prettier to avoid conflicts
- Key rules:
  - `@typescript-eslint/no-unused-vars`: Allows `_` prefix for intentionally unused parameters
  - `@typescript-eslint/no-misused-promises`: Prevents void return issues with promises in event handlers
  - `prefer-nullish-coalescing`: Recommends `??` over `||` for safer defaults

**Prettier Configuration** (`.prettierrc`):
- Single quotes, semicolons enabled
- 90 character line width
- 2-space indentation
- LF line endings

**Known ESLint Issues**:
The codebase currently has ~25 ESLint warnings (not errors) that are style recommendations:
- Use `??` instead of `||` for nullable values (safer)
- Handle promises properly in event handlers
- Await floating promises or explicitly void them

These are safe to ignore or fix gradually.

### Debugging

**Firefox**:
- Use `pnpm firefox:run` to launch with web-ext
- Console logs appear in Browser Console (Ctrl+Shift+J)
- Inspect popup: right-click extension icon → Inspect

**Chrome**:
- Load from `dist/chrome/` in chrome://extensions
- Console logs in extension service worker inspector
- Inspect popup: right-click extension icon → Inspect

## Project-Specific Conventions

- **Browser API**: Always use `browser.*` (not `chrome.*`) - works in both browsers
- **Promises**: All async code uses `async/await`, no callbacks
- **Error Handling**: Always catch errors and return `ExtensionResponse` with `success: false`
- **File Downloads**: Use `downloadFile()` from utils.ts, handles blob creation and cleanup
- **Conversation Branches**: `getCurrentBranch()` traces from `current_leaf_message_uuid` back to root using `parent_message_uuid` links
