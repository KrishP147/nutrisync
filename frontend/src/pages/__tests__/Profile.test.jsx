/**
 * Comprehensive tests for Profile page
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock Supabase - declare vi.fn() directly in the mock factory
vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
      updateUser: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signInWithPassword: vi.fn()
    },
    from: vi.fn()
  }
}));

// Mock GoalsContext
vi.mock('../../contexts/GoalsContext', () => ({
  useGoals: () => ({
    goals: {
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 65,
      fiber: 30
    },
    updateGoals: vi.fn()
  })
}));

// Mock Sidebar
vi.mock('../../components/layout/Sidebar', () => ({
  default: ({ children }) => <div data-testid="sidebar">{children}</div>
}));

// Mock navigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn()
  };
});

// Import after mocks are set up
import Profile from '../Profile';
import { supabase } from '../../supabaseClient';

const renderProfile = async () => {
  let result;
  await act(async () => {
    result = render(
      <BrowserRouter>
        <Profile />
      </BrowserRouter>
    );
  });
  return result;
};

describe('Profile Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Default mock implementations
    supabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          created_at: '2024-01-01T00:00:00Z'
        }
      }
    });

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          age: 30,
          gender: 'male',
          height_cm: 175,
          weight_kg: 70,
          activity_level: 'moderately_active',
          goal_type: 'maintain',
          dietary_restrictions: ['vegetarian'],
          bmi: 22.9,
          bmi_category: 'Normal'
        },
        error: null
      }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null })
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('renders profile page after loading', async () => {
    await renderProfile();

    await waitFor(() => {
      expect(screen.queryByText(/loading profile/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('displays user email', async () => {
    await renderProfile();

    await waitFor(() => {
      expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('loads user profile data', async () => {
    await renderProfile();

    await waitFor(() => {
      expect(supabase.auth.getUser).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('user_profile');
    }, { timeout: 5000 });
  });

  it('shows dietary tab with restrictions', async () => {
    await renderProfile();

    await waitFor(() => {
      expect(screen.queryByText(/loading profile/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // Click on Dietary tab
    const dietaryTab = screen.getByRole('button', { name: /dietary/i });
    await act(async () => {
      fireEvent.click(dietaryTab);
    });

    await waitFor(() => {
      // Use getAllByText since there are multiple matches for "vegetarian"
      const vegetarianElements = screen.getAllByText(/vegetarian/i);
      expect(vegetarianElements.length).toBeGreaterThan(0);
    });
  });

  it('handles password reset', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null
    });

    await renderProfile();

    await waitFor(() => {
      expect(screen.queryByText(/loading profile/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // Find and click the reset password button
    const resetButton = screen.getByRole('button', { name: /send password reset email/i });
    await act(async () => {
      fireEvent.click(resetButton);
    });

    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/reset-password')
        })
      );
    });
  });

  it('shows password reset success message', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null
    });

    await renderProfile();

    await waitFor(() => {
      expect(screen.queryByText(/loading profile/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    const resetButton = screen.getByRole('button', { name: /send password reset email/i });
    await act(async () => {
      fireEvent.click(resetButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });

  it('handles password reset error', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: 'Failed to send reset email' }
    });

    await renderProfile();

    await waitFor(() => {
      expect(screen.queryByText(/loading profile/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    const resetButton = screen.getByRole('button', { name: /send password reset email/i });
    await act(async () => {
      fireEvent.click(resetButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/failed to send reset email/i)).toBeInTheDocument();
    });
  });

  it('opens delete account confirmation dialog', async () => {
    await renderProfile();

    await waitFor(() => {
      expect(screen.queryByText(/loading profile/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    const deleteButton = screen.getByRole('button', { name: /delete account/i });
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/delete account\?/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    });
  });

  it('calculates and displays nutrition goals', async () => {
    await renderProfile();

    await waitFor(() => {
      expect(screen.queryByText(/loading profile/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    const calculateButton = screen.getByRole('button', { name: /calculate goals/i });
    await act(async () => {
      fireEvent.click(calculateButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/calories/i)).toBeInTheDocument();
      expect(screen.getByText(/protein/i)).toBeInTheDocument();
    });
  });

  it('displays BMI information', async () => {
    await renderProfile();

    await waitFor(() => {
      expect(screen.queryByText(/loading profile/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    await waitFor(() => {
      expect(screen.getByText(/22.9/)).toBeInTheDocument();
      expect(screen.getByText(/normal/i)).toBeInTheDocument();
    });
  });

  it('switches between profile and dietary tabs', async () => {
    await renderProfile();

    await waitFor(() => {
      expect(screen.queryByText(/loading profile/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    const dietaryTab = screen.getByRole('button', { name: /dietary/i });
    await act(async () => {
      fireEvent.click(dietaryTab);
    });

    await waitFor(() => {
      expect(screen.getByText(/halal/i)).toBeInTheDocument();
      expect(screen.getByText(/kosher/i)).toBeInTheDocument();
    });
  });

  it('saves profile updates', async () => {
    await renderProfile();

    await waitFor(() => {
      expect(screen.queryByText(/loading profile/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    const saveButton = screen.getByRole('button', { name: /save profile/i });
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('user_profile');
    });
  });

  it('validates required fields before calculating goals', async () => {
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          age: null,
          height_cm: null,
          weight_kg: null,
          dietary_restrictions: []
        },
        error: null
      }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null })
    });

    await renderProfile();

    await waitFor(() => {
      expect(screen.queryByText(/loading profile/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    const calculateButton = screen.getByRole('button', { name: /calculate goals/i });
    await act(async () => {
      fireEvent.click(calculateButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/please fill in age, height, and weight/i)).toBeInTheDocument();
    });
  });

  it('renders loading state initially', () => {
    // Use sync render to catch loading state
    render(
      <BrowserRouter>
        <Profile />
      </BrowserRouter>
    );
    
    expect(screen.getByText(/loading profile/i)).toBeInTheDocument();
  });
});
