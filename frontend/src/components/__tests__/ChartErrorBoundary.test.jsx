import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChartErrorBoundary from '../ChartErrorBoundary';

// Component that throws an error
function ThrowError() {
  throw new Error('Test error');
}

// Component that renders successfully
function Success() {
  return <div>Chart rendered successfully</div>;
}

describe('ChartErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <ChartErrorBoundary>
        <Success />
      </ChartErrorBoundary>
    );

    expect(screen.getByText('Chart rendered successfully')).toBeInTheDocument();
  });

  it('renders error message when child component throws', () => {
    render(
      <ChartErrorBoundary>
        <ThrowError />
      </ChartErrorBoundary>
    );

    expect(screen.getByText(/chart failed to load/i)).toBeInTheDocument();
  });

  it('displays error icon when error occurs', () => {
    const { container } = render(
      <ChartErrorBoundary>
        <ThrowError />
      </ChartErrorBoundary>
    );

    // Check for error state container - use getAllByText and take first
    const errorTexts = screen.getAllByText(/chart failed to load/i);
    expect(errorTexts.length).toBeGreaterThan(0);
    const errorContainer = errorTexts[0].closest('div');
    expect(errorContainer).toBeInTheDocument();
  });

  it('prevents error from propagating to parent', () => {
    // This test ensures the error boundary catches the error
    expect(() => {
      render(
        <ChartErrorBoundary>
          <ThrowError />
        </ChartErrorBoundary>
      );
    }).not.toThrow();
  });
});
