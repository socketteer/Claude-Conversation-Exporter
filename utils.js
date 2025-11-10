// Shared utility functions for Claude Exporter

// Helper function to reconstruct the current branch from the message tree
function getCurrentBranch(data) {
  if (!data.chat_messages || !data.current_leaf_message_uuid) {
    return [];
  }
  
  // Create a map of UUID to message for quick lookup
  const messageMap = new Map();
  data.chat_messages.forEach(msg => {
    messageMap.set(msg.uuid, msg);
  });
  
  // Trace back from the current leaf to the root
  const branch = [];
  let currentUuid = data.current_leaf_message_uuid;
  
  while (currentUuid && messageMap.has(currentUuid)) {
    const message = messageMap.get(currentUuid);
    branch.unshift(message); // Add to beginning to maintain order
    currentUuid = message.parent_message_uuid;
    
    // Stop if we hit the root (parent UUID that doesn't exist in our messages)
    if (!messageMap.has(currentUuid)) {
      break;
    }
  }
  
  return branch;
}

// Convert to markdown format
function convertToMarkdown(data, includeMetadata, conversationId = null, includeArtifacts = true) {
  console.log('🔧 convertToMarkdown - conversationId:', conversationId, 'includeArtifacts:', includeArtifacts);
  let markdown = `# ${data.name || 'Untitled Conversation'}\n\n`;

  if (includeMetadata) {
    markdown += `**Created:** ${new Date(data.created_at).toLocaleString()}\n`;
    markdown += `**Updated:** ${new Date(data.updated_at).toLocaleString()}\n`;
    markdown += `**Exported:** ${new Date().toLocaleString()}\n`;
    markdown += `**Model:** ${data.model}\n`;
    if (conversationId) {
      markdown += `**Link:** [https://claude.ai/chat/${conversationId}](https://claude.ai/chat/${conversationId})\n`;
    }
    markdown += `\n---\n\n`;
  }

  // Get only the current branch messages
  const branchMessages = getCurrentBranch(data);

  for (const message of branchMessages) {
    const sender = message.sender === 'human' ? '## Prompt' : '### Response';
    markdown += `${sender}\n`;

    if (includeMetadata && message.created_at) {
      markdown += `**${new Date(message.created_at).toISOString()}**\n`;
    }
    markdown += `\n`;

    // Extract artifacts from the entire message (handles both old and new formats)
    const messageArtifacts = includeArtifacts ? extractArtifactsFromMessage(message) : [];
    if (messageArtifacts.length > 0) {
      console.log('📦 Found', messageArtifacts.length, 'artifact(s) in message:', messageArtifacts.map(a => a.title));
    }

    // Render message text (excluding tool_use and artifact tags)
    if (message.content) {
      for (const content of message.content) {
        // Handle thinking blocks (extended thinking)
        if (content.type === 'thinking' && content.thinking) {
          // Get the summary if available
          const summary = content.summaries && content.summaries.length > 0
            ? content.summaries[content.summaries.length - 1].summary
            : 'Thought process';

          markdown += `#### Thinking\n\`\`\`\`plaintext\n${summary}\n\n${content.thinking}\n\`\`\`\`\n\n`;
        }
        // Handle regular text content (skip tool_use, we handle artifacts separately)
        else if (content.type === 'text' && content.text) {
          // Remove old-format artifact tags from text
          let textWithoutArtifacts = content.text.replace(/<antArtifact[^>]*>[\s\S]*?<\/antArtifact>/g, '').trim();
          if (textWithoutArtifacts) {
            markdown += `${textWithoutArtifacts}\n\n`;
          }
        }
      }
    } else if (message.text) {
      // Handle old format - remove artifact tags from text
      let textWithoutArtifacts = message.text.replace(/<antArtifact[^>]*>[\s\S]*?<\/antArtifact>/g, '').trim();
      if (textWithoutArtifacts) {
        markdown += `${textWithoutArtifacts}\n\n`;
      }
    }

    // Render all artifacts found in the message
    for (const artifact of messageArtifacts) {
      markdown += `#### 📦 Artifact: ${artifact.title}\n`;
      markdown += `**Type:** ${artifact.type} | **Language:** ${artifact.language}\n\n`;

      if (artifact.type === 'code' || isProgrammingLanguage(artifact.language)) {
        markdown += `\`\`\`${artifact.language}\n${artifact.content}\n\`\`\`\n\n`;
      } else {
        markdown += `${artifact.content}\n\n`;
      }
    }
  }

  return markdown;
}

// Convert to plain text
function convertToText(data, includeMetadata, includeArtifacts = true) {
  let text = '';

  // Add metadata header if requested
  if (includeMetadata) {
    text += `${data.name || 'Untitled Conversation'}\n`;
    text += `Created: ${new Date(data.created_at).toLocaleString()}\n`;
    text += `Updated: ${new Date(data.updated_at).toLocaleString()}\n`;
    text += `Model: ${data.model}\n\n`;
    text += '---\n\n';
  }

  // Get only the current branch messages
  const branchMessages = getCurrentBranch(data);

  // Use simplified format
  let humanSeen = false;
  let assistantSeen = false;

  branchMessages.forEach((message) => {
    // Extract artifacts from the entire message (handles both old and new formats)
    const artifacts = includeArtifacts ? extractArtifactsFromMessage(message) : [];

    // Get the message text (excluding artifacts)
    let messageText = '';
    if (message.content) {
      for (const content of message.content) {
        // Only include text content, skip tool_use
        if (content.type === 'text' && content.text) {
          // Remove old-format artifact tags
          messageText += content.text.replace(/<antArtifact[^>]*>[\s\S]*?<\/antArtifact>/g, '').trim() + ' ';
        }
      }
    } else if (message.text) {
      // Handle old format - remove artifact tags
      messageText = message.text.replace(/<antArtifact[^>]*>[\s\S]*?<\/antArtifact>/g, '').trim();
    }

    messageText = messageText.trim();

    // Use full label on first occurrence, then abbreviate
    let senderLabel;
    if (message.sender === 'human') {
      senderLabel = humanSeen ? 'H' : 'Human';
      humanSeen = true;
    } else {
      senderLabel = assistantSeen ? 'A' : 'Assistant';
      assistantSeen = true;
    }

    text += `${senderLabel}: ${messageText}\n`;

    // Add artifacts if present
    if (artifacts.length > 0) {
      for (const artifact of artifacts) {
        text += `\n[Artifact: ${artifact.title} (${artifact.language})]\n`;
        text += `${artifact.content}\n`;
        text += `[End Artifact]\n`;
      }
    }

    text += `\n`;
  });
  
  return text.trim();
}

// Download file utility
function downloadFile(content, filename, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Artifact Extraction Functions
// ============================================================================

// Extract artifacts from message content (supports both old and new formats)
function extractArtifactsFromMessage(message) {
  const artifacts = [];

  // Check if message has content array (new format)
  if (message.content && Array.isArray(message.content)) {
    for (const content of message.content) {
      // NEW FORMAT: tool_use with display_content
      if (content.type === 'tool_use' && content.display_content) {
        const displayContent = content.display_content;

        // Check for json_block format
        if (displayContent.type === 'json_block' && displayContent.json_block) {
          try {
            const artifactData = JSON.parse(displayContent.json_block);

            // Extract artifact details
            const language = artifactData.language || 'txt';
            const code = artifactData.code || '';
            const filename = artifactData.filename || 'Untitled';

            // Extract title from filename (remove path and extension)
            const title = filename.split('/').pop().replace(/\.[^.]+$/, '');

            artifacts.push({
              title: title || 'Untitled',
              language: language,
              type: isProgrammingLanguage(language) ? 'code' : 'document',
              identifier: null,
              content: code.trim(),
            });
          } catch (e) {
            // JSON parse failed, skip this artifact
            console.warn('Failed to parse artifact json_block:', e);
          }
        }
      }

      // OLD FORMAT: Check text content for <antArtifact> tags
      if (content.text) {
        const textArtifacts = extractArtifactsFromText(content.text);
        artifacts.push(...textArtifacts);
      }
    }
  }

  // Fallback: Check message.text directly (older format)
  if (message.text) {
    const textArtifacts = extractArtifactsFromText(message.text);
    artifacts.push(...textArtifacts);
  }

  return artifacts;
}

// Extract artifacts from text using regex (OLD FORMAT: <antArtifact> tags)
function extractArtifactsFromText(text) {
  const artifactRegex = /<antArtifact[^>]*>([\s\S]*?)<\/antArtifact>/g;
  const artifacts = [];
  let match;

  while ((match = artifactRegex.exec(text)) !== null) {
    const fullTag = match[0];
    const content = match[1];

    // Extract attributes - handle both old and new formats
    const titleMatch = fullTag.match(/title="([^"]*)"/);
    const typeMatch = fullTag.match(/type="([^"]*)"/);
    const languageMatch = fullTag.match(/language="([^"]*)"/);
    const identifierMatch = fullTag.match(/identifier="([^"]*)"/);

    // Determine the artifact type and language
    let artifactType = 'text';
    let language = 'txt';

    if (typeMatch) {
      const type = typeMatch[1];
      // Map type to language/format
      if (type === 'text/html') {
        language = 'html';
        artifactType = 'code';
      } else if (type === 'text/markdown') {
        language = 'markdown';
        artifactType = 'document';
      } else if (type === 'application/vnd.ant.code') {
        language = languageMatch ? languageMatch[1] : 'txt';
        artifactType = 'code';
      } else if (type === 'text/css') {
        language = 'css';
        artifactType = 'code';
      } else if (type === 'application/vnd.ant.mermaid') {
        language = 'mermaid';
        artifactType = 'document';
      } else if (type === 'application/vnd.ant.react') {
        language = 'jsx';
        artifactType = 'code';
      } else if (type === 'image/svg+xml') {
        language = 'svg';
        artifactType = 'code';
      }
    } else if (languageMatch) {
      // Old format - just language attribute
      language = languageMatch[1];
      artifactType = 'code';
    }

    artifacts.push({
      title: titleMatch ? titleMatch[1] : 'Untitled',
      language: language,
      type: artifactType,
      identifier: identifierMatch ? identifierMatch[1] : null,
      content: content.trim(),
    });
  }

  return artifacts;
}

// Legacy function name for backward compatibility
function extractArtifacts(text) {
  return extractArtifactsFromText(text);
}

// Get file extension from language
function getFileExtension(language) {
  const languageToExt = {
    javascript: '.js',
    html: '.html',
    css: '.css',
    python: '.py',
    java: '.java',
    c: '.c',
    cpp: '.cpp',
    'c++': '.cpp',
    ruby: '.rb',
    php: '.php',
    swift: '.swift',
    go: '.go',
    rust: '.rs',
    typescript: '.ts',
    tsx: '.tsx',
    jsx: '.jsx',
    shell: '.sh',
    bash: '.sh',
    sql: '.sql',
    kotlin: '.kt',
    scala: '.scala',
    r: '.r',
    matlab: '.m',
    json: '.json',
    xml: '.xml',
    yaml: '.yaml',
    yml: '.yml',
    markdown: '.md',
    md: '.md',
    text: '.txt',
    txt: '.txt',
    latex: '.tex',
    tex: '.tex',
    bibtex: '.bib',
    bib: '.bib',
    mermaid: '.mmd',
    svg: '.svg',
    csv: '.csv',
    toml: '.toml',
    ini: '.ini',
    perl: '.pl',
    lua: '.lua',
    dart: '.dart',
    elixir: '.ex',
    erlang: '.erl',
    haskell: '.hs',
    clojure: '.clj',
    fsharp: '.fs',
    'f#': '.fs',
    'c#': '.cs',
    csharp: '.cs',
    'objective-c': '.m',
    ocaml: '.ml',
    scheme: '.scm',
    lisp: '.lisp',
    fortran: '.f90',
    assembly: '.asm',
    asm: '.asm',
    scss: '.scss',
    sass: '.sass',
    less: '.less',
    stylus: '.styl',
    dockerfile: '.dockerfile',
    makefile: '.mk',
    gradle: '.gradle',
    groovy: '.groovy',
  };
  return languageToExt[language.toLowerCase()] || '.txt';
}

// Check if a language is a programming language (should be saved in original format only)
function isProgrammingLanguage(language) {
  const programmingLanguages = [
    'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'c++', 'ruby', 'php',
    'swift', 'go', 'rust', 'jsx', 'tsx', 'shell', 'bash', 'sql', 'kotlin', 'scala',
    'r', 'perl', 'lua', 'dart', 'elixir', 'erlang', 'haskell', 'clojure', 'fsharp',
    'f#', 'c#', 'csharp', 'objective-c', 'ocaml', 'scheme', 'lisp', 'fortran',
    'assembly', 'asm', 'groovy', 'html', 'css', 'scss', 'sass', 'less', 'stylus'
  ];
  return programmingLanguages.includes(language.toLowerCase());
}

// Extract all artifacts from a conversation into separate files
function extractArtifactFiles(data) {
  const artifactFiles = [];
  const usedFilenames = new Set();

  // Get only the current branch messages
  const branchMessages = getCurrentBranch(data);

  for (const message of branchMessages) {
    const artifacts = extractArtifactsFromMessage(message);

    for (const artifact of artifacts) {
      // Generate filename from title and language
      let baseFilename = artifact.title || 'artifact';
      // Sanitize filename (remove invalid characters)
      baseFilename = baseFilename.replace(/[<>:"/\\|?*]/g, '_');

      // Get extension from language
      const extension = getFileExtension(artifact.language);
      let filename = `${baseFilename}${extension}`;

      // Handle duplicate filenames
      let counter = 1;
      while (usedFilenames.has(filename)) {
        filename = `${baseFilename}_${counter}${extension}`;
        counter++;
      }

      usedFilenames.add(filename);

      artifactFiles.push({
        filename: filename,
        content: artifact.content
      });
    }
  }

  return artifactFiles;
}

// Functions are available globally in the browser context
// No need for module.exports in browser extensions
