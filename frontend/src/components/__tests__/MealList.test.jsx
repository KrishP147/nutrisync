/**
 * Tests for MealList component - edit mode input contrast (issue #3)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MealList from '../MealList';

// All vi.mock calls MUST use inline factory functions (no external const references),
// so shared fixtures go through vi.hoisted.
const { mockMeal, createBuilder } = vi.hoisted(() => {
  const mockMeal = {
    id: 'meal-1',
    user_id: 'test-user-id',
    meal_name: 'Grilled Chicken',
    meal_type: 'lunch',
    consumed_at: '2024-01-15T12:00:00.000Z',
    total_calories: 200,
    total_protein_g: 30,
    total_carbs_g: 5,
    total_fat_g: 8,
    total_fiber_g: 2,
    portion_size: null,
    portion_unit: null,
    is_compound: false,
    notes: '',
  };

  const createBuilder = (result) => {
    const builder = {};
    ['select', 'eq', 'gte', 'lte', 'order', 'limit', 'delete', 'insert', 'update'].forEach((fn) => {
      builder[fn] = () => builder;
    });
    builder.single = () => Promise.resolve(result);
    builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
    return builder;
  };

  return { mockMeal, createBuilder };
});

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
    },
    from: vi.fn((table) => {
      if (table === 'meals') {
        return createBuilder({ data: [mockMeal], error: null });
      }
      if (table === 'meal_components') {
        return createBuilder({ data: [], error: null });
      }
      return createBuilder({ data: [], error: null });
    }),
    storage: {
      from: vi.fn(() => ({
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    },
  },
}));

describe('MealList - edit mode input contrast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gives every macro number input a dark background in manual edit mode', async () => {
    render(<MealList />);

    const editButton = await screen.findByRole('button', { name: 'Edit' });
    fireEvent.click(editButton);

    const editManuallyButton = await screen.findByText('Edit Manually');
    fireEvent.click(editManuallyButton);

    const numberInputs = screen.getAllByRole('spinbutton');
    expect(numberInputs).toHaveLength(5);
    numberInputs.forEach((input) => {
      expect(input).toHaveClass('bg-black');
      expect(input).toHaveClass('border-[#1a1a1a]');
    });
  });
});
