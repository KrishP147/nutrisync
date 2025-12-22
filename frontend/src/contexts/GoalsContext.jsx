import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const GoalsContext = createContext();

export function useGoals() {
  const context = useContext(GoalsContext);
  if (!context) {
    throw new Error('useGoals must be used within a GoalsProvider');
  }
  return context;
}

export function GoalsProvider({ children }) {
  const [goals, setGoals] = useState({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 67,
    fiber: 28,
    // Fasting goals
    fasting_enabled: false,
    fasting_schedule_type: '16:8',
    fasting_duration_hours: 16,
    fasting_start_time: '20:00',
    meal_reminder_enabled: true
  });
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    fetchGoals();

    // Listen for auth state changes to refetch goals
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        fetchGoals();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.log('No user found, using default goals');
        setLoading(false);
        return;
      }

      console.log('Fetching goals for user:', user.id);

      const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('No goals found for user, using defaults');
        } else {
          console.error('Error fetching goals:', error);
        }
      }

      if (data) {
        const fetchedGoals = {
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fat: data.fat,
          fiber: data.fiber || 28,
          // Fasting fields
          fasting_enabled: data.fasting_enabled || false,
          fasting_schedule_type: data.fasting_schedule_type || '16:8',
          fasting_duration_hours: data.fasting_duration_hours || 16,
          fasting_start_time: data.fasting_start_time || '20:00',
          meal_reminder_enabled: data.meal_reminder_enabled !== false
        };
        console.log('Goals fetched successfully:', fetchedGoals);
        setGoals(fetchedGoals);
      } else {
        console.log('Using default goals');
      }
    } catch (error) {
      console.error('Error in fetchGoals:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateGoals = async (newGoals) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error('No user found when trying to save goals');
        alert('You must be logged in to save goals');
        return false;
      }

      console.log('Saving goals for user:', user.id, newGoals);

      // Use upsert to handle both insert and update
      const { data, error } = await supabase
        .from('user_goals')
        .upsert({
          user_id: user.id,
          calories: newGoals.calories,
          protein: newGoals.protein,
          carbs: newGoals.carbs,
          fat: newGoals.fat,
          fiber: newGoals.fiber,
          // Fasting fields
          fasting_enabled: newGoals.fasting_enabled,
          fasting_schedule_type: newGoals.fasting_schedule_type,
          fasting_duration_hours: newGoals.fasting_duration_hours,
          fasting_start_time: newGoals.fasting_start_time,
          meal_reminder_enabled: newGoals.meal_reminder_enabled
        }, {
          onConflict: 'user_id'
        })
        .select();

      if (error) {
        console.error('Error saving goals:', error);
        alert(`Failed to save goals: ${error.message}`);
        return false;
      }

      console.log('Goals saved successfully:', data);

      // Update local state
      setGoals(newGoals);
      return true;
    } catch (error) {
      console.error('Error in updateGoals:', error);
      alert(`Unexpected error saving goals: ${error.message}`);
      return false;
    }
  };

  return (
    <GoalsContext.Provider value={{ goals, updateGoals, loading, refreshGoals: fetchGoals }}>
      {children}
    </GoalsContext.Provider>
  );
}

