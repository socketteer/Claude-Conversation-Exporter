// @ts-nocheck - File is compiled by Vite, not included in tsconfig.json
/**
 * Popup script for Claude Conversation Exporter
 * Handles the extension popup UI and user interactions
 */

/// <reference path="../chrome.d.ts" />

import type { ExtensionResponse } from '../../types';

/**
 * Get organization ID from storage
 */
async function getOrgId(): Promise<string | undefined> {
  const result = await chrome.storage.sync.get(['organizationId']);
  return result.organizationId as string | undefined;
}

/**
 * Get current conversation ID from active tab URL
 */
async function getCurrentConversationId(): Promise<string | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
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
    void chrome.runtime.openOptionsPage();
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
        'Could not detect a conversation ID. Make sure you are on a Claude.ai conversation page.'
      );
    }

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
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

    try {
      const response = (await chrome.tabs.sendMessage(tab.id, {
        action: 'exportConversation',
        conversationId,
        orgId,
        format: formatSelect?.value ?? 'json',
        includeMetadata: metadataCheck?.checked ?? true,
      })) as ExtensionResponse;

      if (response?.success) {
        showStatus('Conversation exported successfully!', 'success');
      } else if (response?.error) {
        // Only show error if there's an actual error message
        console.error('Export failed:', response.error, response?.details);
        showStatus(response.error, 'error');
      } else {
        // No explicit success or error - assume download was triggered
        showStatus('Download started...', 'success');
      }
    } catch (sendError) {
      // Handle "Could not establish connection" error
      const errorMsg = sendError instanceof Error ? sendError.message : String(sendError);
      if (errorMsg.includes('connection') || errorMsg.includes('Receiving end')) {
        throw new Error(
          'Cannot connect to page. Please ensure you are on a Claude.ai conversation page (https://claude.ai/chat/...) and refresh if needed.'
        );
      }
      throw sendError;
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
  void chrome.tabs.create({ url: chrome.runtime.getURL('src/chrome/scripts/browse.html') });
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

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    // Check if we're on Claude.ai
    if (!tab?.url?.includes('claude.ai')) {
      throw new Error(
        'Please navigate to a Claude.ai page first, or use "Browse All Conversations" instead.'
      );
    }

    if (!tab.id) {
      throw new Error('Could not identify active tab.');
    }

    const formatSelect = getElement<HTMLSelectElement>('format');
    const metadataCheck = getElement<HTMLInputElement>('includeMetadata');

    try {
      const response = (await chrome.tabs.sendMessage(tab.id, {
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
      } else if (response?.error) {
        // Only show error if there's an actual error message
        console.error('Export failed:', response.error, response?.details);
        showStatus(response.error, 'error');
      } else {
        // No explicit success or error - assume download was triggered
        showStatus('Download started...', 'success');
      }
    } catch (sendError) {
      // Handle "Could not establish connection" error
      const errorMsg = sendError instanceof Error ? sendError.message : String(sendError);
      if (errorMsg.includes('connection') || errorMsg.includes('Receiving end')) {
        throw new Error(
          'Cannot connect to page. This feature requires a Claude.ai page (https://claude.ai/chat/... or similar). Try "Browse All Conversations" instead - it works from any tab.'
        );
      }
      throw sendError;
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

  exportCurrentBtn?.addEventListener('click', () => void handleExportCurrent());
  browseBtn?.addEventListener('click', handleBrowseConversations);
  exportAllBtn?.addEventListener('click', () => void handleExportAll());
});
