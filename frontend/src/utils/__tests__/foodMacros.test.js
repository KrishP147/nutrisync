import { describe, it, expect } from 'vitest';
import { toPer100g } from '../foodMacros';

describe('toPer100g', () => {
  it('scales base values up when base_portion_size < 100', () => {
    // e.g. Gemini detected "1 slice (20g)" with 5 cal
    const food = {
      base_calories: 5,
      base_protein_g: 0.4,
      base_carbs_g: 1,
      base_fat_g: 0.2,
      base_fiber_g: 0.1,
      base_portion_size: 20,
    };

    expect(toPer100g(food)).toEqual({
      base_calories: 25,
      base_protein_g: 2,
      base_carbs_g: 5,
      base_fat_g: 1,
      base_fiber_g: 0.5,
    });
  });

  it('scales base values down when base_portion_size > 100', () => {
    const food = {
      base_calories: 500,
      base_protein_g: 40,
      base_carbs_g: 60,
      base_fat_g: 20,
      base_fiber_g: 10,
      base_portion_size: 250,
    };

    expect(toPer100g(food)).toEqual({
      base_calories: 200,
      base_protein_g: 16,
      base_carbs_g: 24,
      base_fat_g: 8,
      base_fiber_g: 4,
    });
  });

  it('is a no-op (aside from rounding) when base_portion_size is already 100', () => {
    const food = {
      base_calories: 165,
      base_protein_g: 31,
      base_carbs_g: 0,
      base_fat_g: 3.6,
      base_fiber_g: 0,
      base_portion_size: 100,
    };

    expect(toPer100g(food)).toEqual({
      base_calories: 165,
      base_protein_g: 31,
      base_carbs_g: 0,
      base_fat_g: 3.6,
      base_fiber_g: 0,
    });
  });

  it('falls back to base_portion_size 100 when 0', () => {
    const food = {
      base_calories: 100,
      base_protein_g: 10,
      base_carbs_g: 10,
      base_fat_g: 5,
      base_fiber_g: 2,
      base_portion_size: 0,
    };

    expect(toPer100g(food)).toEqual({
      base_calories: 100,
      base_protein_g: 10,
      base_carbs_g: 10,
      base_fat_g: 5,
      base_fiber_g: 2,
    });
  });

  it('falls back to base_portion_size 100 when undefined', () => {
    const food = {
      base_calories: 100,
      base_protein_g: 10,
      base_carbs_g: 10,
      base_fat_g: 5,
      base_fiber_g: 2,
    };

    expect(toPer100g(food)).toEqual({
      base_calories: 100,
      base_protein_g: 10,
      base_carbs_g: 10,
      base_fat_g: 5,
      base_fiber_g: 2,
    });
  });

  it('defaults missing base_fiber_g to 0', () => {
    const food = {
      base_calories: 50,
      base_protein_g: 5,
      base_carbs_g: 5,
      base_fat_g: 1,
      base_portion_size: 50,
    };

    expect(toPer100g(food).base_fiber_g).toBe(0);
  });

  it('rounds macro grams to 1 decimal place', () => {
    const food = {
      base_calories: 7,
      base_protein_g: 1,
      base_carbs_g: 1,
      base_fat_g: 1,
      base_fiber_g: 1,
      base_portion_size: 30,
    };

    // 100/30 = 3.333...
    const result = toPer100g(food);
    expect(result.base_protein_g).toBe(3.3);
    expect(result.base_carbs_g).toBe(3.3);
    expect(result.base_fat_g).toBe(3.3);
    expect(result.base_fiber_g).toBe(3.3);
    expect(result.base_calories).toBe(23); // Math.round(23.33)
  });
});
