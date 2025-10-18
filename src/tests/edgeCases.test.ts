/**
 * Edge case tests for the Claude Conversation Exporter
 * Tests unusual scenarios and boundary conditions
 */

import { describe, it, expect } from 'vitest';
import {
  inferModel,
  getCurrentBranch,
  convertToMarkdown,
  convertToText,
  generateFilename,
} from '../utils';
import type { Conversation } from '../types';

describe('Edge Cases', () => {
  describe('Empty and minimal data', () => {
    it('should handle conversation with empty chat_messages array', () => {
      const conversation: Conversation = {
        uuid: 'empty-conv',
        name: 'Empty Conversation',
        created_at: '2024-10-01T10:00:00Z',
        updated_at: '2024-10-01T10:00:00Z',
        model: 'claude-3-5-sonnet-20241022',
        chat_messages: [],
        current_leaf_message_uuid: '',
      };

      const branch = getCurrentBranch(conversation);
      expect(branch).toEqual([]);

      const markdown = convertToMarkdown(conversation, false);
      expect(markdown).toContain('# Empty Conversation');

      const text = convertToText(conversation, false);
      expect(text).toBe('');
    });

    it('should handle message with empty content array', () => {
      const conversation: Conversation = {
        uuid: 'empty-content',
        name: 'Empty Content',
        created_at: '2024-10-01T10:00:00Z',
        updated_at: '2024-10-01T10:00:00Z',
        model: 'claude-3-5-sonnet-20241022',
        chat_messages: [
          {
            uuid: 'msg-1',
            sender: 'human',
            content: [],
            parent_message_uuid: null,
            created_at: '2024-10-01T10:00:00Z',
          },
        ],
        current_leaf_message_uuid: 'msg-1',
      };

      const markdown = convertToMarkdown(conversation, false);
      expect(markdown).toContain('**You**:');
    });

    it('should handle message with content but no text', () => {
      const conversation: Conversation = {
        uuid: 'no-text',
        name: 'No Text',
        created_at: '2024-10-01T10:00:00Z',
        updated_at: '2024-10-01T10:00:00Z',
        model: 'claude-3-5-sonnet-20241022',
        chat_messages: [
          {
            uuid: 'msg-1',
            sender: 'human',
            content: [{ type: 'image' }],
            parent_message_uuid: null,
            created_at: '2024-10-01T10:00:00Z',
          },
        ],
        current_leaf_message_uuid: 'msg-1',
      };

      const markdown = convertToMarkdown(conversation, false);
      expect(markdown).toBeDefined();
    });
  });

  describe('Complex branching scenarios', () => {
    it('should handle orphaned messages', () => {
      const conversation: Conversation = {
        uuid: 'orphaned',
        name: 'Orphaned Messages',
        created_at: '2024-10-01T10:00:00Z',
        updated_at: '2024-10-01T10:00:00Z',
        model: 'claude-3-5-sonnet-20241022',
        chat_messages: [
          {
            uuid: 'root',
            sender: 'human',
            content: [{ text: 'Root' }],
            parent_message_uuid: null,
            created_at: '2024-10-01T10:00:00Z',
          },
          {
            uuid: 'orphan',
            sender: 'assistant',
            content: [{ text: 'Orphaned message' }],
            parent_message_uuid: 'nonexistent',
            created_at: '2024-10-01T10:01:00Z',
          },
        ],
        current_leaf_message_uuid: 'orphan',
      };

      const branch = getCurrentBranch(conversation);
      // Should only contain the orphaned message since its parent doesn't exist
      expect(branch.length).toBe(1);
      expect(branch[0]?.uuid).toBe('orphan');
    });
  });

  describe('Filename edge cases', () => {
    it('should handle very long conversation names', () => {
      const longName = 'a'.repeat(1000);
      const filename = generateFilename(longName, 'json', 'id-123');

      // Should be truncated
      expect(filename.length).toBeLessThan(100);
      expect(filename).toMatch(/\.json$/);
    });

    it('should handle conversation name with only special characters', () => {
      const specialName = '!@#$%^&*()[]{}';
      const filename = generateFilename(specialName, 'json', 'id-123');

      expect(filename).toMatch(/^[a-z0-9_]+_id-123\.json$/);
    });

    it('should handle empty conversation name', () => {
      const filename = generateFilename('', 'json', 'id-123');

      expect(filename).toBe('_id-123.json');
    });

    it('should handle conversation name with unicode', () => {
      const unicodeName = '你好世界 🌍 مرحبا';
      const filename = generateFilename(unicodeName, 'json', 'id-123');

      // Should only contain allowed characters
      expect(filename).toMatch(/^[a-z0-9_]+_id-123\.json$/);
    });

    it('should handle undefined conversation ID', () => {
      const filename = generateFilename('Test', 'json', undefined);

      expect(filename).toBe('test.json');
    });
  });

  describe('Model inference edge cases', () => {
    it('should handle very old dates', () => {
      const conversation: Conversation = {
        uuid: 'old',
        name: 'Old',
        created_at: '2020-01-01T10:00:00Z',
        updated_at: '2020-01-01T10:00:00Z',
        model: null,
        chat_messages: [],
        current_leaf_message_uuid: '',
      };

      const model = inferModel(conversation);
      expect(model).toBe('claude-3-sonnet-20240229');
    });

    it('should handle future dates far in the future', () => {
      const conversation: Conversation = {
        uuid: 'future',
        name: 'Future',
        created_at: '2100-01-01T10:00:00Z',
        updated_at: '2100-01-01T10:00:00Z',
        model: null,
        chat_messages: [],
        current_leaf_message_uuid: '',
      };

      const model = inferModel(conversation);
      // Should return the latest model
      expect(model).toBe('claude-sonnet-4-5-20250929');
    });

    it('should handle invalid date strings gracefully', () => {
      const conversation: Conversation = {
        uuid: 'invalid',
        name: 'Invalid',
        created_at: 'not-a-date',
        updated_at: 'not-a-date',
        model: null,
        chat_messages: [],
        current_leaf_message_uuid: '',
      };

      // Should not crash
      const model = inferModel(conversation);
      expect(model).toBeDefined();
    });

    it('should handle dates exactly on model transition boundaries', () => {
      const testCases = [
        { date: '2024-06-20T00:00:00.000Z', expected: 'claude-3-5-sonnet-20240620' },
        { date: '2024-10-22T00:00:00.000Z', expected: 'claude-3-5-sonnet-20241022' },
        { date: '2025-02-29T00:00:00.000Z', expected: 'claude-3-7-sonnet-20250219' },
      ];

      testCases.forEach(({ date, expected }) => {
        const conversation: Conversation = {
          uuid: 'boundary',
          name: 'Boundary',
          created_at: date,
          updated_at: date,
          model: null,
          chat_messages: [],
          current_leaf_message_uuid: '',
        };

        const model = inferModel(conversation);
        expect(model).toBe(expected);
      });
    });
  });

  describe('Content conversion edge cases', () => {
    it('should handle messages with mixed old and new format', () => {
      const conversation: Conversation = {
        uuid: 'mixed',
        name: 'Mixed Format',
        created_at: '2024-10-01T10:00:00Z',
        updated_at: '2024-10-01T10:00:00Z',
        model: 'claude-3-5-sonnet-20241022',
        chat_messages: [
          {
            uuid: 'msg-1',
            sender: 'human',
            text: 'Old format',
            parent_message_uuid: null,
            created_at: '2024-10-01T10:00:00Z',
          },
          {
            uuid: 'msg-2',
            sender: 'assistant',
            content: [{ text: 'New format' }],
            parent_message_uuid: 'msg-1',
            created_at: '2024-10-01T10:01:00Z',
          },
        ],
        current_leaf_message_uuid: 'msg-2',
      };

      const markdown = convertToMarkdown(conversation, false);
      expect(markdown).toContain('Old format');
      expect(markdown).toContain('New format');
    });

    it('should handle messages without created_at timestamp', () => {
      const conversation: Conversation = {
        uuid: 'no-timestamp',
        name: 'No Timestamp',
        created_at: '2024-10-01T10:00:00Z',
        updated_at: '2024-10-01T10:00:00Z',
        model: 'claude-3-5-sonnet-20241022',
        chat_messages: [
          {
            uuid: 'msg-1',
            sender: 'human',
            content: [{ text: 'Message' }],
            parent_message_uuid: null,
            created_at: '',
          },
        ],
        current_leaf_message_uuid: 'msg-1',
      };

      const markdown = convertToMarkdown(conversation, true);
      expect(markdown).toBeDefined();
    });

    it('should handle very long message content', () => {
      const longText = 'a'.repeat(10000); // Reduced from 100000 for faster tests
      const conversation: Conversation = {
        uuid: 'long',
        name: 'Long',
        created_at: '2024-10-01T10:00:00Z',
        updated_at: '2024-10-01T10:00:00Z',
        model: 'claude-3-5-sonnet-20241022',
        chat_messages: [
          {
            uuid: 'msg-1',
            sender: 'human',
            content: [{ text: longText }],
            parent_message_uuid: null,
            created_at: '2024-10-01T10:00:00Z',
          },
        ],
        current_leaf_message_uuid: 'msg-1',
      };

      const markdown = convertToMarkdown(conversation, false);
      expect(markdown.length).toBeGreaterThan(longText.length);
    });
  });
});
