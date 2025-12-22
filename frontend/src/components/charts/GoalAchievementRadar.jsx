import { ResponsiveRadar } from '@nivo/radar';
import { motion } from 'motion/react';
import { Target } from 'lucide-react';

export default function GoalAchievementRadar({ currentData, goals, previousData }) {
  if (!currentData || !goals) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/40">
        <Target size={32} className="mb-2 opacity-50" />
        <p>No goal data available</p>
      </div>
    );
  }

  // Calculate percentages
  const calculatePercent = (value, goal) => {
    if (!goal || goal === 0) return 0;
    return Math.min(Math.round((value / goal) * 100), 150);
  };

  const radarData = [
    {
      metric: 'Calories',
      current: calculatePercent(currentData.calories, goals.calories),
      previous: previousData ? calculatePercent(previousData.calories, goals.calories) : 0,
    },
    {
      metric: 'Protein',
      current: calculatePercent(currentData.protein, goals.protein),
      previous: previousData ? calculatePercent(previousData.protein, goals.protein) : 0,
    },
    {
      metric: 'Carbs',
      current: calculatePercent(currentData.carbs, goals.carbs),
      previous: previousData ? calculatePercent(previousData.carbs, goals.carbs) : 0,
    },
    {
      metric: 'Fat',
      current: calculatePercent(currentData.fat, goals.fat),
      previous: previousData ? calculatePercent(previousData.fat, goals.fat) : 0,
    },
    {
      metric: 'Fiber',
      current: calculatePercent(currentData.fiber, goals.fiber),
      previous: previousData ? calculatePercent(previousData.fiber, goals.fiber) : 0,
    },
  ];

  // Calculate overall achievement
  const avgCurrent = radarData.reduce((sum, d) => sum + d.current, 0) / radarData.length;
  const allAbove90 = radarData.every(d => d.current >= 90);
  const allAbove100 = radarData.every(d => d.current >= 100);
  const anyBelow70 = radarData.some(d => d.current < 70);

  const CustomTooltip = ({ index, indexValue }) => {
    const point = radarData[index];
    return (
      <div className="bg-[#0a0a0a] border border-white/10  px-3 py-2 shadow-lg">
        <div className="font-medium text-white mb-1">{indexValue}</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2  bg-primary-500" />
            <span className="text-white/70 text-sm">Current:</span>
            <span className="font-mono font-bold text-primary-500">{point.current}%</span>
          </div>
          {point.previous > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2  bg-white/30" />
              <span className="text-white/70 text-sm">Previous:</span>
              <span className="font-mono text-white/50">{point.previous}%</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="h-72"
      >
        <ResponsiveRadar
          data={radarData}
          keys={previousData ? ['current', 'previous'] : ['current']}
          indexBy="metric"
          maxValue={150}
          margin={{ top: 40, right: 60, bottom: 40, left: 60 }}
          borderColor={{ from: 'color' }}
          gridLabelOffset={24}
          gridLevels={6}
          gridShape="linear"
          dotSize={8}
          dotColor={{ theme: 'background' }}
          dotBorderWidth={2}
          colors={['#047857', 'rgba(255,255,255,0.3)']}
          fillOpacity={0.25}
          blendMode="normal"
          animate={true}
          motionConfig="gentle"
          sliceTooltip={CustomTooltip}
          theme={{
            background: 'transparent',
            textColor: 'rgba(255,255,255,0.7)',
            fontSize: 12,
            fontFamily: 'Plus Jakarta Sans',
            grid: {
              line: {
                stroke: 'rgba(255,255,255,0.1)',
                strokeWidth: 1,
              }
            },
            dots: {
              text: {
                fontFamily: 'JetBrains Mono',
              }
            }
          }}
        />
      </motion.div>

      {/* Achievement badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex justify-center"
      >
        <div className={`px-4 py-2  border text-sm font-medium ${
          allAbove100 
            ? 'bg-primary-700/20 border-primary-700/30 text-primary-500' 
            : allAbove90 
              ? 'bg-secondary-500/20 border-secondary-500/30 text-secondary-400'
              : anyBelow70
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                : 'bg-white/5 border-white/10 text-white/60'
        }`}>
          {allAbove100 
            ? 'Perfect Week! All goals exceeded' 
            : allAbove90 
              ? 'Great Week! Close to all goals'
              : anyBelow70
                ? 'Keep Going! Some goals need attention'
                : `Average: ${Math.round(avgCurrent)}% of goals`
          }
        </div>
      </motion.div>
    </div>
  );
}

