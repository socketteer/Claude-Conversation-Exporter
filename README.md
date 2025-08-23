# Claude Conversation Exporter

A Chrome extension that allows you to export your Claude.ai conversations in various formats (JSON, Markdown, Plain Text) with support for bulk exports and conversation browsing.

## Features

- 📥 **Export Individual Conversations** - Export any conversation directly from Claude.ai
- 📚 **Bulk Export** - Export all or filtered conversations as a ZIP file
- 🔍 **Browse & Search** - View all your conversations in a searchable table
- 🌳 **Branch-Aware Export** - Correctly handles conversation branches (exports only the current branch)
- 📝 **Multiple Formats** - JSON (full data), Markdown, or Plain Text
- 🗂️ **ZIP Archives** - Bulk exports create organized ZIP files with all conversations
- 🏷️ **Metadata Options** - Include or exclude timestamps, models, and other metadata
- 🤖 **Complete Model Information** - Preserves and displays model information for all conversations (unlike official Claude.ai exports)
- 🔮 **Smart Model Inference** - Automatically infers the correct model for conversations that used the default model at the time

## Advantages Over Official Claude.ai Export

This extension provides several advantages over the official Claude.ai data export:

1. **Model Information Preserved**: The official export doesn't include which model (Claude 3, 3.5, Opus, Sonnet, etc.) was used for each conversation. This extension preserves and displays this crucial information.

2. **Historical Model Inference**: For conversations that used the default model (which shows as `null` in the data), the extension intelligently infers which model was actually used based on when the conversation occurred and Anthropic's default model timeline.

3. **Instant Export**: No waiting for email delivery - export conversations immediately.

4. **Flexible Formats**: Choose between JSON, Markdown, or Plain Text formats based on your needs.

5. **Selective Export**: Export individual conversations or filter by model, date, or search terms.

6. **Better Organization**: Conversations are exported with meaningful filenames and can be bulk exported into organized ZIP files.

## Installation from Source

### Prerequisites
- Google Chrome browser (or Chromium-based browser)
- A Claude.ai account

### Steps

1. **Download or Clone the Repository**
   ```bash
   git clone [repository-url]
   # Or download and extract the ZIP file
   ```

2. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Or click the three dots menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right corner

4. **Load the Extension**
   - Click "Load unpacked"
   - Select the `claude-exporter` folder
   - The extension icon should appear in your toolbar

5. **Configure Your Organization ID**
   - Click the extension icon
   - You'll see a notice about configuring your Organization ID
   - Click "Click here to set it up" or right-click the extension icon → Options
   - Go to `https://claude.ai/settings/account`
   - Copy your Organization ID
   - Paste it in the extension options and click Save
   - Click "Test Connection" to verify it works

## Usage

### Export Current Conversation
1. Navigate to any conversation on Claude.ai
2. Click the extension icon
3. Choose your export format and metadata preferences
4. Click "Export Current Conversation"

### Browse All Conversations
1. Click the extension icon
2. Click "Browse All Conversations" (green button)
3. In the browse page, you can:
   - Search conversations by name
   - Filter by model
   - Sort by date or name
   - Export individual conversations
   - Export all filtered conversations as ZIP

### Bulk Export
1. In the browse page, select your format and filters
2. Click "Export All"
3. A progress dialog will show the export status
4. Once complete, a ZIP file will download containing all conversations

## Export Formats

### JSON
- Complete data including all branches and metadata
- Best for data preservation and programmatic use
- Includes all message versions and conversation branches

### Markdown
- Human-readable format with formatting
- Shows only the current conversation branch
- Includes optional metadata (timestamps, model info)
- Great for documentation or sharing

### Plain Text
- Simple format following Claude's prompt style
- Uses "Human:" and "Assistant:" prefixes (abbreviated to H:/A: after first occurrence)
- Shows only the current conversation branch
- Ideal for copying into other LLMs or text editors

## File Structure

```
claude-exporter/
├── manifest.json          # Extension configuration
├── background.js          # Background service worker
├── content.js            # Content script for Claude.ai pages
├── content.css           # Styles for content script
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── options.html          # Options page for configuration
├── options.js            # Options page logic
├── browse.html           # Conversation browser interface
├── browse.js             # Browser page functionality
├── utils.js              # Shared utility functions
├── jszip.min.js          # Library for creating ZIP files
├── icon16.png            # Extension icon (16x16)
├── icon48.png            # Extension icon (48x48)
└── icon128.png           # Extension icon (128x128)
```

## Chrome Web Store Submission

To prepare for Chrome Web Store submission:

### 1. Create a ZIP for Submission
```bash
cd claude-export
zip -r claude-exporter.zip claude-exporter/ -x "*.DS_Store" -x "*/.git/*"
```

### 2. Prepare Store Listing Assets
You'll need:
- **Screenshots** (1280x800 or 640x400): Take screenshots of the extension in action
- **Promotional Images**: Small tile (440x280), Large tile (920x680) - optional
- **Description**: Use the features list from this README
- **Category**: Suggested: "Productivity" or "Developer Tools"

### 3. Privacy Policy
Since the extension accesses Claude.ai data, you should mention:
- The extension only accesses data when explicitly triggered by the user
- No data is sent to external servers
- All processing happens locally in the browser
- User's Claude.ai authentication is used only for API access

### 4. Permissions Justification
Be ready to explain why each permission is needed:
- `activeTab`: To interact with the current Claude.ai tab
- `storage`: To save user's organization ID
- `scripting`: To inject content scripts for export functionality
- Host permission for `claude.ai`: To access Claude.ai API endpoints

## Troubleshooting

### "Organization ID not configured"
- Follow the setup steps in the Configuration section
- Make sure you're copying the complete UUID from the URL

### "Not authenticated" error
- Make sure you're logged into Claude.ai
- Try refreshing the Claude.ai page

### Export fails for some conversations
- Some very old conversations might have different data structures
- Check the browser console for specific error messages
- The ZIP export includes a summary file listing any failed exports

### Content Security Policy errors
- Make sure you're using the latest version of the extension
- Try reloading the extension from chrome://extensions/

## Privacy & Security

- **Local Processing**: All data processing happens in your browser
- **No External Servers**: The extension doesn't send data anywhere
- **Your Authentication**: Uses your existing Claude.ai session
- **Open Source**: You can review all code before installation

## Known Limitations

- Plaintext and markdown formats only export the currently selected branch in conversations with multiple branches
- Large bulk exports may take several minutes
- Some special content types (like artifacts) may not export perfectly
- Rate limiting: The extension processes conversations in small batches to avoid overwhelming the API

## Contributing

Feel free to submit issues or pull requests if you find bugs or have suggestions for improvements!

## License

[Add your chosen license here]

## Acknowledgments

- **Code Development**: Written by Claude Opus 4.1 in collaboration with a human developer
- **ZIP Library**: Uses [JSZip](https://stuk.github.io/jszip/) for creating ZIP archives
- **Motivation**: Inspired by the need for better Claude.ai conversation management and the limitations of official exports

---

**Note**: This extension is not officially affiliated with Anthropic or Claude.ai. It's a community tool that uses the web interface's API endpoints.
