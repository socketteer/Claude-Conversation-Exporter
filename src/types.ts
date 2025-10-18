/**
 * Type definitions for Claude Conversation Exporter
 */

/**
 * Message content type - can have text or other content types
 */
export interface MessageContent {
  text?: string;
  type?: string;
  [key: string]: unknown;
}

/**
 * Individual chat message in a conversation
 */
export interface ChatMessage {
  uuid: string;
  sender: 'human' | 'assistant';
  content?: MessageContent[];
  text?: string; // Fallback for older message format
  parent_message_uuid: string | null;
  created_at: string;
  updated_at?: string;
  [key: string]: unknown; // Allow additional properties from API
}

/**
 * Full conversation data from Claude API
 */
export interface Conversation {
  uuid: string;
  name: string;
  created_at: string;
  updated_at: string;
  model: string | null;
  chat_messages: ChatMessage[];
  current_leaf_message_uuid: string;
  is_starred?: boolean;
  [key: string]: unknown; // Allow additional properties from API
}

/**
 * Simplified conversation list item (from /chat_conversations endpoint)
 */
export interface ConversationListItem {
  uuid: string;
  name: string;
  created_at: string;
  updated_at: string;
  model: string | null;
  is_starred?: boolean;
  [key: string]: unknown;
}

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'markdown' | 'text';

/**
 * Extension settings stored in browser.storage
 */
export interface ExtensionSettings {
  organizationId?: string;
}

/**
 * Message types for communication between extension components
 */
export type ExtensionMessage =
  | {
      action: 'exportConversation';
      conversationId: string;
      orgId: string;
      format: ExportFormat;
      includeMetadata: boolean;
    }
  | {
      action: 'exportAllConversations';
      orgId: string;
      format: ExportFormat;
      includeMetadata: boolean;
    }
  | {
      action: 'ensureContentScript';
    }
  | {
      action: 'fetchConversations';
      orgId: string;
    }
  | {
      action: 'fetchConversation';
      orgId: string;
      conversationId: string;
    };

/**
 * Response types for extension messages
 */
export interface ExtensionResponse {
  success: boolean;
  error?: string;
  details?: unknown;
  count?: number;
  warnings?: string;
  data?: unknown;
}

/**
 * Model timeline entry for inferring null models
 */
export interface ModelTimelineEntry {
  date: Date;
  model: string;
}

/**
 * Progress callback for bulk operations
 */
export interface ProgressInfo {
  current: number;
  total: number;
  conversationName?: string;
  status?: 'processing' | 'success' | 'error';
}

export type ProgressCallback = (progress: ProgressInfo) => void;

/**
 * Export result for individual conversation
 */
export interface ExportResult {
  success: boolean;
  conversationId: string;
  conversationName: string;
  error?: string;
}

/**
 * Bulk export summary
 */
export interface BulkExportSummary {
  total: number;
  successful: number;
  failed: number;
  failedConversations?: ExportResult[];
}
