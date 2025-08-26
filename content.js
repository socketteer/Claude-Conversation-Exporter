// Note: Organization ID is now stored in extension settings
// Users need to configure it in the extension options page

// Default model timeline for null models
const DEFAULT_MODEL_TIMELINE = [
  { date: new Date('2024-01-01'), model: 'claude-3-sonnet-20240229' }, // Before June 20, 2024
  { date: new Date('2024-06-20'), model: 'claude-3-5-sonnet-20240620' }, // Starting June 20, 2024
  { date: new Date('2024-10-22'), model: 'claude-3-5-sonnet-20241022' }, // Starting October 22, 2024
  { date: new Date('2025-02-29'), model: 'claude-3-7-sonnet-20250219' }, // Starting February 29, 2025
  { date: new Date('2025-05-14'), model: 'claude-sonnet-4-20250514' } // Starting May 14, 2025
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
    markdown += `**Model:** ${data.model}\n\n`;
    markdown += '---\n\n';
  }
  
  // Get only the current branch messages
  const branchMessages = getCurrentBranch(data);
  
  for (const message of branchMessages) {
    const sender = message.sender === 'human' ? '**You**' : '**Claude**';
    markdown += `${sender}:\n\n`;
    
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