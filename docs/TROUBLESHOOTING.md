# Browse Page Troubleshooting Guide

## Steps to Debug

### 1. Rebuild the Extension
```bash
pnpm build:firefox
```

### 2. Reload Extension in Firefox
- Go to `about:debugging#/runtime/this-firefox`
- Find "Claude Conversation Exporter"
- Click **Reload** button

### 3. Open Browse Page
- Click the extension icon in Firefox toolbar
- Click "Browse All Conversations" button

### 4. Open Browser Console
- Press `F12` or `Ctrl+Shift+I` (Linux) to open Developer Tools
- Go to the **Console** tab

### 5. Check Console Logs
Look for these log messages in order:

```
[Browse] Script loaded, waiting for DOMContentLoaded...
[Browse] DOMContentLoaded fired, initializing...
[Browse] Loading org ID...
[Browse] Org ID loaded: <your-org-id>
[Browse] loadConversations called, orgId: <your-org-id>
[Browse] Fetching conversations from API...
[Browse] API response status: 200
[Browse] Loaded X conversations
[Browse] displayConversations called, filtered count: X
[Browse] Rendering table with X conversations
[Browse] Initialization complete
```

## Common Issues and Solutions

### Issue 1: No logs appear at all
**Problem:** Script isn't loading
**Solution:** 
- Check that `browse.html` is in the correct location
- Verify the script tag in `browse.html` points to `browse.ts`
- Make sure Vite is bundling the browse page correctly

### Issue 2: "No org ID configured" error
**Problem:** Organization ID not set
**Solution:**
- Click the extension icon
- Click "Options" or gear icon
- Configure your Organization ID
- Instructions: Visit claude.ai, open DevTools Network tab, filter by "chat_conversations", copy the org ID from the URL

### Issue 3: "tableContent element not found!"
**Problem:** HTML structure issue
**Solution:**
- Check that `browse.html` has `<div id="tableContent">`
- Verify the HTML file is loading correctly

### Issue 4: API response status not 200
**Problem:** Authentication or API issue
**Solutions:**
- Make sure you're logged into claude.ai in the same browser
- Check if cookies are being sent with the request
- Verify the Organization ID is correct

### Issue 5: Script loaded but DOMContentLoaded never fires
**Problem:** Page isn't finishing load
**Solution:**
- Check for JavaScript errors in console
- Look for any failed resource loads in Network tab

## Manual Verification Steps

1. **Check if page is loading:**
   - Open browse page, you should see "Loading conversations..." initially

2. **Verify HTML elements exist:**
   Open console and run:
   ```javascript
   console.log('tableContent:', document.getElementById('tableContent'));
   console.log('stats:', document.getElementById('stats'));
   console.log('searchInput:', document.getElementById('searchInput'));
   ```
   All should show elements, not `null`

3. **Check storage:**
   ```javascript
   browser.storage.sync.get(['organizationId']).then(console.log);
   ```
   Should show your org ID

4. **Test API manually:**
   ```javascript
   fetch('https://claude.ai/api/organizations/YOUR-ORG-ID/chat_conversations', {
     credentials: 'include',
     headers: { Accept: 'application/json' }
   })
   .then(r => r.json())
   .then(console.log);
   ```

## Report Back

Please share:
1. What console logs you see (copy/paste)
2. Any error messages
3. Network tab showing the API request status
4. Screenshot of the browse page if possible
