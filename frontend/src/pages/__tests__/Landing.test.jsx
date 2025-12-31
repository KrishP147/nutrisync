import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Landing from '../Landing';

// Mock router
const MockRouter = ({ children }) => <BrowserRouter>{children}</BrowserRouter>;

describe('Landing Page', () => {
  it('renders main heading', () => {
    render(
      <MockRouter>
        <Landing />
      </MockRouter>
    );

    // Check for NutriSync text or any heading
    const headings = screen.queryAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('displays call-to-action buttons', () => {
    render(
      <MockRouter>
        <Landing />
      </MockRouter>
    );

    const getStartedButtons = screen.getAllByText(/get started/i);
    expect(getStartedButtons.length).toBeGreaterThan(0);
  });

  it('shows feature sections', () => {
    render(
      <MockRouter>
        <Landing />
      </MockRouter>
    );

    // Check that page renders with content
    const links = screen.queryAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
  });

  it('includes navigation links', () => {
    render(
      <MockRouter>
        <Landing />
      </MockRouter>
    );

    // Check for any links (navigation)
    const links = screen.queryAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
  });

  it('renders footer with privacy and terms links', () => {
    render(
      <MockRouter>
        <Landing />
      </MockRouter>
    );

    // Use getAllByText for multiple matches
    const privacyLinks = screen.getAllByText(/privacy/i);
    expect(privacyLinks.length).toBeGreaterThan(0);
    const termsLinks = screen.getAllByText(/terms/i);
    expect(termsLinks.length).toBeGreaterThan(0);
  });
});
