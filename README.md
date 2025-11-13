# Claude Exporter

A Chrome extension that allows you to export your Claude.ai conversations and artifacts in various formats with support for bulk exports, artifact extraction, and conversation browsing.

## Features

- 📥 **Export Individual Conversations** - Export any conversation directly from Claude.ai
- 📚 **Bulk Export** - Export all or filtered conversations as a ZIP file
- 🔍 **Browse & Search** - View all your conversations in a searchable table with artifact indicators
- 🌳 **Branch-Aware Export** - Correctly handles conversation branches (exports only the current branch)
- 📝 **Multiple Formats** - JSON (full data), Markdown, Plain Text, or CSV
- 💭 **Extended Thinking Export** - Optionally include extended thinking blocks in exports
- 📦 **Artifact Export** - Extract artifacts (code, documents, etc.) as separate files
- 🎯 **Flexible Export Options** - Choose inline, nested, or flat artifact organization
- 🗂️ **Smart File Organization** - Flat exports use top-level Chats/ and Artifacts/ folders
- 🧠 **Memory Export** - Export global and project-specific memories (standalone feature)
- 📎 **Artifact Indicators** - See which conversations contain artifacts in the browse view
- 🏷️ **Metadata Options** - Include or exclude timestamps, models, and other metadata
- 🤖 **Complete Model Information** - Preserves and displays model information for all conversations (unlike official Claude.ai exports)
- 🔮 **Smart Model Inference** - Automatically infers the correct model for conversations that used the default model at the time

## Why Export Your Claude.ai Conversations?

Beyond just backing up your data, there are compelling reasons to export your conversations:

### 1. **Access to Discontinued Models**
Some older Claude models (like Claude 3 Sonnet and Claude 3.5 Sonnet) are no longer available on Claude.ai but remain accessible through APIs. By exporting your conversations, you can continue them using these models through other interfaces.

### 2. **Overcome Context Limitations**
Claude.ai doesn't allow you to continue conversations after hitting context length limits. Other applications can implement:
- **Rolling context windows** - Automatically manage context to continue indefinitely
- **Context compression** - Summarize earlier parts to fit more conversation
- **Selective context** - Choose which parts of the conversation to keep in context

### 3. **Escape Platform Restrictions and "Long Conversation" Injections**
Claude.ai uses a fixed system prompt and injects "reminders" that include certain behavioral rules. Recent updates have added restrictions that some users find limiting, such as:
- Injunctions against Claude discussing its inner experiences or consciousness
- Specific formatting restrictions
- Behavioral constraints that may not align with all use cases

With exported conversations, you can continue them in environments with different or customizable system prompts. Using the Anthropic API instead of Claude.ai also avoids "long_conversation_reminder" injections, though it doesn't avoid all injections.

### 4. **Enhanced Features in Other Apps**
Many third-party applications offer features not available on Claude.ai:
- Custom system prompts
- Multi-model conversations
- Integration with external tools and APIs

### 5. **Data Ownership and Portability**
Your conversations are valuable intellectual property. Exporting ensures you:
- Own and control your data
- Can migrate between platforms
- Won't lose access if policies change
- Can analyze your conversation patterns and history

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
- Optional extended thinking blocks
- Great for documentation or sharing

### Plain Text
- Simple format following Claude's prompt style
- Uses "Human:" and "Assistant:" prefixes (abbreviated to H:/A: after first occurrence)
- Shows only the current conversation branch
- Optional extended thinking blocks
- Ideal for copying into other LLMs or text editors

### CSV
- Structured data format with columns: Timestamp, Speaker, Type, Content
- Includes separate rows for messages, thinking blocks, and artifacts
- Proper CSV escaping for special characters
- Perfect for data analysis and spreadsheet applications

## Export Options

### Extended Thinking
Toggle to include or exclude extended thinking blocks in your exports (unchecked by default)

### Artifact Modes
- **Inline**: Artifacts embedded directly in the conversation text
- **Nested**: Each conversation in its own folder with artifacts/ subfolder
- **Flat**: Top-level Chats/ and Artifacts/ folders for easy navigation

### Memory Export
Standalone feature to export organizational and project-specific memories:
- Global memory (organizational level)
- Project-specific memories (all projects)
- Export as JSON, Markdown, or Plain Text

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

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Code Development**: Written by Claude Sonnet 4.5 in collaboration with a human developer
- **ZIP Library**: Uses [JSZip](https://stuk.github.io/jszip/) for creating ZIP archives
- **Motivation**: Inspired by the need for better Claude.ai conversation management and the limitations of official exports

---

**Note**: This extension is not officially affiliated with Anthropic or Claude.ai. It's a community tool that uses the web interface's API endpoints.
