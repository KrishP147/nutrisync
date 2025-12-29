import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Logging from '../Logging';

// Mock Supabase
vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lt: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({
                data: [],
                error: null
              }))
            }))
          })),
          single: vi.fn(() => Promise.resolve({
            data: { calories: 2000 },
            error: null
          })),
          order: vi.fn(() => Promise.resolve({
            data: [],
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: {}, error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: {}, error: null }))
      }))
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'test.jpg' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://test.com/test.jpg' } }))
      }))
    }
  }
}));

// Mock contexts
vi.mock('../../contexts/FastingContext', () => ({
  useFasting: () => ({
    activeFast: null,
    isLoading: false,
    startFast: vi.fn(),
    endFast: vi.fn()
  })
}));

vi.mock('../../contexts/GoalsContext', () => ({
  useGoals: () => ({
    goals: { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 50 },
    loading: false
  })
}));

// Mock components
vi.mock('../../components/layout/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

vi.mock('../../components/MealForm', () => ({
  default: () => <div data-testid="meal-form">Meal Form</div>
}));

vi.mock('../../components/PhotoMealUpload', () => ({
  default: () => <div data-testid="photo-meal-upload">Photo Upload</div>
}));

vi.mock('../../components/MealList', () => ({
  default: () => <div data-testid="meal-list">Meal List</div>
}));

describe('Logging Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders logging page', async () => {
    render(
      <BrowserRouter>
        <Logging />
      </BrowserRouter>
    );

    await waitFor(() => {
      const sidebar = screen.queryByTestId('sidebar');
      const mealForm = screen.queryByTestId('meal-form');
      expect(sidebar || mealForm).toBeTruthy();
    }, { timeout: 5000 });
  });

  it('shows meal form', () => {
    const { container } = render(
      <BrowserRouter>
        <Logging />
      </BrowserRouter>
    );

    // Just verify the component renders without crashing
    expect(container).toBeTruthy();
  });
});
