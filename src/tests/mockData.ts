/**
 * Mock data for testing
 */

import type { Conversation, ChatMessage, ConversationListItem } from '../types';

export const mockChatMessages: ChatMessage[] = [
  {
    uuid: 'msg-1',
    sender: 'human',
    content: [{ text: 'Hello, Claude!' }],
    parent_message_uuid: null,
    created_at: '2024-10-01T10:00:00Z',
  },
  {
    uuid: 'msg-2',
    sender: 'assistant',
    content: [{ text: 'Hello! How can I help you today?' }],
    parent_message_uuid: 'msg-1',
    created_at: '2024-10-01T10:00:05Z',
  },
  {
    uuid: 'msg-3',
    sender: 'human',
    content: [{ text: 'Can you explain TypeScript?' }],
    parent_message_uuid: 'msg-2',
    created_at: '2024-10-01T10:01:00Z',
  },
  {
    uuid: 'msg-4',
    sender: 'assistant',
    content: [
      {
        text: 'TypeScript is a strongly typed programming language that builds on JavaScript.',
      },
    ],
    parent_message_uuid: 'msg-3',
    created_at: '2024-10-01T10:01:10Z',
  },
];

export const mockConversation: Conversation = {
  uuid: 'conv-123',
  name: 'Test Conversation',
  created_at: '2024-10-01T10:00:00Z',
  updated_at: '2024-10-01T10:01:10Z',
  model: 'claude-3-5-sonnet-20241022',
  chat_messages: mockChatMessages,
  current_leaf_message_uuid: 'msg-4',
};

export const mockConversationWithNullModel: Conversation = {
  uuid: 'conv-456',
  name: 'Old Conversation',
  created_at: '2024-08-15T10:00:00Z',
  updated_at: '2024-08-15T10:01:10Z',
  model: null,
  chat_messages: mockChatMessages,
  current_leaf_message_uuid: 'msg-4',
};

export const mockConversationOldFormat: Conversation = {
  uuid: 'conv-789',
  name: 'Legacy Conversation',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:01:10Z',
  model: null,
  chat_messages: [
    {
      uuid: 'msg-old-1',
      sender: 'human',
      text: 'Hello from old format!',
      parent_message_uuid: null,
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      uuid: 'msg-old-2',
      sender: 'assistant',
      text: 'Hi there! This is the old message format.',
      parent_message_uuid: 'msg-old-1',
      created_at: '2024-01-15T10:00:05Z',
    },
  ],
  current_leaf_message_uuid: 'msg-old-2',
};

export const mockConversationWithBranches: Conversation = {
  uuid: 'conv-branched',
  name: 'Branched Conversation',
  created_at: '2024-10-01T10:00:00Z',
  updated_at: '2024-10-01T10:05:00Z',
  model: 'claude-3-5-sonnet-20241022',
  chat_messages: [
    {
      uuid: 'root',
      sender: 'human',
      content: [{ text: 'Root message' }],
      parent_message_uuid: null,
      created_at: '2024-10-01T10:00:00Z',
    },
    {
      uuid: 'branch-a',
      sender: 'assistant',
      content: [{ text: 'Branch A response' }],
      parent_message_uuid: 'root',
      created_at: '2024-10-01T10:01:00Z',
    },
    {
      uuid: 'branch-b',
      sender: 'assistant',
      content: [{ text: 'Branch B response' }],
      parent_message_uuid: 'root',
      created_at: '2024-10-01T10:02:00Z',
    },
    {
      uuid: 'branch-a-child',
      sender: 'human',
      content: [{ text: 'Continuing branch A' }],
      parent_message_uuid: 'branch-a',
      created_at: '2024-10-01T10:03:00Z',
    },
  ],
  current_leaf_message_uuid: 'branch-a-child',
};

export const mockConversationListItem: ConversationListItem = {
  uuid: 'conv-list-1',
  name: 'List Item Conversation',
  created_at: '2024-10-01T10:00:00Z',
  updated_at: '2024-10-01T10:01:10Z',
  model: 'claude-3-5-sonnet-20241022',
  is_starred: true,
};

export const mockConversationListItemWithNullModel: ConversationListItem = {
  uuid: 'conv-list-2',
  name: 'Old List Item',
  created_at: '2024-03-01T10:00:00Z',
  updated_at: '2024-03-01T10:01:10Z',
  model: null,
  is_starred: false,
};
