// Load saved settings
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['organizationId'], (result) => {
    if (result.organizationId) {
      document.getElementById('orgId').value = result.organizationId;
      showStatus('status', 'Organization ID loaded from saved settings', 'success');
      setTimeout(() => hideStatus('status'), 2000);
    }
  });
});

// Save settings
document.getElementById('saveBtn').addEventListener('click', () => {
  const orgId = document.getElementById('orgId').value.trim();

  if (!orgId) {
    showStatus('status', 'Please enter an Organization ID', 'error');
    return;
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(orgId)) {
    showStatus('status', 'Invalid Organization ID format. It should be a UUID like: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'error');
    return;
  }

  chrome.storage.sync.set({ organizationId: orgId }, () => {
    showStatus('status', 'Settings saved successfully!', 'success');
  });
});

// Test connection
document.getElementById('testBtn').addEventListener('click', async () => {
  const orgId = document.getElementById('orgId').value.trim();

  if (!orgId) {
    showStatus('testStatus', 'Please save an Organization ID first', 'error');
    return;
  }

  showStatus('testStatus', 'Testing connection...', 'success');

  try {
    const response = await fetch(`https://claude.ai/api/organizations/${orgId}/chat_conversations`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (response.ok) {
      const data = await response.json();
      showStatus('testStatus', `Success! Found ${data.length} conversations.`, 'success');
    } else if (response.status === 401) {
      showStatus('testStatus', 'Not authenticated. Please make sure you are logged into Claude.ai', 'error');
    } else if (response.status === 403) {
      showStatus('testStatus', 'Access denied. The Organization ID might be incorrect.', 'error');
    } else {
      showStatus('testStatus', `Connection failed with status: ${response.status}`, 'error');
    }
  } catch (error) {
    showStatus('testStatus', `Connection error: ${error.message}`, 'error');
  }
});

// Helper functions
function showStatus(elementId, message, type) {
  const statusEl = document.getElementById(elementId);
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

function hideStatus(elementId) {
  const statusEl = document.getElementById(elementId);
  statusEl.className = 'status';
}
