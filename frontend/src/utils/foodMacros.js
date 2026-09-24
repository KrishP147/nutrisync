/**
 * Convert a food's base_* macro values (stated per `base_portion_size` grams)
 * into per-100g values.
 *
 * Data contract: base_* fields on stored foods (user_foods, meal_components)
 * are always per 100g. This helper is the single place that performs that
 * conversion so photo-analyzed foods (whose base values are per the
 * AI-detected portion, not per 100g) get normalized before being persisted.
 *
 * @param {Object} food
 * @param {number} food.base_calories
 * @param {number} food.base_protein_g
 * @param {number} food.base_carbs_g
 * @param {number} food.base_fat_g
 * @param {number} [food.base_fiber_g]
 * @param {number} [food.base_portion_size] - grams the base_* values above correspond to; falls back to 100 when 0/undefined.
 * @returns {{base_calories: number, base_protein_g: number, base_carbs_g: number, base_fat_g: number, base_fiber_g: number}}
 */
export function toPer100g(food) {
  const basePortionSize = food.base_portion_size || 100;
  const conversionMultiplier = 100 / basePortionSize;

  return {
    base_calories: Math.round(food.base_calories * conversionMultiplier),
    base_protein_g: parseFloat((food.base_protein_g * conversionMultiplier).toFixed(1)),
    base_carbs_g: parseFloat((food.base_carbs_g * conversionMultiplier).toFixed(1)),
    base_fat_g: parseFloat((food.base_fat_g * conversionMultiplier).toFixed(1)),
    base_fiber_g: parseFloat(((food.base_fiber_g || 0) * conversionMultiplier).toFixed(1)),
  };
}
