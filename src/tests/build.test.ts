/**
 * Build verification tests
 * These tests verify that the build process produces correct output
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'fs';
import { resolve } from 'path';

const DIST_FIREFOX = resolve(__dirname, '../../dist/firefox');
const DIST_CHROME = resolve(__dirname, '../../dist/chrome');

describe('Build Output Verification', () => {
  describe('Firefox Build', () => {
    it('should have all required files', () => {
      if (!existsSync(DIST_FIREFOX)) {
        console.warn('Firefox dist folder not found - run "pnpm build:firefox" first');
        return;
      }

      const requiredFiles = [
        'manifest.json',
        'background.js',
        'src/firefox/scripts/content.js',
        'src/firefox/scripts/popup.html',
        'src/firefox/scripts/popup.js',
        'src/firefox/scripts/popup-header.png',
        'src/firefox/scripts/options.html',
        'src/firefox/scripts/options.js',
        'src/firefox/scripts/browse.html',
        'src/firefox/scripts/browse.js',
        'src/content-styles.css',
        'src/icon16.png',
        'src/icon48.png',
        'src/icon128.png',
      ];

      for (const file of requiredFiles) {
        const filePath = resolve(DIST_FIREFOX, file);
        expect(existsSync(filePath), `${file} should exist`).toBe(true);
      }
    });

    it('should have a properly built content script (not a stub)', () => {
      if (!existsSync(DIST_FIREFOX)) {
        console.warn('Firefox dist folder not found - run "pnpm build:firefox" first');
        return;
      }

      const contentScriptPath = resolve(DIST_FIREFOX, 'src/firefox/scripts/content.js');
      if (!existsSync(contentScriptPath)) {
        throw new Error('Content script not found');
      }

      const stats = statSync(contentScriptPath);
      const content = readFileSync(contentScriptPath, 'utf-8');

      // Content script should be substantial (at least 3KB when minified)
      expect(stats.size).toBeGreaterThan(3000);

      // Should contain actual code, not just a dynamic import wrapper
      expect(content).not.toMatch(/^.*await import.*$/);
      expect(content).not.toBe(
        '(async()=>{await import(chrome.runtime.getURL("src/content.js"))})();'
      );

      // Should contain key functionality
      expect(content).toContain('browser.runtime.onMessage.addListener');
      expect(content).toContain('exportConversation');
      expect(content).toContain('exportAllConversations');
      expect(content).toContain('Claude Conversation Exporter content script loaded');
    });

    it('should have a valid manifest.json', () => {
      if (!existsSync(DIST_FIREFOX)) {
        console.warn('Firefox dist folder not found - run "pnpm build:firefox" first');
        return;
      }

      const manifestPath = resolve(DIST_FIREFOX, 'manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
        manifest_version: number;
        name: string;
        permissions?: string[];
        content_scripts?: { matches: string[]; js: string[] }[];
      };

      expect(manifest.manifest_version).toBe(2);
      expect(manifest.name).toBe('Claude Conversation Exporter');
      expect(manifest.permissions).toContain('storage');
      expect(manifest.content_scripts).toBeDefined();
      expect(manifest.content_scripts?.[0]?.matches).toContain('https://claude.ai/*');
      expect(manifest.content_scripts?.[0]?.js).toContain(
        'src/firefox/scripts/content.js'
      );
    });
  });

  describe('Chrome Build', () => {
    it('should have all required files when built', () => {
      if (!existsSync(DIST_CHROME)) {
        console.warn('Chrome dist folder not found - run "pnpm build:chrome" first');
        return;
      }

      const requiredFiles = [
        'manifest.json',
        'serviceWorker.js',
        'src/chrome/scripts/background.js',
        'src/chrome/scripts/popup.html',
        'src/chrome/scripts/popup.js',
        'src/chrome/scripts/popup-header.png',
        'src/chrome/scripts/options.html',
        'src/chrome/scripts/options.js',
        'src/chrome/scripts/browse.html',
        'src/chrome/scripts/browse.js',
        'src/chrome/scripts/content.js',
        'src/content-styles.css',
        'src/icon16.png',
        'src/icon48.png',
        'src/icon128.png',
      ];

      for (const file of requiredFiles) {
        const filePath = resolve(DIST_CHROME, file);
        expect(existsSync(filePath), `${file} should exist`).toBe(true);
      }
    });

    it('should have a valid manifest.json with MV3', () => {
      if (!existsSync(DIST_CHROME)) {
        console.warn('Chrome dist folder not found - run "pnpm build:chrome" first');
        return;
      }

      const manifestPath = resolve(DIST_CHROME, 'manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
        manifest_version: number;
        name: string;
        permissions?: string[];
        content_scripts?: { matches: string[]; js: string[] }[];
      };

      expect(manifest.manifest_version).toBe(3);
      expect(manifest.name).toBe('Claude Conversation Exporter');
      expect(manifest.permissions).toContain('storage');
      expect(manifest.content_scripts).toBeDefined();
      expect(manifest.content_scripts?.[0]?.matches).toContain('https://claude.ai/*');
      expect(manifest.content_scripts?.[0]?.js).toContain(
        'src/chrome/scripts/content.js'
      );
    });

    it('should have a properly built Chrome content script', () => {
      if (!existsSync(DIST_CHROME)) {
        console.warn('Chrome dist folder not found - run "pnpm build:chrome" first');
        return;
      }

      const contentScriptPath = resolve(DIST_CHROME, 'src/chrome/scripts/content.js');
      if (!existsSync(contentScriptPath)) {
        throw new Error('Content script not found');
      }

      const stats = statSync(contentScriptPath);
      const content = readFileSync(contentScriptPath, 'utf-8');

      // Content script should be substantial (at least 3KB when minified)
      expect(stats.size).toBeGreaterThan(3000);

      // Should contain actual code, not just a dynamic import wrapper
      expect(content).not.toMatch(/^.*await import.*$/);

      // Should use chrome.* API
      expect(content).toContain('chrome.runtime.onMessage');
      expect(content).toContain('exportConversation');
      expect(content).toContain('exportAllConversations');
    });
  });
});

describe('Source Code Quality', () => {
  it('should have TypeScript source files with proper typing', () => {
    const typesFile = resolve(__dirname, '../types.ts');
    const utilsFile = resolve(__dirname, '../utils.ts');
    const firefoxContentFile = resolve(__dirname, '../firefox/scripts/content.ts');
    const chromeContentFile = resolve(__dirname, '../chrome/scripts/content.ts');

    expect(existsSync(typesFile)).toBe(true);
    expect(existsSync(utilsFile)).toBe(true);
    expect(existsSync(firefoxContentFile)).toBe(true);
    expect(existsSync(chromeContentFile)).toBe(true);

    // Verify types file exports key types
    const typesContent = readFileSync(typesFile, 'utf-8');
    expect(typesContent).toContain('export interface Conversation');
    expect(typesContent).toContain('export interface ConversationListItem');
    expect(typesContent).toContain('export type ExportFormat');
  });

  it('should have proper browser API usage in Firefox content script', () => {
    const contentFile = resolve(__dirname, '../firefox/scripts/content.ts');
    const content = readFileSync(contentFile, 'utf-8');

    // Should use browser.* API (Firefox compatible)
    expect(content).toContain('browser.runtime.onMessage');

    // Should have message handlers for both export actions
    expect(content).toContain('exportConversation');
    expect(content).toContain('exportAllConversations');
  });

  it('should have proper chrome API usage in Chrome content script', () => {
    const contentFile = resolve(__dirname, '../chrome/scripts/content.ts');
    const content = readFileSync(contentFile, 'utf-8');

    // Should use chrome.* API (Chrome compatible)
    expect(content).toContain('chrome.runtime.onMessage');

    // Should have message handlers for both export actions
    expect(content).toContain('exportConversation');
    expect(content).toContain('exportAllConversations');
  });
});
