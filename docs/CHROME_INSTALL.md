# Loading the Extension in Chrome

## Steps to Install

1. **Build the Chrome extension**:
   ```bash
   pnpm build:chrome
   ```

2. **Open Chrome Extensions page**:
   - Navigate to `chrome://extensions/`
   - OR: Menu → More Tools → Extensions

3. **Enable Developer Mode**:
   - Toggle the "Developer mode" switch in the top right corner

4. **Load the extension**:
   - Click "Load unpacked"
   - Navigate to your project folder
   - Select the `dist/chrome` folder
   - Click "Select Folder"

5. **Verify the extension**:
   - You should see "Claude Conversation Exporter" appear in your extensions list
   - The extension should show as "Enabled"

## Testing the Extension

1. Navigate to https://claude.ai
2. Open a conversation
3. Click the extension icon in your Chrome toolbar
4. Try the "Export Current Conversation" button

## Troubleshooting

### Extension not loading
- Make sure you selected the `dist/chrome` folder (not the project root)
- Check for any errors in the extensions page

### Content script errors
- Open DevTools (F12) on a Claude.ai page
- Check the Console tab for errors
- You should see "Claude Conversation Exporter content script loaded"

### Connection errors
- The content script only loads on `https://claude.ai/*` pages
- Make sure you're on a Claude.ai page when testing
- Try reloading the page after installing the extension

## Development

To rebuild after making changes:
```bash
pnpm build:chrome
```

Then click the refresh icon on the extension card in `chrome://extensions/`
