// Get organization ID from storage
async function getOrgId() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['organizationId'], (result) => {
      resolve(result.organizationId);
    });
  });
}

// Check if org ID is configured on popup load
document.addEventListener('DOMContentLoaded', async () => {
  const orgId = await getOrgId();
  if (!orgId) {
    document.getElementById('setupNotice').style.display = 'block';
    document.getElementById('exportCurrent').disabled = true;
    document.getElementById('exportAll').disabled = true;
  }

  // Handle checkbox dependencies
  const includeChatsCheckbox = document.getElementById('includeChats');
  const includeThinkingCheckbox = document.getElementById('includeThinking');
  const includeMetadataCheckbox = document.getElementById('includeMetadata');
  const includeArtifactsCheckbox = document.getElementById('includeArtifacts');

  function updateCheckboxStates() {
    const chatsEnabled = includeChatsCheckbox.checked;

    // Disable thinking, metadata and inline artifacts when chats is unchecked
    includeThinkingCheckbox.disabled = !chatsEnabled;
    includeMetadataCheckbox.disabled = !chatsEnabled;
    includeArtifactsCheckbox.disabled = !chatsEnabled;

    // Optionally uncheck them when disabled
    if (!chatsEnabled) {
      includeThinkingCheckbox.checked = false;
      includeMetadataCheckbox.checked = false;
      includeArtifactsCheckbox.checked = false;
    }
  }

  includeChatsCheckbox.addEventListener('change', updateCheckboxStates);
  updateCheckboxStates(); // Initialize on load
});

// Handle options link click
document.getElementById('openOptions').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
  
  // Get current conversation ID from URL
  async function getCurrentConversationId() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    const match = url.pathname.match(/\/chat\/([a-f0-9-]+)/);
    return match ? match[1] : null;
  }
  
  // Show status message
  function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    statusEl.className = `status ${type}`;
    statusEl.textContent = message;
    
    if (type === 'success') {
      setTimeout(() => {
        statusEl.textContent = '';
        statusEl.className = '';
      }, 3000);
    }
  }
  
  // Export current conversation
document.getElementById('exportCurrent').addEventListener('click', async () => {
  const button = document.getElementById('exportCurrent');
  button.disabled = true;
  showStatus('Fetching conversation...', 'info');
  
  try {
    const orgId = await getOrgId();
    const conversationId = await getCurrentConversationId();
    
    if (!orgId) {
      throw new Error('Organization ID not configured. Click the setup link above to configure it.');
    }
    if (!conversationId) {
      throw new Error('Could not detect conversation ID. Make sure you are on a Claude.ai conversation page.');
    }
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if we're on Claude.ai
    if (!tab.url.includes('claude.ai')) {
      throw new Error('Please navigate to a Claude.ai conversation page first.');
    }
      
          chrome.tabs.sendMessage(tab.id, {
      action: 'exportConversation',
      conversationId,
      orgId,
      format: document.getElementById('format').value,
      includeChats: document.getElementById('includeChats').checked,
      includeThinking: document.getElementById('includeThinking').checked,
      includeMetadata: document.getElementById('includeMetadata').checked,
      includeArtifacts: document.getElementById('includeArtifacts').checked,
      extractArtifacts: document.getElementById('extractArtifacts').checked,
      artifactFormat: document.getElementById('artifactFormat').value,
      flattenArtifacts: document.getElementById('flattenArtifacts').checked
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Chrome runtime error:', chrome.runtime.lastError);
        showStatus(`Error: ${chrome.runtime.lastError.message}`, 'error');
        button.disabled = false;
        return;
      }
      
      if (response?.success) {
        showStatus('Conversation exported successfully!', 'success');
      } else {
        const errorMsg = response?.error || 'Export failed';
        console.error('Export failed:', errorMsg, response?.details);
        showStatus(errorMsg, 'error');
      }
      button.disabled = false;
    });
    } catch (error) {
      showStatus(error.message, 'error');
      button.disabled = false;
    }
  });
  
  // Browse conversations
  document.getElementById('browseConversations').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('browse.html') });
  });

  // Export all conversations
  document.getElementById('exportAll').addEventListener('click', async () => {
    const button = document.getElementById('exportAll');
    button.disabled = true;
    showStatus('Fetching all conversations...', 'info');
    
    try {
      const orgId = await getOrgId();
      
          if (!orgId) {
      throw new Error('Organization ID not configured. Click the setup link above to configure it.');
      }
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
          chrome.tabs.sendMessage(tab.id, {
      action: 'exportAllConversations',
      orgId,
      format: document.getElementById('format').value,
      includeChats: document.getElementById('includeChats').checked,
      includeMetadata: document.getElementById('includeMetadata').checked,
      includeArtifacts: document.getElementById('includeArtifacts').checked,
      extractArtifacts: document.getElementById('extractArtifacts').checked,
      artifactFormat: document.getElementById('artifactFormat').value,
      flattenArtifacts: document.getElementById('flattenArtifacts').checked
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Chrome runtime error:', chrome.runtime.lastError);
        showStatus(`Error: ${chrome.runtime.lastError.message}`, 'error');
        button.disabled = false;
        return;
      }
      
      if (response?.success) {
        if (response.warnings) {
          showStatus(response.warnings, 'info');
        } else {
          showStatus(`Exported ${response.count} conversations!`, 'success');
        }
      } else {
        const errorMsg = response?.error || 'Export failed';
        console.error('Export failed:', errorMsg, response?.details);
        showStatus(errorMsg, 'error');
      }
      button.disabled = false;
    });
    } catch (error) {
      showStatus(error.message, 'error');
      button.disabled = false;
    }
  });