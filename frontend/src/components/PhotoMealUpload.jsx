import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useGoals } from '../contexts/GoalsContext';
import { updateDailyAchievement } from '../utils/updateDailyAchievement';
import api from '../services/api';
import FoodSearchInput from './FoodSearchInput';
import imageCompression from 'browser-image-compression';

export default function PhotoMealUpload({ onMealAdded }) {
  const { goals } = useGoals();
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [originalResult, setOriginalResult] = useState(null);
  const [error, setError] = useState(null);
  const [mealType, setMealType] = useState('');
  const [editableResult, setEditableResult] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [mealMultiplier, setMealMultiplier] = useState(1);
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState(null);
  const [savePhoto, setSavePhoto] = useState(true);
  const [customMealName, setCustomMealName] = useState('');
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false);
  const [dietaryRestrictions, setDietaryRestrictions] = useState([]);

  // Fetch user dietary restrictions on mount
  useEffect(() => {
    const fetchDietaryRestrictions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_profile')
        .select('dietary_restrictions')
        .eq('user_id', user.id)
        .single();

      if (data?.dietary_restrictions) {
        setDietaryRestrictions(data.dietary_restrictions);
      }
    };

    fetchDietaryRestrictions();
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
      setMealType('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
      setMealType('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const uploadPhotoToStorage = async (file) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Compression options
      const options = {
        maxSizeMB: 1, // Max file size in MB
        maxWidthOrHeight: 1200, // Max width or height
        useWebWorker: true,
        fileType: 'image/jpeg', // Convert to JPEG for better compression
      };

      // Compress the image
      console.log(`Original file size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      const compressedFile = await imageCompression(file, options);
      console.log(`Compressed file size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);

      // Create a unique filename (always use .jpg since we're converting to JPEG)
      const fileName = `${user.id}/${Date.now()}.jpg`;

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('meal-photos')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg'
        });

      if (error) {
        console.error('Error uploading photo:', error);
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('meal-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error('Error in uploadPhotoToStorage:', err);
      return null;
    }
  };

  const analyzeImage = async () => {
    if (!selectedFile) return;
    if (!mealType) {
      setError('Please select a meal type first');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // Upload photo to Supabase Storage BEFORE AI analysis (only if savePhoto is true)
      if (savePhoto) {
        const uploadedPhotoUrl = await uploadPhotoToStorage(selectedFile);
        if (uploadedPhotoUrl) {
          setPhotoUrl(uploadedPhotoUrl);
        }
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('dietaryRestrictions', JSON.stringify(dietaryRestrictions));

      const response = await api.post('/api/analyze-meal-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      });

      // Transform API response to include base values and portions
      const transformedFoods = response.data.foods.map(food => {
        // Extract portion size from AI response
        // Handle formats: "85g", "1 bun (75g)", "2 slices (50g)"
        const portionStr = food.portion || '100g';

        // Try to extract number from parentheses first (e.g., "1 bun (75g)" -> 75)
        const parenMatch = portionStr.match(/\((\d+(?:\.\d+)?)/);
        const geminiPortionGrams = parenMatch
          ? parseFloat(parenMatch[1])
          : (parseFloat(portionStr.replace(/[^\d.]/g, '')) || 100);

        // AI returns nutrients for the detected portion
        // We store these as "per geminiPortionGrams" base values
        // Example: If Gemini detected "1 slice (20g)" with 5 cal,
        // we store base_calories = 5 per 20g (not per 100g!)

        return {
          ...food,
          // Store ORIGINAL AI values to prevent rounding errors during reset
          original_calories: food.calories,
          original_protein_g: food.protein_g,
          original_carbs_g: food.carbs_g,
          original_fat_g: food.fat_g,
          original_fiber_g: food.fiber_g || 0,
          original_portion_size: geminiPortionGrams,
          original_portion_display: portionStr,
          // Store base values PER GEMINI PORTION (not per 100g)
          // This is the key change - base values match the Gemini portion size
          base_calories: food.calories,
          base_protein_g: food.protein_g,
          base_carbs_g: food.carbs_g,
          base_fat_g: food.fat_g,
          base_fiber_g: food.fiber_g || 0,
          base_portion_size: geminiPortionGrams, // The size that base values correspond to
          portion_size: geminiPortionGrams,
          portion_display: '1', // Show "1" by default (representing 1 unit of the Gemini portion)
          portion_unit: 'g',
        };
      });

      const resultData = {
        ...response.data,
        foods: transformedFoods,
        meal_type: mealType
      };

      setResult(resultData);
      setOriginalResult(JSON.parse(JSON.stringify(resultData))); // Deep copy for reset
      setEditableResult(resultData);
      
      // Initialize meal name
      const initialName = transformedFoods.map(f => f.name).join(', ');
      setCustomMealName(initialName);
      setIsNameManuallyEdited(false);
    } catch (err) {
      let errorMessage = err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to analyze image';
      
      // Replace timeout errors with user-friendly message
      if (errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('60000')) {
        errorMessage = 'Please try again. The request took too long to process.';
      }
      
      setError(errorMessage);
      console.error('Full error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const updateFoodQuantity = (index, inputValue) => {
    // Create deep copy to ensure React detects state change
    const updated = {
      ...editableResult,
      foods: [...editableResult.foods]
    };
    const food = updated.foods[index];

    // Handle empty input
    if (inputValue === '' || inputValue === null || inputValue === undefined) {
      updated.foods[index] = {
        ...food,
        portion_display: inputValue,
        portion_size: 0,
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        fiber_g: 0
      };

      // Recalculate totals
      updated.total_nutrition = {
        calories: updated.foods.reduce((sum, f) => sum + (parseFloat(f.calories) || 0), 0),
        protein_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.protein_g) || 0), 0),
        carbs_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.carbs_g) || 0), 0),
        fat_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.fat_g) || 0), 0),
        fiber_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.fiber_g) || 0), 0),
      };

      setEditableResult(updated);
      return;
    }

    // Smart input parsing: check if input contains letters (unit)
    const containsLetters = /[a-zA-Z]/.test(inputValue);
    let portionSize;
    const basePortionSize = food.base_portion_size || 100; // The portion size that base values correspond to

    if (containsLetters) {
      // Extract numeric value from input (e.g., "150g" -> 150)
      const numericValue = parseFloat(inputValue.replace(/[^\d.]/g, ''));
      portionSize = numericValue || basePortionSize;
    } else {
      // Pure number - treat as multiplier of the BASE portion
      // e.g., "2" means 2 units of the Gemini-detected portion (e.g., 2 slices = 2 × 20g = 40g)
      const multiplier = parseFloat(inputValue);
      portionSize = isNaN(multiplier) ? basePortionSize : multiplier * basePortionSize;
    }

    // Calculate multiplier relative to the base portion size
    const multiplier = portionSize / basePortionSize;

    // Update food with new values (create new object to ensure React detects change)
    updated.foods[index] = {
      ...food,
      portion_display: inputValue,
      portion_size: portionSize,
      calories: Math.round(food.base_calories * multiplier),
      protein_g: parseFloat((food.base_protein_g * multiplier).toFixed(1)),
      carbs_g: parseFloat((food.base_carbs_g * multiplier).toFixed(1)),
      fat_g: parseFloat((food.base_fat_g * multiplier).toFixed(1)),
      fiber_g: parseFloat((food.base_fiber_g * multiplier).toFixed(1))
    };

    // Recalculate totals
    updated.total_nutrition = {
      calories: updated.foods.reduce((sum, f) => sum + (parseFloat(f.calories) || 0), 0),
      protein_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.protein_g) || 0), 0),
      carbs_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.carbs_g) || 0), 0),
      fat_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.fat_g) || 0), 0),
      fiber_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.fiber_g) || 0), 0),
    };

    setEditableResult(updated);
  };

  const getTotalCompoundWeight = () => {
    if (!editableResult || !editableResult.foods) return 0;
    return editableResult.foods.reduce((sum, f) => sum + (f.portion_size || 100), 0);
  };

  // Generate dynamic meal name based on current foods and multiplier
  const generateDynamicMealName = (result = editableResult, multiplier = mealMultiplier) => {
    if (!result || !result.foods) return '';
    
    let baseName = result.foods.map(f => f.name).join(', ');
    
    // Add multiplier suffix if not 1
    if (multiplier !== 1 && multiplier !== '' && multiplier !== '1') {
      const containsLetters = /[a-zA-Z]/.test(String(multiplier));
      baseName += containsLetters ? ` (${multiplier})` : ` (${multiplier}x)`;
    }
    
    return baseName;
  };

  const resetMealName = () => {
    const dynamicName = generateDynamicMealName();
    setCustomMealName(dynamicName);
    setIsNameManuallyEdited(false);
  };

  const handleMealNameChange = (value) => {
    setCustomMealName(value);
    setIsNameManuallyEdited(true);
  };

  const updateMealMultiplier = (inputValue) => {
    // Allow empty input for backspace/clearing
    if (inputValue === '') {
      setMealMultiplier('');
      return;
    }

    if (!editableResult || !originalResult) return;

    // Calculate ORIGINAL total weight (from when AI first analyzed)
    const originalTotalWeight = originalResult.foods.reduce((sum, f) => sum + (f.portion_size || 100), 0);

    // Handle alphanumeric input
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

    const updated = { ...editableResult };

    // Apply multiplier to ORIGINAL foods, not current state
    updated.foods = originalResult.foods.map(food => {
      const basePortionSize = food.base_portion_size || 100;
      const newPortionSize = (food.portion_size || basePortionSize) * multiplier;
      const actualMultiplier = newPortionSize / basePortionSize;

      return {
        ...food,
        portion_size: newPortionSize,
        portion_display: `${Math.round(newPortionSize)}g`,
        calories: Math.round(food.base_calories * actualMultiplier),
        protein_g: parseFloat((food.base_protein_g * actualMultiplier).toFixed(1)),
        carbs_g: parseFloat((food.base_carbs_g * actualMultiplier).toFixed(1)),
        fat_g: parseFloat((food.base_fat_g * actualMultiplier).toFixed(1)),
        fiber_g: parseFloat((food.base_fiber_g * actualMultiplier).toFixed(1)),
      };
    });

    // Recalculate totals
    updated.total_nutrition = {
      calories: updated.foods.reduce((sum, f) => sum + (parseFloat(f.calories) || 0), 0),
      protein_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.protein_g) || 0), 0),
      carbs_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.carbs_g) || 0), 0),
      fat_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.fat_g) || 0), 0),
      fiber_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.fiber_g) || 0), 0),
    };

    setEditableResult(updated);
    
    // Auto-update meal name if not manually edited
    if (!isNameManuallyEdited) {
      const dynamicName = generateDynamicMealName(updated, mealMultiplier);
      setCustomMealName(dynamicName);
    }
  };

  const resetToOriginal = () => {
    if (originalResult) {
      setEditableResult(JSON.parse(JSON.stringify(originalResult))); // Deep copy
      setMealMultiplier(1);
    }
  };

  const updateFood = (index, field, value) => {
    // Create deep copy to ensure React detects state change
    const updated = {
      ...editableResult,
      foods: [...editableResult.foods.map((f, i) => i === index ? { ...f } : f)]
    };
    updated.foods[index][field] = value;

    // If updating base values, recalculate current values
    if (field.startsWith('base_')) {
      const basePortionSize = updated.foods[index].base_portion_size || 100;
      const multiplier = updated.foods[index].portion_size / basePortionSize;
      const baseField = field.replace('base_', '');
      updated.foods[index][baseField] = parseFloat(value) * multiplier;
    }

    // Recalculate totals
    updated.total_nutrition = {
      calories: updated.foods.reduce((sum, f) => sum + (parseFloat(f.calories) || 0), 0),
      protein_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.protein_g) || 0), 0),
      carbs_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.carbs_g) || 0), 0),
      fat_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.fat_g) || 0), 0),
      fiber_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.fiber_g) || 0), 0),
    };

    setEditableResult(updated);
    
    // Auto-update meal name if not manually edited
    if (!isNameManuallyEdited) {
      const dynamicName = generateDynamicMealName(updated, mealMultiplier);
      setCustomMealName(dynamicName);
    }
  };

  const removeFood = (index) => {
    const updated = { ...editableResult };
    updated.foods.splice(index, 1);

    // Recalculate totals
    updated.total_nutrition = {
      calories: updated.foods.reduce((sum, f) => sum + (parseFloat(f.calories) || 0), 0),
      protein_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.protein_g) || 0), 0),
      carbs_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.carbs_g) || 0), 0),
      fat_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.fat_g) || 0), 0),
      fiber_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.fiber_g) || 0), 0),
    };

    setEditableResult(updated);
    
    // Auto-update meal name if not manually edited
    if (!isNameManuallyEdited) {
      const dynamicName = generateDynamicMealName(updated, mealMultiplier);
      setCustomMealName(dynamicName);
    }
  };

  const saveAsCustomFood = async (index) => {
    const food = editableResult.foods[index];
    const foodName = prompt(`Save "${food.name}" as custom food? Enter a name:`, food.name);

    if (!foodName) return; // User cancelled

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Convert base values to per 100g for consistency
      const basePortionSize = food.base_portion_size || 100;
      const conversionMultiplier = 100 / basePortionSize;

      const { error } = await supabase
        .from('user_foods')
        .insert([{
          user_id: user.id,
          name: foodName,
          base_calories: Math.round(food.base_calories * conversionMultiplier),
          base_protein_g: parseFloat((food.base_protein_g * conversionMultiplier).toFixed(1)),
          base_carbs_g: parseFloat((food.base_carbs_g * conversionMultiplier).toFixed(1)),
          base_fat_g: parseFloat((food.base_fat_g * conversionMultiplier).toFixed(1)),
          base_fiber_g: parseFloat((food.base_fiber_g * conversionMultiplier).toFixed(1)),
          source: 'edited_from_ai',
          original_food_name: food.name
        }]);

      if (error) {
        alert('Failed to save custom food: ' + error.message);
      } else {
        alert(`"${foodName}" saved as custom food!`);

        // Update the food name in the current meal
        const updated = { ...editableResult, foods: [...editableResult.foods] };
        updated.foods[index] = { ...updated.foods[index], name: foodName };
        setEditableResult(updated);

        // Update meal name if not manually edited
        if (!isNameManuallyEdited) {
          const dynamicName = generateDynamicMealName(updated, mealMultiplier);
          setCustomMealName(dynamicName);
        }
      }
    } catch (err) {
      alert('Failed to save custom food: ' + err.message);
    }
  };

  const saveEntireMealAsCustomFood = async () => {
    if (!editableResult || !editableResult.foods || editableResult.foods.length === 0) return;

    const baseMealName = editableResult.foods.map(f => f.name).join(', ');
    const foodName = prompt(`Save this entire meal as a reusable custom food? Enter a name:`, baseMealName);

    if (!foodName) return; // User cancelled

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Calculate base nutrition values per 100g from current total
      const totalWeight = editableResult.foods.reduce((sum, f) => sum + (f.portion_size || 100), 0);
      const totalCalories = editableResult.foods.reduce((sum, f) => sum + (parseFloat(f.calories) || 0), 0);
      const totalProtein = editableResult.foods.reduce((sum, f) => sum + (parseFloat(f.protein_g) || 0), 0);
      const totalCarbs = editableResult.foods.reduce((sum, f) => sum + (parseFloat(f.carbs_g) || 0), 0);
      const totalFat = editableResult.foods.reduce((sum, f) => sum + (parseFloat(f.fat_g) || 0), 0);
      const totalFiber = editableResult.foods.reduce((sum, f) => sum + (parseFloat(f.fiber_g) || 0), 0);

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
          source: 'photo_meal',
          original_food_name: baseMealName
        }]);

      if (error) {
        alert('Failed to save photo meal as custom food: ' + error.message);
      } else {
        alert(`"${foodName}" saved as custom food!\n\nNutrition per 100g:\n${baseCalories} cal | ${baseProtein}g P | ${baseCarbs}g C | ${baseFat}g F | ${baseFiber}g Fiber`);

        // Update the meal name to match the saved food name
        setCustomMealName(foodName);
        setIsNameManuallyEdited(true); // Mark as manually edited since user chose the name
      }
    } catch (err) {
      alert('Failed to save photo meal: ' + err.message);
    }
  };

  const addManualFood = () => {
    setShowFoodSearch(true);
  };

  const handleFoodSelect = (food) => {
    const updated = { ...editableResult };
    updated.foods.push({
      name: food.name,
      portion: food.portion || '100g',
      portion_size: 100,
      portion_display: '1', // Default to "1" (representing 100g)
      portion_unit: 'g',
      base_calories: food.calories,
      base_protein_g: food.protein_g,
      base_carbs_g: food.carbs_g,
      base_fat_g: food.fat_g,
      base_fiber_g: food.fiber_g || 0,
      base_portion_size: 100, // Database foods are per 100g
      calories: food.calories,
      protein_g: food.protein_g,
      carbs_g: food.carbs_g,
      fat_g: food.fat_g,
      fiber_g: food.fiber_g || 0,
      confidence: 1.0,
    });

    // Recalculate totals
    updated.total_nutrition = {
      calories: updated.foods.reduce((sum, f) => sum + (parseFloat(f.calories) || 0), 0),
      protein_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.protein_g) || 0), 0),
      carbs_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.carbs_g) || 0), 0),
      fat_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.fat_g) || 0), 0),
      fiber_g: updated.foods.reduce((sum, f) => sum + (parseFloat(f.fiber_g) || 0), 0),
    };

    setEditableResult(updated);
    setShowFoodSearch(false);
    
    // Auto-update meal name if not manually edited
    if (!isNameManuallyEdited) {
      const dynamicName = generateDynamicMealName(updated, mealMultiplier);
      setCustomMealName(dynamicName);
    }
  };

  const saveMeal = async () => {
    if (!editableResult) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Create the meal as a compound food
      // Calculate aggregate portion info for display in title
      const totalPortionSize = editableResult.foods.reduce((sum, f) => sum + (f.portion_size || 100), 0);

      // Use custom meal name (user can edit this)
      const baseMealName = customMealName || generateDynamicMealName();

      const { data: mealData, error: mealError } = await supabase
        .from('meals')
        .insert([
          {
            user_id: user.id,
            meal_name: baseMealName,
            meal_type: editableResult.meal_type,
            total_calories: Math.round(editableResult.total_nutrition.calories),
            total_protein_g: parseFloat(editableResult.total_nutrition.protein_g.toFixed(1)),
            total_carbs_g: parseFloat(editableResult.total_nutrition.carbs_g.toFixed(1)),
            total_fat_g: parseFloat(editableResult.total_nutrition.fat_g.toFixed(1)),
            total_fiber_g: parseFloat(editableResult.total_nutrition.fiber_g.toFixed(1)),
            is_ai_analyzed: true,
            is_compound: editableResult.foods.length > 1,
            portion_size: totalPortionSize,
            portion_unit: 'g',
            notes: notes || null,
            photo_url: photoUrl || null,
          },
        ])
        .select();

      if (mealError) throw mealError;

      // Save individual components if it's a compound food
      if (editableResult.foods.length > 1 && mealData[0]) {
        const components = editableResult.foods.map(food => ({
          meal_id: mealData[0].id,
          component_name: food.name,
          portion_size: food.portion_size || 100,
          portion_unit: food.portion_unit || 'g',
          base_calories: food.base_calories,
          base_protein_g: food.base_protein_g,
          base_carbs_g: food.base_carbs_g,
          base_fat_g: food.base_fat_g,
          base_fiber_g: food.base_fiber_g || 0,
        }));

        const { error: componentsError } = await supabase
          .from('meal_components')
          .insert(components);

        if (componentsError) {
          console.error('Failed to save components:', componentsError);
          // Continue anyway - meal is saved
        }
      }

      // Reset form
      setSelectedFile(null);
      setPreview(null);
      setResult(null);
      setEditableResult(null);
      setOriginalResult(null);
      setMealType('');
      setMealMultiplier(1);
      setNotes('');
      setPhotoUrl(null);
      setSavePhoto(true);
      setCustomMealName('');
      setIsNameManuallyEdited(false);

      // Update daily achievement for streak tracking
      await updateDailyAchievement(goals);

      if (onMealAdded) onMealAdded(mealData[0]);
    } catch (e) {
      console.error(e);
      setError('Failed to save meal: ' + e.message);
    }
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a]  shadow-sm p-6">
      <h2 className="text-2xl font-heading font-bold text-white mb-4">Photo Analysis</h2>

      {!preview && !result && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-[#1a1a1a]  p-14 min-h-[340px] flex items-center justify-center text-center hover:border-primary-700 transition cursor-pointer"
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="file-input"
          />
          <label htmlFor="file-input" className="cursor-pointer">
            <div className="text-6xl mb-4">📷</div>
            <p className="text-white/60 mb-2">Drop an image here or click to upload</p>
            <p className="text-sm text-white/60">Supported: JPG, PNG, HEIC</p>
          </label>
        </div>
      )}

      {preview && !result && (
        <div>
          <div className="relative">
            <img src={preview} alt="Preview" className="w-full  mb-4 max-h-64 object-cover" />
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreview(null);
                setMealType('');
                setMealMultiplier(1);
                setNotes('');
                setPhotoUrl(null);
                setCustomMealName('');
                setIsNameManuallyEdited(false);
              }}
              className="absolute top-2 right-2 bg-red-600 text-white  w-8 h-8 flex items-center justify-center hover:bg-red-700 transition shadow-lg"
              title="Remove photo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          {/* Meal Type Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-white/60 mb-2">
              Select Meal Type *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
                <button
                  key={type}
                  onClick={() => setMealType(type)}
                  className={`py-2 px-2 sm:px-4  border-2 transition capitalize text-xs sm:text-sm ${
                    mealType === type
                      ? 'border-primary-700 bg-primary-700/20 text-primary-700 font-semibold'
                      : 'border-[#1a1a1a] hover:border-primary-700/50 text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Save Photo Checkbox */}
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id="savePhoto"
              checked={savePhoto}
              onChange={(e) => setSavePhoto(e.target.checked)}
              className="w-4 h-4 text-primary-700 bg-black border-[#1a1a1a]  focus:ring-primary-700"
            />
            <label htmlFor="savePhoto" className="ml-2 text-sm text-white/60">
              Save photo with meal log (uncheck to analyze without saving photo)
            </label>
          </div>

          <button
            onClick={analyzeImage}
            disabled={analyzing || !mealType}
            className="w-full bg-primary-700 text-white py-3  hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? 'Analyzing...' : 'Analyze Photo'}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3  mt-4">
          {error}
        </div>
      )}

      {editableResult && (
        <div className="space-y-4">
          <div className="relative">
            <img src={preview} alt="Analyzed" className="w-full  max-h-48 object-cover" />
            <button
              onClick={() => {
                setResult(null);
                setOriginalResult(null);
                setEditableResult(null);
                setSelectedFile(null);
                setPreview(null);
                setMealType('');
                setMealMultiplier(1);
                setNotes('');
                setPhotoUrl(null);
                setCustomMealName('');
                setIsNameManuallyEdited(false);
              }}
              className="absolute top-2 right-2 bg-red-600 text-white  w-8 h-8 flex items-center justify-center hover:bg-red-700 transition shadow-lg"
              title="Remove photo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          <div className="bg-[#0a0a0a] border border-[#1a1a1a]  p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-white">Detected Foods:</h3>
              <button
                onClick={addManualFood}
                className="text-sm bg-primary-700 text-white px-3 py-1  hover:bg-primary-600"
              >
                + Add Food
              </button>
            </div>

            {/* Meal Multiplier */}
            <div className="mb-3 bg-black p-3  border-2 border-primary-700/30">
              <div className="flex items-center gap-3 mb-1">
                <label className="text-sm font-medium text-white/60 whitespace-nowrap">Meal Multiplier:</label>
                <input
                  type="text"
                  value={mealMultiplier}
                  onChange={(e) => updateMealMultiplier(e.target.value)}
                  placeholder="1 or 2x or 250g"
                  className="flex-1 px-3 py-1.5 border border-[#1a1a1a]  focus:ring-2 focus:ring-primary-700 text-sm text-white bg-black"
                />
                <span className="text-xs font-semibold text-primary-700 whitespace-nowrap bg-primary-700/10 px-2 py-1 ">
                  Total: {Math.round(getTotalCompoundWeight())}g
                </span>
              </div>
              <p className="text-xs text-white/60">
                Enter a number (e.g., 2) to multiply all portions, or grams (e.g., 250g) to scale to that weight
              </p>
            </div>

            {showFoodSearch && (
              <div className="mb-3">
                <FoodSearchInput onFoodSelect={handleFoodSelect} />
                <button
                  onClick={() => setShowFoodSearch(false)}
                  className="mt-2 text-sm text-white/60 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            )}

            <ul className="space-y-2">
              {editableResult.foods.map((food, idx) => (
                <li key={idx} className="bg-black p-3  border border-[#1a1a1a]">
                  {editingIndex === idx ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={food.name}
                        onChange={(e) => updateFood(idx, 'name', e.target.value)}
                        placeholder="Food name"
                        className="w-full px-2 py-1 border border-[#1a1a1a]  text-white bg-black"
                      />
                      <p className="text-xs text-white/60 font-medium">Edit base nutrition values (per 100{food.portion_unit}):</p>
                      <div className="overflow-x-auto -mx-3 px-3">
                        <div className="grid grid-cols-5 gap-2 min-w-[500px] sm:min-w-0">
                          <div>
                            <label className="text-[10px] sm:text-xs text-white/60 block mb-0.5">Calories</label>
                            <input
                              type="number"
                              min="0"
                              value={food.base_calories}
                              onChange={(e) => updateFood(idx, 'base_calories', parseFloat(e.target.value) || 0)}
                              className="w-full px-1 sm:px-2 py-1 border border-[#1a1a1a]  text-xs sm:text-sm text-white bg-black"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] sm:text-xs text-white/60 block mb-0.5">Protein (g)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={food.base_protein_g}
                              onChange={(e) => updateFood(idx, 'base_protein_g', parseFloat(e.target.value) || 0)}
                              className="w-full px-1 sm:px-2 py-1 border border-[#1a1a1a]  text-xs sm:text-sm text-white bg-black"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] sm:text-xs text-white/60 block mb-0.5">Carbs (g)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={food.base_carbs_g}
                              onChange={(e) => updateFood(idx, 'base_carbs_g', parseFloat(e.target.value) || 0)}
                              className="w-full px-1 sm:px-2 py-1 border border-[#1a1a1a]  text-xs sm:text-sm text-white bg-black"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] sm:text-xs text-white/60 block mb-0.5">Fat (g)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={food.base_fat_g}
                              onChange={(e) => updateFood(idx, 'base_fat_g', parseFloat(e.target.value) || 0)}
                              className="w-full px-1 sm:px-2 py-1 border border-[#1a1a1a]  text-xs sm:text-sm text-white bg-black"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] sm:text-xs text-white/60 block mb-0.5">Fiber (g)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={food.base_fiber_g}
                              onChange={(e) => updateFood(idx, 'base_fiber_g', parseFloat(e.target.value) || 0)}
                              className="w-full px-1 sm:px-2 py-1 border border-[#1a1a1a]  text-xs sm:text-sm text-white bg-black"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="text-sm bg-primary-700 text-white px-3 py-1  hover:bg-primary-600"
                        >
                          Done
                        </button>
                        <button
                          onClick={() => saveAsCustomFood(idx)}
                          className="text-sm bg-secondary-500 text-white px-3 py-1  hover:bg-secondary-400"
                        >
                          Save as Custom Food
                        </button>
                        <button
                          onClick={() => removeFood(idx)}
                          className="text-sm bg-red-500 text-white px-3 py-1  hover:bg-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-white">{food.name}</p>
                          <p className="text-xs text-white/60">
                            Base: {food.base_calories} cal per {food.base_portion_size || 100}{food.portion_unit} (enter {food.base_portion_size || 100}{food.portion_unit} or 1)
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveAsCustomFood(idx)}
                            className="text-xs bg-secondary-500 text-white px-2 py-1  hover:bg-secondary-400"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingIndex(idx)}
                            className="text-sm text-primary-700 hover:text-primary-600"
                          >
                            Edit Manually
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <div className="flex-1 w-full sm:w-auto">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-1">
                            <label className="text-xs sm:text-sm text-white/60 sm:w-24">Count (g or x):</label>
                            <input
                              type="text"
                              value={food.portion_display}
                              onChange={(e) => updateFoodQuantity(idx, e.target.value)}
                              placeholder="e.g., 150g or 2"
                              className="flex-1 w-full sm:w-auto px-2 sm:px-3 py-1 border border-[#1a1a1a]  focus:ring-2 focus:ring-primary-700 text-xs sm:text-sm text-white bg-black"
                            />
                          </div>
                          <p className="text-[10px] sm:text-xs text-white/60 sm:ml-24">
                            <span className="font-semibold text-primary-700">{food.base_portion_size || 100}g = 1</span> • Total: {Math.round(food.portion_size)}g
                          </p>
                        </div>
                      </div>

                      <div className="bg-[#0a0a0a] p-2  text-sm">
                        <div className="grid grid-cols-5 gap-1 text-center overflow-x-auto">
                          <div className="min-w-[60px]">
                            <p className="font-bold font-mono text-green-500 text-xs sm:text-sm">{food.calories}</p>
                            <p className="text-[10px] sm:text-xs text-white/60">cal</p>
                          </div>
                          <div className="min-w-[60px]">
                            <p className="font-bold font-mono text-red-500 text-xs sm:text-sm">{food.protein_g}g</p>
                            <p className="text-[10px] sm:text-xs text-white/60">P</p>
                          </div>
                          <div className="min-w-[60px]">
                            <p className="font-bold font-mono text-yellow-500 text-xs sm:text-sm">{food.carbs_g}g</p>
                            <p className="text-[10px] sm:text-xs text-white/60">C</p>
                          </div>
                          <div className="min-w-[60px]">
                            <p className="font-bold font-mono text-purple-500 text-xs sm:text-sm">{food.fat_g}g</p>
                            <p className="text-[10px] sm:text-xs text-white/60">F</p>
                          </div>
                          <div className="min-w-[60px]">
                            <p className="font-bold font-mono text-blue-500 text-xs sm:text-sm">{food.fiber_g}g</p>
                            <p className="text-[10px] sm:text-xs text-white/60">Fiber</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-x-auto -mx-4 px-4">
            <div className="grid grid-cols-5 gap-2 min-w-[500px] sm:min-w-0">
              <div className="text-center p-2 sm:p-3 bg-green-500/10  border border-green-500/30">
                <p className="text-lg sm:text-xl font-bold font-mono text-green-500">{Math.round(editableResult.total_nutrition.calories)}</p>
                <p className="text-[10px] sm:text-xs text-white/60">Calories</p>
              </div>
              <div className="text-center p-2 sm:p-3 bg-red-500/10  border border-red-500/30">
                <p className="text-lg sm:text-xl font-bold font-mono text-red-500">{editableResult.total_nutrition.protein_g.toFixed(1)}g</p>
                <p className="text-[10px] sm:text-xs text-white/60">Protein</p>
              </div>
              <div className="text-center p-2 sm:p-3 bg-yellow-500/10  border border-yellow-500/30">
                <p className="text-lg sm:text-xl font-bold font-mono text-yellow-500">{editableResult.total_nutrition.carbs_g.toFixed(1)}g</p>
                <p className="text-[10px] sm:text-xs text-white/60">Carbs</p>
              </div>
              <div className="text-center p-2 sm:p-3 bg-purple-500/10  border border-purple-500/30">
                <p className="text-lg sm:text-xl font-bold font-mono text-purple-500">{editableResult.total_nutrition.fat_g.toFixed(1)}g</p>
                <p className="text-[10px] sm:text-xs text-white/60">Fat</p>
              </div>
              <div className="text-center p-2 sm:p-3 bg-blue-500/10  border border-blue-500/30">
                <p className="text-lg sm:text-xl font-bold font-mono text-blue-500">{editableResult.total_nutrition.fiber_g.toFixed(1)}g</p>
                <p className="text-[10px] sm:text-xs text-white/60">Fiber</p>
              </div>
            </div>
          </div>

          {editableResult.recommendations && (
            <div className="bg-amber-500/10 border border-amber-500/30  p-3">
              <p className="text-sm text-white">{editableResult.recommendations}</p>
            </div>
          )}

          {/* Meal Name Editor */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              Meal Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customMealName}
                onChange={(e) => handleMealNameChange(e.target.value)}
                placeholder="Enter meal name"
                className="flex-1 px-3 py-2 border border-[#1a1a1a]  focus:ring-2 focus:ring-primary-700 focus:border-transparent text-white bg-black"
              />
              <button
                onClick={resetMealName}
                className="px-4 py-2 bg-[#0a0a0a] border border-[#1a1a1a] text-white  hover:bg-black transition whitespace-nowrap"
                title="Reset to dynamic name"
              >
                Reset
              </button>
            </div>
            {isNameManuallyEdited && (
              <p className="text-xs text-white/60 mt-1">
                Original: {generateDynamicMealName()}
              </p>
            )}
          </div>

          {/* Meal Notes */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              Add Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this meal (e.g., where you ate, how you felt, special ingredients...)"
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 border border-[#1a1a1a]  focus:ring-2 focus:ring-primary-700 focus:border-transparent text-white bg-black resize-none"
            />
            <p className="text-xs text-white/60 mt-1">
              {notes.length}/500 characters
            </p>
          </div>

          <div className="space-y-2">
            {/* Save as My Food button */}
            <button
              onClick={saveEntireMealAsCustomFood}
              className="w-full bg-secondary-500 text-white py-2.5  hover:bg-secondary-400 transition shadow-md font-medium"
            >
              Save Entire Meal as My Food
            </button>

            <div className="flex gap-2">
              <button
                onClick={saveMeal}
                className="flex-1 bg-primary-700 text-white py-3  hover:bg-primary-600 transition"
              >
                Save Meal
              </button>
              <button
                onClick={resetToOriginal}
                className="px-6 py-3 bg-[#0a0a0a] border border-[#1a1a1a] text-white  hover:bg-black transition"
                title="Reset to AI-detected values"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
