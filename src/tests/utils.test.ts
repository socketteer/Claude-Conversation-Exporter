/**
 * Unit tests for utils.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  inferModel,
  getCurrentBranch,
  convertToMarkdown,
  convertToText,
  generateFilename,
  downloadFile,
} from '../utils';
import {
  mockConversation,
  mockConversationWithNullModel,
  mockConversationOldFormat,
  mockConversationWithBranches,
  mockConversationListItemWithNullModel,
} from './mockData';

describe('inferModel', () => {
  it('should return the model if it is not null', () => {
    const result = inferModel(mockConversation);
    expect(result).toBe('claude-3-5-sonnet-20241022');
  });

  it('should infer claude-3-5-sonnet-20240620 for dates in June-October 2024', () => {
    const result = inferModel(mockConversationWithNullModel);
    expect(result).toBe('claude-3-5-sonnet-20240620');
  });

  it('should infer claude-3-sonnet-20240229 for dates in early 2024', () => {
    const result = inferModel(mockConversationOldFormat);
    expect(result).toBe('claude-3-sonnet-20240229');
  });

  it('should infer claude-3-sonnet-20240229 for dates before 2024', () => {
    const conversation = {
      ...mockConversationWithNullModel,
      created_at: '2023-12-01T10:00:00Z',
      model: null,
    };
    const result = inferModel(conversation);
    expect(result).toBe('claude-3-sonnet-20240229');
  });

  it('should work with ConversationListItem', () => {
    const result = inferModel(mockConversationListItemWithNullModel);
    expect(result).toBe('claude-3-sonnet-20240229');
  });

  it('should infer newest model for future dates', () => {
    const conversation = {
      ...mockConversationWithNullModel,
      created_at: '2026-01-01T10:00:00Z',
      model: null,
    };
    const result = inferModel(conversation);
    expect(result).toBe('claude-sonnet-4-5-20250929');
  });
});

describe('getCurrentBranch', () => {
  it('should return all messages in the current branch', () => {
    const result = getCurrentBranch(mockConversation);
    expect(result).toHaveLength(4);
    expect(result[0]?.uuid).toBe('msg-1');
    expect(result[1]?.uuid).toBe('msg-2');
    expect(result[2]?.uuid).toBe('msg-3');
    expect(result[3]?.uuid).toBe('msg-4');
  });

  it('should return only the current branch when there are multiple branches', () => {
    const result = getCurrentBranch(mockConversationWithBranches);
    expect(result).toHaveLength(3);
    expect(result[0]?.uuid).toBe('root');
    expect(result[1]?.uuid).toBe('branch-a');
    expect(result[2]?.uuid).toBe('branch-a-child');
  });

  it('should return empty array when chat_messages is undefined', () => {
    const conversation = {
      ...mockConversation,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      chat_messages: undefined as any,
    };
    const result = getCurrentBranch(conversation);
    expect(result).toEqual([]);
  });

  it('should return empty array when current_leaf_message_uuid is undefined', () => {
    const conversation = {
      ...mockConversation,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      current_leaf_message_uuid: undefined as any,
    };
    const result = getCurrentBranch(conversation);
    expect(result).toEqual([]);
  });

  it('should handle messages with old text format', () => {
    const result = getCurrentBranch(mockConversationOldFormat);
    expect(result).toHaveLength(2);
    expect(result[0]?.uuid).toBe('msg-old-1');
    expect(result[1]?.uuid).toBe('msg-old-2');
  });
});

describe('convertToMarkdown', () => {
  it('should convert conversation to markdown with metadata', () => {
    const result = convertToMarkdown(mockConversation, true);

    expect(result).toContain('# Test Conversation');
    expect(result).toContain('**Created:**');
    expect(result).toContain('**Updated:**');
    expect(result).toContain('**Model:** claude-3-5-sonnet-20241022');
    expect(result).toContain('**You**:');
    expect(result).toContain('**Claude**:');
    expect(result).toContain('Hello, Claude!');
    expect(result).toContain('Hello! How can I help you today?');
  });

  it('should convert conversation to markdown without metadata', () => {
    const result = convertToMarkdown(mockConversation, false);

    expect(result).toContain('# Test Conversation');
    expect(result).not.toContain('**Created:**');
    expect(result).not.toContain('**Updated:**');
    expect(result).not.toContain('**Model:**');
    expect(result).toContain('**You**:');
    expect(result).toContain('**Claude**:');
  });

  it('should handle conversation with old text format', () => {
    const result = convertToMarkdown(mockConversationOldFormat, false);

    expect(result).toContain('Hello from old format!');
    expect(result).toContain('Hi there! This is the old message format.');
  });

  it('should infer model when null', () => {
    const result = convertToMarkdown(mockConversationWithNullModel, true);

    expect(result).toContain('**Model:** claude-3-5-sonnet-20240620');
  });

  it('should handle untitled conversations', () => {
    const conversation = {
      ...mockConversation,
      name: '',
    };
    const result = convertToMarkdown(conversation, false);

    expect(result).toContain('# Untitled Conversation');
  });
});

describe('convertToText', () => {
  it('should convert conversation to text with metadata', () => {
    const result = convertToText(mockConversation, true);

    expect(result).toContain('Test Conversation');
    expect(result).toContain('Created:');
    expect(result).toContain('Updated:');
    expect(result).toContain('Model: claude-3-5-sonnet-20241022');
    expect(result).toContain('Human: Hello, Claude!');
    expect(result).toContain('Assistant: Hello! How can I help you today?');
  });

  it('should convert conversation to text without metadata', () => {
    const result = convertToText(mockConversation, false);

    expect(result).not.toContain('Created:');
    expect(result).not.toContain('Updated:');
    expect(result).not.toContain('Model:');
    expect(result).toContain('Human: Hello, Claude!');
    expect(result).toContain('Assistant: Hello! How can I help you today?');
  });

  it('should abbreviate sender labels after first occurrence', () => {
    const result = convertToText(mockConversation, false);

    expect(result).toContain('Human: Hello, Claude!');
    expect(result).toContain('Assistant: Hello! How can I help you today?');
    expect(result).toContain('H: Can you explain TypeScript?');
    expect(result).toContain('A: TypeScript is a strongly typed programming language');
  });

  it('should handle conversation with old text format', () => {
    const result = convertToText(mockConversationOldFormat, false);

    expect(result).toContain('Hello from old format!');
    expect(result).toContain('Hi there! This is the old message format.');
  });

  it('should handle untitled conversations', () => {
    const conversation = {
      ...mockConversation,
      name: '',
    };
    const result = convertToText(conversation, true);

    expect(result).toContain('Untitled Conversation');
  });
});

describe('generateFilename', () => {
  it('should generate filename for JSON format', () => {
    const result = generateFilename('Test Conversation', 'json', 'conv-123');
    expect(result).toBe('test_conversation_conv-123.json');
  });

  it('should generate filename for markdown format', () => {
    const result = generateFilename('My Test', 'markdown', 'abc-456');
    expect(result).toBe('my_test_abc-456.md');
  });

  it('should generate filename for text format', () => {
    const result = generateFilename('Hello World', 'text', 'xyz-789');
    expect(result).toBe('hello_world_xyz-789.txt');
  });

  it('should sanitize special characters', () => {
    const result = generateFilename('Test!@#$%^&*()_+[]{}', 'json', 'id-123');
    expect(result).toBe('test_________________id-123.json');
  });

  it('should truncate long names to 50 characters', () => {
    const longName = 'a'.repeat(100);
    const result = generateFilename(longName, 'json', 'id-123');
    expect(result.length).toBeLessThanOrEqual(62); // 50 + '_' + 8 char id + '.json'
  });

  it('should work without conversation ID', () => {
    const result = generateFilename('Test', 'json');
    expect(result).toBe('test.json');
  });

  it('should convert to lowercase', () => {
    const result = generateFilename('UPPERCASE TEST', 'json', 'id-123');
    expect(result).toBe('uppercase_test_id-123.json');
  });
});

describe('downloadFile', () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Set up DOM mocks
    document.body.innerHTML = '';

    // Mock URL.createObjectURL and URL.revokeObjectURL
    mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  it('should create and download a file with default type', () => {
    const content = '{"test": "data"}';
    const filename = 'test.json';

    downloadFile(content, filename);

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should create and download a file with custom type', () => {
    const content = '# Test';
    const filename = 'test.md';
    const type = 'text/markdown';

    downloadFile(content, filename, type);

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should create and trigger anchor element click', () => {
    const content = 'test content';
    const filename = 'test.txt';

    // Spy on appendChild and removeChild
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    downloadFile(content, filename, 'text/plain');

    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
  });
});
