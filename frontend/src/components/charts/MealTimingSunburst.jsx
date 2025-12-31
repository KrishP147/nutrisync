import { ResponsiveSunburst } from '@nivo/sunburst';
import { useState, useMemo } from 'react';
import { motion as Motion } from 'motion/react';
import { Sun, Info } from 'lucide-react';

const MEAL_TYPE_COLORS = {
  'Breakfast': '#f59e0b', // Amber
  'Lunch': '#10b981',     // Green
  'Dinner': '#3b82f6',    // Blue
  'Snack': '#a855f7',     // Purple
};

const TIME_COLORS = {
  'Morning': '#fbbf24',   // Yellow
  'Afternoon': '#34d399',  // Teal
  'Evening': '#60a5fa',   // Light Blue
  'Night': '#991b1b',      // Maroon (replaced purple to avoid duplicate with Snack)
};

const FOOD_CATEGORY_COLORS = {
  'Protein': '#ef4444',   // Red
  'Grains': '#eab308',     // Yellow
  'Vegetables': '#22c55e', // Green
  'Fruits': '#f97316',     // Orange
  'Dairy': '#06b6d4',      // Cyan
  'Other': '#991b1b',      // Maroon
};

// Categorize food by keywords
const categorizeFood = (name) => {
  const lower = name.toLowerCase();
  if (/chicken|beef|fish|salmon|tuna|egg|turkey|pork|shrimp|whey|protein|meat|steak|tofu/.test(lower)) return 'Protein';
  if (/rice|bread|pasta|potato|oat|cereal|grain|wheat|corn|noodle|bagel|tortilla/.test(lower)) return 'Grains';
  if (/salad|broccoli|spinach|carrot|tomato|lettuce|cucumber|vegetable|veggie|pepper|onion/.test(lower)) return 'Vegetables';
  if (/apple|banana|orange|berry|fruit|grape|melon|mango|pineapple/.test(lower)) return 'Fruits';
  if (/milk|cheese|yogurt|cream|dairy/.test(lower)) return 'Dairy';
  return 'Other';
};

const getTimeOfDay = (hour) => {
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
};

export default function MealTimingSunburst({ meals }) {
  const [showInfo, setShowInfo] = useState(false);

  const sunburstData = useMemo(() => {
    if (!meals || meals.length === 0) return null;

    // Build hierarchical data: Meal Type -> Time of Day -> Food Category
    const hierarchy = {};

    meals.forEach(meal => {
      const mealType = (meal.meal_type || 'snack').charAt(0).toUpperCase() + (meal.meal_type || 'snack').slice(1);
      const hour = new Date(meal.consumed_at).getHours();
      const timeOfDay = getTimeOfDay(hour);
      const foodCategory = categorizeFood(meal.meal_name || '');
      const calories = meal.total_calories || 0;

      if (!hierarchy[mealType]) {
        hierarchy[mealType] = { times: {} };
      }
      if (!hierarchy[mealType].times[timeOfDay]) {
        hierarchy[mealType].times[timeOfDay] = { categories: {} };
      }
      if (!hierarchy[mealType].times[timeOfDay].categories[foodCategory]) {
        hierarchy[mealType].times[timeOfDay].categories[foodCategory] = 0;
      }
      hierarchy[mealType].times[timeOfDay].categories[foodCategory] += calories;
    });

    // Convert to sunburst format
    const children = Object.entries(hierarchy).map(([mealType, mealData]) => ({
      name: mealType,
      color: MEAL_TYPE_COLORS[mealType] || '#6b7280',
      children: Object.entries(mealData.times).map(([time, timeData]) => ({
        name: time,
        color: TIME_COLORS[time] || '#6b7280',
        children: Object.entries(timeData.categories)
          .filter(([category, cal]) => cal > 0 && category !== 'Other')
          .map(([category, calories]) => ({
            name: category,
            value: Math.round(calories),
            color: FOOD_CATEGORY_COLORS[category] || '#6b7280',
          }))
      })).filter(t => t.children.length > 0)
    })).filter(m => m.children.length > 0);

    return {
      name: 'All Meals',
      children
    };
  }, [meals]);

  if (!meals || meals.length === 0 || !sunburstData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/40">
        <Sun size={32} className="mb-2 opacity-50" />
        <p>No meal data for sunburst</p>
      </div>
    );
  }

  return (
    <div className="relative" style={{ overflow: 'visible' }}>
      {/* Info tooltip */}
      <div 
        className="absolute top-0 right-0 z-10"
        onMouseEnter={() => setShowInfo(true)}
        onMouseLeave={() => setShowInfo(false)}
      >
        <Info size={18} className="text-white/40 hover:text-white/70 cursor-help" />
        {showInfo && (
          <div className="absolute right-0 top-6 w-72 bg-black border border-white/10  p-3 text-xs text-white/70 z-20">
            Hierarchical view of your meals. Inner ring = meal type, middle = time of day, outer = food category. Size represents calories. Hover to explore!
          </div>
        )}
      </div>

      {/* Legends */}
      <div className="space-y-3 mb-4">
        {/* Meal Type Legend */}
        <div>
          <p className="text-xs text-white/40 mb-2">Meal Type</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(MEAL_TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5 text-xs text-white/60">
                <div className="w-3 h-3 " style={{ backgroundColor: color }} />
                <span>{type}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Time of Day Legend */}
        <div>
          <p className="text-xs text-white/40 mb-2">Time of Day</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(TIME_COLORS).map(([time, color]) => (
              <div key={time} className="flex items-center gap-1.5 text-xs text-white/60">
                <div className="w-3 h-3 " style={{ backgroundColor: color }} />
                <span>{time}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Food Category Legend */}
        <div>
          <p className="text-xs text-white/40 mb-2">Food Category</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(FOOD_CATEGORY_COLORS)
              .filter(([category]) => category !== 'Other')
              .map(([category, color]) => (
                <div key={category} className="flex items-center gap-1.5 text-xs text-white/60">
                  <div className="w-3 h-3 " style={{ backgroundColor: color }} />
                  <span>{category}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <Motion.div         initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-80"
        style={{ overflow: 'visible' }}
      >
        <ResponsiveSunburst
          data={sunburstData}
          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          id="name"
          value="value"
          cornerRadius={4}
          borderWidth={2}
          borderColor="#0a0a0a"
          colors={(node) => node.data.color || '#6b7280'}
          childColor={(parent, child) => child.data.color || parent.color}
          enableArcLabels={false}
          arcLabelsSkipAngle={20}
          arcLabelsTextColor="#ffffff"
          tooltip={({ id, value, color, percentage }) => (
            <div className="bg-black border border-white/10  px-3 py-2 shadow-lg">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 " style={{ backgroundColor: color }} />
                <span className="font-medium text-white">{id}</span>
              </div>
              {value && (
                <div className="font-mono text-primary-500">{value} cal ({percentage.toFixed(1)}%)</div>
              )}
            </div>
          )}
          theme={{
            labels: {
              text: {
                fontSize: 10,
                fontFamily: 'Plus Jakarta Sans',
                fill: 'rgba(255,255,255,0.8)',
              }
            },
            tooltip: {
              container: {
                background: 'transparent',
                boxShadow: 'none',
                padding: 0,
              }
            }
          }}
          motionConfig="gentle"
          transitionMode="pushIn"
        />
      </Motion.div>

      {/* Hover hint */}
      <p className="text-center text-white/40 text-xs mt-2">Hover over sections to see details</p>
    </div>
  );
}
