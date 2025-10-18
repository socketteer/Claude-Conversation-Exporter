/**
 * Integration tests for content script functionality
 */

import { describe, it, expect } from 'vitest';
import { convertToMarkdown, convertToText, generateFilename, inferModel } from '../utils';
import {
  mockConversation,
  mockConversationWithNullModel,
  mockConversationWithBranches,
} from './mockData';

describe('Content Script Integration', () => {
  describe('Full export workflow', () => {
    it('should process a conversation through full export pipeline', () => {
      // Infer model
      const modelName = inferModel(mockConversation);
      expect(modelName).toBe('claude-3-5-sonnet-20241022');

      // Convert to different formats
      const markdown = convertToMarkdown(mockConversation, true);
      const text = convertToText(mockConversation, true);

      expect(markdown).toContain('# Test Conversation');
      expect(text).toContain('Test Conversation');

      // Generate filenames
      const mdFilename = generateFilename(
        mockConversation.name,
        'markdown',
        mockConversation.uuid
      );
      const txtFilename = generateFilename(
        mockConversation.name,
        'text',
        mockConversation.uuid
      );

      expect(mdFilename).toBe('test_conversation_conv-123.md');
      expect(txtFilename).toBe('test_conversation_conv-123.txt');
    });

    it('should handle conversations with null model', () => {
      // Infer model when null
      const modelName = inferModel(mockConversationWithNullModel);
      expect(modelName).toBe('claude-3-5-sonnet-20240620');

      // Update conversation with inferred model
      const updatedConversation = {
        ...mockConversationWithNullModel,
        model: modelName,
      };

      // Convert to markdown
      const markdown = convertToMarkdown(updatedConversation, true);
      expect(markdown).toContain('**Model:** claude-3-5-sonnet-20240620');
    });

    it('should correctly handle branched conversations', () => {
      // Get the current branch
      const markdown = convertToMarkdown(mockConversationWithBranches, true);

      // Should only include messages from current branch
      expect(markdown).toContain('Root message');
      expect(markdown).toContain('Branch A response');
      expect(markdown).toContain('Continuing branch A');

      // Should not include branch B
      expect(markdown).not.toContain('Branch B response');
    });
  });

  describe('Format conversion consistency', () => {
    it('should include the same messages in all formats', () => {
      const markdown = convertToMarkdown(mockConversation, false);
      const text = convertToText(mockConversation, false);

      // Check that key content appears in both
      expect(markdown).toContain('Hello, Claude!');
      expect(text).toContain('Hello, Claude!');

      expect(markdown).toContain('Hello! How can I help you today?');
      expect(text).toContain('Hello! How can I help you today?');

      expect(markdown).toContain('Can you explain TypeScript?');
      expect(text).toContain('Can you explain TypeScript?');
    });

    it('should handle metadata consistently across formats', () => {
      const markdownWithMeta = convertToMarkdown(mockConversation, true);
      const markdownWithoutMeta = convertToMarkdown(mockConversation, false);
      const textWithMeta = convertToText(mockConversation, true);
      const textWithoutMeta = convertToText(mockConversation, false);

      // With metadata
      expect(markdownWithMeta).toContain('**Model:**');
      expect(textWithMeta).toContain('Model:');

      // Without metadata
      expect(markdownWithoutMeta).not.toContain('**Model:**');
      expect(textWithoutMeta).not.toContain('Model:');
    });
  });

  describe('Filename generation', () => {
    it('should generate unique filenames for different formats', () => {
      const jsonFile = generateFilename('Test', 'json', 'id-123');
      const mdFile = generateFilename('Test', 'markdown', 'id-123');
      const txtFile = generateFilename('Test', 'text', 'id-123');

      expect(jsonFile).toBe('test_id-123.json');
      expect(mdFile).toBe('test_id-123.md');
      expect(txtFile).toBe('test_id-123.txt');

      // Filenames should be different
      const filenames = new Set([jsonFile, mdFile, txtFile]);
      expect(filenames.size).toBe(3);
    });

    it('should handle edge cases in conversation names', () => {
      const emptyName = generateFilename('', 'json', 'id-123');
      const specialChars = generateFilename('Test!@#$', 'json', 'id-123');
      const unicode = generateFilename('Test 测试', 'json', 'id-123');

      expect(emptyName).toMatch(/^.*_id-123\.json$/);
      expect(specialChars).toMatch(/^[a-z0-9_]+_id-123\.json$/);
      expect(unicode).toMatch(/^[a-z0-9_]+_id-123\.json$/);
    });
  });

  describe('Model inference edge cases', () => {
    it('should handle various date ranges correctly', () => {
      const testCases = [
        { date: '2023-12-31T23:59:59Z', expected: 'claude-3-sonnet-20240229' },
        { date: '2024-01-01T00:00:00Z', expected: 'claude-3-sonnet-20240229' },
        { date: '2024-06-20T00:00:00Z', expected: 'claude-3-5-sonnet-20240620' },
        { date: '2024-10-22T00:00:00Z', expected: 'claude-3-5-sonnet-20241022' },
        { date: '2025-02-29T00:00:00Z', expected: 'claude-3-7-sonnet-20250219' },
        { date: '2030-01-01T00:00:00Z', expected: 'claude-sonnet-4-5-20250929' },
      ];

      testCases.forEach(({ date, expected }) => {
        const conversation = {
          ...mockConversationWithNullModel,
          created_at: date,
          model: null,
        };
        const result = inferModel(conversation);
        expect(result).toBe(expected);
      });
    });
  });
});
