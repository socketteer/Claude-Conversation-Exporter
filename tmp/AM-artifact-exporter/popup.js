// Get DOM elements
const exportBtn = document.getElementById('exportBtn');
const progress = document.getElementById('progress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const status = document.getElementById('status');
const settingsLink = document.getElementById('settingsLink');

// Open settings page
settingsLink.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Show status message
function showStatus(message, type) {
  status.textContent = message;
  status.className = `status visible ${type}`;
}

// Hide status message
function hideStatus() {
  status.className = 'status';
}

// Show progress
function showProgress() {
  progress.className = 'progress visible';
}

// Hide progress
function hideProgress() {
  progress.className = 'progress';
}

// Update progress bar
function updateProgress(current, total, conversationName) {
  const percentage = Math.round((current / total) * 100);
  progressFill.style.width = `${percentage}%`;
  progressText.textContent = `Processing ${current}/${total}: ${conversationName}`;
}

// Listen for progress updates from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'exportProgress') {
    updateProgress(request.current, request.total, request.conversationName);
  }
});

// Handle export button click
exportBtn.addEventListener('click', async () => {
  try {
    hideStatus();

    // Get organization ID from storage
    const result = await chrome.storage.sync.get(['organizationId']);
    const orgId = result.organizationId;

    if (!orgId) {
      showStatus('Please configure your Organization ID in settings first', 'error');
      return;
    }

    // Disable button and show progress
    exportBtn.disabled = true;
    exportBtn.textContent = 'Exporting...';
    showProgress();
    progressFill.style.width = '0%';
    progressText.textContent = 'Starting export...';

    // Send export request to background script
    chrome.runtime.sendMessage(
      {
        action: 'exportArtifacts',
        orgId: orgId
      },
      (response) => {
        // Re-enable button
        exportBtn.disabled = false;
        exportBtn.textContent = 'Export All Artifacts';
        hideProgress();

        if (response.success) {
          showStatus(
            `Success! Exported ${response.artifactCount} artifacts from ${response.conversationCount}/${response.totalConversations} conversations.`,
            'success'
          );
          exportBtn.className = 'button success';
          setTimeout(() => {
            exportBtn.className = 'button';
          }, 3000);
        } else {
          showStatus(`Error: ${response.error}`, 'error');
        }
      }
    );
  } catch (error) {
    console.error('Export error:', error);
    showStatus(`Error: ${error.message}`, 'error');
    exportBtn.disabled = false;
    exportBtn.textContent = 'Export All Artifacts';
    hideProgress();
  }
});

// Check if org ID is configured on popup open
chrome.storage.sync.get(['organizationId'], (result) => {
  if (!result.organizationId) {
    showStatus('Please configure your Organization ID in settings', 'info');
  }
});
