# Claude Artifact Downloader

## Table of Contents
1. [Introduction](#introduction)
2. [Features](#features)
3. [Installation](#installation)
4. [Usage](#usage)
5. [Project Structure](#project-structure)
6. [How It Works](#how-it-works)
7. [Contributing](#contributing)
8. [Troubleshooting](#troubleshooting)
9. [License](#license)

## Introduction

Claude Artifact Downloader is a Chrome extension designed to enhance your experience with the Claude AI chat interface. It allows users to easily download all artifacts (code snippets, diagrams, etc.) generated during a conversation with Claude as a single ZIP file. This tool is particularly useful for developers, researchers, and anyone who frequently uses Claude for generating or discussing code and other technical content.

> This project was inspired and uses some code snippets from https://github.com/hamelsmu/claudesave. Thank you Hamel and other authors.

## Features

- Adds a "Download Artifacts" button directly to the Claude chat interface
- Extracts all artifacts from the current conversation
- Packages artifacts into a single ZIP file for easy download
- Preserves the chronological order of artifacts
- Handles duplicate artifact names with intelligent suffixing
- Assigns appropriate file extensions based on content type

## Installation

To install the Claude Artifact Downloader extension:

1. Clone this repository or download the source code.
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable "Developer mode" using the toggle switch in the top right corner.
4. Click "Load unpacked" and select the directory containing the extension files.
5. The extension should now appear in your list of installed extensions.

## Usage

1. Navigate to the Claude AI chat interface (https://claude.ai).
2. Start or continue a conversation with Claude.
3. When you're ready to download artifacts, look for the "Download Artifacts" button in the chat interface (usually near the top of the page).
4. Click the "Download Artifacts" button.
5. The extension will process the conversation and generate a ZIP file containing all artifacts.
6. Choose a location to save the ZIP file when prompted by your browser.

## Project Structure

The project consists of the following key files:

- `manifest.json`: Defines the extension's properties and permissions.
- `background.js`: Contains the main logic for extracting and processing artifacts.
- `content.js`: Handles the injection of the download button into the Claude interface.
- `jszip.min.js`: Third-party library for creating ZIP files in the browser.

## How It Works

1. The extension adds a "Download Artifacts" button to the Claude chat interface.
2. When clicked, it extracts the conversation UUID from the current URL.
3. It then retrieves the chat data from Chrome's local storage.
4. The chat messages are processed recursively, starting from the most recent root message.
5. Artifacts are extracted from each message using regular expressions.
6. Each artifact is added to a ZIP file with a unique filename based on its title, language, and message index.
7. The ZIP file is then offered for download.

## Contributing

Contributions to the Claude Artifact Downloader are welcome! If you'd like to contribute:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them with clear, descriptive messages.
4. Push your changes to your fork.
5. Submit a pull request with a description of your changes.

Please ensure your code adheres to the existing style and includes appropriate comments.

## Troubleshooting

- If no artifacts are found, try refreshing the Claude chat page and attempting the download again.
- Ensure you have the latest version of Google Chrome installed.
- If you encounter any issues, check the browser console for error messages and report them in the project's issue tracker.

## License

[MIT License](LICENSE)

---

For any questions, issues, or feature requests, please open an issue in the project repository.
