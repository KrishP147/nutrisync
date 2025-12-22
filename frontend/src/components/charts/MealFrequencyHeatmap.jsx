import { ResponsiveHeatMap } from '@nivo/heatmap';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Grid3X3, Info } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function MealFrequencyHeatmap({ meals }) {
  const [showInfo, setShowInfo] = useState(false);
  const [view, setView] = useState('count'); // count or calories

  if (!meals || meals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/40">
        <Grid3X3 size={32} className="mb-2 opacity-50" />
        <p>No meal data for heatmap</p>
      </div>
    );
  }

  // Build heatmap data in the format expected by @nivo/heatmap
  const heatmapData = [];
  
  // Only show reasonable eating hours (6am - 11pm)
  for (let hour = 6; hour <= 23; hour++) {
    const row = {
      id: `${hour.toString().padStart(2, '0')}:00`,
      data: []
    };
    
    DAYS.forEach((day, dayIndex) => {
      const jsDayIndex = dayIndex === 6 ? 0 : dayIndex + 1;
      
      const matchingMeals = meals.filter(m => {
        const mealDate = new Date(m.consumed_at);
        return mealDate.getHours() === hour && mealDate.getDay() === jsDayIndex;
      });

      const value = view === 'count' 
        ? matchingMeals.length 
        : matchingMeals.reduce((sum, m) => sum + (m.total_calories || 0), 0);
      
      row.data.push({ x: day, y: value });
    });

    heatmapData.push(row);
  }

  const maxValue = Math.max(...heatmapData.flatMap(row => row.data.map(d => d.y || 0)), 1);

  return (
    <div className="relative" style={{ overflow: 'visible' }}>
      {/* Info tooltip */}
      <div 
        className="absolute top-0 right-0 z-50"
        onMouseEnter={() => setShowInfo(true)}
        onMouseLeave={() => setShowInfo(false)}
      >
        <Info size={18} className="text-white/40 hover:text-white/70 cursor-help" />
        {showInfo && (
          <div className="absolute right-0 top-6 w-64 bg-black border border-white/10  p-3 text-xs text-white/70 z-[9999] shadow-xl">
            Shows when you eat most often. Rows are hours, columns are days. Brighter cells = more meals or calories at that time.
          </div>
        )}
      </div>

      {/* Toggle buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView('count')}
          className={`px-3 py-1.5  text-sm font-medium transition ${
            view === 'count' ? 'bg-primary-700 text-white' : 'bg-white/5 text-white/60'
          }`}
        >
          Meal Count
        </button>
        <button
          onClick={() => setView('calories')}
          className={`px-3 py-1.5  text-sm font-medium transition ${
            view === 'calories' ? 'bg-primary-700 text-white' : 'bg-white/5 text-white/60'
          }`}
        >
          Calories
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-80"
        style={{ overflow: 'visible' }}
      >
        <ResponsiveHeatMap
          data={heatmapData}
          margin={{ top: 20, right: 20, bottom: 40, left: 60 }}
          valueFormat={v => `${v}`}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 10,
            tickRotation: 0,
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 10,
          }}
          colors={{
            type: 'sequential',
            scheme: 'blues',
            minValue: 0,
            maxValue: maxValue,
          }}
          emptyColor="#1a1a1a"
          borderRadius={4}
          borderWidth={1}
          borderColor="#1a1a1a"
          enableLabels={false}
          hoverTarget="cell"
          tooltip={({ cell }) => (
            <div className="bg-black border border-white/10  px-3 py-2 shadow-xl z-[9999]">
              <div className="text-xs text-white/50 mb-1">{cell.serieId} @ {cell.data.x}</div>
              <div className="font-mono font-bold text-primary-500">
                {cell.data.y} {view === 'count' ? (cell.data.y === 1 ? 'meal' : 'meals') : 'cal'}
              </div>
            </div>
          )}
          theme={{
            background: 'transparent',
            text: {
              fill: 'rgba(255,255,255,0.6)',
            },
            axis: {
              ticks: {
                text: {
                  fill: 'rgba(255,255,255,0.6)',
                  fontSize: 11,
                }
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
          animate={true}
        />
      </motion.div>
    </div>
  );
}
