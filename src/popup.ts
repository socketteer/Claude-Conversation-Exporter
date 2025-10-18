/**
 * Popup script for Claude Conversation Exporter
 * Handles the extension popup UI and user interactions
 */

import type { ExtensionResponse } from './types';

/**
 * Get organization ID from storage
 */
async function getOrgId(): Promise<string | undefined> {
  const result = await browser.storage.sync.get(['organizationId']);
  return result['organizationId'] as string | undefined;
}

/**
 * Get current conversation ID from active tab URL
 */
async function getCurrentConversationId(): Promise<string | null> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab?.url) {
    return null;
  }

  const url = new URL(tab.url);
  const match = /\/chat\/([a-f0-9-]+)/.exec(url.pathname);
  return match?.[1] ?? null;
}

/**
 * Show status message to user
 */
function showStatus(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
  const statusEl = document.getElementById('status');
  if (!statusEl) return;

  statusEl.className = `status ${type}`;
  statusEl.textContent = message;

  if (type === 'success') {
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = '';
    }, 3000);
  }
}

/**
 * Get HTML element by ID with type checking
 */
function getElement<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Check if org ID is configured on popup load
 */
async function initializePopup(): Promise<void> {
  const orgId = await getOrgId();

  if (!orgId) {
    const setupNotice = getElement('setupNotice');
    if (setupNotice) {
      setupNotice.style.display = 'block';
    }

    const exportCurrentBtn = getElement<HTMLButtonElement>('exportCurrent');
    const exportAllBtn = getElement<HTMLButtonElement>('exportAll');

    if (exportCurrentBtn) exportCurrentBtn.disabled = true;
    if (exportAllBtn) exportAllBtn.disabled = true;
  }
}

/**
 * Handle options link click
 */
function setupOptionsLink(): void {
  const openOptionsBtn = getElement('openOptions');
  openOptionsBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    void browser.runtime.openOptionsPage();
  });
}

/**
 * Handle export current conversation
 */
async function handleExportCurrent(): Promise<void> {
  const button = getElement<HTMLButtonElement>('exportCurrent');
  if (!button) return;

  button.disabled = true;
  showStatus('Fetching conversation...', 'info');

  try {
    const orgId = await getOrgId();
    const conversationId = await getCurrentConversationId();

    if (!orgId) {
      throw new Error(
        'Organization ID not configured. Click the setup link above to configure it.'
      );
    }

    if (!conversationId) {
      throw new Error(
        'Could not detect conversation ID. Make sure you are on a Claude.ai conversation page.'
      );
    }

    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    // Check if we're on Claude.ai
    if (!tab?.url?.includes('claude.ai')) {
      throw new Error('Please navigate to a Claude.ai conversation page first.');
    }

    if (!tab.id) {
      throw new Error('Could not identify active tab.');
    }

    const formatSelect = getElement<HTMLSelectElement>('format');
    const metadataCheck = getElement<HTMLInputElement>('includeMetadata');

    const response = (await browser.tabs.sendMessage(tab.id, {
      action: 'exportConversation',
      conversationId,
      orgId,
      format: formatSelect?.value ?? 'json',
      includeMetadata: metadataCheck?.checked ?? true,
    })) as ExtensionResponse;

    if (response?.success) {
      showStatus('Conversation exported successfully!', 'success');
    } else {
      const errorMsg = response?.error ?? 'Export failed';
      console.error('Export failed:', errorMsg, response?.details);
      showStatus(errorMsg, 'error');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    showStatus(message, 'error');
  } finally {
    button.disabled = false;
  }
}

/**
 * Handle browse conversations button
 */
function handleBrowseConversations(): void {
  void browser.tabs.create({ url: browser.runtime.getURL('browse.html') });
}

/**
 * Handle export all conversations
 */
async function handleExportAll(): Promise<void> {
  const button = getElement<HTMLButtonElement>('exportAll');
  if (!button) return;

  button.disabled = true;
  showStatus('Fetching all conversations...', 'info');

  try {
    const orgId = await getOrgId();

    if (!orgId) {
      throw new Error(
        'Organization ID not configured. Click the setup link above to configure it.'
      );
    }

    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    if (!tab?.id) {
      throw new Error('Could not identify active tab.');
    }

    const formatSelect = getElement<HTMLSelectElement>('format');
    const metadataCheck = getElement<HTMLInputElement>('includeMetadata');

    const response = (await browser.tabs.sendMessage(tab.id, {
      action: 'exportAllConversations',
      orgId,
      format: formatSelect?.value ?? 'json',
      includeMetadata: metadataCheck?.checked ?? true,
    })) as ExtensionResponse;

    if (response?.success) {
      if (response.warnings) {
        showStatus(response.warnings, 'info');
      } else {
        showStatus(`Exported ${response.count ?? 0} conversations!`, 'success');
      }
    } else {
      const errorMsg = response?.error ?? 'Export failed';
      console.error('Export failed:', errorMsg, response?.details);
      showStatus(errorMsg, 'error');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    showStatus(message, 'error');
  } finally {
    button.disabled = false;
  }
}

/**
 * Initialize popup when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
  void initializePopup();
  setupOptionsLink();

  const exportCurrentBtn = getElement('exportCurrent');
  const browseBtn = getElement('browseConversations');
  const exportAllBtn = getElement('exportAll');

  exportCurrentBtn?.addEventListener('click', () => void handleExportCurrent);
  browseBtn?.addEventListener('click', handleBrowseConversations);
  exportAllBtn?.addEventListener('click', () => void handleExportAll);
});
