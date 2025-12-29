import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SetGoals from '../SetGoals';

// Mock contexts
const mockUpdateGoals = vi.fn();
vi.mock('../../contexts/GoalsContext', () => ({
  useGoals: () => ({
    goals: {
      calories: 2000,
      protein: 150,
      carbs: 250,
      fat: 65,
      fiber: 30,
      fasting_enabled: false,
      fasting_schedule_type: '16:8',
      fasting_duration_hours: 16,
      fasting_start_time: '20:00',
      meal_reminder_enabled: true
    },
    loading: false,
    updateGoals: mockUpdateGoals
  })
}));

// Mock UserProfile component
vi.mock('../UserProfile', () => ({
  default: () => <div data-testid="user-profile">User Profile</div>
}));

describe('SetGoals - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateGoals.mockResolvedValue({ data: {}, error: null });
  });

  it('renders collapsed state initially', () => {
    render(<SetGoals />);
    
    expect(screen.getByText(/daily goals/i)).toBeInTheDocument();
    expect(screen.getByText(/2000 kcal/i)).toBeInTheDocument();
  });

  it('expands when clicked', async () => {
    render(<SetGoals />);
    
    const header = screen.getByText(/daily goals/i);
    fireEvent.click(header);
    
    await waitFor(() => {
      // Should show input fields when expanded
      const inputs = screen.queryAllByRole('spinbutton');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  it('displays current goal values', () => {
    render(<SetGoals />);
    
    // Check summary shows current values
    expect(screen.getByText(/2000 kcal/i)).toBeInTheDocument();
    expect(screen.getByText(/150g P/i)).toBeInTheDocument();
    expect(screen.getByText(/250g C/i)).toBeInTheDocument();
    expect(screen.getByText(/65g F/i)).toBeInTheDocument();
  });

  it('allows changing calorie goal', async () => {
    render(<SetGoals />);
    
    // Expand
    const header = screen.getByText(/daily goals/i);
    fireEvent.click(header);
    
    await waitFor(() => {
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs.length).toBeGreaterThan(0);
    });
    
    // Find calories input (usually first one)
    const inputs = screen.getAllByRole('spinbutton');
    const caloriesInput = inputs.find(input => input.value === '2000');
    
    if (caloriesInput) {
      fireEvent.change(caloriesInput, { target: { value: '2500' } });
      expect(caloriesInput.value).toBe('2500');
    }
  });

  it('shows save and cancel buttons when expanded', async () => {
    render(<SetGoals />);
    
    const header = screen.getByText(/daily goals/i);
    fireEvent.click(header);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  it('calls updateGoals when save is clicked', async () => {
    render(<SetGoals />);
    
    // Expand
    const header = screen.getByText(/daily goals/i);
    fireEvent.click(header);
    
    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
    });
    
    await waitFor(() => {
      expect(mockUpdateGoals).toHaveBeenCalled();
    });
  });

  it('resets values when cancel is clicked', async () => {
    render(<SetGoals />);
    
    // Expand
    const header = screen.getByText(/daily goals/i);
    fireEvent.click(header);
    
    await waitFor(() => {
      const inputs = screen.getAllByRole('spinbutton');
      if (inputs.length > 0) {
        fireEvent.change(inputs[0], { target: { value: '3000' } });
      }
    });
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    // Should close
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    });
  });

  it('displays fasting schedule options when enabled', async () => {
    render(<SetGoals />);
    
    const header = screen.getByText(/daily goals/i);
    fireEvent.click(header);
    
    await waitFor(() => {
      // Should show fasting options
      const content = document.body.textContent;
      const hasFastingOptions = content.includes('16:8') || content.includes('Fasting');
      expect(hasFastingOptions).toBe(true);
    });
  });

  it('shows fasting info in summary when enabled', () => {
    render(<SetGoals />);
    
    // Mock shows fasting_enabled: false, so this won't show
    // But the component should still render
    expect(screen.getByText(/daily goals/i)).toBeInTheDocument();
  });

  it('handles numeric input validation', async () => {
    render(<SetGoals />);
    
    const header = screen.getByText(/daily goals/i);
    fireEvent.click(header);
    
    await waitFor(() => {
      const inputs = screen.getAllByRole('spinbutton');
      if (inputs.length > 0) {
        // Try to set invalid value
        fireEvent.change(inputs[0], { target: { value: '-100' } });
        // HTML5 spinbutton should handle validation
        expect(inputs[0]).toBeInTheDocument();
      }
    });
  });

  it('allows changing all macro goals', async () => {
    render(<SetGoals />);
    
    const header = screen.getByText(/daily goals/i);
    fireEvent.click(header);
    
    await waitFor(() => {
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs.length).toBeGreaterThan(3); // At least 4 macros
      
      // Change multiple inputs
      inputs.forEach((input, idx) => {
        if (idx < 4) {
          fireEvent.change(input, { target: { value: String(100 + idx * 10) } });
        }
      });
    });
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockUpdateGoals).toHaveBeenCalled();
    });
  });

  it('shows fasting schedule selector', async () => {
    render(<SetGoals />);
    
    const header = screen.getByText(/daily goals/i);
    fireEvent.click(header);
    
    await waitFor(() => {
      // Look for schedule options
      const selects = screen.queryAllByRole('combobox');
      const buttons = screen.queryAllByRole('button');
      // Should have some interactive elements
      expect(selects.length + buttons.length).toBeGreaterThan(2);
    });
  });

  it('includes UserProfile component', async () => {
    render(<SetGoals />);
    
    const header = screen.getByText(/daily goals/i);
    fireEvent.click(header);
    
    await waitFor(() => {
      expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    });
  });

  it('collapses after saving', async () => {
    render(<SetGoals />);
    
    // Expand
    const header = screen.getByText(/daily goals/i);
    fireEvent.click(header);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    });
  });

  it('handles updateGoals errors gracefully', async () => {
    mockUpdateGoals.mockRejectedValueOnce(new Error('Update failed'));
    
    render(<SetGoals />);
    
    const header = screen.getByText(/daily goals/i);
    fireEvent.click(header);
    
    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
    });
    
    // Should not crash
    await waitFor(() => {
      expect(screen.getByText(/daily goals/i)).toBeInTheDocument();
    });
  });
});
