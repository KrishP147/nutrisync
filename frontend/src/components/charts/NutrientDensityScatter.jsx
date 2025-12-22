import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Crosshair, Info } from 'lucide-react';

const MEAL_TYPE_COLORS = {
  breakfast: '#f59e0b',
  lunch: '#10b981',
  dinner: '#3b82f6',
  snack: '#a855f7',
};

export default function NutrientDensityScatter({ meals, onMealClick }) {
  const [showInfo, setShowInfo] = useState(false);
  const [densityType, setDensityType] = useState('protein');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!meals || meals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/40">
        <Crosshair size={32} className="mb-2 opacity-50" />
        <p>No meal data for scatter plot</p>
      </div>
    );
  }

  // Group meals by type for the scatter plot
  const scatterData = Object.entries(MEAL_TYPE_COLORS).map(([type, color]) => ({
    id: type.charAt(0).toUpperCase() + type.slice(1),
    data: meals
      .filter(m => (m.meal_type || 'snack').toLowerCase() === type)
      .map(meal => {
        const calories = meal.total_calories || 1;
        const density = densityType === 'protein' 
          ? ((meal.total_protein_g || 0) / calories) * 100
          : ((meal.total_fiber_g || 0) / calories) * 100;
        
        return {
          x: calories,
          y: parseFloat(density.toFixed(2)),
          meal: meal,
        };
      })
      .filter(d => d.x > 0),
  })).filter(group => group.data.length > 0);

  const CustomTooltip = ({ node }) => (
    <div className="bg-black border border-white/10  px-3 py-2 shadow-lg pointer-events-none">
      <div className="text-xs text-white/50 mb-1">{node.data.meal?.meal_name || 'Meal'}</div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-white/70">Calories:</span>
          <span className="font-mono text-white">{node.data.x}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-white/70">{densityType === 'protein' ? 'Protein' : 'Fiber'} Density:</span>
          <span className="font-mono text-primary-500">{node.data.y}%</span>
        </div>
        {node.data.meal && (
          <>
            <div className="flex justify-between gap-4">
              <span className="text-white/70">Protein:</span>
              <span className="font-mono text-secondary-400">{node.data.meal.total_protein_g}g</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/70">Carbs:</span>
              <span className="font-mono text-amber-400">{node.data.meal.total_carbs_g}g</span>
            </div>
          </>
        )}
      </div>
    </div>
  );

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
          <div className="absolute right-0 top-6 w-64 bg-black border border-white/10  p-3 text-xs text-white/70 z-20">
            Shows meal quality by plotting calories vs nutrient density. Higher dots = more nutritious per calorie. Colors indicate meal type.
          </div>
        )}
      </div>

      {/* Toggle buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setDensityType('protein')}
          className={`px-3 py-1.5  text-sm font-medium transition ${
            densityType === 'protein' ? 'bg-secondary-500 text-white' : 'bg-white/5 text-white/60'
          }`}
        >
          Protein Density
        </button>
        <button
          onClick={() => setDensityType('fiber')}
          className={`px-3 py-1.5  text-sm font-medium transition ${
            densityType === 'fiber' ? 'bg-green-500 text-white' : 'bg-white/5 text-white/60'
          }`}
        >
          Fiber Density
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-80"
        style={{ overflow: 'visible' }}
      >
        <ResponsiveScatterPlot
          data={scatterData}
          margin={{ top: 30, right: 20, bottom: 70, left: 70 }}
          xScale={{ type: 'linear', min: 0, max: 'auto' }}
          yScale={{ type: 'linear', min: 0, max: 'auto' }}
          colors={[
            MEAL_TYPE_COLORS.breakfast,
            MEAL_TYPE_COLORS.lunch,
            MEAL_TYPE_COLORS.dinner,
            MEAL_TYPE_COLORS.snack,
          ]}
          blendMode="normal"
          nodeSize={12}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 10,
            tickValues: isMobile ? 3 : undefined, // Show only 3 labels on mobile
            legend: 'Calories',
            legendPosition: 'middle',
            legendOffset: 40,
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 10,
            legend: `${densityType === 'protein' ? 'Protein' : 'Fiber'} per 100 cal`,
            legendPosition: 'middle',
            legendOffset: -55,
          }}
          tooltip={CustomTooltip}
          onClick={(node) => onMealClick && onMealClick(node.data.meal)}
          legends={[
            {
              anchor: 'bottom',
              direction: 'row',
              translateY: 65,
              itemWidth: 70,
              itemHeight: 20,
              itemTextColor: 'rgba(255,255,255,0.6)',
              symbolSize: 10,
              symbolShape: 'circle',
              itemsSpacing: 10,
            }
          ]}
          theme={{
            background: 'transparent',
            textColor: 'rgba(255,255,255,0.6)',
            fontSize: 11,
            fontFamily: 'Plus Jakarta Sans',
            axis: {
              legend: { text: { fontSize: 11, fill: 'rgba(255,255,255,0.6)' } },
              ticks: { text: { fontSize: 10, fill: 'rgba(255,255,255,0.6)' } }
            },
            grid: {
              line: { stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }
            },
            tooltip: {
              container: {
                background: 'transparent',
                boxShadow: 'none',
                padding: 0,
              }
            }
          }}
        />
      </motion.div>
    </div>
  );
}
