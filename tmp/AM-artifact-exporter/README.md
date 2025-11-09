# Claude Artifact Bulk Exporter

A Chrome extension that allows you to bulk export all artifacts from all your Claude.ai conversations in one go.

## Features

- **Bulk Export**: Export artifacts from all conversations at once
- **Organized Structure**: Artifacts are organized by conversation in a ZIP file
- **Progress Tracking**: Real-time progress updates during export
- **Smart File Naming**: Handles duplicate names and preserves directory structures in artifact titles
- **Multiple Languages**: Supports all artifact languages (JavaScript, Python, HTML, CSS, etc.)

## How It Works

This extension combines the best of two approaches:

1. **Bulk Fetching** (from AM-chat-exporter): Fetches all your conversations from Claude.ai's API
2. **Artifact Extraction** (from aashwanthkuma-artifacts): Extracts `<antArtifact>` tags from messages

The result: A single ZIP file containing all your artifacts, organized by conversation.

## Installation

### From Source

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the `AM-artifact-exporter` folder

## Setup

### 1. Find Your Organization ID

1. Go to [claude.ai/settings/account](https://claude.ai/settings/account)
2. Copy your Organization ID (it looks like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### 2. Configure the Extension

1. Click the extension icon in your browser toolbar
2. Click "Configure Organization ID"
3. Paste your Organization ID
4. Click "Save Settings"
5. (Optional) Click "Test Connection" to verify it works

## Usage

1. Make sure you're logged into Claude.ai
2. Click the extension icon
3. Click "Export All Artifacts"
4. Wait for the export to complete (you'll see progress updates)
5. Choose where to save the ZIP file

### Output Structure

The exported ZIP file will have this structure:

```
claude-artifacts-2025-11-04.zip
├── Conversation_Name_1/
│   ├── artifact_title_1.html
│   ├── artifact_title_2.py
│   └── src/
│       └── components/
│           └── Button.jsx
├── Conversation_Name_2/
│   ├── script.js
│   └── styles.css
└── Another_Conversation/
    └── data_analysis.py
```

## Credits

This extension combines techniques from:

- **socketteer** (forked as AM-chat-exporter): Bulk conversation fetching
- **aashwanthkuma-artifacts**: Artifact extraction logic

## Technical Details

### Supported Artifact Languages

The extension automatically assigns the correct file extension based on the artifact's language:

- JavaScript (.js)
- TypeScript (.ts)
- Python (.py)
- HTML (.html)
- CSS (.css)
- Java (.java)
- C/C++ (.c, .cpp)
- Ruby (.rb)
- PHP (.php)
- Go (.go)
- Rust (.rs)
- Shell (.sh)
- SQL (.sql)
- And more...

### API Rate Limiting

The extension includes a 500ms delay between conversation fetches to avoid overwhelming Claude's API.

### Error Handling

- Individual conversation failures won't stop the entire export
- Failed conversations are logged to the console
- You'll see a summary of how many artifacts were successfully exported

## Privacy

This extension:
- Only runs on claude.ai domains
- Stores your Organization ID locally in Chrome's sync storage
- Does not send any data to external servers
- All processing happens locally in your browser

## Troubleshooting

### "Please configure your Organization ID"

Make sure you've followed the Setup steps above.

### "Failed to fetch conversations"

1. Verify you're logged into Claude.ai
2. Check that your Organization ID is correct
3. Try the "Test Connection" button in settings

### "No artifacts found"

This means none of your conversations contain artifacts. Artifacts are code/content blocks created by Claude in special artifact containers.

## Development

### File Structure

```
AM-artifact-exporter/
├── manifest.json         # Extension configuration
├── background.js         # Main logic (fetching + extraction)
├── popup.html           # Popup UI
├── popup.js            # Popup logic
├── options.html        # Settings page
├── options.js         # Settings logic
├── jszip.min.js      # ZIP file creation library
├── icon16.png        # Extension icons
├── icon48.png
├── icon128.png
└── README.md        # This file
```

### Building on This

Feel free to fork and modify! Some ideas:

- Add filtering by date range
- Add option to export only from specific conversations
- Support for exporting artifact metadata
- Integration with cloud storage services

## License

This is a combination of open-source projects. Please respect the original licenses of the constituent projects.

## Version History

### 1.0.0 (2025-11-04)
- Initial release
- Bulk artifact export from all conversations
- Organized ZIP structure by conversation
- Progress tracking
- Organization ID configuration
