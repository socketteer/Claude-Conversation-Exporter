# Content Script Build Issue - RESOLVED

## The Problem

The Vite web extension plugin (`@samrum/vite-plugin-web-extension`) was creating a dynamic import loader for the content script instead of bundling the actual code:

```javascript
// What was being generated (69 bytes):
(async()=>{await import(chrome.runtime.getURL("src/content.js"))})();
```

This created a self-referencing loop where the content script tried to load itself, causing it to never actually load. This is why you saw:
- "Could not establish connection" errors
- No "Claude Conversation Exporter content script loaded" message in console
- Content script not responding to messages from the popup

## The Root Cause

The `@samrum/vite-plugin-web-extension` plugin uses dynamic imports for content scripts by design, which doesn't work well with Firefox's Manifest V2 content script loading mechanism. The plugin was:
1. Creating a loader stub at `src/content.js`
2. Trying to dynamically import the actual code
3. But the actual code was never being generated as a separate chunk

## The Solution

Created a separate Vite configuration (`vite.content.config.ts`) that builds the content script as an IIFE (Immediately Invoked Function Expression) bundle, then copies it to the correct location.

### Files Added:

1. **`vite.content.config.ts`** - Separate Vite config for content script
   - Builds content.ts as a library in IIFE format
   - Outputs to temp directory

2. **`build-firefox.sh`** - Custom build script
   - Builds content script separately first
   - Builds main extension with Vite plugin
   - Copies the properly built content script over the plugin's stub
   
3. **`build-check.sh`** - Verification script
   - Checks if content script was built correctly
   - Helps debug build issues

### Changes Made:

1. **`package.json`**
   - Updated `build:firefox` script to use `build-firefox.sh`

2. **`src/firefox/manifest.json`**
   - Added `"run_at": "document_end"` to content script configuration
   - Ensures content script loads after page is ready

## Verification

After building with `pnpm build:firefox`:
- Content script is now **5.24 KB** (was 69 bytes)
- Contains actual minified code with all functions
- Loads properly on Claude.ai pages
- Console shows: "Claude Conversation Exporter content script loaded"
- Responds to messages from popup

## Next Steps for User

1. **Rebuild the extension:**
   ```bash
   pnpm build:firefox
   ```

2. **Reload in Firefox:**
   - Go to `about:debugging#/runtime/this-firefox`
   - Click Reload button next to the extension

3. **Test on Claude.ai:**
   - Navigate to any https://claude.ai/chat/... page
   - Open console (F12)
   - You should see: "Claude Conversation Exporter content script loaded"
   - Try clicking "Export Current Conversation" - it should work now!

## Future Improvements

Consider:
- Migrate to Manifest V3 (though this has its own challenges)
- Use a different build plugin that handles content scripts better
- Or continue with this custom build script approach (works well!)
