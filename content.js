// Note: Organization ID is now stored in extension settings
// Users need to configure it in the extension options page

// Default model timeline for null models
const DEFAULT_MODEL_TIMELINE = [
  { date: new Date('2024-01-01'), model: 'claude-3-sonnet-20240229' }, // Before June 20, 2024
  { date: new Date('2024-06-20'), model: 'claude-3-5-sonnet-20240620' }, // Starting June 20, 2024
  { date: new Date('2024-10-22'), model: 'claude-3-5-sonnet-20241022' }, // Starting October 22, 2024
  { date: new Date('2025-02-29'), model: 'claude-3-7-sonnet-20250219' }, // Starting February 29, 2025
  { date: new Date('2025-05-14'), model: 'claude-sonnet-4-20250514' }, // Starting May 14, 2025
  { date: new Date('2025-09-29'), model: 'claude-sonnet-4-5-20250929' } // Starting September 29, 2025
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
  // Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'exportConversation') {
    console.log('Export conversation request received:', request);
    
    fetchConversation(request.orgId, request.conversationId)
      .then(data => {
        console.log('Conversation data fetched successfully:', data);
        
        // Infer model if null
        data.model = inferModel(data);
        
        // Check if we need to extract artifacts to separate files
        if (request.extractArtifacts) {
          // Extract artifacts
          const artifactFiles = extractArtifactFiles(data);

          if (artifactFiles.length > 0) {
            // Create a ZIP with artifacts (and optionally conversation)
            const zip = new JSZip();

            // Add conversation file only if includeChats is true
            if (request.includeChats !== false) {
              let conversationContent, conversationFilename;
              switch (request.format) {
                case 'markdown':
                  conversationContent = convertToMarkdown(data, request.includeMetadata, request.conversationId, request.includeArtifacts);
                  conversationFilename = `${data.name || request.conversationId}.md`;
                  break;
                case 'text':
                  conversationContent = convertToText(data, request.includeMetadata, request.includeArtifacts);
                  conversationFilename = `${data.name || request.conversationId}.txt`;
                  break;
                default:
                  conversationContent = JSON.stringify(data, null, 2);
                  conversationFilename = `${data.name || request.conversationId}.json`;
              }

              zip.file(conversationFilename, conversationContent);
            }

            // Add artifact files to root or artifacts subfolder
            const artifactsFolder = request.includeChats !== false ? zip.folder('artifacts') : zip;
            for (const artifact of artifactFiles) {
              artifactsFolder.file(artifact.filename, artifact.content);
            }

            // Generate and download ZIP
            zip.generateAsync({ type: 'blob' }).then(blob => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${data.name || request.conversationId}.zip`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            });

            console.log(`Downloading ZIP with conversation and ${artifactFiles.length} artifact(s)`);
            sendResponse({ success: true });
          } else {
            // No artifacts found, just export conversation normally
            let content, filename, type;
            switch (request.format) {
              case 'markdown':
                content = convertToMarkdown(data, request.includeMetadata, request.conversationId, request.includeArtifacts);
                filename = `${data.name || request.conversationId}.md`;
                type = 'text/markdown';
                break;
              case 'text':
                content = convertToText(data, request.includeMetadata, request.includeArtifacts);
                filename = `${data.name || request.conversationId}.txt`;
                type = 'text/plain';
                break;
              default:
                content = JSON.stringify(data, null, 2);
                filename = `${data.name || request.conversationId}.json`;
                type = 'application/json';
            }
            console.log('No artifacts found. Downloading file:', filename);
            downloadFile(content, filename, type);
            sendResponse({ success: true });
          }
        } else {
          // Normal export without artifact extraction
          if (request.includeChats === false) {
            // If chats are disabled and we're not extracting artifacts, there's nothing to export
            console.log('No content to export (chats disabled, artifacts not extracted)');
            sendResponse({
              success: false,
              error: 'Nothing to export. Enable "Include conversation text" or "Artifacts nested".'
            });
          } else {
            let content, filename, type;
            switch (request.format) {
              case 'markdown':
                content = convertToMarkdown(data, request.includeMetadata, request.conversationId, request.includeArtifacts);
                filename = `${data.name || request.conversationId}.md`;
                type = 'text/markdown';
                break;
              case 'text':
                content = convertToText(data, request.includeMetadata, request.includeArtifacts);
                filename = `${data.name || request.conversationId}.txt`;
                type = 'text/plain';
                break;
              default:
                content = JSON.stringify(data, null, 2);
                filename = `${data.name || request.conversationId}.json`;
                type = 'application/json';
            }

            console.log('Downloading file:', filename);
            downloadFile(content, filename, type);
            sendResponse({ success: true });
          }
        }
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
        
        if (request.format === 'json' && !request.extractArtifacts) {
          // For JSON without artifact extraction, export as a single file
          const filename = `all-conversations-${new Date().toISOString().split('T')[0]}.json`;
          console.log('Downloading all conversations as JSON:', filename);
          downloadFile(JSON.stringify(conversations, null, 2), filename);
          sendResponse({ success: true, count: conversations.length });
        } else if (request.extractArtifacts) {
          // When extracting artifacts, always create a ZIP
          const zip = new JSZip();
          let processed = 0;
          let included = 0;
          let errors = [];

          for (const conv of conversations) {
            try {
              processed++;
              console.log(`Scanning conversation ${processed}/${conversations.length}: ${conv.name || conv.uuid}`);
              const fullConv = await fetchConversation(request.orgId, conv.uuid);

              // Infer model if null
              fullConv.model = inferModel(fullConv);

              // Extract artifacts first to check if this conversation should be included
              const artifactFiles = extractArtifactFiles(fullConv);

              // If chats are disabled and no artifacts, skip this conversation
              if (request.includeChats === false && artifactFiles.length === 0) {
                console.log(`  Skipping - no artifacts found (${processed}/${conversations.length} scanned, ${included} included)`);
                // Add a small delay to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
              }

              // Sanitize folder name
              const folderName = (conv.name || conv.uuid).replace(/[<>:"/\\|?*]/g, '_');
              const convFolder = zip.folder(folderName);

              // Add conversation file only if includeChats is true
              if (request.includeChats !== false) {
                let conversationContent, conversationFilename;
                if (request.format === 'markdown') {
                  conversationContent = convertToMarkdown(fullConv, request.includeMetadata, conv.uuid, request.includeArtifacts);
                  conversationFilename = `${folderName}.md`;
                } else if (request.format === 'text') {
                  conversationContent = convertToText(fullConv, request.includeMetadata, request.includeArtifacts);
                  conversationFilename = `${folderName}.txt`;
                } else {
                  conversationContent = JSON.stringify(fullConv, null, 2);
                  conversationFilename = `${folderName}.json`;
                }

                convFolder.file(conversationFilename, conversationContent);
              }

              // Add artifact files
              if (artifactFiles.length > 0) {
                const artifactsFolder = request.includeChats !== false ? convFolder.folder('artifacts') : convFolder;
                for (const artifact of artifactFiles) {
                  artifactsFolder.file(artifact.filename, artifact.content);
                }
              }

              included++;
              console.log(`  Added to export (${processed}/${conversations.length} scanned, ${included} included)`);

              // Add a small delay to avoid overwhelming the API
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
              console.error(`Failed to export conversation ${conv.uuid}:`, error);
              errors.push(`${conv.name || conv.uuid}: ${error.message}`);
            }
          }

          // Generate and download ZIP
          zip.generateAsync({ type: 'blob' }).then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `all-conversations-${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          });

          if (errors.length > 0) {
            console.warn('Some conversations failed to export:', errors);
            sendResponse({
              success: true,
              count: included,
              warnings: `Exported ${included}/${conversations.length} conversations. Some failed: ${errors.join('; ')}`
            });
          } else {
            sendResponse({ success: true, count: included });
          }
        } else {
          // For other formats without artifact extraction, create individual files
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
                content = convertToMarkdown(fullConv, request.includeMetadata, conv.uuid, request.includeArtifacts);
                filename = `${conv.name || conv.uuid}.md`;
                type = 'text/markdown';
              } else {
                content = convertToText(fullConv, request.includeMetadata, request.includeArtifacts);
                filename = `${conv.name || conv.uuid}.txt`;
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