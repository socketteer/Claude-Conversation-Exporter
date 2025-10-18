/**
 * Background script for Claude Conversation Exporter
 * Handles extension lifecycle events and content script injection
 */

import type { ExtensionMessage, ExtensionResponse } from './types';

/**
 * Handle extension installation
 */
browser.runtime.onInstalled.addListener(() => async () => {
  console.log('Claude Conversation Exporter installed');

  // Inject content script into already-open Claude.ai tabs
  try {
    const tabs = await browser.tabs.query({ url: 'https://claude.ai/*' });

    for (const tab of tabs) {
      if (tab.id) {
        try {
          await browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js'],
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
browser.runtime.onMessage.addListener(
  (
    request: ExtensionMessage,
    _sender: browser.runtime.MessageSender
  ): Promise<ExtensionResponse> | boolean => {
    if (request.action === 'ensureContentScript') {
      return (async () => {
        try {
          const tabs = await browser.tabs.query({
            active: true,
            currentWindow: true,
          });

          const activeTab = tabs[0];
          if (activeTab?.id) {
            await browser.scripting.executeScript({
              target: { tabId: activeTab.id },
              files: ['content.js'],
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
