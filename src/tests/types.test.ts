/**
 * Unit tests for types.ts
 * Tests type guards and type validation
 */

import { describe, it, expect } from 'vitest';
import type {
  Conversation,
  ChatMessage,
  ConversationListItem,
  ExportFormat,
  ExtensionMessage,
  MessageContent,
} from '../types';

describe('Type definitions', () => {
  it('should accept valid ChatMessage', () => {
    const message: ChatMessage = {
      uuid: 'test-uuid',
      sender: 'human',
      content: [{ text: 'Hello' }],
      parent_message_uuid: null,
      created_at: '2024-10-01T10:00:00Z',
    };

    expect(message.uuid).toBe('test-uuid');
    expect(message.sender).toBe('human');
  });

  it('should accept valid ChatMessage with text field', () => {
    const message: ChatMessage = {
      uuid: 'test-uuid',
      sender: 'assistant',
      text: 'Hello from old format',
      parent_message_uuid: 'parent-id',
      created_at: '2024-10-01T10:00:00Z',
    };

    expect(message.text).toBe('Hello from old format');
  });

  it('should accept valid MessageContent', () => {
    const content: MessageContent = {
      text: 'Test message',
      type: 'text',
    };

    expect(content.text).toBe('Test message');
    expect(content.type).toBe('text');
  });

  it('should accept valid Conversation', () => {
    const conversation: Conversation = {
      uuid: 'conv-123',
      name: 'Test',
      created_at: '2024-10-01T10:00:00Z',
      updated_at: '2024-10-01T10:01:00Z',
      model: 'claude-3-5-sonnet-20241022',
      chat_messages: [],
      current_leaf_message_uuid: 'leaf-id',
    };

    expect(conversation.uuid).toBe('conv-123');
    expect(conversation.model).toBe('claude-3-5-sonnet-20241022');
  });

  it('should accept Conversation with null model', () => {
    const conversation: Conversation = {
      uuid: 'conv-123',
      name: 'Test',
      created_at: '2024-10-01T10:00:00Z',
      updated_at: '2024-10-01T10:01:00Z',
      model: null,
      chat_messages: [],
      current_leaf_message_uuid: 'leaf-id',
    };

    expect(conversation.model).toBeNull();
  });

  it('should accept valid ConversationListItem', () => {
    const item: ConversationListItem = {
      uuid: 'conv-list-1',
      name: 'Test Item',
      created_at: '2024-10-01T10:00:00Z',
      updated_at: '2024-10-01T10:01:00Z',
      model: 'claude-3-5-sonnet-20241022',
      is_starred: true,
    };

    expect(item.uuid).toBe('conv-list-1');
    expect(item.is_starred).toBe(true);
  });

  it('should accept valid ExportFormat values', () => {
    const json: ExportFormat = 'json';
    const markdown: ExportFormat = 'markdown';
    const text: ExportFormat = 'text';

    expect(json).toBe('json');
    expect(markdown).toBe('markdown');
    expect(text).toBe('text');
  });

  it('should accept valid exportConversation message', () => {
    const message: ExtensionMessage = {
      action: 'exportConversation',
      conversationId: 'conv-123',
      orgId: 'org-456',
      format: 'json',
      includeMetadata: true,
    };

    expect(message.action).toBe('exportConversation');
    expect(message.format).toBe('json');
  });

  it('should accept valid exportAllConversations message', () => {
    const message: ExtensionMessage = {
      action: 'exportAllConversations',
      orgId: 'org-456',
      format: 'markdown',
      includeMetadata: false,
    };

    expect(message.action).toBe('exportAllConversations');
    expect(message.format).toBe('markdown');
  });

  it('should accept valid ensureContentScript message', () => {
    const message: ExtensionMessage = {
      action: 'ensureContentScript',
    };

    expect(message.action).toBe('ensureContentScript');
  });

  it('should accept valid fetchConversations message', () => {
    const message: ExtensionMessage = {
      action: 'fetchConversations',
      orgId: 'org-456',
    };

    expect(message.action).toBe('fetchConversations');
  });

  it('should accept valid fetchConversation message', () => {
    const message: ExtensionMessage = {
      action: 'fetchConversation',
      orgId: 'org-456',
      conversationId: 'conv-123',
    };

    expect(message.action).toBe('fetchConversation');
    expect(message.conversationId).toBe('conv-123');
  });
});
