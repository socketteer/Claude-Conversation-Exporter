# Claude Conversation Exporter

A browser extension for Chrome and Firefox that allows you to export your Claude.ai conversations in various formats (JSON, Markdown, Plain Text) with support for bulk exports and conversation browsing.

**Built with TypeScript** - Both Chrome and Firefox versions are compiled from the same TypeScript codebase with strict type checking enabled.

**Firefox Version**: Uses Firefox MV2 manifest with `browser.*` Promise-based APIs
**Chrome Version**: Uses Chrome MV3 manifest with service workers

Both versions share 100% of the TypeScript source code, differing only in their manifest configurations and build targets.

## Project Structure

```text
/
├── README.md                  # This file
├── package.json               # pnpm workspace configuration
├── tsconfig.json             # TypeScript configuration (strict mode)
├── vite.config.ts            # Vite build configuration
├── src/                      # Shared source code
│   ├── chrome/              # Chrome-specific files
│   │   └── manifest.json   # Chrome MV3 manifest
│   ├── firefox/             # Firefox-specific files
│   │   └── manifest.json   # Firefox MV2 manifest
│   ├── *.ts                 # TypeScript source files
│   ├── *.html               # HTML pages
│   ├── *.css                # Stylesheets
│   └── *.png                # Icons and images
└── dist/                     # Build output (generated)
    ├── chrome/              # Built Chrome extension
    └── firefox/             # Built Firefox extension
```

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

## Development Setup

### Prerequisites

- Node.js 18+ and pnpm
- Chrome or Firefox browser
- A Claude.ai account

### Build from Source

1. **Clone the Repository**

   ```bash
   git clone [repository-url]
   cd Claude-Conversation-Exporter-Firefox-TS
   ```

2. **Install Dependencies**

   ```bash
   pnpm install
   ```

3. **Build the Extension**

   For Firefox (TypeScript):

   ```bash
   pnpm build:firefox
   # Output: dist/firefox/
   ```

   For Chrome (TypeScript):

   ```bash
   pnpm build:chrome
   # Output: dist/chrome/
   ```

   Build both:

   ```bash
   pnpm build
   ```

4. **Development Mode** (auto-rebuild on changes)

   ```bash
   pnpm dev:firefox   # Watch mode for Firefox
   pnpm dev:chrome    # Watch mode for Chrome
   ```

5. **Type Checking**

   ```bash
   pnpm type-check    # Run TypeScript type checker
   ```

6. **Testing**

   ```bash
   pnpm test          # Run tests in watch mode
   pnpm test:run      # Run tests once
   pnpm test:ui       # Run tests with UI
   pnpm test:coverage # Run tests with coverage report
   ```

   The test suite includes:
   - **Unit tests** for utility functions (utils.ts)
   - **Type validation tests** for TypeScript types
   - **Integration tests** for complete workflows
   - **98%+ coverage** on core utility functions

   See `src/tests/README.md` for more details about the test structure.

## Installation

### Firefox

1. Build the extension (see Development Setup above)
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" → "Load Temporary Add-on"
4. Select any file in `dist/firefox/` directory
5. Or use `pnpm firefox:run` to launch Firefox with the extension loaded

### Chrome

1. Build the extension (see Development Setup above)
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `dist/chrome/` directory

### Configure Your Organization ID

After installation (either browser):

1. Click the extension icon
2. Click "Click here to set it up" or access Options
3. Go to `https://claude.ai/settings/account`
4. Copy your Organization ID (UUID format)
5. Paste it in the extension options and click Save
6. Click "Test Connection" to verify

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

```text
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

## Firefox Add-ons (AMO) Submission

To prepare for Firefox Add-ons (addons.mozilla.org) submission:

### 1. Build for Production

```bash
pnpm build:firefox
```

### 2. Create a Source Code Archive

Firefox AMO requires source code submission for extensions that use build tools:

```bash
# Create a source code archive excluding unnecessary files
zip -r claude-exporter-source.zip . \
  -x "node_modules/*" \
  -x "dist/*" \
  -x ".git/*" \
  -x "*.DS_Store" \
  -x ".vscode/*" \
  -x ".idea/*"
```

### 3. Create the Extension Package

```bash
cd dist/firefox
zip -r ../../claude-exporter-firefox.zip .
cd ../..
```

### 4. Prepare Build Instructions

Create a `BUILD.md` file to include with your source:

```markdown
# Build Instructions

## Prerequisites
- Node.js 18 or higher
- pnpm package manager

## Build Steps
1. Install dependencies: `pnpm install`
2. Build Firefox extension: `pnpm build:firefox`
3. Extension output will be in `dist/firefox/`

## Verification
The built extension can be loaded temporarily in Firefox from about:debugging
```

### 5. Prepare Store Listing Assets

You'll need:

- **Screenshots** (1280x800 or 640x400): Take screenshots of the extension in action
- **Icons**: Already included (icon16.png, icon48.png, icon128.png)
- **Description**: Use the features list from this README
- **Category**: Suggested: "Productivity" or "Other"
- **License**: Choose an open source license (MIT, GPL, etc.)

### 6. Privacy Policy

Since the extension accesses Claude.ai data, include in your privacy policy:

- The extension only accesses data when explicitly triggered by the user
- No data is sent to external servers
- All processing happens locally in the browser
- User's Claude.ai authentication is used only for API access
- No telemetry or analytics are collected

### 7. Permissions Justification

Firefox reviewers will want to know why each permission is needed:

- `activeTab`: To interact with the current Claude.ai tab
- `storage`: To save user's organization ID preference
- `tabs`: To identify when user is on Claude.ai
- Host permission for `https://claude.ai/*`: To access Claude.ai API endpoints for exporting conversations

### 8. Submission Process

1. Go to <https://addons.mozilla.org/developers/>
2. Click "Submit a New Add-on"
3. Upload `claude-exporter-firefox.zip`
4. Upload `claude-exporter-source.zip` when prompted
5. Provide the build instructions from step 4
6. Fill in the listing information
7. Submit for review

### 9. Review Notes

In the "Notes to Reviewer" field, mention:

- This extension uses TypeScript and Vite for building
- Build instructions are included with the source code
- The extension uses the MV2 manifest (Firefox standard)
- All API calls are made to claude.ai using the user's existing authentication
- No external servers or services are contacted

## Chrome Web Store Submission

To prepare for Chrome Web Store submission:

### 1. Build Chrome Extension for Production

```bash
pnpm build:chrome
```

### 2. Create a ZIP for Submission

```bash
cd dist/chrome
zip -r ../../claude-exporter-chrome.zip .
cd ../..
```

### 3. Prepare Store Listing Assets

You'll need:

- **Screenshots** (1280x800 or 640x400): Take screenshots of the extension in action
- **Promotional Images**: Small tile (440x280), Large tile (920x680) - optional
- **Description**: Use the features list from this README
- **Category**: Suggested: "Productivity" or "Developer Tools"

### 4. Privacy Policy

Since the extension accesses Claude.ai data, you should mention:

- The extension only accesses data when explicitly triggered by the user
- No data is sent to external servers
- All processing happens locally in the browser
- User's Claude.ai authentication is used only for API access

### 5. Permissions Justification

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
