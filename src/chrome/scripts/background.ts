// @ts-nocheck - File is compiled by Vite, not included in tsconfig.json
/**
 * Chrome Background Service Worker
 * Handles extension lifecycle, content script injection, and message routing
 */

import type { ExtensionMessage, ExtensionResponse } from '../../types';

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener(() => async () => {
  console.log('Claude Conversation Exporter installed');

  // Inject content script into already-open Claude.ai tabs
  try {
    const tabs = await chrome.tabs.query({ url: 'https://claude.ai/*' });

    for (const tab of tabs) {
      if (tab.id) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['src/chrome/scripts/content.js'],
          });
        } catch (err) {
          console.log('Could not inject into tab', tab.id, err);
        }
      }
    }
  } catch (err) {
    console.error('Error querying or injecting tabs:', err);
  }
});

/**
 * Handle messages from popup or other extension components
 */
chrome.runtime.onMessage.addListener(
  // @ts-expect-error - Chrome types expect unknown parameters, but we type them for safety
  (
    request: ExtensionMessage,
    _sender: chrome.runtime.MessageSender
  ): Promise<ExtensionResponse> | boolean => {
    if (request.action === 'ensureContentScript') {
      return (async () => {
        try {
          const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });

          const activeTab = tabs[0];
          if (activeTab?.id) {
            await chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              files: ['src/chrome/scripts/content.js'],
            });

            return { success: true };
          }

          return {
            success: false,
            error: 'No active tab found',
          };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          };
        }
      })();
    }

    // Return false to indicate no response will be sent
    return false;
  }
);
