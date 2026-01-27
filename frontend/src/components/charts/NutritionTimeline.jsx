import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Flame, Beef, Wheat, Droplets, Leaf } from 'lucide-react';

export default function NutritionTimeline({ meals = [] }) {
  const [viewMode, setViewMode] = useState('calories');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const histogramData = useMemo(() => {
    // Create 24 half-hour time slots (12:00 AM to 11:30 PM)
    const timeSlots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let half = 0; half < 2; half++) {
        const label = `${hour.toString().padStart(2, '0')}:${half === 0 ? '00' : '30'}`;
        timeSlots.push({
          time: label,
          hour: hour,
          halfHour: half,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
        });
      }
    }

    // Aggregate meals into time slots
    meals.forEach(meal => {
      const date = new Date(meal.consumed_at);
      const hour = date.getHours();
      const minutes = date.getMinutes();
      const halfHour = minutes < 30 ? 0 : 1;
      const slotIndex = hour * 2 + halfHour;

      if (slotIndex >= 0 && slotIndex < timeSlots.length) {
        timeSlots[slotIndex].calories += meal.total_calories || 0;
        timeSlots[slotIndex].protein += meal.total_protein_g || 0;
        timeSlots[slotIndex].carbs += meal.total_carbs_g || 0;
        timeSlots[slotIndex].fat += meal.total_fat_g || 0;
        timeSlots[slotIndex].fiber += meal.total_fiber_g || 0;
      }
    });

    return timeSlots;
  }, [meals]);

  const getBarColor = () => {
    switch (viewMode) {
      case 'calories': return '#22c55e'; // Green
      case 'protein': return '#ef4444'; // Red
      case 'carbs': return '#eab308'; // Yellow
      case 'fat': return '#a855f7'; // Purple
      case 'fiber': return '#3b82f6'; // Blue
      default: return '#22c55e';
    }
  };

  const getDataKey = () => {
    return viewMode;
  };

  const formatYAxis = (value) => {
    if (viewMode === 'calories') {
      return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value;
    }
    return `${value}g`;
  };

  const modes = [
    { key: 'calories', label: 'Calories', icon: Flame, activeClass: 'bg-green-500 text-white' },
    { key: 'protein', label: 'Protein', icon: Beef, activeClass: 'bg-red-500 text-white' },
    { key: 'carbs', label: 'Carbs', icon: Wheat, activeClass: 'bg-yellow-500 text-black' },
    { key: 'fat', label: 'Fat', icon: Droplets, activeClass: 'bg-purple-500 text-white' },
    { key: 'fiber', label: 'Fiber', icon: Leaf, activeClass: 'bg-blue-500 text-white' },
  ];

  const hasData = meals.length > 0;

  return (
    <div>
      {/* View Mode Toggle */}
      <div className="flex flex-wrap gap-2 mb-6">
        {modes.map(({ key, label, icon: Icon, activeClass }) => (
          <button
            key={key}
            onClick={() => setViewMode(key)}
            className={`flex items-center gap-2 px-3 py-1.5  text-sm font-medium transition ${
              viewMode === key
                ? activeClass
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icon size={14} strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {hasData ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={histogramData} margin={{ top: 10, right: 10, left: 0, bottom: isMobile ? 50 : 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="time"
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: 'rgba(255,255,255,0.5)' }}
              fontSize={isMobile ? 8 : 10}
              interval={isMobile ? 7 : 3}
              tickFormatter={(value) => value.split(':')[0] + ':00'}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? 'end' : 'middle'}
              height={isMobile ? 60 : 30}
            />
            <YAxis
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: 'rgba(255,255,255,0.5)' }}
              fontSize={10}
              tickFormatter={formatYAxis}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#000000',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff'
              }}
              labelStyle={{ color: '#fff' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value) => [
                viewMode === 'calories' ? `${Math.round(value)} kcal` : `${value.toFixed(1)}g`,
                viewMode.charAt(0).toUpperCase() + viewMode.slice(1)
              ]}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Bar dataKey={getDataKey()} radius={[2, 2, 0, 0]}>
              {histogramData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry[getDataKey()] > 0 ? getBarColor() : 'rgba(255,255,255,0.05)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-white/40">
          <Flame size={32} className="mb-3 opacity-50" />
          <p>No meals logged on this day</p>
          <p className="text-sm mt-1">Your nutrition timeline will appear here</p>
        </div>
      )}
    </div>
  );
}

