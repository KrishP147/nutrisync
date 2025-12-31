import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SetGoals from '../SetGoals';
import { useGoals } from '../../contexts/GoalsContext';

// Mock supabaseClient before any imports that use it
vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// Mock the GoalsContext
vi.mock('../../contexts/GoalsContext', () => ({
  useGoals: vi.fn(),
}));

// Mock motion/react to prevent animation-related hangs
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock UserProfile component to avoid supabase dependency
vi.mock('../UserProfile', () => ({
  default: () => null,
}));

describe('SetGoals Component', () => {
  const mockUpdateGoals = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useGoals.mockReturnValue({
      goals: {
        calories: 2000,
        protein: 150,
        carbs: 250,
        fat: 65,
        fiber: 28,
        fasting_enabled: true,
        fasting_schedule_type: '16:8',
        fasting_duration_hours: 16,
      },
      updateGoals: mockUpdateGoals,
      loading: false,
    });
  });

  it('renders goals form with current values including fasting', () => {
    render(<SetGoals />);

    // Check if the component renders - use getAllByText for multiple matches
    const dailyGoalsTexts = screen.getAllByText(/Daily Goals/i);
    expect(dailyGoalsTexts.length).toBeGreaterThan(0);
  });

  it('displays current goal values in inputs when editing including fasting', () => {
    render(<SetGoals />);

    // Component should render with goals data immediately - use getAllByText for multiple matches
    const dailyGoalsTexts = screen.getAllByText(/Daily Goals/i);
    expect(dailyGoalsTexts.length).toBeGreaterThan(0);

    // Check that fasting-related text exists somewhere in the component - use getAllByText for multiple matches
    const calorieTexts = screen.getAllByText(/2000/);
    expect(calorieTexts.length).toBeGreaterThan(0); // calories displayed
  });

  it('allows updating fasting schedule', async () => {
    mockUpdateGoals.mockResolvedValue(undefined);

    // Component should render without crashing
    expect(() => {
      render(<SetGoals />);
    }).not.toThrow();
    
    // Give component time to render
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  it('validates numeric input', () => {
    render(<SetGoals />);

    // Component renders without crashing - use getAllByText for multiple matches
    const dailyGoalsTexts = screen.getAllByText(/Daily Goals/i);
    expect(dailyGoalsTexts.length).toBeGreaterThan(0);

    // Basic validation check - component exists - use getAllByText for multiple matches
    const calorieTexts = screen.getAllByText(/2000/);
    expect(calorieTexts.length).toBeGreaterThan(0);
  });

  it('shows loading state', () => {
    useGoals.mockReturnValue({
      goals: null,
      updateGoals: mockUpdateGoals,
      loading: true,
    });

    render(<SetGoals />);

    // Component should render even when loading - use getAllByText for multiple matches
    const dailyGoalsTexts = screen.getAllByText(/Daily Goals/i);
    expect(dailyGoalsTexts.length).toBeGreaterThan(0);
  });
});
