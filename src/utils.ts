/**
 * Shared utility functions for Claude Conversation Exporter
 */

import type {
  Conversation,
  ChatMessage,
  ConversationListItem,
  ModelTimelineEntry,
} from './types';

/**
 * Default model timeline for inferring null models
 */
const DEFAULT_MODEL_TIMELINE: ModelTimelineEntry[] = [
  { date: new Date('2024-01-01'), model: 'claude-3-sonnet-20240229' },
  { date: new Date('2024-06-20'), model: 'claude-3-5-sonnet-20240620' },
  { date: new Date('2024-10-22'), model: 'claude-3-5-sonnet-20241022' },
  { date: new Date('2025-02-29'), model: 'claude-3-7-sonnet-20250219' },
  { date: new Date('2025-05-14'), model: 'claude-sonnet-4-20250514' },
  { date: new Date('2025-09-29'), model: 'claude-sonnet-4-5-20250929' },
];

/**
 * Infer model for conversations with null model based on creation date
 */
export function inferModel(conversation: Conversation | ConversationListItem): string {
  if (conversation.model) {
    return conversation.model;
  }

  const conversationDate = new Date(conversation.created_at);

  // Find the appropriate model based on the conversation date
  // Start from the end and work backwards to find the right period
  for (let i = DEFAULT_MODEL_TIMELINE.length - 1; i >= 0; i--) {
    const entry = DEFAULT_MODEL_TIMELINE[i];
    if (entry && conversationDate >= entry.date) {
      return entry.model;
    }
  }

  // If date is before all known dates, use the first model
  return DEFAULT_MODEL_TIMELINE[0]?.model ?? 'claude-3-sonnet-20240229';
}

/**
 * Reconstruct the current branch from the message tree
 * Traces back from the current leaf message to the root
 */
export function getCurrentBranch(data: Conversation): ChatMessage[] {
  if (!data.chat_messages || !data.current_leaf_message_uuid) {
    return [];
  }

  // Create a map of UUID to message for quick lookup
  const messageMap = new Map<string, ChatMessage>();
  data.chat_messages.forEach((msg) => {
    messageMap.set(msg.uuid, msg);
  });

  // Trace back from the current leaf to the root
  const branch: ChatMessage[] = [];
  let currentUuid: string | null = data.current_leaf_message_uuid;

  while (currentUuid && messageMap.has(currentUuid)) {
    const message = messageMap.get(currentUuid);
    if (!message) break;

    branch.unshift(message); // Add to beginning to maintain order
    currentUuid = message.parent_message_uuid;

    // Stop if we hit the root (parent UUID that doesn't exist in our messages)
    if (currentUuid && !messageMap.has(currentUuid)) {
      break;
    }
  }

  return branch;
}

/**
 * Extract text content from a message, handling both old and new formats
 */
function getMessageText(message: ChatMessage): string {
  let messageText = '';

  if (message.content) {
    for (const content of message.content) {
      if (content.text) {
        messageText += content.text;
      }
    }
  } else if (message.text) {
    messageText = message.text;
  }

  return messageText;
}

/**
 * Convert conversation data to Markdown format
 */
export function convertToMarkdown(data: Conversation, includeMetadata: boolean): string {
  let markdown = `# ${data.name || 'Untitled Conversation'}\n\n`;

  if (includeMetadata) {
    markdown += `**Created:** ${new Date(data.created_at).toLocaleString()}\n`;
    markdown += `**Updated:** ${new Date(data.updated_at).toLocaleString()}\n`;
    markdown += `**Model:** ${inferModel(data)}\n\n`;
    markdown += '---\n\n';
  }

  // Get only the current branch messages
  const branchMessages = getCurrentBranch(data);

  for (const message of branchMessages) {
    const sender = message.sender === 'human' ? '**You**' : '**Claude**';
    markdown += `${sender}:\n\n`;

    const messageText = getMessageText(message);
    if (messageText) {
      markdown += `${messageText}\n\n`;
    }

    if (includeMetadata && message.created_at) {
      markdown += `*${new Date(message.created_at).toLocaleString()}*\n\n`;
    }

    markdown += '---\n\n';
  }

  return markdown;
}

/**
 * Convert conversation data to plain text format
 */
export function convertToText(data: Conversation, includeMetadata: boolean): string {
  let text = '';

  // Add metadata header if requested
  if (includeMetadata) {
    text += `${data.name || 'Untitled Conversation'}\n`;
    text += `Created: ${new Date(data.created_at).toLocaleString()}\n`;
    text += `Updated: ${new Date(data.updated_at).toLocaleString()}\n`;
    text += `Model: ${inferModel(data)}\n\n`;
    text += '---\n\n';
  }

  // Get only the current branch messages
  const branchMessages = getCurrentBranch(data);

  // Use simplified format
  let humanSeen = false;
  let assistantSeen = false;

  for (const message of branchMessages) {
    const messageText = getMessageText(message);

    // Use full label on first occurrence, then abbreviate
    let senderLabel: string;
    if (message.sender === 'human') {
      senderLabel = humanSeen ? 'H' : 'Human';
      humanSeen = true;
    } else {
      senderLabel = assistantSeen ? 'A' : 'Assistant';
      assistantSeen = true;
    }

    text += `${senderLabel}: ${messageText}\n\n`;
  }

  return text.trim();
}

/**
 * Download a file to the user's computer
 */
export function downloadFile(
  content: string,
  filename: string,
  type = 'application/json'
): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate a safe filename from conversation name and format
 */
export function generateFilename(
  conversationName: string,
  format: string,
  conversationId?: string
): string {
  // Sanitize the conversation name for use in filename
  const safeName = conversationName
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .substring(0, 50);

  const extension = format === 'json' ? 'json' : format === 'markdown' ? 'md' : 'txt';
  const idPart = conversationId ? `_${conversationId.substring(0, 8)}` : '';

  return `${safeName}${idPart}.${extension}`;
}
