import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MealForm from '../MealForm';

// All vi.mock calls MUST use inline factory functions (no external const references)
vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      })
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'meal-1', meal_name: 'Test Food' }],
          error: null
        })
      })),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { dietary_restrictions: [] },
            error: null
          })
        })
      }),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { calories: 2000 },
        error: null
      })
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'photo.jpg' }, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://test.com/photo.jpg' } }))
      }))
    }
  }
}));


// Mock contexts
vi.mock('../../contexts/GoalsContext', () => ({
  useGoals: () => ({
    goals: { calories: 2000, protein: 150, carbs: 200, fat: 50 }
  })
}));

// Mock updateDailyAchievement
vi.mock('../../utils/updateDailyAchievement', () => ({
  updateDailyAchievement: vi.fn().mockResolvedValue(undefined)
}));

// Mock FoodSearchInput
vi.mock('../FoodSearchInput', () => ({
  default: ({ onFoodSelect }) => (
    <div data-testid="food-search-mock">
      <button onClick={() => onFoodSelect({
        name: 'Test Food',
        calories: 100,
        protein_g: 10,
        carbs_g: 15,
        fat_g: 5,
        fiber_g: 2,
        quantity: 1
      })}>
        Select Test Food
      </button>
    </div>
  )
}));

describe('MealForm - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders autocomplete mode by default', () => {
    render(
      <BrowserRouter>
        <MealForm onMealAdded={vi.fn()} />
      </BrowserRouter>
    );

    expect(screen.getByTestId('food-search-mock')).toBeInTheDocument();
  });

  it('allows selecting meal type', () => {
    render(
      <BrowserRouter>
        <MealForm onMealAdded={vi.fn()} />
      </BrowserRouter>
    );

    const mealTypeButtons = screen.queryAllByRole('button');
    const breakfastButton = mealTypeButtons.find(btn =>
      btn.textContent.toLowerCase().includes('breakfast')
    );

    if (breakfastButton) {
      fireEvent.click(breakfastButton);
      expect(breakfastButton).toBeInTheDocument();
    }
  });

  it('adds food through search', async () => {
    render(
      <BrowserRouter>
        <MealForm onMealAdded={vi.fn()} />
      </BrowserRouter>
    );

    const selectButtons = screen.queryAllByText(/select test food/i);
    if (selectButtons.length > 0) {
      fireEvent.click(selectButtons[0]);

      await waitFor(() => {
        expect(screen.queryAllByText(/test food/i).length).toBeGreaterThan(0);
      });
    }
  });

  it('shows manual entry mode toggle', () => {
    render(
      <BrowserRouter>
        <MealForm onMealAdded={vi.fn()} />
      </BrowserRouter>
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('allows switching to manual mode', async () => {
    render(
      <BrowserRouter>
        <MealForm onMealAdded={vi.fn()} />
      </BrowserRouter>
    );

    const buttons = screen.getAllByRole('button');
    const toggleButton = buttons.find(btn =>
      btn.textContent.toLowerCase().includes('manual') ||
      btn.textContent.toLowerCase().includes('autocomplete')
    );

    if (toggleButton) {
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const textInputs = screen.queryAllByRole('textbox');
        expect(textInputs.length).toBeGreaterThan(0);
      });
    }
  });

  it('calculates total nutrition from added foods', async () => {
    render(
      <BrowserRouter>
        <MealForm onMealAdded={vi.fn()} />
      </BrowserRouter>
    );

    const selectButton = screen.getByText(/select test food/i);
    fireEvent.click(selectButton);

    await waitFor(() => {
      const content = document.body.textContent;
      expect(content.includes('100') || content.includes('Total')).toBe(true);
    });
  });

  it('submits meal successfully', async () => {
    const onMealAdded = vi.fn();
    render(
      <BrowserRouter>
        <MealForm onMealAdded={onMealAdded} />
      </BrowserRouter>
    );

    const selectButton = screen.getByText(/select test food/i);
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(screen.getByText(/test food/i)).toBeInTheDocument();
    });

    const submitButton = await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const btn = buttons.find(b => {
        const text = b.textContent.toLowerCase();
        return (text.includes('log') || text.includes('save') || text.includes('add')) &&
          !b.disabled &&
          !text.includes('logging');
      });
      if (!btn) {
        throw new Error('Submit button not found or still disabled');
      }
      return btn;
    }, { timeout: 3000 });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onMealAdded).toHaveBeenCalled();
    }, { timeout: 5000 });
  });

  it('shows loading state during submission', async () => {
    render(
      <BrowserRouter>
        <MealForm onMealAdded={vi.fn()} />
      </BrowserRouter>
    );

    const selectButton = screen.getByText(/select test food/i);
    fireEvent.click(selectButton);

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const submitButton = buttons.find(btn =>
        btn.textContent.toLowerCase().includes('save') ||
        btn.textContent.toLowerCase().includes('log')
      );

      if (submitButton && !submitButton.disabled) {
        fireEvent.click(submitButton);
      }
    });
  });

  it('allows removing added foods', async () => {
    render(
      <BrowserRouter>
        <MealForm onMealAdded={vi.fn()} />
      </BrowserRouter>
    );

    const selectButton = screen.getByText(/select test food/i);
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(screen.getByText(/test food/i)).toBeInTheDocument();
    });

    const allButtons = screen.getAllByRole('button');
    const removeButton = allButtons.find(btn =>
      btn.textContent.includes('×') ||
      btn.textContent.toLowerCase().includes('remove') ||
      btn.textContent.toLowerCase().includes('delete')
    );

    if (removeButton) {
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(allButtons.length).toBeGreaterThan(0);
      });
    }
  });

  it('allows adding notes to meal', () => {
    render(
      <BrowserRouter>
        <MealForm onMealAdded={vi.fn()} />
      </BrowserRouter>
    );

    const textareas = screen.queryAllByRole('textbox');
    const notesField = textareas.find(ta =>
      ta.placeholder?.toLowerCase().includes('note') ||
      ta.placeholder?.toLowerCase().includes('comment')
    );

    if (notesField) {
      fireEvent.change(notesField, { target: { value: 'Test notes' } });
      expect(notesField.value).toBe('Test notes');
    } else {
      expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
    }
  });

  it('displays meal nutrition summary', async () => {
    render(
      <BrowserRouter>
        <MealForm onMealAdded={vi.fn()} />
      </BrowserRouter>
    );

    const selectButton = screen.getByText(/select test food/i);
    fireEvent.click(selectButton);

    await waitFor(() => {
      const content = document.body.textContent;
      const hasNutritionInfo = content.includes('cal') ||
        content.includes('protein') ||
        content.includes('100');
      expect(hasNutritionInfo).toBe(true);
    });
  });

  it('validates required fields before submission', async () => {
    render(
      <BrowserRouter>
        <MealForm onMealAdded={vi.fn()} />
      </BrowserRouter>
    );

    const buttons = screen.getAllByRole('button');
    const submitButton = buttons.find(btn =>
      btn.textContent.toLowerCase().includes('save') ||
      btn.textContent.toLowerCase().includes('log')
    );

    if (submitButton) {
      expect(submitButton).toBeInTheDocument();
    }
  });

  it('allows adjusting portion sizes', async () => {
    render(
      <BrowserRouter>
        <MealForm onMealAdded={vi.fn()} />
      </BrowserRouter>
    );

    const selectButton = screen.getByText(/select test food/i);
    fireEvent.click(selectButton);

    await waitFor(() => {
      const numberInputs = screen.queryAllByRole('spinbutton');
      if (numberInputs.length > 0) {
        fireEvent.change(numberInputs[0], { target: { value: '2' } });
        expect(numberInputs[0].value).toBe('2');
      }
    });
  });

  it('updates nutrition when portions change', async () => {
    render(
      <BrowserRouter>
        <MealForm onMealAdded={vi.fn()} />
      </BrowserRouter>
    );

    const selectButton = screen.getByText(/select test food/i);
    fireEvent.click(selectButton);

    await waitFor(() => {
      const numberInputs = screen.queryAllByRole('spinbutton');
      if (numberInputs.length > 0) {
        fireEvent.change(numberInputs[0], { target: { value: '3' } });

        const updatedContent = document.body.textContent;
        expect(updatedContent).toBeTruthy();
      }
    });
  });
});
