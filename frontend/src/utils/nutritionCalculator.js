/**
 * Calculate BMI (Body Mass Index)
 * @param {number} weight_kg - Weight in kilograms
 * @param {number} height_cm - Height in centimeters
 * @returns {number} BMI value
 */
export function calculateBMI(weight_kg, height_cm) {
  const height_m = height_cm / 100;
  return weight_kg / (height_m * height_m);
}

/**
 * Get BMI category
 * @param {number} bmi - BMI value
 * @returns {Object} Category info with label and color
 */
export function getBMICategory(bmi) {
  if (bmi < 18.5) {
    return { label: 'Underweight', color: '#3b82f6' }; // blue
  } else if (bmi < 25) {
    return { label: 'Normal weight', color: '#22c55e' }; // green
  } else if (bmi < 30) {
    return { label: 'Overweight', color: '#f59e0b' }; // orange
  } else {
    return { label: 'Obese', color: '#ef4444' }; // red
  }
}

/**
 * Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation
 * @param {number} weight_kg - Weight in kilograms
 * @param {number} height_cm - Height in centimeters
 * @param {number} age - Age in years
 * @param {string} gender - 'male' or 'female'
 * @returns {number} BMR in calories
 */
export function calculateBMR(weight_kg, height_cm, age, gender) {
  const baseCalculation = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  
  if (gender === 'male') {
    return baseCalculation + 5;
  } else if (gender === 'female') {
    return baseCalculation - 161;
  } else {
    // For 'other', use average of male and female
    return baseCalculation - 78;
  }
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE)
 * @param {number} bmr - Basal Metabolic Rate
 * @param {string} activityLevel - Activity level
 * @returns {number} TDEE in calories
 */
export function calculateTDEE(bmr, activityLevel) {
  const activityMultipliers = {
    sedentary: 1.2,           // Little to no exercise
    lightly_active: 1.375,    // Light exercise 1-3 days/week
    moderately_active: 1.55,  // Moderate exercise 3-5 days/week
    very_active: 1.725,       // Heavy exercise 6-7 days/week
    extra_active: 1.9         // Very heavy exercise, physical job
  };
  
  return Math.round(bmr * (activityMultipliers[activityLevel] || 1.2));
}

/**
 * Adjust calories based on goal (lose/maintain/gain weight)
 * @param {number} tdee - Total Daily Energy Expenditure
 * @param {string} goalType - 'lose', 'maintain', or 'gain'
 * @param {number} customAmount - Custom calorie adjustment amount (optional)
 * @returns {number} Adjusted calories
 */
export function adjustCaloriesForGoal(tdee, goalType, customAmount = null) {
  switch (goalType) {
    case 'lose': {
      const deficit = customAmount || 500;
      return Math.round(tdee - deficit);
    }
    case 'gain': {
      const surplus = customAmount || 300;
      return Math.round(tdee + surplus);
    }
    case 'maintain':
    default:
      return tdee;
  }
}

/**
 * Get protein intake target (g/kg/day) based on goal and activity level
 * @param {string} goalType - 'lose', 'maintain', or 'gain'
 * @param {string} activityLevel - Activity level
 * @returns {number} Protein per kg (midpoint of range)
 */
export function getProteinPerKg(goalType, activityLevel) {
  // Protein targets in g/kg/day based on goal and activity level
  // Values are midpoints of the ranges from research-based guidelines
  const proteinTargets = {
    lose: {
      sedentary: 1.7,        // 1.6-1.8
      lightly_active: 1.9,   // 1.8-2.0
      moderately_active: 2.1, // 2.0-2.2
      very_active: 2.3,      // 2.2-2.4
      extra_active: 2.45     // 2.3-2.6
    },
    maintain: {
      sedentary: 1.3,        // 1.2-1.4
      lightly_active: 1.5,   // 1.4-1.6
      moderately_active: 1.7, // 1.6-1.8
      very_active: 1.9,      // 1.8-2.0
      extra_active: 2.1      // 2.0-2.2
    },
    gain: {
      sedentary: 1.7,        // 1.6-1.8
      lightly_active: 1.9,   // 1.8-2.0
      moderately_active: 2.1, // 2.0-2.2
      very_active: 2.3,      // 2.2-2.4
      extra_active: 2.5      // 2.4-2.6
    }
  };

  const goalTargets = proteinTargets[goalType] || proteinTargets.maintain;
  return goalTargets[activityLevel] || goalTargets.sedentary;
}

/**
 * Calculate macronutrient targets
 * @param {number} calories - Total daily calories
 * @param {number} weight_kg - Weight in kilograms
 * @param {string} goalType - 'lose', 'maintain', or 'gain'
 * @param {string} activityLevel - Activity level
 * @returns {Object} Macro targets {protein, carbs, fat, fiber}
 */
export function calculateMacros(calories, weight_kg, goalType, activityLevel = 'sedentary') {
  // Get protein target based on goal and activity level
  const proteinPerKg = getProteinPerKg(goalType, activityLevel);

  const protein = Math.round(weight_kg * proteinPerKg);
  const proteinCalories = protein * 4; // 4 calories per gram of protein

  // Fat: 25-30% of total calories (0.8-1g per kg)
  const fatPercentage = 0.27; // 27% of calories from fat
  const fatCalories = Math.round(calories * fatPercentage);
  const fat = Math.round(fatCalories / 9); // 9 calories per gram of fat

  // Carbs: Fill remaining calories
  const remainingCalories = calories - proteinCalories - fatCalories;
  const carbs = Math.round(remainingCalories / 4); // 4 calories per gram of carbs

  // Fiber: 14g per 1000 calories (standard dietary recommendation)
  const fiber = Math.round((calories / 1000) * 14);

  return {
    calories,
    protein,
    carbs,
    fat,
    fiber
  };
}

/**
 * Calculate all nutrition goals from profile
 * @param {Object} profile - User profile object
 * @returns {Object} Complete nutrition goals
 */
export function calculateGoalsFromProfile(profile) {
  const { weight_kg, height_cm, age, gender, activity_level, goal_type, calorie_adjustment } = profile;
  
  // Calculate BMR
  const bmr = calculateBMR(weight_kg, height_cm, age, gender);
  
  // Calculate TDEE
  const tdee = calculateTDEE(bmr, activity_level);
  
  // Adjust for goal with custom amount
  const targetCalories = adjustCaloriesForGoal(tdee, goal_type, calorie_adjustment);
  
  // Calculate macros
  const macros = calculateMacros(targetCalories, weight_kg, goal_type);
  
  return {
    ...macros,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee)
  };
}

