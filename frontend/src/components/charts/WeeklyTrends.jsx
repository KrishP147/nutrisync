import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useGoals } from '../../contexts/GoalsContext';
import { motion as Motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus, Calendar, Flame, Beef, Wheat, Droplets, Leaf, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function WeeklyTrends() {
  const { goals } = useGoals();
  const [weekData, setWeekData] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('calories');
  const [showInfo, setShowInfo] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const views = [
    { key: 'calories', label: 'Calories', icon: Flame, color: '#22c55e', unit: 'kcal' }, // Green
    { key: 'protein', label: 'Protein', icon: Beef, color: '#ef4444', unit: 'g' }, // Red
    { key: 'carbs', label: 'Carbs', icon: Wheat, color: '#eab308', unit: 'g' }, // Yellow
    { key: 'fat', label: 'Fat', icon: Droplets, color: '#a855f7', unit: 'g' }, // Purple
    { key: 'fiber', label: 'Fiber', icon: Leaf, color: '#3b82f6', unit: 'g' }, // Blue
  ];

  useEffect(() => {
    fetchWeeklyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchWeeklyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .gte('consumed_at', twoWeeksAgo.toISOString())
        .order('consumed_at', { ascending: true });

      if (!error && data) {
        processWeeklyData(data);
      }
    } catch (error) {
      console.error('Error fetching weekly data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processWeeklyData = (meals) => {
    const dailyTotals = {};

    meals.forEach(meal => {
      const date = new Date(meal.consumed_at);
      const dateStr = date.toISOString().split('T')[0];

      if (!dailyTotals[dateStr]) {
        dailyTotals[dateStr] = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
      }

      dailyTotals[dateStr].calories += meal.total_calories || 0;
      dailyTotals[dateStr].protein += meal.total_protein_g || 0;
      dailyTotals[dateStr].carbs += meal.total_carbs_g || 0;
      dailyTotals[dateStr].fat += meal.total_fat_g || 0;
      dailyTotals[dateStr].fiber += meal.total_fiber_g || 0;
    });

    // Get last 7 days for chart
    const last7Days = Object.entries(dailyTotals)
      .slice(-7)
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
        calories: Math.round(data.calories),
        protein: Math.round(data.protein * 10) / 10,
        carbs: Math.round(data.carbs * 10) / 10,
        fat: Math.round(data.fat * 10) / 10,
        fiber: Math.round(data.fiber * 10) / 10,
      }));

    setWeekData(last7Days);

    // Calculate week comparison for calories
    const dates = Object.keys(dailyTotals).sort();
    const thisWeekDates = dates.slice(-7);
    const lastWeekDates = dates.slice(-14, -7);

    const avgThisWeek = thisWeekDates.reduce((sum, date) => sum + dailyTotals[date].calories, 0) / (thisWeekDates.length || 1);
    const avgLastWeek = lastWeekDates.reduce((sum, date) => sum + dailyTotals[date].calories, 0) / (lastWeekDates.length || 1);

    const percentChange = lastWeekDates.length > 0 
      ? ((avgThisWeek - avgLastWeek) / avgLastWeek * 100)
      : 0;

    setComparison({
      thisWeek: Math.round(avgThisWeek),
      lastWeek: Math.round(avgLastWeek),
      percentChange: percentChange.toFixed(1),
      trend: percentChange > 5 ? 'up' : percentChange < -5 ? 'down' : 'stable'
    });
  };

  const getGoalValue = () => {
    switch (activeView) {
      case 'calories': return goals?.calories;
      case 'protein': return goals?.protein;
      case 'carbs': return goals?.carbs;
      case 'fat': return goals?.fat;
      case 'fiber': return goals?.fiber;
      default: return null;
    }
  };

  const getActiveViewConfig = () => views.find(v => v.key === activeView);

  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-6 bg-white/10  w-1/3 mb-4"></div>
        <div className="h-48 bg-white/5 "></div>
      </div>
    );
  }

  const viewConfig = getActiveViewConfig();
  const goalValue = getGoalValue();

  return (
    <div className="card p-6 relative">
      {/* Info tooltip */}
      <div 
        className="absolute top-4 right-4 z-10"
        onMouseEnter={() => setShowInfo(true)}
        onMouseLeave={() => setShowInfo(false)}
      >
        <Info size={18} className="text-white/40 hover:text-white/70 cursor-help" />
        {showInfo && (
          <div className="absolute right-0 top-6 w-64 bg-black border border-white/10  p-3 text-xs text-white/70 z-20">
            Shows your daily intake over the past week. The dotted line represents your goal. Toggle between metrics (Calories, Protein, Carbs, Fat, Fiber) to see trends.
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10  bg-secondary-500/10 flex items-center justify-center">
            <Calendar size={20} className="text-secondary-400" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-lg font-heading font-semibold text-white">Weekly Trends</h2>
            <p className="text-white/50 text-sm">{viewConfig.label} intake over the past week</p>
          </div>
        </div>

        {comparison && comparison.thisWeek > 0 && Math.abs(parseFloat(comparison.percentChange)) > 0.1 && activeView === 'calories' && (
          <div className={`flex items-center gap-2 px-3 py-1.5  ${
            comparison.trend === 'up' ? 'bg-amber-500/10 text-amber-400' :
            comparison.trend === 'down' ? 'bg-primary-700/10 text-primary-500' :
            'bg-white/5 text-white/60'
          }`}>
            {comparison.trend === 'up' ? <TrendingUp size={16} /> :
             comparison.trend === 'down' ? <TrendingDown size={16} /> :
             <Minus size={16} />}
            <span className="text-sm font-medium">
              {comparison.percentChange > 0 ? '+' : ''}{comparison.percentChange}%
            </span>
          </div>
        )}
      </div>

      {/* View Toggle */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* eslint-disable-next-line no-unused-vars */}
        {views.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setActiveView(key)}
            className={`flex items-center gap-2 px-3 py-1.5  text-sm font-medium transition ${
              activeView === key
                ? 'text-white'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
            }`}
            style={activeView === key ? { backgroundColor: color } : {}}
          >
            <Icon size={14} strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      {weekData.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={weekData} margin={{ top: 10, right: 10, left: 0, bottom: isMobile ? 50 : 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="date" 
              stroke="rgba(255,255,255,0.5)" 
              fontSize={isMobile ? 9 : 12}
              interval={isMobile ? 1 : 0}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? 'end' : 'middle'}
              height={isMobile ? 60 : 30}
            />
            <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#000000',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff'
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload[0] && payload[0].payload.fullDate) {
                  return payload[0].payload.fullDate;
                }
                return label;
              }}
              formatter={(value) => [`${value} ${viewConfig.unit}`, viewConfig.label]}
            />
            <Line 
              type="monotone" 
              dataKey={activeView}
              stroke={viewConfig.color}
              strokeWidth={2}
              dot={{ fill: viewConfig.color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: viewConfig.color }}
            />
            {goalValue && (
              <ReferenceLine
                y={goalValue}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth={1}
                strokeDasharray="5 5"
                label={{ value: 'Goal', position: 'right', fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-48 flex items-center justify-center text-white/40">
          No data available for this period
        </div>
      )}

      {comparison && comparison.thisWeek > 0 && activeView === 'calories' && (
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-6">
          <div>
            <p className="text-white/50 text-sm mb-1">This Week Avg</p>
            <p className="text-2xl font-mono font-bold text-white">
              {comparison.thisWeek}
              <span className="text-white/40 text-sm ml-1">kcal/day</span>
            </p>
          </div>
          <div>
            <p className="text-white/50 text-sm mb-1">Last Week Avg</p>
            <p className="text-2xl font-mono font-bold text-white/60">
              {comparison.lastWeek}
              <span className="text-white/40 text-sm ml-1">kcal/day</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
