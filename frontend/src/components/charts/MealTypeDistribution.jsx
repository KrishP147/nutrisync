import { ResponsiveSunburst } from '@nivo/sunburst';
import { useMemo } from 'react';
import { motion } from 'motion/react';
import { PieChart } from 'lucide-react';

const MEAL_TYPE_COLORS = {
  'Breakfast': '#f59e0b', // Amber
  'Lunch': '#10b981',     // Green
  'Dinner': '#3b82f6',    // Blue
  'Snack': '#a855f7',     // Purple
};

export default function MealTypeDistribution({ meals }) {
  const sunburstData = useMemo(() => {
    if (!meals || meals.length === 0) return null;

    // Count meals by type
    const mealCounts = meals.reduce((acc, meal) => {
      const type = (meal.meal_type || 'snack').charAt(0).toUpperCase() + (meal.meal_type || 'snack').slice(1);
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Convert to sunburst format with single ring
    const children = Object.entries(mealCounts).map(([type, count]) => ({
      name: type,
      value: count,
      color: MEAL_TYPE_COLORS[type] || '#6b7280',
    }));

    return {
      name: 'All Meals',
      children: children.filter(item => item.value > 0),
    };
  }, [meals]);

  if (!meals || meals.length === 0 || !sunburstData || sunburstData.children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/40">
        <PieChart size={32} className="mb-2 opacity-50" />
        <p>No meal distribution data</p>
      </div>
    );
  }

  return (
    <div className="relative" style={{ overflow: 'visible' }}>
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-center lg:justify-center">
        {/* Sunburst Chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="h-64 w-64 flex-shrink-0"
          style={{ overflow: 'visible' }}
        >
          <ResponsiveSunburst
            data={sunburstData}
            margin={{ top: 40, right: 10, bottom: 10, left: 10 }}
            id="name"
            value="value"
            cornerRadius={4}
            borderWidth={2}
            borderColor="#0a0a0a"
            colors={(node) => node.data.color || '#6b7280'}
            childColor={(parent, child) => child.data.color || parent.color}
            enableArcLabels={false}
            arcLabelsSkipAngle={10}
            arcLabelsTextColor="#ffffff"
            tooltip={({ id, value, color, percentage }) => (
              <div className="bg-black border border-white/10  px-3 py-2 shadow-lg z-[9999]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 " style={{ backgroundColor: color }} />
                  <span className="font-medium text-white">{id}</span>
                </div>
                <div className="font-mono text-white text-sm">
                  {value} {value === 1 ? 'meal' : 'meals'} ({percentage.toFixed(1)}%)
                </div>
              </div>
            )}
            theme={{
              labels: {
                text: {
                  fontSize: 11,
                  fontFamily: 'Plus Jakarta Sans',
                  fill: '#ffffff',
                  fontWeight: 600,
                }
              },
              tooltip: {
                container: {
                  background: 'transparent',
                  boxShadow: 'none',
                  padding: 0,
                  zIndex: 9999,
                }
              }
            }}
            motionConfig="gentle"
            transitionMode="pushIn"
          />
        </motion.div>

        {/* Legend - Side Labels */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {Object.entries(MEAL_TYPE_COLORS).map(([type, color]) => {
            const count = sunburstData.children.find(c => c.name === type)?.value || 0;
            if (count === 0) return null;
            const percentage = ((count / meals.length) * 100).toFixed(1);
            return (
              <div key={type} className="flex items-center gap-2 text-sm text-white/70">
                <div className="w-3 h-3  flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="font-medium min-w-[80px]">{type}</span>
                <span className="text-white/50 text-xs">({count} • {percentage}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
