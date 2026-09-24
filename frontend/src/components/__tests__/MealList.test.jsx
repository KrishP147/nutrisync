/**
 * Tests for MealList component - edit mode input contrast (issue #3)
 * plus error-handling coverage for duplicate/edit/replace (issue #7)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MealList from '../MealList';
import { supabase } from '../../supabaseClient';

// All vi.mock calls MUST use inline factory functions (no external const references),
// so shared fixtures go through vi.hoisted.
const { mockMeal, mockCompoundMeal, mockComponent, createBuilder } = vi.hoisted(() => {
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

  const mockCompoundMeal = {
    ...mockMeal,
    id: 'meal-1',
    is_compound: true,
  };

  const mockComponent = {
    id: 'component-1',
    meal_id: 'meal-1',
    component_name: 'Rice',
    portion_size: 100,
    portion_unit: 'g',
    base_calories: 130,
    base_protein_g: 2.7,
    base_carbs_g: 28,
    base_fat_g: 0.3,
    base_fiber_g: 0.4,
    custom_food_id: null,
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

  return { mockMeal, mockCompoundMeal, mockComponent, createBuilder };
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

// Builder for the 'meals' table that returns a full row from .single() (insert)
// and the compound meal list from .then() (select), like the real query chains.
function makeMealsBuilder(singleResult) {
  const b = {};
  ['select', 'eq', 'gte', 'lte', 'order', 'limit', 'insert', 'update'].forEach((fn) => {
    b[fn] = () => b;
  });
  b.single = () => Promise.resolve(singleResult);
  b.then = (resolve, reject) =>
    Promise.resolve({ data: [mockCompoundMeal], error: null }).then(resolve, reject);
  return b;
}

// Builder for 'meal_components' select (.then) with an overridable insert spy.
function makeComponentsBuilder(insertImpl) {
  const b = {};
  ['select', 'eq', 'update', 'delete'].forEach((fn) => {
    b[fn] = () => b;
  });
  b.insert = insertImpl;
  b.then = (resolve, reject) =>
    Promise.resolve({ data: [mockComponent], error: null }).then(resolve, reject);
  return b;
}

describe('MealList - duplicate/edit/replace error handling (issue #7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('duplicates a compound meal, carrying base_* fields for every component', async () => {
    const newMealRow = { ...mockCompoundMeal, id: 'meal-2' };
    const mealsBuilder = makeMealsBuilder({ data: newMealRow, error: null });
    const insertSpy = vi.fn(() => Promise.resolve({ error: null }));
    const componentsBuilder = makeComponentsBuilder(insertSpy);

    supabase.from.mockImplementation((table) => {
      if (table === 'meals') return mealsBuilder;
      if (table === 'meal_components') return componentsBuilder;
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    });

    render(<MealList />);

    const copyButton = await screen.findByRole('button', { name: 'Copy' });
    fireEvent.click(copyButton);

    await waitFor(() => expect(insertSpy).toHaveBeenCalled());

    const payload = insertSpy.mock.calls[0][0];
    expect(payload).toHaveLength(1);
    expect(payload[0]).toMatchObject({
      meal_id: 'meal-2',
      component_name: mockComponent.component_name,
      portion_size: mockComponent.portion_size,
      portion_unit: mockComponent.portion_unit,
      base_calories: mockComponent.base_calories,
      base_protein_g: mockComponent.base_protein_g,
      base_carbs_g: mockComponent.base_carbs_g,
      base_fat_g: mockComponent.base_fat_g,
      base_fiber_g: mockComponent.base_fiber_g,
      custom_food_id: null,
    });
    expect(payload[0]).not.toHaveProperty('calories');
    expect(payload[0]).not.toHaveProperty('protein_g');
    expect(payload[0]).not.toHaveProperty('carbs_g');
    expect(payload[0]).not.toHaveProperty('fat_g');
    expect(payload[0]).not.toHaveProperty('fiber_g');
  });

  it('rolls back the duplicated meal and shows an error when the component insert fails', async () => {
    const newMealRow = { ...mockCompoundMeal, id: 'meal-2' };
    const mealsBuilder = makeMealsBuilder({ data: newMealRow, error: null });
    let deletedId = null;
    mealsBuilder.delete = () => ({
      eq: (_col, val) => {
        deletedId = val;
        return Promise.resolve({ error: null });
      },
    });
    const componentsBuilder = makeComponentsBuilder(
      vi.fn(() => Promise.resolve({ error: { message: 'component insert failed' } }))
    );

    supabase.from.mockImplementation((table) => {
      if (table === 'meals') return mealsBuilder;
      if (table === 'meal_components') return componentsBuilder;
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    });

    render(<MealList />);

    const copyButton = await screen.findByRole('button', { name: 'Copy' });
    fireEvent.click(copyButton);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('component insert failed');
    await waitFor(() => expect(deletedId).toBe('meal-2'));
  });

  it('shows an error banner when saving an edit fails and keeps the editor open', async () => {
    const mealsBuilder = {};
    ['select', 'eq', 'gte', 'lte', 'order', 'limit', 'insert', 'delete'].forEach((fn) => {
      mealsBuilder[fn] = () => mealsBuilder;
    });
    mealsBuilder.single = () => Promise.resolve({ data: mockMeal, error: null });
    let mode = 'select';
    mealsBuilder.update = () => {
      mode = 'update';
      return mealsBuilder;
    };
    mealsBuilder.then = (resolve, reject) => {
      const result =
        mode === 'update'
          ? { data: null, error: { message: 'boom' } }
          : { data: [mockMeal], error: null };
      return Promise.resolve(result).then(resolve, reject);
    };

    supabase.from.mockImplementation((table) => {
      if (table === 'meals') return mealsBuilder;
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    });

    render(<MealList />);

    const editButton = await screen.findByRole('button', { name: 'Edit' });
    fireEvent.click(editButton);

    const saveButton = await screen.findByRole('button', { name: 'Save Changes' });
    fireEvent.click(saveButton);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('boom');
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });

  it('handles a missing user in fetchMeals without crashing', async () => {
    supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    render(<MealList />);

    expect(
      await screen.findByText('No meals logged yet. Start by adding your first meal!')
    ).toBeInTheDocument();
  });
});
