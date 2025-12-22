import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { motion } from 'motion/react';
import {
  Flame,
  Beef,
  Wheat,
  Droplets,
  Leaf
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import MealList from '../components/MealList';
import { NutritionTimeline, CalorieFlowSankey, NutrientDensityScatter, MacroRatioTernary } from '../components/charts';
import { useGoals } from '../contexts/GoalsContext';
import ChartErrorBoundary from '../components/ChartErrorBoundary';
import FastingToggle from '../components/fasting/FastingToggle';
import RemindersCard from '../components/dashboard/RemindersCard';

export default function Dashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [todaysMeals, setTodaysMeals] = useState([]);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [totals, setTotals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0
  });
  const { goals } = useGoals();

  useEffect(() => {
    fetchTodaysMeals();
  }, [refreshTrigger]);

  const fetchTodaysMeals = async () => {
    setLoadingMeals(true);
    const { data: { user } } = await supabase.auth.getUser();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .gte('consumed_at', today.toISOString())
      .lt('consumed_at', tomorrow.toISOString())
      .order('consumed_at', { ascending: true });

    if (!error && data) {
      setTodaysMeals(data);

      // Calculate totals
      const newTotals = data.reduce((acc, meal) => ({
        calories: acc.calories + (meal.total_calories || 0),
        protein: acc.protein + (meal.total_protein_g || 0),
        carbs: acc.carbs + (meal.total_carbs_g || 0),
        fat: acc.fat + (meal.total_fat_g || 0),
        fiber: acc.fiber + (meal.total_fiber_g || 0)
      }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

      setTotals(newTotals);
    }
    setLoadingMeals(false);
  };

  const handleMealChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const getProgress = (current, goal) => {
    if (!goal || goal === 0) return 0;
    return Math.min(100, Math.round((current / goal) * 100));
  };

  const macroCards = [
    {
      label: 'Calories',
      current: Math.round(totals.calories),
      goal: goals?.calories || 2000,
      unit: 'kcal',
      icon: Flame,
      color: 'green',
      bgColor: 'bg-green-500/10',
      textColor: 'text-green-500',
      borderColor: 'border-green-500/30',
      barColor: 'bg-green-500'
    },
    {
      label: 'Protein',
      current: Math.round(totals.protein),
      goal: goals?.protein || 150,
      unit: 'g',
      icon: Beef,
      color: 'red',
      bgColor: 'bg-red-500/10',
      textColor: 'text-red-500',
      borderColor: 'border-red-500/30',
      barColor: 'bg-red-500'
    },
    {
      label: 'Carbs',
      current: Math.round(totals.carbs),
      goal: goals?.carbs || 250,
      unit: 'g',
      icon: Wheat,
      color: 'yellow',
      bgColor: 'bg-yellow-500/10',
      textColor: 'text-yellow-500',
      borderColor: 'border-yellow-500/30',
      barColor: 'bg-yellow-500'
    },
    {
      label: 'Fat',
      current: Math.round(totals.fat),
      goal: goals?.fat || 65,
      unit: 'g',
      icon: Droplets,
      color: 'purple',
      bgColor: 'bg-purple-500/10',
      textColor: 'text-purple-500',
      borderColor: 'border-purple-500/30',
      barColor: 'bg-purple-500'
    }
  ];

  return (
    <Sidebar>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-heading font-bold text-white"
          >
            Dashboard
          </motion.h1>
          <p className="text-white/50 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Fasting Toggle */}
        <FastingToggle />

        {/* Smart Reminders */}
        <RemindersCard />

        {/* Macro Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {macroCards.map((macro, index) => {
            const Icon = macro.icon;
            const progress = getProgress(macro.current, macro.goal);

            return (
              <motion.div
                key={macro.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`card p-5 ${macro.borderColor} border`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 ${macro.bgColor} flex items-center justify-center`}>
                    <Icon size={20} className={macro.textColor} strokeWidth={2} />
                  </div>
                  <span className="text-white/60 font-medium">{macro.label}</span>
                </div>

                <div className="mb-3">
                  <span className={`text-3xl font-mono font-bold ${macro.textColor}`}>
                    {macro.current}
                  </span>
                  <span className="text-white/40 text-sm ml-1">
                    / {macro.goal} {macro.unit}
                  </span>
                </div>

                <div className="progress-bar">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    className={`progress-fill ${macro.barColor}`}
                  />
                </div>
                <p className="text-xs text-white/40 mt-2">{progress}% of daily goal</p>
              </motion.div>
            );
          })}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Nutrition Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2"
          >
            <div className="card p-6">
              <div className="mb-6">
                <h2 className="text-lg font-heading font-semibold text-white">Nutrition Timeline</h2>
                <p className="text-white/50 text-sm">Calories consumed throughout the day</p>
              </div>

              {!loadingMeals && (
                <NutritionTimeline meals={todaysMeals} />
              )}
            </div>
          </motion.div>

          {/* Right Column - Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-6"
          >
            {/* Fiber Card */}
            <div className="card p-5 border-blue-500/30 border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/10 flex items-center justify-center">
                    <Leaf size={20} className="text-blue-500" strokeWidth={2} />
                  </div>
                  <span className="text-white/60 font-medium">Fiber</span>
                </div>
                <span className="text-xs text-blue-500">{getProgress(totals.fiber, goals?.fiber || 30)}%</span>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-mono font-bold text-blue-500">{Math.round(totals.fiber)}</span>
                <span className="text-white/40">/ {goals?.fiber || 30}g</span>
              </div>
              <div className="progress-bar">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${getProgress(totals.fiber, goals?.fiber || 30)}%` }}
                  transition={{ duration: 0.8 }}
                  className="progress-fill bg-blue-500"
                />
              </div>
            </div>

            {/* Meals Logged */}
            <div className="card p-5">
                <div className="mb-2">
                  <p className="text-white/60 text-sm">Meals Today</p>
                  <p className="text-2xl font-mono font-bold text-white">{todaysMeals.length}</p>
                </div>
            </div>

            {/* Remaining Calories */}
            <div className="card p-5 border-amber-500/20">
              <p className="text-white/60 text-sm mb-2">Remaining Calories</p>
              <p className="text-3xl font-mono font-bold text-amber-400">
                {Math.max(0, (goals?.calories || 2000) - Math.round(totals.calories))}
              </p>
              <p className="text-white/40 text-xs mt-1">kcal left today</p>
            </div>
          </motion.div>
        </div>

        {/* Calorie Flow Sankey */}
        {todaysMeals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="card p-6"
          >
              <div className="mb-6">
                <h2 className="text-lg font-heading font-semibold text-white">Calorie Flow</h2>
                <p className="text-white/50 text-sm">From meals to macros (Note: values measured in kcal)</p>
              </div>
            <ChartErrorBoundary>
              <CalorieFlowSankey meals={todaysMeals} />
            </ChartErrorBoundary>
          </motion.div>
        )}

        {/* Nutrient Density Scatter */}
        {todaysMeals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="card p-6"
          >
              <div className="mb-6">
                <h2 className="text-lg font-heading font-semibold text-white">Meal Quality</h2>
                <p className="text-white/50 text-sm">Nutrient density per meal</p>
              </div>
            <ChartErrorBoundary>
              <NutrientDensityScatter meals={todaysMeals} />
            </ChartErrorBoundary>
          </motion.div>
        )}

        {/* Macro Ratio Ternary */}
        {todaysMeals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="card p-6"
          >
              <div className="mb-6">
                <h2 className="text-lg font-heading font-semibold text-white">Macro Ratios</h2>
                <p className="text-white/50 text-sm">P/C/F balance per meal</p>
              </div>
            <ChartErrorBoundary>
              <MacroRatioTernary meals={todaysMeals} />
            </ChartErrorBoundary>
          </motion.div>
        )}

        {/* Recent Meals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading font-semibold text-white">Recent Meals</h2>
              <a href="/logging" className="text-primary-500 hover:text-primary-400 text-sm font-medium">
                View All
              </a>
          </div>

          <div className="card p-6 max-h-[500px] overflow-y-auto custom-scrollbar">
            <MealList
              refreshTrigger={refreshTrigger}
              onMealDeleted={handleMealChange}
              onMealUpdated={handleMealChange}
              limit={5}
            />
          </div>
        </motion.div>
      </div>
    </Sidebar>
  );
}

