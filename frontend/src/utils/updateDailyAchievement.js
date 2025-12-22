import { supabase } from '../supabaseClient';

/**
 * Updates or creates a daily achievement entry for today.
 * Called after meal logging to keep streak data current.
 * @param {Object} goals - User's current goals { calories, protein, carbs, fat, fiber }
 */
export async function updateDailyAchievement(goals) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get today's date in local timezone
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Start and end of today
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // Get today's meals
    const { data: meals } = await supabase
      .from('meals')
      .select('total_calories, total_protein_g, total_carbs_g, total_fat_g, total_fiber_g')
      .eq('user_id', user.id)
      .gte('consumed_at', todayStart.toISOString())
      .lte('consumed_at', todayEnd.toISOString());

    if (!meals || meals.length === 0) return;

    // Calculate totals
    const totals = meals.reduce((acc, meal) => ({
      calories: acc.calories + (meal.total_calories || 0),
      protein: acc.protein + (meal.total_protein_g || 0),
      carbs: acc.carbs + (meal.total_carbs_g || 0),
      fat: acc.fat + (meal.total_fat_g || 0),
      fiber: acc.fiber + (meal.total_fiber_g || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

    // Get user's goals (use provided or defaults)
    const userGoals = {
      calories: goals?.calories || 2000,
      protein: goals?.protein || 150,
      carbs: goals?.carbs || 250,
      fat: goals?.fat || 65,
      fiber: goals?.fiber || 30,
    };

    // Upsert daily achievement
    await supabase.from('daily_achievements').upsert({
      user_id: user.id,
      achievement_date: todayStr,
      calories_goal: userGoals.calories,
      protein_goal: userGoals.protein,
      carbs_goal: userGoals.carbs,
      fat_goal: userGoals.fat,
      fiber_goal: userGoals.fiber,
      calories_actual: Math.round(totals.calories),
      protein_actual: parseFloat(totals.protein.toFixed(1)),
      carbs_actual: parseFloat(totals.carbs.toFixed(1)),
      fat_actual: parseFloat(totals.fat.toFixed(1)),
      fiber_actual: parseFloat(totals.fiber.toFixed(1)),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,achievement_date',
    });

  } catch (error) {
    console.error('Error updating daily achievement:', error);
  }
}

