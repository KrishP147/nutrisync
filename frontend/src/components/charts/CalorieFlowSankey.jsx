import { ResponsiveSankey } from '@nivo/sankey';
import { useState, useEffect } from 'react';
import { motion as Motion } from 'motion/react';
import { GitBranch, Info } from 'lucide-react';

const COLORS = {
  Breakfast: '#f59e0b',
  Lunch: '#10b981',
  Dinner: '#3b82f6',
  Snack: '#a855f7',
  Protein: '#0ea5e9',
  Carbs: '#f59e0b',
  Fat: '#a855f7',
  Fiber: '#22c55e',
};

export default function CalorieFlowSankey({ meals }) {
  const [showInfo, setShowInfo] = useState(false);
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
        <GitBranch size={32} className="mb-2 opacity-50" />
        <p>No data for calorie flow</p>
      </div>
    );
  }

  // Calculate totals by meal type and macro
  const mealTypeData = meals.reduce((acc, meal) => {
    const type = (meal.meal_type || 'snack').charAt(0).toUpperCase() + (meal.meal_type || 'snack').slice(1);
    if (!acc[type]) {
      acc[type] = { protein: 0, carbs: 0, fat: 0, fiber: 0, total: 0 };
    }
    acc[type].protein += (meal.total_protein_g || 0) * 4;
    acc[type].carbs += (meal.total_carbs_g || 0) * 4;
    acc[type].fat += (meal.total_fat_g || 0) * 9;
    acc[type].fiber += (meal.total_fiber_g || 0) * 2;
    acc[type].total += meal.total_calories || 0;
    return acc;
  }, {});

  // Only include meal types that have data
  const activeMealTypes = Object.keys(mealTypeData).filter(type => mealTypeData[type].total > 0);
  
  if (activeMealTypes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/40">
        <GitBranch size={32} className="mb-2 opacity-50" />
        <p>Not enough data for flow visualization</p>
      </div>
    );
  }

  const nodes = [
    ...activeMealTypes.map(type => ({ id: type, nodeColor: COLORS[type] || '#6b7280' })),
    { id: 'Protein', nodeColor: COLORS.Protein },
    { id: 'Carbs', nodeColor: COLORS.Carbs },
    { id: 'Fat', nodeColor: COLORS.Fat },
    { id: 'Fiber', nodeColor: COLORS.Fiber },
  ];

  const links = [];
  activeMealTypes.forEach(type => {
    const data = mealTypeData[type];
    if (data.protein > 5) links.push({ source: type, target: 'Protein', value: Math.round(data.protein) });
    if (data.carbs > 5) links.push({ source: type, target: 'Carbs', value: Math.round(data.carbs) });
    if (data.fat > 5) links.push({ source: type, target: 'Fat', value: Math.round(data.fat) });
    if (data.fiber > 5) links.push({ source: type, target: 'Fiber', value: Math.round(data.fiber) });
  });

  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/40">
        <GitBranch size={32} className="mb-2 opacity-50" />
        <p>Not enough data for flow visualization</p>
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
          <div className="absolute right-0 top-6 w-72 bg-black border border-white/10  p-3 text-xs text-white/70 z-[9999] shadow-xl">
            Shows how calories flow from meal types to macronutrients. Left side shows meal types (Breakfast, Lunch, Dinner, Snack), right side shows where those calories come from (Protein, Carbs, Fat, Fiber). Width of flows = calorie amount.
          </div>
        )}
      </div>

      <Motion.div         initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-80"
      >
        <ResponsiveSankey
          data={{ nodes, links }}
          margin={{ top: 20, right: isMobile ? 80 : 140, bottom: 20, left: isMobile ? 80 : 140 }}
          align="justify"
          colors={(node) => node.nodeColor || COLORS[node.id] || '#6b7280'}
          nodeOpacity={1}
          nodeHoverOpacity={1}
          nodeHoverOthersOpacity={0.35}
          nodeThickness={20}
          nodeSpacing={30}
          nodeBorderWidth={0}
          nodeBorderRadius={4}
          linkOpacity={0.6}
          linkHoverOpacity={0.9}
          linkHoverOthersOpacity={0.15}
          linkContract={0}
          enableLinkGradient={true}
          linkBlendMode="normal"
          labelPosition="outside"
          labelOrientation="horizontal"
          labelPadding={16}
          labelTextColor="rgba(255,255,255,0.9)"
          tooltip={({ node, link }) => {
            if (node) {
              const totalCals = links
                .filter(l => l.source === node.id || l.target === node.id)
                .reduce((sum, l) => sum + l.value, 0);
              return (
                <div className="bg-black border border-white/10  px-3 py-2 shadow-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 " style={{ backgroundColor: node.color }} />
                    <span className="font-medium text-white">{node.id}</span>
                  </div>
                  <div className="font-mono font-bold text-primary-500">{totalCals} cal</div>
                </div>
              );
            }
            if (link) {
              return (
                <div className="bg-black border border-white/10  px-3 py-2 shadow-xl">
                  <div className="text-white/70 text-sm mb-1">
                    {link.source.id} → {link.target.id}
                  </div>
                  <div className="font-mono font-bold text-white">
                    {link.value} cal
                  </div>
                </div>
              );
            }
            return null;
          }}
          theme={{
            background: 'transparent',
            textColor: 'rgba(255,255,255,0.9)',
            fontSize: 12,
            fontFamily: 'Plus Jakarta Sans',
            labels: {
              text: {
                fill: 'rgba(255,255,255,0.9)',
                fontSize: 12,
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
          motionConfig="gentle"
        />
      </Motion.div>
    </div>
  );
}
