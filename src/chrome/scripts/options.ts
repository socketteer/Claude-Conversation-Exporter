// @ts-nocheck - File is compiled by Vite, not included in tsconfig.json
/**
 * Options page script for Claude Conversation Exporter
 * Handles extension configuration and settings
 */

type StatusType = 'success' | 'error' | 'info';

/**
 * Get HTML element by ID with type checking
 */
function getElement<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Show status message
 */
function showStatus(elementId: string, message: string, type: StatusType): void {
  const statusEl = getElement(elementId);
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

/**
 * Hide status message
 */
function hideStatus(elementId: string): void {
  const statusEl = getElement(elementId);
  if (!statusEl) return;

  statusEl.className = 'status';
  statusEl.textContent = '';
}

/**
 * Load saved settings on page load
 */
async function loadSettings(): Promise<void> {
  try {
    const result = await chrome.storage.sync.get(['organizationId']);
    const orgId = result['organizationId'] as string | undefined;

    if (orgId) {
      const orgIdInput = getElement<HTMLInputElement>('orgId');
      if (orgIdInput) {
        orgIdInput.value = orgId;
      }
      showStatus('status', 'Organization ID loaded from saved settings', 'success');
      setTimeout(() => hideStatus('status'), 2000);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Save settings
 */
async function saveSettings(): Promise<void> {
  const orgIdInput = getElement<HTMLInputElement>('orgId');
  if (!orgIdInput) return;

  const orgId = orgIdInput.value.trim();

  if (!orgId) {
    showStatus('status', 'Please enter an Organization ID', 'error');
    return;
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(orgId)) {
    showStatus(
      'status',
      'Invalid Organization ID format. It should be a UUID like: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      'error'
    );
    return;
  }

  try {
    await chrome.storage.sync.set({ organizationId: orgId });
    showStatus('status', 'Settings saved successfully!', 'success');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    showStatus('status', `Error saving settings: ${errorMsg}`, 'error');
  }
}

/**
 * Test connection to Claude API
 */
async function testConnection(): Promise<void> {
  const orgIdInput = getElement<HTMLInputElement>('orgId');
  if (!orgIdInput) return;

  const orgId = orgIdInput.value.trim();

  if (!orgId) {
    showStatus('testStatus', 'Please save an Organization ID first', 'error');
    return;
  }

  showStatus('testStatus', 'Testing connection...', 'info');

  try {
    const response = await fetch(
      `https://claude.ai/api/organizations/${orgId}/chat_conversations`,
      {
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = (await response.json()) as unknown[];
      showStatus('testStatus', `Success! Found ${data.length} conversations.`, 'success');
    } else if (response.status === 401) {
      showStatus(
        'testStatus',
        'Not authenticated. Please make sure you are logged into Claude.ai',
        'error'
      );
    } else if (response.status === 403) {
      showStatus(
        'testStatus',
        'Access denied. The Organization ID might be incorrect.',
        'error'
      );
    } else {
      showStatus(
        'testStatus',
        `Connection failed with status: ${response.status}`,
        'error'
      );
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    showStatus('testStatus', `Connection error: ${errorMsg}`, 'error');
  }
}

/**
 * Initialize options page
 */
document.addEventListener('DOMContentLoaded', () => {
  // Load saved settings
  void loadSettings();

  // Set up event listeners
  const saveBtn = getElement('saveBtn');
  const testBtn = getElement('testBtn');

  saveBtn?.addEventListener('click', () => void saveSettings());
  testBtn?.addEventListener('click', () => void testConnection());
});
