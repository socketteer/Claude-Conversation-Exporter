// Note: Organization ID is now stored in extension settings
// Users need to configure it in the extension options page

// Convert HTML element to markdown
function htmlToMarkdown(element) {
  let result = '';

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const tag = node.tagName.toLowerCase();
    const children = Array.from(node.childNodes).map(processNode).join('');

    switch (tag) {
      case 'h1':
        return `\n# ${children}\n\n`;
      case 'h2':
        return `\n## ${children}\n\n`;
      case 'h3':
        return `\n### ${children}\n\n`;
      case 'h4':
        return `\n#### ${children}\n\n`;
      case 'h5':
        return `\n##### ${children}\n\n`;
      case 'h6':
        return `\n###### ${children}\n\n`;
      case 'p':
        return `${children}\n\n`;
      case 'br':
        return '\n';
      case 'hr':
        return '\n---\n\n';
      case 'strong':
      case 'b':
        return `**${children}**`;
      case 'em':
      case 'i':
        return `*${children}*`;
      case 'code':
        if (node.parentElement?.tagName.toLowerCase() === 'pre') {
          return children;
        }
        return `\`${children}\``;
      case 'pre':
        const codeEl = node.querySelector('code');
        const lang = codeEl?.className.match(/language-(\w+)/)?.[1] || '';
        return `\n\`\`\`${lang}\n${children.trim()}\n\`\`\`\n\n`;
      case 'a':
        const href = node.getAttribute('href');
        if (!href) return children;
        // If link text is same as URL (or just the domain), just show the URL
        const textTrimmed = children.trim();
        if (textTrimmed === href || href.includes(textTrimmed) || textTrimmed.match(/^[\w.-]+\.(com|org|net|io|ai|edu|gov)$/i)) {
          return href;
        }
        return `[${children}](${href})`;
      case 'ul':
        return `\n${children}\n`;
      case 'ol':
        return `\n${children}\n`;
      case 'li':
        const parent = node.parentElement?.tagName.toLowerCase();
        const index = Array.from(node.parentElement?.children || []).indexOf(node);
        const prefix = parent === 'ol' ? `${index + 1}. ` : '- ';
        return `${prefix}${children.trim()}\n`;
      case 'blockquote':
        return children.split('\n').map(line => `> ${line}`).join('\n') + '\n\n';
      case 'table':
        return `\n${children}\n`;
      case 'thead':
      case 'tbody':
        return children;
      case 'tr':
        const cells = Array.from(node.children).map(processNode).join(' | ');
        let row = `| ${cells} |\n`;
        // Add header separator after first row in thead
        if (node.parentElement?.tagName.toLowerCase() === 'thead') {
          const colCount = node.children.length;
          row += '| ' + Array(colCount).fill('---').join(' | ') + ' |\n';
        }
        return row;
      case 'th':
      case 'td':
        return children.trim();
      case 'div':
      case 'span':
        return children;
      case 'img':
        const alt = node.getAttribute('alt') || '';
        const src = node.getAttribute('src') || '';
        return `![${alt}](${src})`;
      case 'button':
      case 'svg':
      case 'path':
        return ''; // Skip UI elements
      default:
        return children;
    }
  }

  result = processNode(element);
  // Clean up excessive newlines
  return result.replace(/\n{3,}/g, '\n\n').trim();
}

// Scrape share page data from DOM (share pages are server-rendered with no API)
function scrapeSharePage() {
  const shareId = window.location.pathname.split('/').pop();

  // Get title from header or meta tags
  const headerEl = document.querySelector('[data-testid="page-header"]');
  let title = headerEl ? headerEl.innerText : document.title.replace(' | Claude', '');

  // Also try og:title as fallback
  const ogTitle = document.querySelector('meta[property="og:title"]')?.content;

  // Extract "Shared by X" and remove from title
  let sharedBy = null;
  const sharedByMatch = title.match(/\nShared by .+$/);
  if (sharedByMatch) {
    sharedBy = sharedByMatch[0].replace('\n', '').trim();
    title = title.replace(sharedByMatch[0], '');
  }

  // Use og:title if it's cleaner
  if (ogTitle && !ogTitle.includes('Shared by')) {
    title = ogTitle;
  }

  // Get description from meta
  const description = document.querySelector('meta[property="og:description"]')?.content ||
                      document.querySelector('meta[name="description"]')?.content;

  // Extract messages from DOM in API-compatible format
  const chat_messages = [];
  const userMsgEls = document.querySelectorAll('[data-testid="user-message"]');
  const claudeResponseEls = document.querySelectorAll('.font-claude-response');

  // Interleave user and Claude messages
  const maxLen = Math.max(userMsgEls.length, claudeResponseEls.length);
  let prevUuid = '00000000-0000-4000-8000-000000000000';

  for (let i = 0; i < maxLen; i++) {
    if (i < userMsgEls.length) {
      const userEl = userMsgEls[i].querySelector('[class*="font-user-message"]') || userMsgEls[i];
      const text = userEl.innerText;
      const uuid = crypto.randomUUID();
      chat_messages.push({
        uuid: uuid,
        text: text,
        content: [{ type: 'text', text: text }],
        sender: 'human',
        index: chat_messages.length,
        created_at: null,
        updated_at: null,
        parent_message_uuid: prevUuid
      });
      prevUuid = uuid;
    }
    if (i < claudeResponseEls.length) {
      const text = htmlToMarkdown(claudeResponseEls[i]);
      const uuid = crypto.randomUUID();
      chat_messages.push({
        uuid: uuid,
        text: text,
        content: [{ type: 'text', text: text }],
        sender: 'assistant',
        index: chat_messages.length,
        created_at: null,
        updated_at: null,
        parent_message_uuid: prevUuid
      });
      prevUuid = uuid;
    }
  }

  return {
    uuid: shareId,
    name: title,
    summary: description,
    sharedBy: sharedBy,
    source_url: window.location.href,
    model: null,
    created_at: null,
    updated_at: null,
    scraped_at: new Date().toISOString(),
    is_starred: false,
    current_leaf_message_uuid: prevUuid,
    chat_messages: chat_messages
  };
}

// Convert share page data to markdown
function convertShareToMarkdown(data, includeMetadata) {
  let markdown = `# ${data.name || 'Untitled Conversation'}\n\n`;

  if (includeMetadata) {
    if (data.sharedBy) markdown += `**${data.sharedBy}**\n`;
    markdown += `**Source:** https://claude.ai/share/${data.uuid}\n\n`;
    markdown += '---\n\n';
  }

  for (const message of data.chat_messages) {
    const sender = message.sender === 'human' ? '**You**' : '**Claude**';
    markdown += `${sender}:\n\n${message.text}\n\n---\n\n`;
  }

  return markdown;
}

// Convert share page data to plain text
function convertShareToText(data, includeMetadata) {
  let text = '';

  if (includeMetadata) {
    text += `${data.name || 'Untitled Conversation'}\n`;
    if (data.sharedBy) text += `${data.sharedBy}\n`;
    text += `Source: https://claude.ai/share/${data.uuid}\n\n---\n\n`;
  }

  let humanSeen = false;
  let assistantSeen = false;

  data.chat_messages.forEach((message) => {
    let senderLabel;
    if (message.sender === 'human') {
      senderLabel = humanSeen ? 'H' : 'Human';
      humanSeen = true;
    } else {
      senderLabel = assistantSeen ? 'A' : 'Assistant';
      assistantSeen = true;
    }
    text += `${senderLabel}: ${message.text}\n\n`;
  });

  return text.trim();
}

// Default model timeline for null models
const DEFAULT_MODEL_TIMELINE = [
  { date: new Date('2024-01-01'), model: 'claude-3-sonnet-20240229' }, // Before June 20, 2024
  { date: new Date('2024-06-20'), model: 'claude-3-5-sonnet-20240620' }, // Starting June 20, 2024
  { date: new Date('2024-10-22'), model: 'claude-3-5-sonnet-20241022' }, // Starting October 22, 2024
  { date: new Date('2025-02-29'), model: 'claude-3-7-sonnet-20250219' }, // Starting February 29, 2025
  { date: new Date('2025-05-14'), model: 'claude-sonnet-4-20250514' }, // Starting May 14, 2025
  { date: new Date('2025-09-29'), model: 'claude-sonnet-4-5-20250929' }, // Starting September 29, 2025
  { date: new Date('2026-02-17'), model: 'claude-sonnet-4-6' } // Starting February 17, 2026
];

// Infer model for conversations with null model based on date
function inferModel(conversation) {
  if (conversation.model) {
    return conversation.model;
  }
  
  // Use created_at date to determine which default model was active
  const conversationDate = new Date(conversation.created_at);
  
  // Find the appropriate model based on the conversation date
  // Start from the end and work backwards to find the right period
  for (let i = DEFAULT_MODEL_TIMELINE.length - 1; i >= 0; i--) {
    if (conversationDate >= DEFAULT_MODEL_TIMELINE[i].date) {
      return DEFAULT_MODEL_TIMELINE[i].model;
    }
  }
  
  // If date is before all known dates, use the first model
  return DEFAULT_MODEL_TIMELINE[0].model;
}
  
  // Fetch conversation data
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
  
  // Fetch all conversations
  async function fetchAllConversations(orgId) {
    const url = `https://claude.ai/api/organizations/${orgId}/chat_conversations`;
    
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch conversations: ${response.status}`);
    }
    
    return await response.json();
  }
  
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
function convertToMarkdown(data, includeMetadata) {
  let markdown = `# ${data.name || 'Untitled Conversation'}\n\n`;
  
  if (includeMetadata) {
    markdown += `**Created:** ${new Date(data.created_at).toLocaleString()}\n`;
    markdown += `**Updated:** ${new Date(data.updated_at).toLocaleString()}\n`;
    markdown += `**Model:** ${data.model}\n`;
    if (data.truncated !== undefined) {
      markdown += `**Truncated:** ${data.truncated}\n`;
    }
    markdown += '\n---\n\n';
  }

  // Get only the current branch messages
  const branchMessages = getCurrentBranch(data);

  for (const message of branchMessages) {
    const sender = message.sender === 'human' ? '**You**' : '**Claude**';
    markdown += `${sender}:\n\n`;

    // Show attachments if metadata enabled
    if (includeMetadata && message.attachments && message.attachments.length > 0) {
      for (const attachment of message.attachments) {
        markdown += `> **Attachment:** ${attachment.file_name || '(unnamed)'}`;
        if (attachment.file_size) {
          const sizeKB = (attachment.file_size / 1024).toFixed(1);
          markdown += ` (${sizeKB} KB)`;
        }
        if (attachment.file_type) {
          markdown += ` [${attachment.file_type}]`;
        }
        markdown += '\n';
        if (attachment.extracted_content) {
          markdown += `>\n> <details><summary>Extracted content</summary>\n>\n> \`\`\`\n> ${attachment.extracted_content.replace(/\n/g, '\n> ')}\n> \`\`\`\n>\n> </details>\n`;
        }
      }
      markdown += '\n';
    }

    if (message.content) {
      for (const content of message.content) {
        if (content.text) {
          markdown += `${content.text}\n\n`;
        }
      }
    } else if (message.text) {
      markdown += `${message.text}\n\n`;
    }

    if (includeMetadata && message.created_at) {
      markdown += `*${new Date(message.created_at).toLocaleString()}*\n\n`;
    }

    markdown += '---\n\n';
  }
  
  return markdown;
}

// Convert to plain text
function convertToText(data, includeMetadata) {
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
    // Get the message text
    let messageText = '';
    if (message.content) {
      for (const content of message.content) {
        if (content.text) {
          messageText += content.text;
        }
      }
    } else if (message.text) {
      messageText = message.text;
    }
    
    // Use full label on first occurrence, then abbreviate
    let senderLabel;
    if (message.sender === 'human') {
      senderLabel = humanSeen ? 'H' : 'Human';
      humanSeen = true;
    } else {
      senderLabel = assistantSeen ? 'A' : 'Assistant';
      assistantSeen = true;
    }
    
    text += `${senderLabel}: ${messageText}\n\n`;
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
  
  // Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle share page export (DOM scraping - no API available)
  if (request.action === 'exportSharePage') {
    console.log('Export share page request received:', request);

    try {
      const data = scrapeSharePage();
      console.log('Share page scraped successfully:', data);

      let content, filename, type;
      const safeName = (data.name || data.uuid).replace(/[<>:"/\\|?*]/g, '_');

      switch (request.format) {
        case 'markdown':
          content = convertShareToMarkdown(data, request.includeMetadata);
          filename = `claude-share-${safeName}.md`;
          type = 'text/markdown';
          break;
        case 'text':
          content = convertShareToText(data, request.includeMetadata);
          filename = `claude-share-${safeName}.txt`;
          type = 'text/plain';
          break;
        default:
          content = JSON.stringify(data, null, 2);
          filename = `claude-share-${safeName}.json`;
          type = 'application/json';
      }

      console.log('Downloading file:', filename);
      downloadFile(content, filename, type);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Export share page error:', error);
      sendResponse({
        success: false,
        error: error.message,
        details: error.stack
      });
    }

    return true;
  }

  if (request.action === 'exportConversation') {
    console.log('Export conversation request received:', request);
    
    fetchConversation(request.orgId, request.conversationId)
      .then(data => {
        console.log('Conversation data fetched successfully:', data);
        
        // Infer model if null
        data.model = inferModel(data);
        
        let content, filename, type;
        
        switch (request.format) {
          case 'markdown':
            content = convertToMarkdown(data, request.includeMetadata);
            filename = `claude-conversation-${data.name || request.conversationId}.md`;
            type = 'text/markdown';
            break;
          case 'text':
            content = convertToText(data, request.includeMetadata);
            filename = `claude-conversation-${data.name || request.conversationId}.txt`;
            type = 'text/plain';
            break;
          default:
            content = JSON.stringify(data, null, 2);
            filename = `claude-conversation-${data.name || request.conversationId}.json`;
            type = 'application/json';
        }
        
        console.log('Downloading file:', filename);
        downloadFile(content, filename, type);
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Export conversation error:', error);
        sendResponse({ 
          success: false, 
          error: error.message,
          details: error.stack 
        });
      });
    
    return true;
  }
    
      if (request.action === 'exportAllConversations') {
    console.log('Export all conversations request received:', request);
    
    fetchAllConversations(request.orgId)
      .then(async conversations => {
        console.log(`Fetched ${conversations.length} conversations`);
        
        if (request.format === 'json') {
          // For JSON, export as a single file with all conversations
          const filename = `claude-all-conversations-${new Date().toISOString().split('T')[0]}.json`;
          console.log('Downloading all conversations as JSON:', filename);
          downloadFile(JSON.stringify(conversations, null, 2), filename);
          sendResponse({ success: true, count: conversations.length });
        } else {
          // For other formats, create individual files
          let count = 0;
          let errors = [];
          
          for (const conv of conversations) {
            try {
              console.log(`Fetching full conversation ${count + 1}/${conversations.length}: ${conv.uuid}`);
              const fullConv = await fetchConversation(request.orgId, conv.uuid);
              
              // Infer model if null
              fullConv.model = inferModel(fullConv);
              
              let content, filename, type;
              
              if (request.format === 'markdown') {
                content = convertToMarkdown(fullConv, request.includeMetadata);
                filename = `claude-${conv.name || conv.uuid}.md`;
                type = 'text/markdown';
              } else {
                content = convertToText(fullConv, request.includeMetadata);
                filename = `claude-${conv.name || conv.uuid}.txt`;
                type = 'text/plain';
              }
              
              downloadFile(content, filename, type);
              count++;
              
              // Add a small delay to avoid overwhelming the API
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
              console.error(`Failed to export conversation ${conv.uuid}:`, error);
              errors.push(`${conv.name || conv.uuid}: ${error.message}`);
            }
          }
          
          if (errors.length > 0) {
            console.warn('Some conversations failed to export:', errors);
            sendResponse({ 
              success: true, 
              count, 
              warnings: `Exported ${count}/${conversations.length} conversations. Some failed: ${errors.join('; ')}` 
            });
          } else {
            sendResponse({ success: true, count });
          }
        }
      })
      .catch(error => {
        console.error('Export all conversations error:', error);
        sendResponse({ 
          success: false, 
          error: error.message,
          details: error.stack 
        });
      });
    
    return true;
  }
  });