import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { motion as Motion } from 'motion/react';
import {
  Flame,
  Beef,
  Wheat,
  Droplets,
  Leaf,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import { GitHubHeatmap, WeightBMIProgress, MealTypeDistribution, NutrientStreamGraph } from '../components/charts';
import SetGoals from '../components/SetGoals';
import { useGoals } from '../contexts/GoalsContext';
import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine, AreaChart, Area
} from 'recharts';
import ChartErrorBoundary from '../components/ChartErrorBoundary';
import { useFasting } from '../contexts/FastingContext';

export default function Progress() {
  const { goals } = useGoals();
  const [heatmapData, setHeatmapData] = useState({});
  const [barChartData, setBarChartData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [barChartView, setBarChartView] = useState('all');
  const [meals, setMeals] = useState([]);
  const [weeklyPatternView, setWeeklyPatternView] = useState('calories');
  const [weeklyData, setWeeklyData] = useState([]);
  const { getFastingHistory, getFastingStats } = useFasting();
  const [fastingHistory, setFastingHistory] = useState([]);
  const [fastingStats, setFastingStats] = useState(null);
  const [fastingChartData, setFastingChartData] = useState([]);

  // Time range state
  const [timeRange, setTimeRange] = useState('weekly'); // 'weekly', 'monthly', 'yearly'
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchProgressData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals, timeRange, currentDate]);

  const formatDateLocal = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (timeRange === 'weekly') {
      // Get start of week (Sunday)
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      // Get end of week (Saturday)
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (timeRange === 'monthly') {
      // Get start of month
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      // Get end of month
      end.setMonth(start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    } else if (timeRange === 'yearly') {
      // Get start of year
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      // Get end of year
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  };

  const navigateTime = (direction) => {
    const newDate = new Date(currentDate);

    if (timeRange === 'weekly') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else if (timeRange === 'monthly') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (timeRange === 'yearly') {
      newDate.setFullYear(newDate.getFullYear() + direction);
    }

    setCurrentDate(newDate);
  };

  const getTimeRangeLabel = () => {
    if (timeRange === 'weekly') {
      const { start, end } = getDateRange();
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (timeRange === 'monthly') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (timeRange === 'yearly') {
      return currentDate.getFullYear().toString();
    }
  };

  const isCurrentPeriod = () => {
    const now = new Date();
    if (timeRange === 'weekly') {
      const { start, end } = getDateRange();
      return now >= start && now <= end;
    } else if (timeRange === 'monthly') {
      return now.getMonth() === currentDate.getMonth() && now.getFullYear() === currentDate.getFullYear();
    } else if (timeRange === 'yearly') {
      return now.getFullYear() === currentDate.getFullYear();
    }
    return false;
  };

  const checkAndRecordAchievement = async (heatmap, goals) => {
    const today = new Date();
    const todayStr = formatDateLocal(today);
    const todayData = heatmap[todayStr];

    if (!todayData) return;

    const safeGoals = {
      calories: goals.calories || 2000,
      protein: goals.protein || 150,
      carbs: goals.carbs || 200,
      fat: goals.fat || 67,
      fiber: goals.fiber || 30,
    };

    const caloriesMet = todayData.calories >= safeGoals.calories * 0.9 && todayData.calories <= safeGoals.calories * 1.1;
    const proteinMet = todayData.protein >= safeGoals.protein;
    const carbsMet = todayData.carbs >= safeGoals.carbs * 0.9;
    const fatMet = todayData.fat >= safeGoals.fat * 0.9;
    const fiberMet = todayData.fiber >= safeGoals.fiber * 0.9;

    if (caloriesMet && proteinMet && carbsMet && fatMet && fiberMet) {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase
        .from('daily_achievements')
        .upsert({
          user_id: user.id,
          achievement_date: todayStr,
          calories_goal: safeGoals.calories,
          protein_goal: safeGoals.protein,
          carbs_goal: safeGoals.carbs,
          fat_goal: safeGoals.fat,
          fiber_goal: safeGoals.fiber,
          calories_actual: Math.round(todayData.calories),
          protein_actual: parseFloat(todayData.protein.toFixed(1)),
          carbs_actual: parseFloat(todayData.carbs.toFixed(1)),
          fat_actual: parseFloat(todayData.fat.toFixed(1)),
          fiber_actual: parseFloat(todayData.fiber.toFixed(1)),
        }, {
          onConflict: 'user_id,achievement_date'
        });
    }
  };

  const fetchProgressData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { start, end } = getDateRange();

      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .gte('consumed_at', start.toISOString())
        .lte('consumed_at', end.toISOString())
        .order('consumed_at', { ascending: true });

      if (!error && data) {
        setMeals(data);
        // Fetch fasting history for the same range
        const hist = await getFastingHistory(start, end);
        const stats = await getFastingStats(start, end);
        setFastingHistory(hist);
        setFastingStats(stats);

        await processData(data, hist);
      }
    } catch (error) {
      console.error('Error fetching progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processData = async (meals, hist = []) => {
    const safeGoals = {
      calories: goals?.calories || 2000,
      protein: goals?.protein || 150,
      carbs: goals?.carbs || 250,
      fat: goals?.fat || 67,
      fiber: goals?.fiber || 28
    };

    const { data: { user } } = await supabase.auth.getUser();

    // Reset all data states first
    if (!meals || meals.length === 0) {
      setHeatmapData({});
      setBarChartData([]);
      setWeeklyData([]);
      setFastingChartData([]);
      setStats({
        avgCalories: '0', avgProtein: '0', avgCarbs: '0', avgFat: '0', avgFiber: '0',
        proteinGoalRate: '0', calorieGoalRate: '0', goalsMetStreak: 0, totalDays: 0,
        totalMeals: 0, avgCaloriesPerMeal: 0
      });
      return;
    }

    const heatmap = {};

    meals.forEach(meal => {
      const dateObj = new Date(meal.consumed_at);
      const date = formatDateLocal(dateObj);

      if (!heatmap[date]) {
        heatmap[date] = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
      }

      heatmap[date].calories += meal.total_calories || 0;
      heatmap[date].protein += meal.total_protein_g || 0;
      heatmap[date].carbs += meal.total_carbs_g || 0;
      heatmap[date].fat += meal.total_fat_g || 0;
      heatmap[date].fiber += meal.total_fiber_g || 0;
    });

    setHeatmapData(heatmap);
    await checkAndRecordAchievement(heatmap, goals);

    // Process fasting history for charts
    const fastingHeatmap = {};
    hist.filter(f => f.status === 'completed').forEach(fast => {
      const date = formatDateLocal(new Date(fast.started_at));
      if (!fastingHeatmap[date]) fastingHeatmap[date] = 0;
      fastingHeatmap[date] += fast.actual_duration_hours || 0;
    });

    // Generate bar chart data based on timeRange
    let chartData = [];
    let fChartData = [];
    const { start, end } = getDateRange();

    if (timeRange === 'weekly') {
      // Show each day of the week
      const current = new Date(start);
      while (current <= end) {
        const dateStr = formatDateLocal(current);
        const dayData = heatmap[dateStr] || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
        const fDuration = fastingHeatmap[dateStr] || 0;

        const label = current.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });

        chartData.push({
          date: label,
          Calories: parseFloat(dayData.calories.toFixed(1)),
          Protein: parseFloat(dayData.protein.toFixed(1)),
          Carbs: parseFloat(dayData.carbs.toFixed(1)),
          Fat: parseFloat(dayData.fat.toFixed(1)),
          Fiber: parseFloat(dayData.fiber.toFixed(1)),
        });

        fChartData.push({
          date: label,
          hours: parseFloat(fDuration.toFixed(1))
        });

        current.setDate(current.getDate() + 1);
      }
    } else if (timeRange === 'monthly') {
      // Show weeks in the month
      const weekStart = new Date(start);
      let weekNum = 1;
      while (weekStart <= end) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        if (weekEnd > end) weekEnd.setTime(end.getTime());

        let weekTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, hours: 0, days: 0, fDays: 0 };
        const current = new Date(weekStart);
        while (current <= weekEnd && current <= end) {
          const dateStr = formatDateLocal(current);
          if (heatmap[dateStr]) {
            weekTotals.calories += heatmap[dateStr].calories;
            weekTotals.protein += heatmap[dateStr].protein;
            weekTotals.carbs += heatmap[dateStr].carbs;
            weekTotals.fat += heatmap[dateStr].fat;
            weekTotals.fiber += heatmap[dateStr].fiber;
            weekTotals.days++;
          }
          if (fastingHeatmap[dateStr]) {
            weekTotals.hours += fastingHeatmap[dateStr];
            weekTotals.fDays++;
          }
          current.setDate(current.getDate() + 1);
        }

        const avgDivisor = weekTotals.days || 1;
        const fAvgDivisor = weekTotals.fDays || 1;
        const label = `Week ${weekNum}`;

        chartData.push({
          date: label,
          Calories: parseFloat((weekTotals.calories / avgDivisor).toFixed(1)),
          Protein: parseFloat((weekTotals.protein / avgDivisor).toFixed(1)),
          Carbs: parseFloat((weekTotals.carbs / avgDivisor).toFixed(1)),
          Fat: parseFloat((weekTotals.fat / avgDivisor).toFixed(1)),
          Fiber: parseFloat((weekTotals.fiber / avgDivisor).toFixed(1)),
        });

        fChartData.push({
          date: label,
          hours: parseFloat((weekTotals.hours / fAvgDivisor).toFixed(1))
        });

        weekStart.setDate(weekStart.getDate() + 7);
        weekNum++;
      }
    } else if (timeRange === 'yearly') {
      // Show all 12 months
      const year = currentDate.getFullYear();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      for (let month = 0; month < 12; month++) {
        let monthTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, hours: 0, days: 0, fDays: 0 };
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          if (heatmap[dateStr]) {
            monthTotals.calories += heatmap[dateStr].calories;
            monthTotals.protein += heatmap[dateStr].protein;
            monthTotals.carbs += heatmap[dateStr].carbs;
            monthTotals.fat += heatmap[dateStr].fat;
            monthTotals.fiber += heatmap[dateStr].fiber;
            monthTotals.days++;
          }
          if (fastingHeatmap[dateStr]) {
            monthTotals.hours += fastingHeatmap[dateStr];
            monthTotals.fDays++;
          }
        }

        const avgDivisor = monthTotals.days || 1;
        const fAvgDivisor = monthTotals.fDays || 1;
        const label = monthNames[month];

        chartData.push({
          date: label,
          Calories: parseFloat((monthTotals.calories / avgDivisor).toFixed(1)),
          Protein: parseFloat((monthTotals.protein / avgDivisor).toFixed(1)),
          Carbs: parseFloat((monthTotals.carbs / avgDivisor).toFixed(1)),
          Fat: parseFloat((monthTotals.fat / avgDivisor).toFixed(1)),
          Fiber: parseFloat((monthTotals.fiber / avgDivisor).toFixed(1)),
        });

        fChartData.push({
          date: label,
          hours: parseFloat((monthTotals.hours / fAvgDivisor).toFixed(1))
        });
      }
    }

    setBarChartData(chartData);
    setFastingChartData(fChartData);

    const totalDays = Object.keys(heatmap).length;

    if (totalDays === 0) {
      setWeeklyData([]);
      setStats({
        avgCalories: '0', avgProtein: '0', avgCarbs: '0', avgFat: '0', avgFiber: '0',
        proteinGoalRate: '0', calorieGoalRate: '0', goalsMetStreak: 0, totalDays: 0,
        totalMeals: 0, avgCaloriesPerMeal: 0
      });
      return;
    }

    const avgCalories = Object.values(heatmap).reduce((sum, day) => sum + day.calories, 0) / totalDays;
    const avgProtein = Object.values(heatmap).reduce((sum, day) => sum + day.protein, 0) / totalDays;
    const avgCarbs = Object.values(heatmap).reduce((sum, day) => sum + day.carbs, 0) / totalDays;
    const avgFat = Object.values(heatmap).reduce((sum, day) => sum + day.fat, 0) / totalDays;
    const avgFiber = Object.values(heatmap).reduce((sum, day) => sum + day.fiber, 0) / totalDays;

    const daysHitProteinGoal = Object.values(heatmap).filter(day => day.protein >= safeGoals.protein).length;
    const daysHitCalorieGoal = Object.values(heatmap).filter(
      day => day.calories >= safeGoals.calories * 0.9 && day.calories <= safeGoals.calories * 1.1
    ).length;

    const { data: achievements } = await supabase
      .from('daily_achievements')
      .select('achievement_date')
      .eq('user_id', user.id)
      .order('achievement_date', { ascending: false });

    let currentStreak = 0;

    if (achievements && achievements.length > 0) {
      const today = new Date();
      const todayStr = formatDateLocal(today);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatDateLocal(yesterday);

      // Check if latest achievement is today or yesterday
      if (achievements[0].achievement_date === todayStr || achievements[0].achievement_date === yesterdayStr) {
        let currentDate = new Date(achievements[0].achievement_date);
        currentStreak = 1;

        for (let i = 1; i < achievements.length; i++) {
          const prevDate = new Date(currentDate);
          prevDate.setDate(prevDate.getDate() - 1);
          const prevDateStr = formatDateLocal(prevDate);

          if (achievements[i].achievement_date === prevDateStr) {
            currentStreak++;
            currentDate = prevDate;
          } else {
            break;
          }
        }
      }
    }

    // Calculate weekly data for Weekly Pattern graph
    const weekdayStats = meals.reduce((acc, meal) => {
      const day = new Date(meal.consumed_at).getDay();
      if (!acc[day]) acc[day] = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, count: 0 };
      acc[day].calories += meal.total_calories || 0;
      acc[day].protein += meal.total_protein_g || 0;
      acc[day].carbs += meal.total_carbs_g || 0;
      acc[day].fat += meal.total_fat_g || 0;
      acc[day].fiber += meal.total_fiber_g || 0;
      acc[day].count += 1;
      return acc;
    }, {});

    const calculatedWeeklyData = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'].map((dayName, idx) => {
      const dayIndex = idx === 6 ? 0 : idx + 1;
      return {
        day: dayName,
        'Avg Calories': weekdayStats[dayIndex] ? Math.round(weekdayStats[dayIndex].calories / weekdayStats[dayIndex].count) : 0,
        'Avg Protein': weekdayStats[dayIndex] ? parseFloat((weekdayStats[dayIndex].protein / weekdayStats[dayIndex].count).toFixed(1)) : 0,
        'Avg Carbs': weekdayStats[dayIndex] ? parseFloat((weekdayStats[dayIndex].carbs / weekdayStats[dayIndex].count).toFixed(1)) : 0,
        'Avg Fat': weekdayStats[dayIndex] ? parseFloat((weekdayStats[dayIndex].fat / weekdayStats[dayIndex].count).toFixed(1)) : 0,
        'Avg Fiber': weekdayStats[dayIndex] ? parseFloat((weekdayStats[dayIndex].fiber / weekdayStats[dayIndex].count).toFixed(1)) : 0
      };
    });

    setWeeklyData(calculatedWeeklyData);

    const totalMeals = meals.length;
    const avgCaloriesPerMeal = totalMeals > 0 ? Math.round(meals.reduce((sum, m) => sum + m.total_calories, 0) / totalMeals) : 0;

    setStats({
      avgCalories: avgCalories.toFixed(0),
      avgProtein: avgProtein.toFixed(0),
      avgCarbs: avgCarbs.toFixed(0),
      avgFat: avgFat.toFixed(0),
      avgFiber: avgFiber.toFixed(0),
      proteinGoalRate: ((daysHitProteinGoal / totalDays) * 100).toFixed(0),
      calorieGoalRate: ((daysHitCalorieGoal / totalDays) * 100).toFixed(0),
      goalsMetStreak: currentStreak,
      totalDays,
      totalMeals,
      avgCaloriesPerMeal,
    });
  };

  const statCards = stats ? [
    { label: 'Avg Calories', value: stats.avgCalories, unit: 'kcal', goal: goals?.calories, icon: Flame, color: 'green' },
    { label: 'Avg Protein', value: stats.avgProtein, unit: 'g', goal: goals?.protein, icon: Beef, color: 'red' },
    { label: 'Avg Carbs', value: stats.avgCarbs, unit: 'g', goal: goals?.carbs, icon: Wheat, color: 'yellow' },
    { label: 'Avg Fat', value: stats.avgFat, unit: 'g', goal: goals?.fat, icon: Droplets, color: 'purple' },
    { label: 'Avg Fiber', value: stats.avgFiber, unit: 'g', goal: goals?.fiber, icon: Leaf, color: 'blue' },
  ] : [];

  const colorStyles = {
    green: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' },
    red: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
    yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  };

  const getWeeklyDataKey = () => {
    switch (weeklyPatternView) {
      case 'calories': return 'Avg Calories';
      case 'protein': return 'Avg Protein';
      case 'carbs': return 'Avg Carbs';
      case 'fat': return 'Avg Fat';
      case 'fiber': return 'Avg Fiber';
      default: return 'Avg Calories';
    }
  };

  if (loading) {
    return (
      <Sidebar>
        <div className="flex items-center justify-center h-64">
          <div className="text-white/60">Loading progress...</div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <Motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-heading font-bold text-white"
              >
                Progress
              </Motion.h1>
              <p className="text-white/50 mt-1">Track your nutrition journey over time</p>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* View Toggle */}
            <div className="flex gap-2">
              {['weekly', 'monthly', 'yearly'].map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    setTimeRange(range);
                    setCurrentDate(new Date());
                  }}
                  className={`px-4 py-2 text-sm font-medium transition capitalize ${timeRange === range
                    ? 'bg-primary-700 text-white'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                >
                  {range}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigateTime(-1)}
                className="p-2 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="min-w-[200px] text-center">
                <p className="text-white font-medium">{getTimeRangeLabel()}</p>
              </div>

              <button
                onClick={() => navigateTime(1)}
                disabled={isCurrentPeriod()}
                className={`p-2 transition ${isCurrentPeriod()
                  ? 'bg-white/5 text-white/20 cursor-not-allowed'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
              >
                <ChevronRight size={20} />
              </button>

              {!isCurrentPeriod() && (
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-2 bg-primary-700/20 text-primary-500 hover:bg-primary-700/30 text-sm font-medium transition"
                >
                  Today
                </button>
              )}
            </div>
          </div>

          {/* Streak Display and Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-xs sm:max-w-sm">
              <Motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`card p-3 sm:p-4 ${stats.goalsMetStreak > 0 ? 'border-amber-500/30' : ''}`}
              >
                <p className={`text-xl sm:text-2xl font-mono font-bold ${stats.goalsMetStreak > 0 ? 'text-amber-400' : 'text-white/40'}`}>
                  {stats.goalsMetStreak}
                </p>
                <p className="text-white/50 text-xs mt-1">Streak</p>
              </Motion.div>

              <Motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-3 sm:p-4"
              >
                <p className="text-xl sm:text-2xl font-mono font-bold text-primary-500">{stats.totalMeals}</p>
                <p className="text-white/50 text-xs mt-1">Meals</p>
              </Motion.div>

              <Motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card p-3 sm:p-4"
              >
                <p className="text-xl sm:text-2xl font-mono font-bold text-secondary-400">{stats.avgCaloriesPerMeal}</p>
                <p className="text-white/50 text-xs mt-1">Cal/Meal</p>
              </Motion.div>
            </div>
          )}
        </div>

        {/* Set Goals */}
        <SetGoals />

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              const styles = colorStyles[stat.color];

              return (
                <Motion.div                   key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`card p-5 border ${styles.border}`}
                >
                  <div className={`w-10 h-10 ${styles.bg} flex items-center justify-center mb-3`}>
                    <Icon size={20} className={styles.text} strokeWidth={2} />
                  </div>
                  <p className={`text-2xl font-mono font-bold ${styles.text}`}>
                    {stat.value}
                    <span className="text-sm ml-1">{stat.unit}</span>
                  </p>
                  <p className="text-white/50 text-sm mt-1">{stat.label}</p>
                  {stat.goal && (
                    <p className="text-xs text-white/30 mt-1">Goal: {stat.goal}{stat.unit}</p>
                  )}
                </Motion.div>
              );
            })}
          </div>
        )}

        {/* Heatmap */}
        <Motion.div           initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6"
        >
          <div className="mb-6">
            <h2 className="text-lg font-heading font-semibold text-white">Activity Heatmap</h2>
            <p className="text-white/50 text-sm">Click on a day to see detailed breakdown</p>
          </div>
          <GitHubHeatmap data={heatmapData} goals={goals} timeRange={timeRange} currentDate={currentDate} />
        </Motion.div>



        {/* Bar Chart */}
        <Motion.div           initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-heading font-semibold text-white">
                {timeRange === 'weekly' ? 'Daily Breakdown' : timeRange === 'monthly' ? 'Weekly Averages' : 'Monthly Averages'}
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All', color: 'primary' },
                { key: 'protein', label: 'Protein', color: 'secondary' },
                { key: 'carbs', label: 'Carbs', color: 'amber' },
                { key: 'fat', label: 'Fat', color: 'purple' },
                { key: 'fiber', label: 'Fiber', color: 'green' },
                { key: 'calories', label: 'Calories', color: 'primary' },
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => setBarChartView(key)}
                  className={`px-3 py-1.5 text-sm font-medium transition ${barChartView === key
                    ? `bg-${color === 'primary' ? 'primary-700' : color === 'secondary' ? 'secondary-500' : color === 'amber' ? 'amber-500' : color === 'blue' ? 'blue-500' : 'green-500'} text-white`
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={12} />
              <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a0a0a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Legend />
              {barChartView === 'all' ? (
                <>
                  <Bar dataKey="Protein" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Protein (g)" />
                  <Bar dataKey="Carbs" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Carbs (g)" />
                  <Bar dataKey="Fat" fill="#d8b4fe" radius={[4, 4, 0, 0]} name="Fat (g)" />
                  <Bar dataKey="Fiber" fill="#22c55e" radius={[4, 4, 0, 0]} name="Fiber (g)" />
                </>
              ) : barChartView === 'protein' ? (
                <>
                  <Bar dataKey="Protein" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Protein (g)" />
                  <ReferenceLine y={goals?.protein || 150} stroke="rgba(255,255,255,0.3)" strokeDasharray="5 5" label={{ value: 'Goal', fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                </>
              ) : barChartView === 'carbs' ? (
                <>
                  <Bar dataKey="Carbs" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Carbs (g)" />
                  <ReferenceLine y={goals?.carbs || 250} stroke="rgba(255,255,255,0.3)" strokeDasharray="5 5" label={{ value: 'Goal', fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                </>
              ) : barChartView === 'fat' ? (
                <>
                  <Bar dataKey="Fat" fill="#d8b4fe" radius={[4, 4, 0, 0]} name="Fat (g)" />
                  <ReferenceLine y={goals?.fat || 65} stroke="rgba(255,255,255,0.3)" strokeDasharray="5 5" label={{ value: 'Goal', fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                </>
              ) : barChartView === 'fiber' ? (
                <>
                  <Bar dataKey="Fiber" fill="#22c55e" radius={[4, 4, 0, 0]} name="Fiber (g)" />
                  <ReferenceLine y={goals?.fiber || 30} stroke="rgba(255,255,255,0.3)" strokeDasharray="5 5" label={{ value: 'Goal', fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                </>
              ) : (
                <>
                  <Bar dataKey="Calories" fill="#047857" radius={[4, 4, 0, 0]} name="Calories" />
                  <ReferenceLine y={goals?.calories || 2000} stroke="rgba(255,255,255,0.3)" strokeDasharray="5 5" label={{ value: 'Goal', fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </Motion.div>

        {/* Meal Type Distribution */}
        <Motion.div           initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card p-6"
        >
            <div className="mb-6">
              <h2 className="text-lg font-heading font-semibold text-white">Meal Distribution</h2>
              <p className="text-white/50 text-sm">Breakdown by meal type</p>
            </div>
          <ChartErrorBoundary>
            <MealTypeDistribution meals={meals} />
          </ChartErrorBoundary>
        </Motion.div>

        {/* Weekly Pattern */}
        <Motion.div           initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card p-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-heading font-semibold text-white">Weekly Pattern</h2>
              <p className="text-white/50 text-sm">Average intake by day</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['calories', 'protein', 'carbs', 'fat', 'fiber'].map((key) => (
                <button key={key} onClick={() => setWeeklyPatternView(key)}
                  className={`px-3 py-1.5 text-sm font-medium transition capitalize ${weeklyPatternView === key ? 'bg-primary-700 text-white' : 'bg-white/5 text-white/60 hover:text-white'}`}>
                  {key}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" fontSize={12} />
              <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey={getWeeklyDataKey()}
                fill={weeklyPatternView === 'calories' ? '#22c55e' : weeklyPatternView === 'protein' ? '#ef4444' : weeklyPatternView === 'carbs' ? '#eab308' : weeklyPatternView === 'fat' ? '#a855f7' : '#3b82f6'}
                radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Motion.div>

        {/* Nutrient Flow */}
        <Motion.div           initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="card p-6"
        >
          <div className="mb-6">
            <h2 className="text-lg font-heading font-semibold text-white">Nutrient Flow</h2>
            <p className="text-white/50 text-sm">Macro distribution over time</p>
          </div>
          <ChartErrorBoundary>
            <NutrientStreamGraph data={weeklyData.map(d => ({
              date: d.day,
              protein: d['Avg Protein'],
              carbs: d['Avg Carbs'],
              fat: d['Avg Fat'],
              fiber: d['Avg Fiber']
            }))} />
          </ChartErrorBoundary>
        </Motion.div>

        {/* Fasting Overview Section */}
        {fastingStats && fastingHistory.length > 0 && (
          <Motion.div             initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-lg font-heading font-semibold text-white">Fasting Overview</h2>
              <p className="text-white/50 text-sm">Track your fasting consistency and durations</p>
            </div>

            {/* Fasting Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-5 border-orange-500/20 bg-orange-500/5">
                <p className="text-2xl font-mono font-bold text-orange-400">
                  {fastingStats.averageHours}
                  <span className="text-sm ml-1">h</span>
                </p>
                <p className="text-white/50 text-sm mt-1">Avg Duration</p>
              </div>
              <div className="card p-5 border-orange-500/20 bg-orange-500/5">
                <p className="text-2xl font-mono font-bold text-orange-400">
                  {fastingStats.totalSessions}
                </p>
                <p className="text-white/50 text-sm mt-1">Sessions</p>
              </div>
              <div className="card p-5 border-orange-500/20 bg-orange-500/5">
                <p className="text-2xl font-mono font-bold text-orange-400">
                  {fastingStats.completionRate}%
                </p>
                <p className="text-white/50 text-sm mt-1">Completion</p>
              </div>
              <div className="card p-5 border-orange-500/20 bg-orange-500/5">
                <p className="text-2xl font-mono font-bold text-orange-400">
                  {Math.max(...fastingHistory.map(f => f.actual_duration_hours || 0), 0).toFixed(1)}
                  <span className="text-sm ml-1">h</span>
                </p>
                <p className="text-white/50 text-sm mt-1">Longest Fast</p>
              </div>
            </div>

            {/* Fasting Duration Chart */}
            <div className="card p-6">
              <h3 className="text-md font-medium text-white/80 mb-6">
                Fasting Duration Trends
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={fastingChartData}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                  <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} unit="h" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                    formatter={(value) => [`${value} hours`, 'Duration']}
                  />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="#f97316"
                    fillOpacity={1}
                    fill="url(#colorHours)"
                    strokeWidth={2}
                  />
                  <ReferenceLine y={16} stroke="rgba(255,115,22,0.3)" strokeDasharray="3 3" label={{ value: '16h Goal', fill: 'rgba(255,115,22,0.5)', fontSize: 10, position: 'right' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Fasting History Log */}
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                <h3 className="font-medium text-white">Recent Fasting Sessions</h3>
                <span className="text-xs text-white/30">{fastingHistory.length} sessions in this period</span>
              </div>
              <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                {fastingHistory.map((fast) => (
                  <div key={fast.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 ${fast.status === 'completed' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="text-white font-medium">
                          {new Date(fast.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          <span className="text-white/30 text-xs ml-2">
                            {new Date(fast.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                        <p className="text-white/50 text-sm">
                          {fast.planned_duration_hours}h target • {fast.status.charAt(0).toUpperCase() + fast.status.slice(1)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-mono font-bold text-white">
                        {fast.actual_duration_hours || 0}
                        <span className="text-sm font-normal text-white/40 ml-1">h</span>
                      </p>
                      <p className="text-xs text-white/30">Total Duration</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Motion.div>
        )}

        {/* Weight/BMI Progress */}
        <Motion.div           initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="card p-6"
        >
          <div className="mb-6">
            <h2 className="text-lg font-heading font-semibold text-white">Weight Progress</h2>
            <p className="text-white/50 text-sm">Track your weight over time</p>
          </div>
          <WeightBMIProgress goals={goals} timeRange={timeRange} currentDate={currentDate} />
        </Motion.div>
      </div>
    </Sidebar>
  );
}

