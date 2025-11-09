// Import JSZip for creating ZIP files
importScripts('jszip.min.js');

// Fetch all conversations from the organization with pagination support
async function fetchAllConversations(orgId) {
  let allConversations = [];
  let offset = 0;
  const limit = 100; // Fetch in batches of 100
  let hasMore = true;

  console.log('Fetching all conversations with pagination...');

  while (hasMore) {
    const url = `https://claude.ai/api/organizations/${orgId}/chat_conversations?limit=${limit}&offset=${offset}`;

    console.log(`  Fetching batch: offset=${offset}, limit=${limit}`);

    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conversations: ${response.status}`);
    }

    const data = await response.json();

    // Handle both array response and object with conversations array
    let conversations = Array.isArray(data) ? data : (data.conversations || data.data || []);

    console.log(`  Received ${conversations.length} conversations in this batch`);

    if (conversations.length === 0) {
      // No more conversations to fetch
      hasMore = false;
    } else {
      allConversations = allConversations.concat(conversations);
      offset += conversations.length;

      // If we got fewer than the limit, we've reached the end
      if (conversations.length < limit) {
        hasMore = false;
      }
    }

    // Small delay to avoid rate limiting
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`Total conversations fetched: ${allConversations.length}`);
  return allConversations;
}

// Fetch full conversation data including all messages
async function fetchConversation(orgId, conversationId) {
  const url = `https://claude.ai/api/organizations/${orgId}/chat_conversations/${conversationId}?tree=True&rendering_mode=messages&render_all_tools=true`;

  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch conversation: ${response.status}`);
  }

  return await response.json();
}

// Extract artifacts from message text using regex
function extractArtifacts(text) {
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
    // Academic/Document formats
    latex: '.tex',
    tex: '.tex',
    bibtex: '.bib',
    bib: '.bib',
    // Diagram and visualization
    mermaid: '.mmd',
    svg: '.svg',
    // Data formats
    csv: '.csv',
    toml: '.toml',
    ini: '.ini',
    // Other programming languages
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
    // Markup and styling
    scss: '.scss',
    sass: '.sass',
    less: '.less',
    stylus: '.styl',
    // Other
    dockerfile: '.dockerfile',
    makefile: '.mk',
    gradle: '.gradle',
    groovy: '.groovy',
  };
  return languageToExt[language.toLowerCase()] || '.txt';
}

// Generate unique filename
function getUniqueFileName(title, language, usedNames, conversationFolder = '', customExtension = null) {
  let baseName = title.replace(/[^\w\-._/]+/g, '_');
  let extension = customExtension || getFileExtension(language);

  // Handle path-like titles (e.g., "src/components/Button.jsx")
  const parts = baseName.split('/');
  if (parts.length > 1) {
    const fileName = parts.pop();
    const subDir = parts.join('/');
    baseName = `${conversationFolder}/${subDir}/${fileName}`;
  } else {
    baseName = `${conversationFolder}/${baseName}`;
  }

  let fileName = `${baseName}${extension}`;
  let counter = 1;

  while (usedNames.has(fileName)) {
    fileName = `${baseName}_${counter}${extension}`;
    counter++;
  }

  usedNames.add(fileName);
  return fileName;
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

// Generate artifact metadata as JSON
function generateArtifactJSON(artifact) {
  return JSON.stringify({
    title: artifact.title,
    language: artifact.language,
    type: artifact.type,
    identifier: artifact.identifier,
    content: artifact.content,
    exported_at: new Date().toISOString()
  }, null, 2);
}

// Generate artifact as Markdown
function generateArtifactMarkdown(artifact) {
  let markdown = `# ${artifact.title}\n\n`;

  if (artifact.identifier) {
    markdown += `**Identifier:** ${artifact.identifier}\n\n`;
  }

  markdown += `**Type:** ${artifact.type}\n`;
  markdown += `**Language:** ${artifact.language}\n\n`;
  markdown += `---\n\n`;

  // Wrap content in code block if it's code
  if (artifact.type === 'code') {
    markdown += `\`\`\`${artifact.language}\n${artifact.content}\n\`\`\`\n`;
  } else {
    markdown += artifact.content;
  }

  return markdown;
}

// Process conversation to extract artifacts
function processConversation(conversation, zip, usedNames) {
  let artifactCount = 0;

  if (!conversation.chat_messages) {
    console.log(`  No chat_messages in conversation: ${conversation.name || conversation.uuid}`);
    return artifactCount;
  }

  // Sanitize conversation name for folder
  const conversationName = (conversation.name || 'Untitled').replace(/[^\w\-._]+/g, '_');
  console.log(`  Processing conversation "${conversationName}" with ${conversation.chat_messages.length} messages`);

  // Process all messages in the conversation
  for (const message of conversation.chat_messages) {
    if (message.sender === 'assistant' && message.content) {
      // Handle both old format (text field) and new format (content array)
      let messageText = '';

      if (Array.isArray(message.content)) {
        // New format: content is an array of content blocks
        for (const content of message.content) {
          if (content.text) {
            messageText += content.text;
          }
        }
      } else if (typeof message.content === 'string') {
        // Old format: content is a string
        messageText = message.content;
      } else if (message.text) {
        // Even older format: direct text field
        messageText = message.text;
      }

      if (messageText) {
        const artifacts = extractArtifacts(messageText);

        if (artifacts.length > 0) {
          console.log(`    Found ${artifacts.length} artifact(s) in message`);
          artifacts.forEach((art, idx) => {
            console.log(`      [${idx + 1}] "${art.title}" (type: ${art.type}, language: ${art.language})`);
          });
        }

        for (const artifact of artifacts) {
          // Check if this is a programming language artifact
          if (isProgrammingLanguage(artifact.language)) {
            // Programming code: save only in original format (root of conversation folder)
            const fileName = getUniqueFileName(
              artifact.title,
              artifact.language,
              usedNames,
              conversationName
            );
            zip.file(fileName, artifact.content);
            artifactCount++;
          } else {
            // Document/text: export in multiple formats with subfolders
            // 1. Original format (root folder)
            const originalFileName = getUniqueFileName(
              artifact.title,
              artifact.language,
              usedNames,
              conversationName
            );
            zip.file(originalFileName, artifact.content);
            artifactCount++;

            // 2. JSON format (json subfolder)
            const jsonFileName = getUniqueFileName(
              artifact.title,
              artifact.language,
              usedNames,
              `${conversationName}/json`,
              '.json'
            );
            zip.file(jsonFileName, generateArtifactJSON(artifact));
            artifactCount++;

            // 3. Markdown format (md subfolder)
            const mdFileName = getUniqueFileName(
              artifact.title,
              artifact.language,
              usedNames,
              `${conversationName}/md`,
              '.md'
            );
            zip.file(mdFileName, generateArtifactMarkdown(artifact));
            artifactCount++;

            // 4. Plain text format (txt subfolder)
            const txtFileName = getUniqueFileName(
              artifact.title,
              artifact.language,
              usedNames,
              `${conversationName}/txt`,
              '.txt'
            );
            zip.file(txtFileName, artifact.content);
            artifactCount++;
          }
        }
      }
    }
  }

  if (artifactCount > 0) {
    console.log(`  ✓ Extracted ${artifactCount} file(s) from "${conversationName}"`);
  }

  return artifactCount;
}

// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Main export handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'exportArtifacts') {
    (async () => {
      try {
        console.log('Starting bulk artifact export...');
        console.log('Organization ID:', request.orgId);

        // Fetch all conversations
        const conversations = await fetchAllConversations(request.orgId);
        console.log(`\n=== INITIAL SCAN ===`);
        console.log(`Found ${conversations.length} conversations`);
        console.log(`First few conversations:`, conversations.slice(0, 5).map(c => ({
          uuid: c.uuid,
          name: c.name,
          updated_at: c.updated_at
        })));

        const zip = new JSZip();
        const usedNames = new Set();
        let totalArtifacts = 0;
        let conversationsWithArtifacts = 0;
        let processedCount = 0;

        // Process each conversation
        for (const conv of conversations) {
          try {
            processedCount++;

            // Send progress update (ignore errors if popup closed)
            try {
              chrome.runtime.sendMessage({
                action: 'exportProgress',
                current: processedCount,
                total: conversations.length,
                conversationName: conv.name || 'Untitled'
              });
            } catch (e) {
              // Popup might be closed, ignore
            }

            console.log(`\n=== Processing ${processedCount}/${conversations.length}: ${conv.name || conv.uuid} ===`);

            // Fetch full conversation data
            const fullConv = await fetchConversation(request.orgId, conv.uuid);
            console.log(`  Fetched conversation data:`, {
              uuid: fullConv.uuid,
              name: fullConv.name,
              message_count: fullConv.chat_messages ? fullConv.chat_messages.length : 0,
              has_messages: !!fullConv.chat_messages
            });

            // Extract artifacts from this conversation
            const artifactCount = processConversation(fullConv, zip, usedNames);

            if (artifactCount > 0) {
              totalArtifacts += artifactCount;
              conversationsWithArtifacts++;
              console.log(`  Found ${artifactCount} artifact(s)`);
            }

            // Add delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 500));

          } catch (error) {
            console.error(`❌ Failed to process conversation ${conv.uuid} (${conv.name || 'Untitled'}):`, error);
            console.error(`   Error details:`, {
              message: error.message,
              status: error.status,
              stack: error.stack
            });
            // Continue with next conversation even if one fails
          }
        }

        console.log(`\n=== EXPORT SUMMARY ===`);
        console.log(`Total conversations scanned: ${conversations.length}`);
        console.log(`Conversations with artifacts: ${conversationsWithArtifacts}`);
        console.log(`Total artifact files created: ${totalArtifacts}`);

        if (totalArtifacts === 0) {
          sendResponse({
            success: false,
            error: 'No artifacts found in any conversations'
          });
          return;
        }

        console.log(`Creating ZIP with ${totalArtifacts} artifacts from ${conversationsWithArtifacts} conversations...`);

        // Generate ZIP file
        const content = await zip.generateAsync({ type: 'blob' });

        // Convert to base64 for download
        const arrayBuffer = await content.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);

        // Download the ZIP
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `claude-artifacts-${timestamp}.zip`;

        chrome.downloads.download({
          url: `data:application/zip;base64,${base64}`,
          filename: filename,
          saveAs: true
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            sendResponse({
              success: false,
              error: 'Failed to download ZIP file'
            });
          } else {
            console.log('Export completed successfully!');
            sendResponse({
              success: true,
              artifactCount: totalArtifacts,
              conversationCount: conversationsWithArtifacts,
              totalConversations: conversations.length
            });
          }
        });

      } catch (error) {
        console.error('Export error:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      }
    })();

    return true; // Keep message channel open for async response
  }
});
