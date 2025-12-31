import { ResponsiveTreeMap } from '@nivo/treemap';
import { useState, useEffect } from 'react';
import { motion as Motion } from 'motion/react';
import { LayoutGrid, Info } from 'lucide-react';

const MACRO_COLORS = {
  'Protein': '#0ea5e9',
  'Carbs': '#f59e0b',
  'Fats': '#d8b4fe',
  'Other': '#6b7280',
};

// Simple food categorization based on keywords
const categorizeFood = (name) => {
  const lower = name.toLowerCase();

  // Protein sources
  if (/chicken|beef|fish|salmon|tuna|egg|turkey|pork|shrimp|whey|protein|meat|steak/.test(lower)) {
    return 'Protein';
  }

  // Carb sources
  if (/rice|bread|pasta|potato|oat|cereal|grain|wheat|corn|noodle|bagel|tortilla|fruit|apple|banana|orange/.test(lower)) {
    return 'Carbs';
  }

  // Fat sources
  if (/butter|oil|avocado|nut|cheese|cream|mayo|peanut|almond|bacon|coconut/.test(lower)) {
    return 'Fats';
  }

  return 'Other';
};

// Truncate text with ellipsis - shorter limit
const truncateName = (name, maxLength = 12) => {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 1) + '…';
};

export default function MealCompositionTreeMap({ meals }) {
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
        <LayoutGrid size={32} className="mb-2 opacity-50" />
        <p>No meal data for treemap</p>
      </div>
    );
  }

  // Build hierarchical data
  const categoryData = {};

  meals.forEach(meal => {
    const category = categorizeFood(meal.meal_name || '');
    const calories = meal.total_calories || 0;
    
    if (!categoryData[category]) {
      categoryData[category] = {};
    }
    
    // Simplify meal name for grouping - shorter limit
    const simpleName = (meal.meal_name || 'Unknown')
      .replace(/\s*\([^)]*\)/g, '') // Remove portion info in parentheses
      .split(',')[0] // Take first item if comma-separated
      .trim()
      .substring(0, 20);
    
    if (!categoryData[category][simpleName]) {
      categoryData[category][simpleName] = 0;
    }
    categoryData[category][simpleName] += calories;
  });

  const treeData = {
    name: 'All Meals',
    children: Object.entries(categoryData).map(([category, foods]) => ({
      name: category,
      color: MACRO_COLORS[category],
      children: Object.entries(foods)
        .filter(([, cal]) => cal > 0)
        .map(([food, calories]) => ({
          name: food,
          displayName: truncateName(food),
          value: Math.round(calories),
          color: MACRO_COLORS[category],
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10), // Top 10 per category
    })).filter(cat => cat.children.length > 0),
  };

  const CustomTooltip = ({ node }) => {
    const displayName = node.data.displayName || node.data.name || node.id;
    
    return (
      <div className="bg-black border border-white/10  px-3 py-2 shadow-xl" style={{ color: '#ffffff', zIndex: 99999, position: 'relative' }}>
        <div className="font-medium mb-1" style={{ color: '#ffffff' }}>{displayName}</div>
        {node.value && (
          <div className="font-mono" style={{ color: '#ffffff' }}>{node.value} calories</div>
        )}
        {node.data.name && node.data.name !== displayName && (
          <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>{node.data.name}</div>
        )}
      </div>
    );
  };

  return (
    <div className="relative" style={{ overflow: 'visible' }}>
      {/* Info tooltip - positioned higher */}
      <div 
        className="absolute -top-8 right-0 z-50"
        onMouseEnter={() => setShowInfo(true)}
        onMouseLeave={() => setShowInfo(false)}
      >
        <Info size={18} className="text-white/40 hover:text-white/70 cursor-help" />
        {showInfo && (
          <div className="absolute right-0 top-6 w-64 bg-black border border-white/10  p-3 text-xs text-white/70 z-[9999] shadow-xl">
            Shows what foods dominate your diet. Area represents total calories. Colors indicate macro type (blue = protein, amber = carbs, purple = fat).
          </div>
        )}
      </div>

      <div className="overflow-x-auto -mx-4 px-4" style={{ overflow: 'visible' }}>
        <Motion.div           initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-80 mt-6"
          style={{ overflow: 'visible', minWidth: isMobile ? '600px' : 'auto', position: 'relative', zIndex: 1 }}
        >
          <ResponsiveTreeMap
            data={treeData}
            identity="name"
            value="value"
            margin={{ top: 10, right: isMobile ? 50 : 10, bottom: 10, left: isMobile ? 50 : 10 }}
          labelSkipSize={80}
          label={e => {
            // Dynamically limit text length based on rectangle size
            const width = e.width || 0;
            const height = e.height || 0;
            const area = width * height;
            const minDimension = Math.min(width, height);
            
            if (isMobile) {
              // Show labels on mobile for boxes with area > 5000
              if (area < 5000) return '';
              // Calculate max length based on rectangle size
              const maxLength = Math.max(8, Math.floor(minDimension / 8));
              return e.data.displayName || truncateName(e.id, maxLength);
            }
            if (area < 3000) return '';
            // Calculate max length based on rectangle size - allow more text for larger boxes
            const maxLength = Math.max(12, Math.floor(minDimension / 6));
            return e.data.displayName || truncateName(e.id, maxLength);
          }}
          labelTextColor="#ffffff"
          parentLabelPosition={isMobile ? "top" : "left"}
          parentLabelTextColor={isMobile ? "#ffffff" : "#ffffff"}
          parentLabelPadding={isMobile ? 2 : 4}
          parentLabelSize={isMobile ? 10 : undefined}
          colors={(node) => node.data.color || '#6b7280'}
          borderWidth={2}
          borderColor="rgba(0,0,0,0.5)"
          nodeOpacity={0.9}
          tooltip={CustomTooltip}
          isInteractive={true}
          onClick={() => {
            // Tooltip will show on hover/click automatically
          }}
            theme={{
              labels: {
                text: {
                  fontFamily: 'Plus Jakarta Sans',
                  fontSize: 9,
                  fontWeight: 500,
                }
              },
              tooltip: {
                container: {
                  background: 'transparent',
                  boxShadow: 'none',
                  padding: 0,
                  zIndex: 99999,
                  position: 'relative',
                }
              }
            }}
          animate={true}
          motionConfig="gentle"
        />
        </Motion.div>
      </div>
    </div>
  );
}
