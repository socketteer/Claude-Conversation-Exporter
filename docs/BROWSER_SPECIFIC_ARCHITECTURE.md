# Browser-Specific Architecture Changes

## Summary

The extension has been restructured to use **native browser APIs** for each platform instead of using a polyfill. Chrome uses `chrome.*` APIs and Firefox uses `browser.*` APIs.

## New Structure

```
src/
├── chrome/
│   ├── manifest.json          # Chrome MV3 manifest
│   └── scripts/               # Chrome-specific scripts using chrome.* API
│       ├── background.ts
│       ├── browse.html/ts
│       ├── content.ts
│       ├── options.html/ts
│       └── popup.html/ts
├── firefox/
│   ├── manifest.json          # Firefox MV2 manifest
│   └── scripts/               # Firefox-specific scripts using browser.* API
│       ├── background.ts
│       ├── browse.html/ts
│       ├── content.ts
│       ├── options.html/ts
│       └── popup.html/ts
├── types.ts                   # Shared type definitions
├── utils.ts                   # Shared utility functions
└── content-styles.css         # Shared styles
```

## Key Changes

### 1. Separate Script Directories

- **Chrome scripts**: `src/chrome/scripts/` - Use `chrome.*` API
- **Firefox scripts**: `src/firefox/scripts/` - Use `browser.*` API
- **Shared code**: `src/types.ts`, `src/utils.ts` - No browser APIs

### 2. Updated Manifests

Both manifests now point to their browser-specific script directories:

**Chrome** (`src/chrome/manifest.json`):
```json
{
  "action": {
    "default_popup": "src/chrome/scripts/popup.html"
  },
  "content_scripts": [{
    "js": ["src/chrome/scripts/content.ts"]
  }],
  "background": {
    "service_worker": "src/chrome/scripts/background.ts"
  }
}
```

**Firefox** (`src/firefox/manifest.json`):
```json
{
  "browser_action": {
    "default_popup": "src/firefox/scripts/popup.html"
  },
  "content_scripts": [{
    "js": ["src/firefox/scripts/content.ts"]
  }],
  "background": {
    "scripts": ["src/firefox/scripts/background.ts"]
  }
}
```

### 3. Build Process

**New Build Configs**:
- `vite.content-chrome.config.ts` - Builds Chrome content script as IIFE
- `vite.content-firefox.config.ts` - Builds Firefox content script as IIFE
- `vite.config.ts` - Updated to use browser-specific input paths

**Build Scripts**:
- `build-chrome.sh` - Builds Chrome extension with chrome.* APIs
- `build-firefox.sh` - Builds Firefox extension with browser.* APIs

### 4. Script Conversion

A `convert-to-chrome.sh` script was created to generate Chrome versions from Firefox scripts by replacing `browser.*` with `chrome.*`.

## Building

```bash
# Build Chrome extension
pnpm build:chrome

# Build Firefox extension
pnpm build:firefox
```

## API Differences

### Storage

**Firefox**:
```typescript
const result = await browser.storage.sync.get(['organizationId']);
```

**Chrome**:
```typescript
const result = await chrome.storage.sync.get(['organizationId']);
```

### Tabs

**Firefox**:
```typescript
const tabs = await browser.tabs.query({ active: true, currentWindow: true });
await browser.tabs.sendMessage(tabId, message);
```

**Chrome**:
```typescript
const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
await chrome.tabs.sendMessage(tabId, message);
```

### Runtime

**Firefox**:
```typescript
const url = browser.runtime.getURL('src/firefox/scripts/browse.html');
```

**Chrome**:
```typescript
const url = chrome.runtime.getURL('src/chrome/scripts/browse.html');
```

## Benefits

1. **No Polyfill Overhead** - Uses native APIs directly
2. **Better Type Safety** - Chrome gets `@types/chrome`, Firefox gets `firefox-webext-browser`
3. **Clearer Separation** - Browser-specific code is isolated
4. **Easier Debugging** - API calls match browser devtools exactly
5. **Future-Proof** - Each browser can evolve independently

## Testing

All 74 tests pass, including new build verification tests that check:
- Correct file paths for each browser
- Proper API usage (chrome.* vs browser.*)
- Content script sizes and functionality
- Icon files present
- Manifest validity

## Migration Notes

- Removed `src/browser-polyfill.ts` (no longer needed)
- TypeScript config excludes browser-specific folders to avoid duplicates
- Both builds produce working extensions with native APIs
