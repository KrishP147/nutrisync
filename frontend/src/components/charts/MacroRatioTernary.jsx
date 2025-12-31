import { useState, useMemo } from 'react';
import { motion as Motion } from 'motion/react';
import { Triangle, Info } from 'lucide-react';

// Convert P/C/F ratio to ternary coordinates
const toTernary = (p, c, f) => {
  const total = p + c + f;
  if (total === 0) return { x: 0.5, y: 0.33 };
  
  const pRatio = p / total;
  const cRatio = c / total;
  
  // Ternary plot coordinates
  const x = 0.5 * (2 * cRatio + pRatio);
  const y = (Math.sqrt(3) / 2) * pRatio;
  
  return { x, y: y * 0.85 + 0.08 }; // Scale and offset for visual
};

const CALORIE_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
};

export default function MacroRatioTernary({ meals }) {
  const [showInfo, setShowInfo] = useState(false);
  const [hoveredMeal, setHoveredMeal] = useState(null);

  const points = useMemo(() => {
    if (!meals || meals.length === 0) return [];
    
    return meals.map(meal => {
      const p = (meal.total_protein_g || 0) * 4;
      const c = (meal.total_carbs_g || 0) * 4;
      const f = (meal.total_fat_g || 0) * 9;
      const coords = toTernary(p, c, f);
      const calories = meal.total_calories || 0;
      
      return {
        ...coords,
        meal,
        calories,
        color: calories < 300 ? CALORIE_COLORS.low : 
               calories < 600 ? CALORIE_COLORS.medium : 
               CALORIE_COLORS.high,
        size: Math.min(12, Math.max(4, (meal.total_fiber_g || 0) * 2)),
      };
    });
  }, [meals]);

  if (!meals || meals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/40">
        <Triangle size={32} className="mb-2 opacity-50" />
        <p>No meal data for ternary plot</p>
      </div>
    );
  }

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
            Triangular plot of macro ratios. Top = high protein, bottom-left = high fat, bottom-right = high carbs. 
            Color: green = low cal, amber = medium, red = high cal. 
            Size: more fiber = larger dot.
          </div>
        )}
      </div>

      <Motion.div         initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-80 relative overflow-hidden"
      >
        <svg viewBox="0 0 100 95" className="w-full h-full">
          {/* Triangle background */}
          <polygon
            points="50,12 5,88 95,88"
            fill="rgba(255,255,255,0.02)"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="0.5"
          />
          
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map(ratio => (
            <g key={ratio}>
              <line
                x1={50 - 45 * ratio}
                y1={12 + 76 * ratio}
                x2={50 + 45 * ratio}
                y2={12 + 76 * ratio}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="0.3"
              />
            </g>
          ))}
          
          {/* Axis labels - moved down to prevent cutoff */}
          <text x="50" y="8" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="4" fontFamily="Plus Jakarta Sans">
            Protein
          </text>
          <text x="2" y="92" textAnchor="start" fill="rgba(255,255,255,0.6)" fontSize="4" fontFamily="Plus Jakarta Sans">
            Fat
          </text>
          <text x="98" y="92" textAnchor="end" fill="rgba(255,255,255,0.6)" fontSize="4" fontFamily="Plus Jakarta Sans">
            Carbs
          </text>
          
          {/* Data points */}
          {points.map((point, i) => (
            <circle
              key={i}
              cx={point.x * 90 + 5}
              cy={95 - point.y * 90}
              r={point.size / 3}
              fill={point.color}
              opacity={hoveredMeal === i ? 1 : 0.7}
              stroke={hoveredMeal === i ? 'white' : 'transparent'}
              strokeWidth="0.5"
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredMeal(i)}
              onMouseLeave={() => setHoveredMeal(null)}
            />
          ))}
        </svg>

        {/* Tooltip */}
        {hoveredMeal !== null && points[hoveredMeal] && (
          <div 
            className="absolute bg-black border border-white/10  px-3 py-2 shadow-lg text-sm pointer-events-none z-20"
            style={{
              left: `${points[hoveredMeal].x * 100}%`,
              top: `${(1 - points[hoveredMeal].y) * 100}%`,
              transform: 'translate(-50%, -120%)',
            }}
          >
            <div className="text-xs text-white/50 mb-1">
              {points[hoveredMeal].meal.meal_name?.substring(0, 25) || 'Meal'}
            </div>
            <div className="font-mono text-white">{points[hoveredMeal].calories} cal</div>
            <div className="text-xs text-white/50 mt-1">
              P: {points[hoveredMeal].meal.total_protein_g}g | 
              C: {points[hoveredMeal].meal.total_carbs_g}g | 
              F: {points[hoveredMeal].meal.total_fat_g}g
            </div>
          </div>
        )}
      </Motion.div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-2 text-xs text-white/50">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3  bg-[#10b981]" />
          <span>&lt;300 cal</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3  bg-[#f59e0b]" />
          <span>300-600 cal</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3  bg-[#ef4444]" />
          <span>&gt;600 cal</span>
        </div>
      </div>
    </div>
  );
}
