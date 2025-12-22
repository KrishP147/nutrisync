import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Info } from 'lucide-react';

export default function GitHubHeatmap({ data, goals, timeRange = 'weekly', currentDate = new Date() }) {
  const navigate = useNavigate();
  const [hoveredDay, setHoveredDay] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showInfo, setShowInfo] = useState(false);

  const safeGoals = {
    calories: goals?.calories || 2000,
    protein: goals?.protein || 150,
    carbs: goals?.carbs || 250,
    fat: goals?.fat || 65,
    fiber: goals?.fiber || 30,
  };

  // Generate days based on timeRange
  const days = useMemo(() => {
    const result = [];
    const targetDate = new Date(currentDate);

    let start = new Date(targetDate);
    let end = new Date(targetDate);

    if (timeRange === 'weekly') {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (timeRange === 'monthly') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    } else if (timeRange === 'yearly') {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
    } else {
      // Fallback to last 90 days
      const today = new Date();
      start = new Date(today);
      start.setDate(today.getDate() - 89);
      end = new Date(today);
    }

    const current = new Date(start);
    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      result.push({
        date: dateStr,
        dayOfWeek: current.getDay(),
        data: data[dateStr] || null
      });

      current.setDate(current.getDate() + 1);
    }

    return result;
  }, [data, timeRange, currentDate]);

  // Group by weeks for grid layout
  const weeks = useMemo(() => {
    const result = [];
    let currentWeek = [];

    // Pad the first week with empty cells
    const firstDayOfWeek = days[0]?.dayOfWeek || 0;
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }

    days.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });

    // Add remaining days
    if (currentWeek.length > 0) {
      result.push(currentWeek);
    }

    return result;
  }, [days]);

  const getColor = (dayData) => {
    if (!dayData || !dayData.data) {
      return 'bg-white/5';
    }

    const caloriePercent = (dayData.data.calories / safeGoals.calories) * 100;
    const proteinPercent = (dayData.data.protein / safeGoals.protein) * 100;

    // Calculate overall score
    const score = (caloriePercent + proteinPercent) / 2;

    if (score >= 90 && score <= 110) {
      return 'bg-primary-500'; // Perfect
    } else if (score >= 70) {
      return 'bg-primary-700'; // Good
    } else if (score >= 50) {
      return 'bg-primary-900'; // Fair
    } else if (score > 0) {
      return 'bg-white/10'; // Low
    }

    return 'bg-white/5';
  };

  const handleMouseEnter = (day, e) => {
    if (day?.data) {
      setHoveredDay(day);
      const rect = e.target.getBoundingClientRect();
      setTooltipPos({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
    }
  };

  const handleDayClick = (day) => {
    if (day?.date) {
      navigate(`/daily-view/${day.date}`);
    }
  };

  const formatDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="relative">
      {/* Info tooltip */}
      <div
        className="absolute -top-1 right-0 z-10"
        onMouseEnter={() => setShowInfo(true)}
        onMouseLeave={() => setShowInfo(false)}
      >
        <Info size={16} className="text-white/40 hover:text-white/70 cursor-help" />
        {showInfo && (
          <div className="absolute right-0 top-5 w-56 bg-black border border-white/10  p-3 text-xs text-white/70 z-20">
            Activity heatmap showing the last 90 days. Brighter = better goal achievement. Click any day to see details.
          </div>
        )}
      </div>

      {/* Heatmap Grid */}
      <div className="flex gap-1 overflow-x-auto pb-2 custom-scrollbar">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) => (
              <motion.div
                key={dayIndex}
                whileHover={{ scale: day ? 1.2 : 1 }}
                className={`
                  w-3 h-3  cursor-pointer transition-all
                  ${day ? getColor(day) : 'bg-transparent'}
                  ${day?.data ? 'hover:ring-2 hover:ring-primary-500/50' : ''}
                `}
                onMouseEnter={(e) => handleMouseEnter(day, e)}
                onMouseLeave={() => setHoveredDay(null)}
                onClick={() => day && handleDayClick(day)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-3 mt-4 text-xs text-white/50">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3  bg-white/5" />
          <div className="w-3 h-3  bg-white/10" />
          <div className="w-3 h-3  bg-primary-900" />
          <div className="w-3 h-3  bg-primary-700" />
          <div className="w-3 h-3  bg-primary-500" />
        </div>
        <span>More</span>
      </div>

      {/* Tooltip */}
      {hoveredDay && hoveredDay.data && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed z-50 card p-3 text-sm shadow-xl pointer-events-none"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <p className="font-medium text-white mb-2">{formatDate(hoveredDay.date)}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-white/50">Calories:</span>
              <span className="font-mono text-green-500">{Math.round(hoveredDay.data.calories)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Protein:</span>
              <span className="font-mono text-red-500">{hoveredDay.data.protein.toFixed(1)}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Carbs:</span>
              <span className="font-mono text-yellow-500">{hoveredDay.data.carbs.toFixed(1)}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Fat:</span>
              <span className="font-mono text-purple-500">{hoveredDay.data.fat.toFixed(1)}g</span>
            </div>
          </div>
          <p className="text-xs text-white/40 mt-2 text-center">Click to view details</p>
        </motion.div>
      )}
    </div>
  );
}

