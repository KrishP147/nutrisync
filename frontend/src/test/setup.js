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
// Filter out motion-specific props to avoid React warnings
const createMotionElement = (tag) => ({ children, whileInView, initial, animate, exit, transition, ...props }) => {
  return React.createElement(tag, props, children);
};

vi.mock('motion/react', () => ({
  motion: {
    div: createMotionElement('div'),
    section: createMotionElement('section'),
    h1: createMotionElement('h1'),
    h2: createMotionElement('h2'),
    h3: createMotionElement('h3'),
    p: createMotionElement('p'),
    span: createMotionElement('span'),
    button: createMotionElement('button'),
    a: createMotionElement('a'),
    nav: createMotionElement('nav'),
    ul: createMotionElement('ul'),
    li: createMotionElement('li'),
    img: (props) => {
      const { whileInView, initial, animate, exit, transition, ...rest } = props;
      return React.createElement('img', rest);
    },
  },
  AnimatePresence: ({ children }) => children,
}));
