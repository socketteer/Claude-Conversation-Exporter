// @ts-nocheck - File is compiled by Vite, not included in tsconfig.json
/**
 * Content script for Claude Conversation Exporter
 * Runs on claude.ai pages to handle conversation exports
 */

import type {
  Conversation,
  ConversationListItem,
  ExtensionMessage,
  ExtensionResponse,
  ExportFormat,
} from '../../types';
import {
  convertToMarkdown,
  convertToText,
  downloadFile,
  generateFilename,
  inferModel,
} from '../../utils';

/**
 * Fetch a single conversation from Claude API
 */
async function fetchConversation(
  orgId: string,
  conversationId: string
): Promise<Conversation> {
  const url = `https://claude.ai/api/organizations/${orgId}/chat_conversations/${conversationId}?tree=True&rendering_mode=messages&render_all_tools=true`;

  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch conversation: ${response.status}`);
  }

  return (await response.json()) as Conversation;
}

/**
 * Fetch all conversations from Claude API
 */
async function fetchAllConversations(orgId: string): Promise<ConversationListItem[]> {
  const url = `https://claude.ai/api/organizations/${orgId}/chat_conversations`;

  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch conversations: ${response.status}`);
  }

  return (await response.json()) as ConversationListItem[];
}

/**
 * Export a single conversation
 */
async function exportConversation(
  orgId: string,
  conversationId: string,
  format: ExportFormat,
  includeMetadata: boolean
): Promise<void> {
  console.log('Fetching conversation:', conversationId);
  const data = await fetchConversation(orgId, conversationId);

  console.log('Conversation data fetched successfully:', data);

  // Infer model if null
  const modelName = inferModel(data);
  data.model = modelName;

  let content: string;
  let filename: string;
  let type: string;

  switch (format) {
    case 'markdown':
      content = convertToMarkdown(data, includeMetadata);
      filename = generateFilename(data.name || 'untitled', 'markdown', data.uuid);
      type = 'text/markdown';
      break;
    case 'text':
      content = convertToText(data, includeMetadata);
      filename = generateFilename(data.name || 'untitled', 'text', data.uuid);
      type = 'text/plain';
      break;
    default:
      content = JSON.stringify(data, null, 2);
      filename = generateFilename(data.name || 'untitled', 'json', data.uuid);
      type = 'application/json';
  }

  console.log('Downloading file:', filename);
  downloadFile(content, filename, type);
}

/**
 * Export all conversations
 */
async function exportAllConversations(
  orgId: string,
  format: ExportFormat,
  includeMetadata: boolean
): Promise<{ count: number; warnings?: string }> {
  const conversations = await fetchAllConversations(orgId);
  console.log(`Fetched ${conversations.length} conversations`);

  if (format === 'json') {
    // For JSON, export as a single file with all conversations
    const filename = `claude-all-conversations-${
      new Date().toISOString().split('T')[0] ?? 'export'
    }.json`;
    console.log('Downloading all conversations as JSON:', filename);
    downloadFile(JSON.stringify(conversations, null, 2), filename, 'application/json');
    return { count: conversations.length };
  }

  // For other formats, create individual files
  let count = 0;
  const errors: string[] = [];

  for (const conv of conversations) {
    try {
      console.log(
        `Fetching full conversation ${count + 1}/${conversations.length}: ${conv.uuid}`
      );
      const fullConv = await fetchConversation(orgId, conv.uuid);

      // Infer model if null
      fullConv.model = inferModel(fullConv);

      let content: string;
      let filename: string;
      let type: string;

      if (format === 'markdown') {
        content = convertToMarkdown(fullConv, includeMetadata);
        filename = generateFilename(conv.name || 'untitled', 'markdown', conv.uuid);
        type = 'text/markdown';
      } else {
        content = convertToText(fullConv, includeMetadata);
        filename = generateFilename(conv.name || 'untitled', 'text', conv.uuid);
        type = 'text/plain';
      }

      downloadFile(content, filename, type);
      count++;

      // Add a small delay to avoid overwhelming the API
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to export conversation ${conv.uuid}:`, errorMsg);
      errors.push(`${conv.name || conv.uuid}: ${errorMsg}`);
    }
  }

  if (errors.length > 0) {
    console.warn('Some conversations failed to export:', errors);
    return {
      count,
      warnings: `Exported ${count}/${conversations.length} conversations. Some failed: ${errors.join('; ')}`,
    };
  }

  return { count };
}

/**
 * Handle messages from popup or background script
 */
chrome.runtime.onMessage.addListener(
  // @ts-expect-error - Chrome types expect unknown parameters, but we type them for safety
  (
    request: ExtensionMessage,
    _sender: chrome.runtime.MessageSender
  ): Promise<ExtensionResponse> | boolean => {
    if (request.action === 'exportConversation') {
      console.log('Export conversation request received:', request);

      return (async () => {
        try {
          await exportConversation(
            request.orgId,
            request.conversationId,
            request.format,
            request.includeMetadata
          );
          return { success: true };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          const errorStack = error instanceof Error ? error.stack : undefined;
          console.error('Export conversation error:', error);
          return {
            success: false,
            error: errorMsg,
            details: errorStack,
          };
        }
      })();
    }

    if (request.action === 'exportAllConversations') {
      console.log('Export all conversations request received:', request);

      return (async () => {
        try {
          const result = await exportAllConversations(
            request.orgId,
            request.format,
            request.includeMetadata
          );
          return {
            success: true,
            count: result.count,
            warnings: result.warnings,
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          const errorStack = error instanceof Error ? error.stack : undefined;
          console.error('Export all conversations error:', error);
          return {
            success: false,
            error: errorMsg,
            details: errorStack,
          };
        }
      })();
    }

    // Return false to indicate no response will be sent
    return false;
  }
);

console.log('Claude Conversation Exporter content script loaded');
