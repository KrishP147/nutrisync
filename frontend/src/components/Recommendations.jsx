import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useGoals } from '../contexts/GoalsContext';
import { AnimatePresence } from 'motion/react';
import api from '../services/api';

export default function Recommendations({ limit = 3, refreshTrigger = 0 }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dietaryRestrictions, setDietaryRestrictions] = useState([]);
  const [showRegeneratePopup, setShowRegeneratePopup] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [mealCount, setMealCount] = useState(0);
  const cooldownIntervalRef = useRef(null);
  const hasInitializedRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const { goals } = useGoals();

  // Memoize goals to prevent unnecessary re-renders
  const goalsKey = useMemo(() => 
    `${goals?.calories || 0}-${goals?.protein || 0}-${goals?.carbs || 0}-${goals?.fat || 0}-${goals?.fiber || 0}`,
    [goals?.calories, goals?.protein, goals?.carbs, goals?.fat, goals?.fiber]
  );

  // Memoize dietary restrictions key
  const dietaryRestrictionsKey = useMemo(() =>
    dietaryRestrictions.sort().join(','),
    [dietaryRestrictions]
  );

  // Generate recommendations function - memoized
  const generateRecommendations = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      // Get today's meals
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: meals } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .gte('consumed_at', today.toISOString())
        .lt('consumed_at', tomorrow.toISOString());

      // Update meal count
      const currentMealCount = meals?.length || 0;
      setMealCount(currentMealCount);

      // Calculate current intake
      const totals = (meals || []).reduce((acc, meal) => ({
        calories: acc.calories + (meal.total_calories || 0),
        protein: acc.protein + (meal.total_protein_g || 0),
        carbs: acc.carbs + (meal.total_carbs_g || 0),
        fat: acc.fat + (meal.total_fat_g || 0),
        fiber: acc.fiber + (meal.total_fiber_g || 0)
      }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

      const userGoals = {
        calories: goals?.calories || 2000,
        protein: goals?.protein || 150,
        carbs: goals?.carbs || 250,
        fat: goals?.fat || 65,
        fiber: goals?.fiber || 30
      };

      // Try to get AI recommendations from backend
      try {
        const lacking = {
          calories: Math.max(0, userGoals.calories - totals.calories),
          protein: Math.max(0, userGoals.protein - totals.protein),
          carbs: Math.max(0, userGoals.carbs - totals.carbs),
          fat: Math.max(0, userGoals.fat - totals.fat),
          fiber: Math.max(0, userGoals.fiber - totals.fiber)
        };

        const response = await api.post('/api/generate-food-recommendations', {
          goals: userGoals,
          current: totals,
          lacking: lacking,
          type: 'toEat',
          dietaryRestrictions: dietaryRestrictions,
          forceRefresh: forceRefresh
        });

        if (response.data?.foodsToEat?.length > 0) {
          // Convert AI response format to recommendations format
          const aiRecs = response.data.foodsToEat.map((food, idx) => ({
            id: `ai-${idx}-${Date.now()}`,
            type: 'eat',
            title: food.name,
            description: food.reason,
            priority: food.score >= 90 ? 'high' : food.score >= 75 ? 'medium' : 'low',
            color: 'primary'
          }));
          setRecommendations(aiRecs.slice(0, limit));
          setLoading(false);
          return;
        }
      } catch (apiError) {
        console.error('AI recommendations failed:', apiError);
        setRecommendations([{
          id: 'error',
          type: 'info',
          title: 'Could not generate meal suggestions at the moment',
          description: 'Please try again later or refresh the page.',
          priority: 'low',
          color: 'amber'
        }]);
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
      setRecommendations([{
        id: 'error',
        type: 'info',
        title: 'Keep tracking',
        description: 'Log more meals to get personalized recommendations.',
        priority: 'low',
        color: 'primary'
      }]);
    } finally {
      setLoading(false);
    }
  }, [goals, dietaryRestrictions, limit]);

  // Fetch dietary restrictions and meal count, set up subscriptions
  useEffect(() => {
    let channel = null;

    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch dietary restrictions
      const { data: profileData } = await supabase
        .from('user_profile')
        .select('dietary_restrictions')
        .eq('user_id', user.id)
        .single();

      if (profileData?.dietary_restrictions) {
        setDietaryRestrictions(profileData.dietary_restrictions);
      }

      // Fetch today's meal count for auto-refresh
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: meals } = await supabase
        .from('meals')
        .select('id')
        .eq('user_id', user.id)
        .gte('consumed_at', today.toISOString())
        .lt('consumed_at', tomorrow.toISOString());

      setMealCount(meals?.length || 0);

      // Set up real-time subscription for meals (only once)
      if (!channel) {
        channel = supabase
          .channel('meals-changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'meals',
            filter: `user_id=eq.${user.id}`
          }, () => {
            // Refresh meal count - this will trigger auto-refresh useEffect with forceRefresh=true
            fetchData();
          })
          .subscribe();
      }
    };

    fetchData();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Start loading immediately on mount (use cache for initial load)
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      // Initial load: use cache (fast)
      generateRecommendations(false);
      // Mark that initial load is done
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh when goals, dietary restrictions, meal count, or refreshTrigger changes
  // Force refresh (bypass cache) when any of these change
  useEffect(() => {
    if (hasInitializedRef.current && !isInitialLoadRef.current) {
      // Any change after initial load: force refresh (bypass cache)
      generateRecommendations(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalsKey, dietaryRestrictionsKey, mealCount, refreshTrigger]);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownSeconds > 0) {
      cooldownIntervalRef.current = setInterval(() => {
        setCooldownSeconds(prev => {
          if (prev <= 1) {
            if (cooldownIntervalRef.current) {
              clearInterval(cooldownIntervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    }

    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, [cooldownSeconds]);

  const handleRefresh = async () => {
    if (cooldownSeconds > 0) return;
    
    setShowRegeneratePopup(true);
  };

  const handleConfirmRegenerate = async () => {
    setShowRegeneratePopup(false);
    setRefreshing(true);
    setCooldownSeconds(60); // 60 second cooldown
    await generateRecommendations(true); // Force refresh
    setRefreshing(false);
  };

  const colorClasses = {
    primary: {
      bg: 'bg-primary-700/10',
      border: 'border-primary-700/30',
      text: 'text-primary-500',
      icon: 'text-primary-500'
    },
    secondary: {
      bg: 'bg-secondary-500/10',
      border: 'border-secondary-500/30',
      text: 'text-secondary-400',
      icon: 'text-secondary-400'
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      icon: 'text-amber-400'
    }
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-heading font-semibold text-white">AI Insights</h2>
        </div>
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 ">
          <p className="text-amber-400 text-sm">
            Generating recommendations... This may take 1-2 minutes as we analyze your goals and intake.
          </p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-white/5 " />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-heading font-semibold text-white">AI Insights</h2>
          <p className="text-white/50 text-sm">Personalized recommendations based on your intake</p>
        </div>
        <div className="flex items-center gap-2">
          {cooldownSeconds > 0 && (
            <span className="text-white/40 text-xs">
              {cooldownSeconds}s
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing || cooldownSeconds > 0}
            className="p-2  bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            title={cooldownSeconds > 0 ? `Wait ${cooldownSeconds} seconds` : "Regenerate recommendations"}
          >
            {refreshing ? '...' : '↻'}
          </button>
        </div>
      </div>

      {/* Regenerate Confirmation Popup */}
      <AnimatePresence>
        {showRegeneratePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRegeneratePopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-white/10  p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Regenerate Recommendations</h3>
                <button
                  onClick={() => setShowRegeneratePopup(false)}
                  className="text-white/60 hover:text-white transition px-2 py-1"
                >
                  ×
                </button>
              </div>
              <p className="text-white/70 mb-6">
                This will generate new AI recommendations based on your current intake. This may take 1-2 minutes.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRegeneratePopup(false)}
                  className="flex-1 px-4 py-2  bg-white/5 hover:bg-white/10 text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRegenerate}
                  className="flex-1 px-4 py-2  bg-primary-600 hover:bg-primary-700 text-white transition"
                >
                  Regenerate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {recommendations.map((rec, index) => {
          const colors = colorClasses[rec.color] || colorClasses.primary;
          
          return (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4  ${colors.bg} border ${colors.border}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium ${colors.text} mb-1`}>{rec.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{rec.description}</p>
                </div>
                {rec.priority === 'high' && (
                  <span className="badge-amber text-xs">Priority</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
