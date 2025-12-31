import { ResponsivePie } from '@nivo/pie';
import { motion as Motion } from 'motion/react';
import { Utensils } from 'lucide-react';

const MACRO_COLORS = {
  Protein: '#0ea5e9', // Sky blue
  Carbs: '#f59e0b',   // Amber
  Fat: '#c084fc',     // Light purple/pink
  Fiber: '#ef4444',   // Red
};

export default function MacroBreakdownChart({ data, showLegend = true }) {
  // data should be: { protein, carbs, fat, fiber, calories }
  
  const hasData = data && (data.protein > 0 || data.carbs > 0 || data.fat > 0 || data.fiber > 0);
  
  const chartData = hasData ? [
    { id: 'Protein', label: 'Protein', value: parseFloat(data.protein?.toFixed(1) || 0), color: MACRO_COLORS.Protein },
    { id: 'Carbs', label: 'Carbs', value: parseFloat(data.carbs?.toFixed(1) || 0), color: MACRO_COLORS.Carbs },
    { id: 'Fat', label: 'Fat', value: parseFloat(data.fat?.toFixed(1) || 0), color: MACRO_COLORS.Fat },
    { id: 'Fiber', label: 'Fiber', value: parseFloat(data.fiber?.toFixed(1) || 0), color: MACRO_COLORS.Fiber },
  ].filter(d => d.value > 0) : [];

  const CustomTooltip = ({ datum }) => (
    <div className="bg-[#0a0a0a] border border-white/10  px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2 mb-1">
        <div 
          className="w-3 h-3 " 
          style={{ backgroundColor: datum.color }}
        />
        <span className="font-medium text-white">{datum.id}</span>
      </div>
      <div className="text-lg font-mono font-bold" style={{ color: datum.color }}>
        {datum.value}g
      </div>
      <div className="text-xs text-white/50">
        {((datum.value / chartData.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1)}% of total
      </div>
    </div>
  );

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <div className="w-16 h-16  bg-white/5 flex items-center justify-center mb-4">
          <Utensils size={32} className="text-white/30" />
        </div>
        <p className="text-white/50 text-sm">No macros logged yet</p>
        <p className="text-white/30 text-xs mt-1">Log a meal to see breakdown</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <ResponsivePie
        data={chartData}
        margin={{ top: 20, right: 20, bottom: showLegend ? 60 : 20, left: 20 }}
        innerRadius={0.65}
        padAngle={2}
        cornerRadius={4}
        activeOuterRadiusOffset={8}
        colors={{ datum: 'data.color' }}
        borderWidth={2}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        enableArcLinkLabels={false}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor="#ffffff"
        arcLabel={d => `${d.value}g`}
        tooltip={CustomTooltip}
        legends={showLegend ? [
          {
            anchor: 'bottom',
            direction: 'row',
            justify: false,
            translateX: 0,
            translateY: 50,
            itemsSpacing: 8,
            itemWidth: 70,
            itemHeight: 18,
            itemTextColor: 'rgba(255,255,255,0.6)',
            itemDirection: 'left-to-right',
            itemOpacity: 1,
            symbolSize: 10,
            symbolShape: 'circle',
          }
        ] : []}
        motionConfig="gentle"
        theme={{
          labels: {
            text: {
              fontFamily: 'JetBrains Mono',
              fontSize: 11,
              fontWeight: 600,
            }
          },
          legends: {
            text: {
              fontFamily: 'Plus Jakarta Sans',
              fontSize: 12,
            }
          }
        }}
      />
    </div>
  );
}

