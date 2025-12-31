import { expect, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import React from 'react';

// Suppress act() warnings in tests - they're often false positives with async operations
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('not wrapped in act(...)')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

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
}

// Mock motion/react globally to prevent animation-related hangs in CI
// Using React.createElement instead of JSX since this is a .js file
// Filter out motion-specific props to avoid React warnings
const createMotionElement = (tag) => ({ children, ...props }) => {
  // Remove motion props: whileInView, initial, animate, exit, transition
  const { whileInView: _whileInView, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...cleanProps } = props;
  return React.createElement(tag, cleanProps, children);
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
      const { whileInView: _whileInView, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...rest } = props;
      return React.createElement('img', rest);
    },
  },
  AnimatePresence: ({ children }) => children,
}));
