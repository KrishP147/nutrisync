import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Box, Info, RotateCcw } from 'lucide-react';
import Plot from 'react-plotly.js';

const MEAL_TYPE_COLORS = {
  breakfast: '#f59e0b',
  lunch: '#10b981',
  dinner: '#3b82f6',
  snack: '#a855f7',
};

export default function MealNutrientSpace3D({ meals }) {
  const [showInfo, setShowInfo] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);

  const plotData = useMemo(() => {
    if (!meals || meals.length === 0) return null;

    // Group by meal type for different traces
    const mealsByType = {};
    
    meals.forEach(meal => {
      const type = (meal.meal_type || 'snack').toLowerCase();
      if (!mealsByType[type]) {
        mealsByType[type] = {
          x: [], y: [], z: [],
          sizes: [], texts: [], meals: []
        };
      }
      
      mealsByType[type].x.push(meal.total_protein_g || 0);
      mealsByType[type].y.push(meal.total_carbs_g || 0);
      mealsByType[type].z.push(meal.total_fat_g || 0);
      mealsByType[type].sizes.push(Math.max(8, Math.min(40, (meal.total_calories || 0) / 20)));
      mealsByType[type].texts.push(
        `${meal.meal_name || 'Meal'}<br>` +
        `Calories: ${meal.total_calories || 0}<br>` +
        `Protein: ${meal.total_protein_g || 0}g<br>` +
        `Carbs: ${meal.total_carbs_g || 0}g<br>` +
        `Fat: ${meal.total_fat_g || 0}g`
      );
      mealsByType[type].meals.push(meal);
    });

    return Object.entries(mealsByType).map(([type, data]) => ({
      type: 'scatter3d',
      mode: 'markers',
      name: type.charAt(0).toUpperCase() + type.slice(1),
      x: data.x,
      y: data.y,
      z: data.z,
      text: data.texts,
      hovertemplate: '%{text}<extra></extra>',
      marker: {
        size: data.sizes,
        color: MEAL_TYPE_COLORS[type],
        opacity: 0.8,
        line: {
          color: 'rgba(255,255,255,0.3)',
          width: 1
        }
      }
    }));
  }, [meals]);

  if (!meals || meals.length === 0 || !plotData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/40">
        <Box size={32} className="mb-2 opacity-50" />
        <p>No meal data for 3D visualization</p>
      </div>
    );
  }

  const layout = {
    autosize: true,
    height: 450,
    margin: { l: 0, r: 0, t: 30, b: 0 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    scene: {
      xaxis: {
        title: { text: 'Protein (g)', font: { color: 'rgba(255,255,255,0.6)', size: 11 } },
        gridcolor: 'rgba(255,255,255,0.05)',
        zerolinecolor: 'rgba(255,255,255,0.1)',
        tickfont: { color: 'rgba(255,255,255,0.5)', size: 10 },
        backgroundcolor: 'transparent',
      },
      yaxis: {
        title: { text: 'Carbs (g)', font: { color: 'rgba(255,255,255,0.6)', size: 11 } },
        gridcolor: 'rgba(255,255,255,0.05)',
        zerolinecolor: 'rgba(255,255,255,0.1)',
        tickfont: { color: 'rgba(255,255,255,0.5)', size: 10 },
        backgroundcolor: 'transparent',
      },
      zaxis: {
        title: { text: 'Fat (g)', font: { color: 'rgba(255,255,255,0.6)', size: 11 } },
        gridcolor: 'rgba(255,255,255,0.05)',
        zerolinecolor: 'rgba(255,255,255,0.1)',
        tickfont: { color: 'rgba(255,255,255,0.5)', size: 10 },
        backgroundcolor: 'transparent',
      },
      bgcolor: 'transparent',
      camera: {
        eye: { x: 1.5, y: 1.5, z: 1.2 }
      }
    },
    legend: {
      x: 0,
      y: 1,
      xanchor: 'left',
      font: { color: 'rgba(255,255,255,0.7)', size: 11 },
      bgcolor: 'transparent'
    },
    hoverlabel: {
      bgcolor: '#0a0a0a',
      bordercolor: 'rgba(255,255,255,0.2)',
      font: { color: '#ffffff', size: 12 }
    }
  };

  const config = {
    displayModeBar: true,
    modeBarButtonsToRemove: ['toImage', 'sendDataToCloud', 'resetCameraLastSave3d'],
    displaylogo: false,
    responsive: true
  };

  return (
    <div className="relative">
      {/* Info tooltip */}
      <div 
        className="absolute top-0 right-0 z-10"
        onMouseEnter={() => setShowInfo(true)}
        onMouseLeave={() => setShowInfo(false)}
      >
        <Info size={18} className="text-white/40 hover:text-white/70 cursor-help" />
        {showInfo && (
          <div className="absolute right-0 top-6 w-72 bg-black border border-white/10  p-3 text-xs text-white/70 z-20">
            3D scatter plot of your meals in macro space. Each axis represents a macronutrient (Protein, Carbs, Fat). Point size = calories, color = meal type. Drag to rotate, scroll to zoom!
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="flex items-center gap-2 mb-2 text-xs text-white/40">
        <RotateCcw size={14} />
        <span>Drag to rotate • Scroll to zoom • Click for details</span>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="overflow-hidden "
      >
        <Plot
          data={plotData}
          layout={layout}
          config={config}
          style={{ width: '100%', height: '450px' }}
          useResizeHandler={true}
        />
      </motion.div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 justify-center">
        {Object.entries(MEAL_TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2 text-xs text-white/60">
            <div className="w-3 h-3 " style={{ backgroundColor: color }} />
            <span className="capitalize">{type}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-xs text-white/40 border-l border-white/10 pl-4">
          <span>Larger points = more calories</span>
        </div>
      </div>
    </div>
  );
}

