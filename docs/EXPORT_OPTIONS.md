# Export Options Guide

The extension provides three different ways to export your Claude conversations:

## 1. Export Current Conversation
**Where:** Popup (extension icon)  
**Requirements:** Must be on a Claude.ai conversation page  
**What it does:** Exports the single conversation you're currently viewing  
**Best for:** Quick exports of individual conversations

**How to use:**
1. Navigate to any Claude.ai conversation
2. Click the extension icon
3. Choose your format (JSON/Markdown/Text)
4. Click "Export Current Conversation"

---

## 2. Export All (requires Claude.ai tab)
**Where:** Popup (extension icon)  
**Requirements:** Must be on ANY Claude.ai page (not necessarily a conversation)  
**What it does:** Exports all conversations as a ZIP file using the content script  
**Best for:** Quick bulk exports when you're already on Claude.ai

**How to use:**
1. Navigate to claude.ai (any page)
2. Click the extension icon
3. Choose your format (JSON/Markdown/Text)
4. Click "Export All (requires Claude.ai tab)"
5. Wait for the ZIP file to download

**Note:** If you see "Could not establish connection" error, you're not on a Claude.ai tab. Use option #3 instead.

---

## 3. Browse All Conversations
**Where:** Popup (extension icon)  
**Requirements:** None - works from any tab  
**What it does:** Opens a dedicated page where you can:
- View all your conversations in a searchable table
- Filter by model type
- Sort by name, created date, or updated date
- Export individual conversations
- Export selected/filtered conversations as a ZIP
- See export progress with cancel option

**Best for:** 
- When you want to browse and selectively export
- When you're not on a Claude.ai tab
- When you want more control over what to export

**How to use:**
1. Click the extension icon (from ANY tab)
2. Click "Browse All Conversations"
3. A new tab opens with all your conversations
4. Use search/filters to find what you want
5. Click individual "Export" buttons OR "Export All" for bulk export

---

## Which Option Should I Use?

| Scenario | Recommended Option |
|----------|-------------------|
| Export one conversation I'm viewing | #1 - Export Current |
| Export all conversations, I'm on Claude.ai | #2 - Export All |
| Export all conversations, I'm NOT on Claude.ai | #3 - Browse All |
| I want to see what conversations I have | #3 - Browse All |
| I want to export only certain conversations | #3 - Browse All |
| I want to filter by model before exporting | #3 - Browse All |

---

## Troubleshooting

### "Could not establish connection" error
- You're trying to use option #2 from a non-Claude.ai tab
- **Solution:** Either navigate to claude.ai first, or use option #3 instead

### "Organization ID not configured"
- You need to set up your org ID first
- **Solution:** Click the options/settings link in the popup to configure it

### Browse page shows no conversations
- Check browser console (F12) for errors
- Verify your Organization ID is correct
- Make sure you're logged into claude.ai in the same browser
