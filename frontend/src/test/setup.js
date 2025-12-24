import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import React from 'react';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock IntersectionObserver
if (typeof globalThis !== 'undefined') {
  globalThis.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  };
} else if (typeof global !== 'undefined') {
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  };
}

// Mock motion/react globally to prevent animation-related hangs in CI
// Using React.createElement instead of JSX since this is a .js file
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }) => React.createElement('div', props, children),
    section: ({ children, ...props }) => React.createElement('section', props, children),
    h1: ({ children, ...props }) => React.createElement('h1', props, children),
    h2: ({ children, ...props }) => React.createElement('h2', props, children),
    h3: ({ children, ...props }) => React.createElement('h3', props, children),
    p: ({ children, ...props }) => React.createElement('p', props, children),
    span: ({ children, ...props }) => React.createElement('span', props, children),
    button: ({ children, ...props }) => React.createElement('button', props, children),
    a: ({ children, ...props }) => React.createElement('a', props, children),
    nav: ({ children, ...props }) => React.createElement('nav', props, children),
    ul: ({ children, ...props }) => React.createElement('ul', props, children),
    li: ({ children, ...props }) => React.createElement('li', props, children),
    img: (props) => React.createElement('img', props),
  },
  AnimatePresence: ({ children }) => children,
}));
