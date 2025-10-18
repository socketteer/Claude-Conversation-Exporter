/**
 * Vitest setup file
 * Global test configuration and browser API mocks
 */

import { vi } from 'vitest';

// Mock browser/chrome API
const mockBrowserAPI = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
    executeScript: vi.fn(),
  },
};

// Set up global browser API mocks
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
(global as any).browser = mockBrowserAPI;
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
(global as any).chrome = mockBrowserAPI;

// Mock Blob and URL for download tests
if (typeof Blob === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  (global as any).Blob = class MockBlob {
    constructor(
      public parts: unknown[],
      public options?: unknown
    ) {}
  };
}

// Mock DOM methods
if (typeof document !== 'undefined') {
  const originalCreateElement = document.createElement.bind(document);
  document.createElement = function (tagName: string) {
    const element = originalCreateElement(tagName);
    if (tagName.toLowerCase() === 'a') {
      element.click = vi.fn();
    }
    return element;
  };
}
