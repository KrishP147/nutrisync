import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ReplaceFoodModal from './ReplaceFoodModal';

export default function MealList({ refreshTrigger, onMealDeleted, onMealUpdated, limit, specificDate }) {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingMealId, setEditingMealId] = useState(null);
  const [editQuantity, setEditQuantity] = useState('1');
  const [editComponents, setEditComponents] = useState([]);
  const [mealMultiplier, setMealMultiplier] = useState(1);
  const [originalComponents, setOriginalComponents] = useState([]);
  const [editNotes, setEditNotes] = useState('');
  const [editingComponentIndex, setEditingComponentIndex] = useState(null);
  const [replacingComponentIndex, setReplacingComponentIndex] = useState(null);
  const [replacingSimpleMeal, setReplacingSimpleMeal] = useState(null);
  const [editMealType, setEditMealType] = useState('');
  const [editConsumedAt, setEditConsumedAt] = useState('');
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState(null);
  const [editingSimpleMacros, setEditingSimpleMacros] = useState(false);
  const [simpleMacros, setSimpleMacros] = useState({
    base_calories: 0,
    base_protein_g: 0,
    base_carbs_g: 0,
    base_fat_g: 0,
    base_fiber_g: 0
  });
  const [editMealName, setEditMealName] = useState('');
  const [originalMealName, setOriginalMealName] = useState('');

  // Dark theme color scheme
  const colors = {
    cardBg: 'bg-[#0a0a0a]',
    cardBorder: 'border-[#1a1a1a]',
    textPrimary: 'text-white',
    textSecondary: 'text-white/60',
    inputBg: 'bg-black',
    inputBorder: 'border-[#1a1a1a]',
    componentBg: 'bg-black',
    componentBorder: 'border-[#1a1a1a]',
    accentColor: 'text-primary-700',
    buttonPrimary: 'bg-primary-700 hover:bg-primary-600',
    buttonSecondary: 'bg-black/5 hover:bg-black/10',
  };

  useEffect(() => {
    fetchMeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const fetchMeals = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id);

    // If specificDate is provided, filter by that date
    if (specificDate) {
      // Parse date string as local time (not UTC) to avoid timezone issues
      const [year, month, day] = specificDate.split('-').map(Number);
      const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
      const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

      query = query
        .gte('consumed_at', dayStart.toISOString())
        .lte('consumed_at', dayEnd.toISOString());
    }

    query = query.order('consumed_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (!error) {
      setMeals(data || []);
    }
    setLoading(false);
  };

  const fetchMealComponents = async (mealId) => {
    const { data, error } = await supabase
      .from('meal_components')
      .select('*')
      .eq('meal_id', mealId);

    if (!error && data) {
      return data;
    }
    return [];
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this meal?')) return;

    // Find the meal to get photo_url
    const meal = meals.find(m => m.id === id);

    // Delete photo from storage if it exists
    if (meal?.photo_url) {
      try {
        // Extract filename from URL
        const urlParts = meal.photo_url.split('/');
        const filename = urlParts.slice(-2).join('/'); // user_id/timestamp.ext

        await supabase.storage
          .from('meal-photos')
          .remove([filename]);
      } catch (err) {
        console.error('Error deleting photo:', err);
        // Continue with meal deletion even if photo deletion fails
      }
    }

    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', id);

    if (!error) {
      setMeals(meals.filter(m => m.id !== id));
      if (onMealDeleted) onMealDeleted();
    }
  };

  const handleDuplicate = async (meal) => {
    const { data: { user } } = await supabase.auth.getUser();

    // Create duplicate meal with current time
    const duplicatedMeal = {
      user_id: user.id,
      meal_name: meal.meal_name,
      meal_type: meal.meal_type,
      consumed_at: new Date().toISOString(),
      total_calories: meal.total_calories,
      total_protein_g: meal.total_protein_g,
      total_carbs_g: meal.total_carbs_g,
      total_fat_g: meal.total_fat_g,
      total_fiber_g: meal.total_fiber_g,
      portion_size: meal.portion_size,
      portion_unit: meal.portion_unit,
      is_compound: meal.is_compound,
      notes: meal.notes || null,
      photo_url: null // Don't copy photo
    };

    const { data: newMeal, error } = await supabase
      .from('meals')
      .insert([duplicatedMeal])
      .select()
      .single();

    if (error) {
      console.error('Error duplicating meal:', error);
      alert('Failed to duplicate meal');
      return;
    }

    // If compound meal, duplicate components
    if (meal.is_compound) {
      const components = await fetchMealComponents(meal.id);
      if (components.length > 0) {
        const duplicatedComponents = components.map(c => ({
          meal_id: newMeal.id,
          component_name: c.component_name,
          portion_size: c.portion_size,
          portion_unit: c.portion_unit,
          calories: c.calories,
          protein_g: c.protein_g,
          carbs_g: c.carbs_g,
          fat_g: c.fat_g,
          fiber_g: c.fiber_g,
          custom_food_id: c.custom_food_id || null
        }));

        await supabase
          .from('meal_components')
          .insert(duplicatedComponents);
      }
    }

    // Refresh meals list
    await fetchMeals();

    // Immediately start editing the duplicated meal to allow time adjustment
    const updatedMeal = { ...newMeal, is_compound: meal.is_compound };
    startEditing(updatedMeal);

    if (onMealUpdated) onMealUpdated();
  };

  const startEditing = async (meal) => {
    setEditingMealId(meal.id);
    setEditNotes(meal.notes || '');
    setEditMealType(meal.meal_type);
    setEditingSimpleMacros(false); // Reset macro editing state

    // Strip any existing portion suffix (e.g., "(2x)" or "(150g)") from meal name
    const baseName = meal.meal_name.replace(/\s*\([0-9.]+[xg]*\)$/, '');
    setEditMealName(baseName);
    setOriginalMealName(baseName);

    // Format datetime-local input value
    const date = new Date(meal.consumed_at);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    setEditConsumedAt(`${year}-${month}-${day}T${hours}:${minutes}`);

    // Extract multiplier from meal name if it exists
    // Format: "Food1, Food2 (2x)" or "Food1, Food2 (250g)"
    const multiplierMatch = meal.meal_name.match(/\(([0-9.]+[xg]*)\)$/);
    if (multiplierMatch) {
      setMealMultiplier(multiplierMatch[1]);
    } else {
      setMealMultiplier(1);
    }

    // Set the initial quantity display based on the meal's actual portion_size
    if (meal.portion_size && meal.portion_unit) {
      const portionSize = meal.portion_size;

      // If it's a multiple of 100, show as multiplier (e.g., "2")
      if (portionSize % 100 === 0 && meal.portion_unit === 'g') {
        setEditQuantity((portionSize / 100).toString());
      } else {
        // Show as grams (e.g., "150g")
        setEditQuantity(`${portionSize}${meal.portion_unit}`);
      }
    } else {
      // Default to "1" if no portion info saved
      setEditQuantity('1');
    }

    // Fetch components if it's a compound food
    if (meal.is_compound) {
      const components = await fetchMealComponents(meal.id);
      // Set each component's display based on current portion_size
      const componentsWithDisplay = components.map(c => {
        // Calculate display value from portion_size
        const portionSize = c.portion_size || 100;
        let displayValue;

        // If it's a multiple of 100, show as multiplier (e.g., "2")
        if (portionSize % 100 === 0) {
          displayValue = (portionSize / 100).toString();
        } else {
          // Show as grams (e.g., "150g")
          displayValue = `${portionSize}g`;
        }

        return {
          ...c,
          portion_display: displayValue
        };
      });
      setEditComponents(componentsWithDisplay);
      setOriginalComponents(JSON.parse(JSON.stringify(componentsWithDisplay))); // Store original for reset
    } else {
      setEditComponents([]);
      setOriginalComponents([]);

      // Calculate base macros for simple food
      const baseMultiplier = meal.portion_size ? (meal.portion_size / 100) : 1;
      setSimpleMacros({
        base_calories: Math.round(meal.total_calories / baseMultiplier),
        base_protein_g: parseFloat((meal.total_protein_g / baseMultiplier).toFixed(1)),
        base_carbs_g: parseFloat((meal.total_carbs_g / baseMultiplier).toFixed(1)),
        base_fat_g: parseFloat((meal.total_fat_g / baseMultiplier).toFixed(1)),
        base_fiber_g: parseFloat((meal.total_fiber_g / baseMultiplier).toFixed(1))
      });
    }
  };

  const cancelEditing = () => {
    setEditingMealId(null);
    setEditQuantity('1');
    setEditComponents([]);
    setMealMultiplier(1);
    setOriginalComponents([]);
    setEditNotes('');
    setEditMealName('');
    setOriginalMealName('');
  };

  const getTotalCompoundWeight = () => {
    if (!editComponents || editComponents.length === 0) return 0;
    return editComponents.reduce((sum, c) => sum + (c.portion_size || 100), 0);
  };

  const updateMealMultiplier = (inputValue) => {
    // Allow empty input for backspace
    if (inputValue === '') {
      setMealMultiplier('');
      return;
    }

    if (originalComponents.length === 0) return;

    // Calculate ORIGINAL total weight
    const originalTotalWeight = originalComponents.reduce((sum, c) => sum + (c.portion_size || 100), 0);

    const containsLetters = /[a-zA-Z]/.test(inputValue);
    let multiplier;

    if (containsLetters) {
      // Extract numeric value and divide by ORIGINAL total weight
      // e.g., "250g" with originalTotalWeight 350 -> 250/350 = 0.714
      const gramAmount = parseFloat(inputValue.replace(/[^\d.]/g, ''));
      multiplier = gramAmount / originalTotalWeight;
    } else {
      // Pure number - use as direct multiplier
      multiplier = parseFloat(inputValue) || 1;
    }

    setMealMultiplier(inputValue);

    // Apply multiplier to ORIGINAL components, not current state
    const updated = originalComponents.map(component => {
      const newPortionSize = component.portion_size * multiplier;

      return {
        ...component,
        portion_size: newPortionSize,
        portion_display: `${Math.round(newPortionSize)}g`
      };
    });

    setEditComponents(updated);
  };

  const formatMealTitle = (meal) => {
    // Format meal name with portion info in brackets
    let portionText = '';
    
    if (meal.portion_size && meal.portion_unit) {
      // Check if portion_size is a multiple of 100 (multiplier-based)
      if (meal.portion_size % 100 === 0 && meal.portion_unit === 'g') {
        const multiplier = meal.portion_size / 100;
        portionText = ` (${multiplier}x)`;
      } else {
        // Show exact gram amount
        portionText = ` (${meal.portion_size}${meal.portion_unit})`;
      }
    }
    
    return meal.meal_name + portionText;
  };

  const updateComponentQuantity = (index, inputValue) => {
    const updated = [...editComponents];
    const component = updated[index];

    // Store the display value
    updated[index] = { ...component, portion_display: inputValue };

    // Handle empty input
    if (inputValue === '' || inputValue === null || inputValue === undefined) {
      updated[index].portion_size = 0;
      setEditComponents(updated);
      return;
    }

    // Smart input parsing: check if input contains letters (unit)
    const containsLetters = /[a-zA-Z]/.test(inputValue);
    let portionSize;

    if (containsLetters) {
      // Extract numeric value from input (e.g., "150g" -> 150)
      const numericValue = parseFloat(inputValue.replace(/[^\d.]/g, ''));
      portionSize = numericValue || 100;
    } else {
      // Pure number - treat as multiplier (e.g., "2" -> 200g)
      const multiplier = parseFloat(inputValue);
      portionSize = isNaN(multiplier) ? 100 : multiplier * 100;
    }

    updated[index].portion_size = portionSize;
    setEditComponents(updated);
  };

  const updateComponentNutrition = (index, field, value) => {
    const updated = [...editComponents];
    updated[index][field] = Math.max(0, parseFloat(value) || 0);
    setEditComponents(updated);
  };

  const updateSimpleMacro = (field, value) => {
    setSimpleMacros({
      ...simpleMacros,
      [field]: Math.max(0, parseFloat(value) || 0)
    });
  };

  const saveSimpleFoodAsCustomFood = async (meal) => {
    const foodName = prompt(`Save "${meal.meal_name}" as a reusable custom food? Enter a name:`, meal.meal_name);

    if (!foodName) return; // User cancelled

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('user_foods')
        .insert([{
          user_id: user.id,
          name: foodName,
          base_calories: simpleMacros.base_calories,
          base_protein_g: simpleMacros.base_protein_g,
          base_carbs_g: simpleMacros.base_carbs_g,
          base_fat_g: simpleMacros.base_fat_g,
          base_fiber_g: simpleMacros.base_fiber_g,
          source: 'simple_meal',
          original_food_name: meal.meal_name
        }]);

      if (error) {
        alert('Failed to save simple food as custom food: ' + error.message);
      } else {
        alert(`"${foodName}" saved as custom food!\n\nNutrition per 100g:\n${simpleMacros.base_calories} cal | ${simpleMacros.base_protein_g}g P | ${simpleMacros.base_carbs_g}g C | ${simpleMacros.base_fat_g}g F | ${simpleMacros.base_fiber_g}g Fiber`);
      }
    } catch (err) {
      alert('Failed to save simple food: ' + err.message);
    }
  };

  const saveComponentAsCustomFood = async (index) => {
    const component = editComponents[index];
    const foodName = prompt(`Save "${component.component_name}" as custom food? Enter a name:`, component.component_name);

    if (!foodName) return; // User cancelled

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('user_foods')
        .insert([{
          user_id: user.id,
          name: foodName,
          base_calories: component.base_calories,
          base_protein_g: component.base_protein_g,
          base_carbs_g: component.base_carbs_g,
          base_fat_g: component.base_fat_g,
          base_fiber_g: component.base_fiber_g,
          source: 'edited_from_meal',
          original_food_name: component.component_name
        }]);

      if (error) {
        alert('Failed to save custom food: ' + error.message);
      } else {
        alert(`"${foodName}" saved as custom food!`);
      }
    } catch (err) {
      alert('Failed to save custom food: ' + err.message);
    }
  };

  const saveCompoundMealAsCustomFood = async (meal) => {
    const foodName = prompt(`Save "${meal.meal_name}" as a reusable custom food? Enter a name:`, meal.meal_name);

    if (!foodName) return; // User cancelled

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Calculate base nutrition values per 100g from current total
      const totalWeight = editComponents.reduce((sum, c) => sum + (c.portion_size || 100), 0);
      const totalCalories = editComponents.reduce((sum, c) => {
        const multiplier = c.portion_size / 100;
        return sum + (c.base_calories * multiplier);
      }, 0);
      const totalProtein = editComponents.reduce((sum, c) => {
        const multiplier = c.portion_size / 100;
        return sum + (c.base_protein_g * multiplier);
      }, 0);
      const totalCarbs = editComponents.reduce((sum, c) => {
        const multiplier = c.portion_size / 100;
        return sum + (c.base_carbs_g * multiplier);
      }, 0);
      const totalFat = editComponents.reduce((sum, c) => {
        const multiplier = c.portion_size / 100;
        return sum + (c.base_fat_g * multiplier);
      }, 0);
      const totalFiber = editComponents.reduce((sum, c) => {
        const multiplier = c.portion_size / 100;
        return sum + (c.base_fiber_g * multiplier);
      }, 0);

      // Convert to per 100g basis
      const baseCalories = Math.round((totalCalories / totalWeight) * 100);
      const baseProtein = parseFloat(((totalProtein / totalWeight) * 100).toFixed(1));
      const baseCarbs = parseFloat(((totalCarbs / totalWeight) * 100).toFixed(1));
      const baseFat = parseFloat(((totalFat / totalWeight) * 100).toFixed(1));
      const baseFiber = parseFloat(((totalFiber / totalWeight) * 100).toFixed(1));

      const { error } = await supabase
        .from('user_foods')
        .insert([{
          user_id: user.id,
          name: foodName,
          base_calories: baseCalories,
          base_protein_g: baseProtein,
          base_carbs_g: baseCarbs,
          base_fat_g: baseFat,
          base_fiber_g: baseFiber,
          source: 'compound_meal',
          original_food_name: meal.meal_name
        }]);

      if (error) {
        alert('Failed to save compound meal as custom food: ' + error.message);
      } else {
        alert(`"${foodName}" saved as custom food!\n\nNutrition per 100g:\n${baseCalories} cal | ${baseProtein}g P | ${baseCarbs}g C | ${baseFat}g F | ${baseFiber}g Fiber`);
      }
    } catch (err) {
      alert('Failed to save compound meal: ' + err.message);
    }
  };

  const handleReplaceFood = (index, newFoodData) => {
    const updated = [...editComponents];
    updated[index] = {
      ...updated[index],
      component_name: newFoodData.name,
      base_calories: newFoodData.base_calories,
      base_protein_g: newFoodData.base_protein_g,
      base_carbs_g: newFoodData.base_carbs_g,
      base_fat_g: newFoodData.base_fat_g,
      base_fiber_g: newFoodData.base_fiber_g,
      portion_size: newFoodData.portion_size,
      portion_unit: newFoodData.portion_unit,
      custom_food_id: newFoodData.custom_food_id || null
    };
    setEditComponents(updated);
    setReplacingComponentIndex(null);
  };

  const handleReplaceSimpleMeal = async (newFoodData) => {
    // Update the meal in the meals list
    const meal = meals.find(m => m.id === replacingSimpleMeal);
    if (!meal) return;

    // Calculate new macros based on portion size
    const multiplier = newFoodData.portion_size / 100;
    const updatedMeal = {
      ...meal,
      meal_name: newFoodData.name,
      portion_size: newFoodData.portion_size,
      portion_unit: newFoodData.portion_unit,
      total_calories: Math.round(newFoodData.base_calories * multiplier),
      total_protein_g: parseFloat((newFoodData.base_protein_g * multiplier).toFixed(1)),
      total_carbs_g: parseFloat((newFoodData.base_carbs_g * multiplier).toFixed(1)),
      total_fat_g: parseFloat((newFoodData.base_fat_g * multiplier).toFixed(1)),
      total_fiber_g: parseFloat((newFoodData.base_fiber_g * multiplier).toFixed(1))
    };

    // Persist to database
    await supabase
      .from('meals')
      .update({
        meal_name: updatedMeal.meal_name,
        portion_size: updatedMeal.portion_size,
        portion_unit: updatedMeal.portion_unit,
        total_calories: updatedMeal.total_calories,
        total_protein_g: updatedMeal.total_protein_g,
        total_carbs_g: updatedMeal.total_carbs_g,
        total_fat_g: updatedMeal.total_fat_g,
        total_fiber_g: updatedMeal.total_fiber_g
      })
      .eq('id', meal.id);

    setMeals(meals.map(m => m.id === meal.id ? updatedMeal : m));
    setReplacingSimpleMeal(null);
  };

  const saveEdit = async (meal) => {
    // Parse editQuantity with smart input parsing
    let portionSize;
    const containsLetters = /[a-zA-Z]/.test(editQuantity);
    
    if (containsLetters) {
      // Extract numeric value (e.g., "150g" -> 150)
      const numericValue = parseFloat(editQuantity.replace(/[^\d.]/g, ''));
      portionSize = numericValue || 100;
    } else {
      // Pure number - treat as multiplier (e.g., "2" -> 200g)
      const multiplier = parseFloat(editQuantity) || 1;
      portionSize = multiplier * 100;
    }

    if (meal.is_compound && editComponents.length > 0) {
      // Update each component (both portion and nutrition if edited)
      for (const component of editComponents) {
        await supabase
          .from('meal_components')
          .update({
            portion_size: component.portion_size,
            base_calories: component.base_calories,
            base_protein_g: component.base_protein_g,
            base_carbs_g: component.base_carbs_g,
            base_fat_g: component.base_fat_g,
            base_fiber_g: component.base_fiber_g
          })
          .eq('id', component.id);
      }

      // Recalculate total macros from components
      const totalCalories = editComponents.reduce((sum, c) => {
        const multiplier = c.portion_size / 100;
        return sum + (c.base_calories * multiplier);
      }, 0);

      const totalProtein = editComponents.reduce((sum, c) => {
        const multiplier = c.portion_size / 100;
        return sum + (c.base_protein_g * multiplier);
      }, 0);

      const totalCarbs = editComponents.reduce((sum, c) => {
        const multiplier = c.portion_size / 100;
        return sum + (c.base_carbs_g * multiplier);
      }, 0);

      const totalFat = editComponents.reduce((sum, c) => {
        const multiplier = c.portion_size / 100;
        return sum + (c.base_fat_g * multiplier);
      }, 0);

      const totalFiber = editComponents.reduce((sum, c) => {
        const multiplier = c.portion_size / 100;
        return sum + (c.base_fiber_g * multiplier);
      }, 0);

      // Calculate total portion size for compound meals
      const totalCompoundWeight = editComponents.reduce((sum, c) => sum + (c.portion_size || 100), 0);

      // Update meal totals, name, portion_size, notes, meal_type, and consumed_at
      // Parse datetime-local value as local time, not UTC
      const consumedDate = new Date(editConsumedAt + ':00'); // Add seconds if not present

      const { error } = await supabase
        .from('meals')
        .update({
          meal_name: editMealName,
          portion_size: totalCompoundWeight,
          portion_unit: 'g',
          total_calories: Math.round(totalCalories),
          total_protein_g: parseFloat(totalProtein.toFixed(1)),
          total_carbs_g: parseFloat(totalCarbs.toFixed(1)),
          total_fat_g: parseFloat(totalFat.toFixed(1)),
          total_fiber_g: parseFloat(totalFiber.toFixed(1)),
          notes: editNotes || null,
          meal_type: editMealType,
          consumed_at: consumedDate.toISOString(),
        })
        .eq('id', meal.id);

      if (!error) {
        await fetchMeals();
        setEditingMealId(null);
        setEditComponents([]);
        if (onMealUpdated) onMealUpdated();
      }
    } else {
      // Simple food - use manually edited macros if available, otherwise calculate from base
      const multiplier = portionSize / 100;

      // Parse datetime-local value as local time, not UTC
      const consumedDate = new Date(editConsumedAt + ':00'); // Add seconds if not present

      const { error } = await supabase
        .from('meals')
        .update({
          meal_name: editMealName,
          portion_size: portionSize,
          portion_unit: 'g',
          total_calories: Math.round(simpleMacros.base_calories * multiplier),
          total_protein_g: parseFloat((simpleMacros.base_protein_g * multiplier).toFixed(1)),
          total_carbs_g: parseFloat((simpleMacros.base_carbs_g * multiplier).toFixed(1)),
          total_fat_g: parseFloat((simpleMacros.base_fat_g * multiplier).toFixed(1)),
          total_fiber_g: parseFloat((simpleMacros.base_fiber_g * multiplier).toFixed(1)),
          notes: editNotes || null,
          meal_type: editMealType,
          consumed_at: consumedDate.toISOString(),
        })
        .eq('id', meal.id);

      if (!error) {
        setMeals(meals.map(m =>
          m.id === meal.id
            ? {
                ...m,
                portion_size: portionSize,
                portion_unit: 'g',
                total_calories: Math.round(simpleMacros.base_calories * multiplier),
                total_protein_g: parseFloat((simpleMacros.base_protein_g * multiplier).toFixed(1)),
                total_carbs_g: parseFloat((simpleMacros.base_carbs_g * multiplier).toFixed(1)),
                total_fat_g: parseFloat((simpleMacros.base_fat_g * multiplier).toFixed(1)),
                total_fiber_g: parseFloat((simpleMacros.base_fiber_g * multiplier).toFixed(1)),
              }
            : m
        ));
        setEditingMealId(null);
        setEditQuantity('1');
        setEditingSimpleMacros(false);
        if (onMealUpdated) onMealUpdated();
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading meals...</div>;
  }

  if (meals.length === 0) {
    return (
      <div className={`${colors.cardBg} border ${colors.cardBorder}  p-8 text-center`}>
        <p className={colors.textSecondary}>
          {specificDate ? 'Nothing was logged today.' : 'No meals logged yet. Start by adding your first meal!'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {meals.map((meal) => (
        <div key={meal.id} className={`${colors.cardBg} border ${colors.cardBorder}  overflow-hidden hover:border-primary-700/50 transition-all`}>
          {editingMealId === meal.id ? (
            // Edit Mode
            <div className="space-y-4 p-4">
              <div>
                <div className="flex items-center gap-2 mb-2 overflow-x-auto">
                  <input
                    type="text"
                    value={editMealName}
                    onChange={(e) => setEditMealName(e.target.value)}
                    placeholder="Meal name"
                    className={`flex-1 min-w-0 text-base sm:text-lg font-semibold px-3 py-2 ${colors.inputBg} border-2 ${colors.inputBorder} text-white  focus:ring-2 focus:ring-primary-700`}
                  />
                  <button
                    onClick={() => setEditMealName(originalMealName)}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2  text-xs sm:text-sm font-medium transition whitespace-nowrap flex-shrink-0"
                    title="Reset to original name"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Meal Type and Time Selectors */}
              <div className={`${colors.inputBg} p-3  border-2 ${colors.inputBorder} space-y-3`}>
                <div>
                  <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                    Meal Type
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setEditMealType(type)}
                        className={`py-2 px-2  border-2 transition capitalize text-xs sm:text-sm truncate ${
                          editMealType === type
                            ? 'border-primary-700 bg-primary-700 text-white font-semibold'
                            : 'border-white/10 bg-black text-white/60 hover:border-primary-700/50'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editConsumedAt}
                    onChange={(e) => setEditConsumedAt(e.target.value)}
                    max={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 border border-white/10  focus:ring-2 focus:ring-primary-700 text-white bg-black"
                  />
                </div>
              </div>

              {meal.is_compound && editComponents.length > 0 ? (
                // Compound food - edit each component
                <div className="space-y-3">
                  {/* Meal Multiplier */}
                  <div className={`${colors.inputBg} p-3  border-2 ${colors.inputBorder}`}>
                    <div className="flex items-center gap-3 mb-1">
                      <label className={`text-sm font-medium ${colors.textPrimary} whitespace-nowrap`}>Meal Multiplier:</label>
                      <input
                        type="text"
                        value={mealMultiplier}
                        onChange={(e) => updateMealMultiplier(e.target.value)}
                        placeholder="1 or 2x or 250g"
                        className={`flex-1 px-3 py-1.5 bg-black border ${colors.inputBorder}  focus:ring-2 focus:ring-primary-700 text-sm text-white max-w-28`}
                      />
                      <span className={`text-xs font-semibold ${colors.accentColor} whitespace-nowrap bg-opacity-20 bg-black px-2 py-1 `}>
                        Total: {Math.round(getTotalCompoundWeight())}g
                      </span>
                    </div>
                    <p className={`text-xs ${colors.textSecondary}`}>
                      Enter a number (e.g., 2) to multiply all portions, or grams (e.g., 250g) to scale to that weight
                    </p>
                  </div>

                  {/* Save Compound Meal as Custom Food */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => saveCompoundMealAsCustomFood(meal)}
                      className="bg-amber-500 text-black px-4 py-2  hover:bg-amber-400 transition text-sm font-medium shadow-md"
                    >
                      Save Entire Meal as My Food
                    </button>
                  </div>

                  <p className={`text-sm font-medium ${colors.textSecondary}`}>Edit Components:</p>
                  {editComponents.map((component, idx) => (
                    <div key={component.id} className={`${colors.componentBg} p-3  border ${colors.componentBorder}`}>
                      {editingComponentIndex === idx ? (
                        // Edit mode - show nutrition inputs
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <p className={`text-sm font-medium ${colors.textPrimary}`}>{component.component_name}</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingComponentIndex(null)}
                                className="text-xs bg-green-600 text-white px-2 py-1  hover:bg-green-700"
                              >
                                Done
                              </button>
                              <button
                                onClick={() => saveComponentAsCustomFood(idx)}
                                className="text-xs bg-amber-500 text-black px-2 py-1  hover:bg-amber-400"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                          <p className={`text-xs ${colors.textSecondary}`}>Edit base nutrition values (per 100{component.portion_unit}):</p>
                          <div className="overflow-x-auto -mx-3 px-3">
                            <div className="grid grid-cols-5 gap-2 min-w-[500px] sm:min-w-0">
                              <div>
                                <label className="text-[10px] sm:text-xs text-gray-300 block mb-0.5">Calories</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={component.base_calories}
                                  onChange={(e) => updateComponentNutrition(idx, 'base_calories', e.target.value)}
                                  className="w-full px-1 sm:px-2 py-1 border  text-xs sm:text-sm text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] sm:text-xs text-gray-300 block mb-0.5">Protein (g)</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={component.base_protein_g}
                                  onChange={(e) => updateComponentNutrition(idx, 'base_protein_g', e.target.value)}
                                  className="w-full px-1 sm:px-2 py-1 border  text-xs sm:text-sm text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] sm:text-xs text-gray-300 block mb-0.5">Carbs (g)</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={component.base_carbs_g}
                                  onChange={(e) => updateComponentNutrition(idx, 'base_carbs_g', e.target.value)}
                                  className="w-full px-1 sm:px-2 py-1 border  text-xs sm:text-sm text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] sm:text-xs text-gray-300 block mb-0.5">Fat (g)</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={component.base_fat_g}
                                  onChange={(e) => updateComponentNutrition(idx, 'base_fat_g', e.target.value)}
                                  className="w-full px-1 sm:px-2 py-1 border  text-xs sm:text-sm text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] sm:text-xs text-gray-300 block mb-0.5">Fiber (g)</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={component.base_fiber_g}
                                  onChange={(e) => updateComponentNutrition(idx, 'base_fiber_g', e.target.value)}
                                  className="w-full px-1 sm:px-2 py-1 border  text-xs sm:text-sm text-white"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${colors.textPrimary}`}>{component.component_name}</p>
                              <p className={`text-xs ${colors.textSecondary}`}>
                                Base: {component.base_calories} cal per 100{component.portion_unit}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setReplacingComponentIndex(idx)}
                                className="text-xs bg-orange-500 text-white px-2 py-1  hover:bg-orange-600"
                              >
                                🔄 Replace
                              </button>
                              <button
                                onClick={() => setEditingComponentIndex(idx)}
                                className={`text-xs ${colors.accentColor} hover:opacity-80`}
                              >
                                Edit Manually
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-32">
                              <label className={`block text-xs ${colors.textSecondary} mb-1`}>
                                Count (g or x)
                              </label>
                              <input
                                type="text"
                                value={component.portion_display ?? ''}
                                onChange={(e) => updateComponentQuantity(idx, e.target.value)}
                                placeholder="e.g., 150g or 2"
                                className={`w-full px-3 py-2 ${colors.inputBg} border ${colors.inputBorder} text-white  focus:ring-2 focus:ring-opacity-50 text-sm`}
                              />
                            </div>
                            <div className="flex-1 ml-2 overflow-x-auto">
                              <div className="grid grid-cols-5 gap-1 text-center text-[10px] sm:text-xs min-w-[250px]">
                                <div className="min-w-[50px]">
                                  <p className="font-bold text-green-500 text-xs sm:text-sm">{Math.round(component.base_calories * (component.portion_size / 100))}</p>
                                  <p className={`text-[10px] sm:text-xs ${colors.textSecondary}`}>cal</p>
                                </div>
                                <div className="min-w-[50px]">
                                  <p className="font-bold text-red-500 text-xs sm:text-sm">{(component.base_protein_g * (component.portion_size / 100)).toFixed(1)}g</p>
                                  <p className={`text-[10px] sm:text-xs ${colors.textSecondary}`}>P</p>
                                </div>
                                <div className="min-w-[50px]">
                                  <p className="font-bold text-yellow-500 text-xs sm:text-sm">{(component.base_carbs_g * (component.portion_size / 100)).toFixed(1)}g</p>
                                  <p className={`text-[10px] sm:text-xs ${colors.textSecondary}`}>C</p>
                                </div>
                                <div className="min-w-[50px]">
                                  <p className="font-bold text-purple-500 text-xs sm:text-sm">{(component.base_fat_g * (component.portion_size / 100)).toFixed(1)}g</p>
                                  <p className={`text-[10px] sm:text-xs ${colors.textSecondary}`}>F</p>
                                </div>
                                <div className="min-w-[50px]">
                                  <p className="font-bold text-blue-500 text-xs sm:text-sm">{(component.base_fiber_g * (component.portion_size / 100)).toFixed(1)}g</p>
                                  <p className={`text-[10px] sm:text-xs ${colors.textSecondary}`}>Fiber</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // Simple food - smart quantity input with Replace button and macro editing
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setReplacingSimpleMeal(meal.id)}
                      className="text-xs bg-orange-500 text-white px-3 py-1.5  hover:bg-orange-600 transition font-medium"
                    >
                      🔄 Replace Food
                    </button>
                    <button
                      type="button"
                      onClick={() => saveSimpleFoodAsCustomFood(meal)}
                      className="text-xs bg-amber-500 text-black px-3 py-1.5  hover:bg-amber-400 transition font-medium shadow-md"
                    >
                      Save as My Food
                    </button>
                  </div>

                  {editingSimpleMacros ? (
                    // Macro editing mode
                    <div className={`${colors.componentBg} p-3  border ${colors.componentBorder} space-y-2`}>
                      <div className="flex justify-between items-center">
                        <p className={`text-sm font-medium ${colors.textPrimary}`}>Edit Base Nutrition (per 100g)</p>
                        <button
                          onClick={() => setEditingSimpleMacros(false)}
                          className="text-xs bg-green-600 text-white px-2 py-1  hover:bg-green-700"
                        >
                          Done Editing
                        </button>
                      </div>
                      <div className="overflow-x-auto -mx-3 px-3">
                        <div className="grid grid-cols-5 gap-2 min-w-[500px] sm:min-w-0">
                          <div>
                            <label className="text-[10px] sm:text-xs text-gray-300 block mb-0.5">Calories</label>
                            <input
                              type="number"
                              min="0"
                              value={simpleMacros.base_calories}
                              onChange={(e) => updateSimpleMacro('base_calories', e.target.value)}
                              className="w-full px-1 sm:px-2 py-1 border  text-xs sm:text-sm text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] sm:text-xs text-gray-300 block mb-0.5">Protein (g)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={simpleMacros.base_protein_g}
                              onChange={(e) => updateSimpleMacro('base_protein_g', e.target.value)}
                              className="w-full px-1 sm:px-2 py-1 border  text-xs sm:text-sm text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] sm:text-xs text-gray-300 block mb-0.5">Carbs (g)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={simpleMacros.base_carbs_g}
                              onChange={(e) => updateSimpleMacro('base_carbs_g', e.target.value)}
                              className="w-full px-1 sm:px-2 py-1 border  text-xs sm:text-sm text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] sm:text-xs text-gray-300 block mb-0.5">Fat (g)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={simpleMacros.base_fat_g}
                              onChange={(e) => updateSimpleMacro('base_fat_g', e.target.value)}
                              className="w-full px-1 sm:px-2 py-1 border  text-xs sm:text-sm text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] sm:text-xs text-gray-300 block mb-0.5">Fiber (g)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={simpleMacros.base_fiber_g}
                              onChange={(e) => updateSimpleMacro('base_fiber_g', e.target.value)}
                              className="w-full px-1 sm:px-2 py-1 border  text-xs sm:text-sm text-white"
                            />
                          </div>
                        </div>
                      </div>
                      <div className={`${colors.inputBg} p-2  border ${colors.inputBorder}`}>
                        <p className={`text-xs ${colors.textSecondary}`}>
                          Current total (with {editQuantity} portion): {Math.round(simpleMacros.base_calories * (parseFloat(editQuantity.replace(/[^\d.]/g, '')) || 1))} cal |
                          {' '}{(simpleMacros.base_protein_g * (parseFloat(editQuantity.replace(/[^\d.]/g, '')) || 1)).toFixed(1)}g P |
                          {' '}{(simpleMacros.base_carbs_g * (parseFloat(editQuantity.replace(/[^\d.]/g, '')) || 1)).toFixed(1)}g C |
                          {' '}{(simpleMacros.base_fat_g * (parseFloat(editQuantity.replace(/[^\d.]/g, '')) || 1)).toFixed(1)}g F |
                          {' '}{(simpleMacros.base_fiber_g * (parseFloat(editQuantity.replace(/[^\d.]/g, '')) || 1)).toFixed(1)}g Fiber
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Normal portion editing mode
                    <div className="space-y-2">
                      <div>
                        <label className={`block text-sm font-medium ${colors.textSecondary} mb-1`}>
                          Count (g or x)
                        </label>
                        <input
                          type="text"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(e.target.value)}
                          placeholder="e.g., 150g or 2"
                          className={`w-full px-3 py-2 ${colors.inputBg} border ${colors.inputBorder} text-white  focus:ring-2 focus:ring-opacity-50`}
                        />
                        <p className={`text-xs ${colors.textSecondary} mt-1`}>
                          Enter grams (e.g., 150g) or multiplier (e.g., 2)
                        </p>
                      </div>
                      <div className={`${colors.componentBg} p-3  border ${colors.componentBorder}`}>
                        <div className="flex justify-between items-center mb-2">
                          <p className={`text-sm font-medium ${colors.textPrimary}`}>Base Nutrition (per 100g)</p>
                          <button
                            onClick={() => setEditingSimpleMacros(true)}
                            className={`text-xs ${colors.accentColor} hover:opacity-80`}
                          >
                            Edit Manually
                          </button>
                        </div>
                        <div className="overflow-x-auto -mx-3 px-3">
                          <div className="grid grid-cols-5 gap-2 text-center text-xs min-w-[300px] sm:min-w-0">
                            <div className="min-w-[50px]">
                              <p className="font-bold text-green-500 text-xs sm:text-sm">{simpleMacros.base_calories}</p>
                              <p className={`text-[10px] sm:text-xs ${colors.textSecondary}`}>cal</p>
                            </div>
                            <div className="min-w-[50px]">
                              <p className="font-bold text-red-500 text-xs sm:text-sm">{simpleMacros.base_protein_g}g</p>
                              <p className={`text-[10px] sm:text-xs ${colors.textSecondary}`}>P</p>
                            </div>
                            <div className="min-w-[50px]">
                              <p className="font-bold text-yellow-500 text-xs sm:text-sm">{simpleMacros.base_carbs_g}g</p>
                              <p className={`text-[10px] sm:text-xs ${colors.textSecondary}`}>C</p>
                            </div>
                            <div className="min-w-[50px]">
                              <p className="font-bold text-purple-500 text-xs sm:text-sm">{simpleMacros.base_fat_g}g</p>
                              <p className={`text-[10px] sm:text-xs ${colors.textSecondary}`}>F</p>
                            </div>
                            <div className="min-w-[50px]">
                              <p className="font-bold text-blue-500 text-xs sm:text-sm">{simpleMacros.base_fiber_g}g</p>
                              <p className={`text-[10px] sm:text-xs ${colors.textSecondary}`}>Fiber</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Meal Notes */}
              <div className={`${colors.inputBg} p-3  border-2 ${colors.inputBorder}`}>
                <label className={`block text-sm font-medium ${colors.textPrimary} mb-2`}>
                  Meal Notes (Optional)
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add any notes about this meal..."
                  maxLength={500}
                  rows={2}
                  className="w-full px-3 py-2 border border-white/10  focus:ring-2 focus:ring-primary-700 text-white bg-black resize-none text-sm"
                />
                <p className={`text-xs ${colors.textSecondary} mt-1`}>
                  {editNotes.length}/500 characters
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => saveEdit(meal)}
                  className={`flex-1 ${colors.buttonPrimary} text-white py-2 px-4  text-sm font-medium transition`}
                >
                  Save Changes
                </button>
                <button
                  onClick={cancelEditing}
                  className={`flex-1 ${colors.buttonSecondary} ${colors.textSecondary} py-2 px-4  text-sm font-medium transition`}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // View Mode - Horizontal Rectangular Layout
            <div className="flex flex-col sm:flex-row gap-4 p-3 sm:p-4">
              {/* Photo on left - rectangular */}
              {meal.photo_url && (
                <button
                  onClick={() => setViewingPhotoUrl(meal.photo_url)}
                  className="flex-shrink-0 self-start"
                >
                  <img
                    src={meal.photo_url}
                    alt="Meal photo"
                    className="w-24 h-20 sm:w-32 sm:h-24  object-cover border border-white/10 hover:border-primary-700 transition cursor-pointer"
                  />
                </button>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-lg font-heading font-semibold ${colors.textPrimary} truncate`}>
                      {formatMealTitle(meal)}
                    </h3>
                    <p className={`text-sm ${colors.textSecondary} flex items-center gap-2 mt-1`}>
                      <span className="capitalize">{meal.meal_type}</span>
                      <span>•</span>
                      <span>{formatDate(meal.consumed_at)}</span>
                      {meal.is_compound && (
                        <span className="ml-2 text-xs bg-secondary-500 text-white px-2 py-0.5  font-semibold">
                          Compound
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 sm:ml-4 mt-2 sm:mt-0">
                    <button
                      onClick={() => startEditing(meal)}
                      className={`${colors.accentColor} hover:opacity-80 text-xs sm:text-sm font-medium`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(meal)}
                      className="text-secondary-500 hover:opacity-80 text-xs sm:text-sm font-medium"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => handleDelete(meal.id)}
                      className="text-red-500 hover:opacity-80 text-xs sm:text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Nutrition Stats - Horizontal */}
                <div className="flex items-center gap-3 sm:gap-6 overflow-x-auto pb-2">
                  <div className="min-w-[60px] sm:min-w-0">
                    <p className="text-xl sm:text-2xl font-mono font-bold text-green-500">{meal.total_calories}</p>
                    <p className={`text-[10px] sm:text-xs ${colors.textSecondary}`}>Calories</p>
                  </div>
                  <div className="min-w-[60px] sm:min-w-0">
                    <p className="text-xl sm:text-2xl font-mono font-bold text-red-500">{meal.total_protein_g}g</p>
                    <p className={`text-[10px] sm:text-xs ${colors.textSecondary}`}>Protein</p>
                  </div>
                  <div className="min-w-[60px] sm:min-w-0">
                    <p className="text-xl sm:text-2xl font-mono font-bold text-yellow-500">{meal.total_carbs_g}g</p>
                    <p className={`text-[10px] sm:text-xs ${colors.textSecondary}`}>Carbs</p>
                  </div>
                  <div className="min-w-[60px] sm:min-w-0">
                    <p className="text-xl sm:text-2xl font-mono font-bold text-purple-500">{meal.total_fat_g}g</p>
                    <p className={`text-[10px] sm:text-xs ${colors.textSecondary}`}>Fat</p>
                  </div>
                  {meal.total_fiber_g > 0 && (
                    <div className="min-w-[60px] sm:min-w-0">
                      <p className="text-xl sm:text-2xl font-mono font-bold text-blue-500">{meal.total_fiber_g}g</p>
                      <p className={`text-[10px] sm:text-xs ${colors.textSecondary}`}>Fiber</p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {meal.notes && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className={`text-sm ${colors.textSecondary} italic`}>{meal.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Replace Food Modal - for compound meal components */}
      {replacingComponentIndex !== null && editComponents[replacingComponentIndex] && (
        <ReplaceFoodModal
          food={editComponents[replacingComponentIndex]}
          onReplace={(newFoodData) => handleReplaceFood(replacingComponentIndex, newFoodData)}
          onClose={() => setReplacingComponentIndex(null)}
        />
      )}

      {/* Replace Food Modal - for simple meals */}
      {replacingSimpleMeal !== null && (
        <ReplaceFoodModal
          food={{
            name: meals.find(m => m.id === replacingSimpleMeal)?.meal_name,
            component_name: meals.find(m => m.id === replacingSimpleMeal)?.meal_name,
            portion_size: meals.find(m => m.id === replacingSimpleMeal)?.portion_size || 100
          }}
          onReplace={handleReplaceSimpleMeal}
          onClose={() => setReplacingSimpleMeal(null)}
        />
      )}

      {/* Photo Viewing Modal */}
      {viewingPhotoUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingPhotoUrl(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setViewingPhotoUrl(null)}
              className="absolute top-4 right-4 bg-black/10 text-white  w-10 h-10 flex items-center justify-center hover:bg-black/20 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
            <img
              src={viewingPhotoUrl}
              alt="Meal photo"
              className="w-full h-auto "
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
