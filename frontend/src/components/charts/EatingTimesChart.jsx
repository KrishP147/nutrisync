import { ResponsiveBar } from '@nivo/bar';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function EatingTimesChart({ meals, selectedView = 'calories' }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  // Process meals into hourly buckets
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: `${i.toString().padStart(2, '0')}:00`,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    mealCount: 0,
  }));

  meals?.forEach(meal => {
    const hour = new Date(meal.consumed_at).getHours();
    hourlyData[hour].calories += meal.total_calories || 0;
    hourlyData[hour].protein += meal.total_protein_g || 0;
    hourlyData[hour].carbs += meal.total_carbs_g || 0;
    hourlyData[hour].fat += meal.total_fat_g || 0;
    hourlyData[hour].mealCount += 1;
  });

  // Filter to only show hours with data or reasonable eating times (6am-11pm)
  const filteredData = hourlyData.filter(d => d.hour >= 6 && d.hour <= 23);

  const hasData = meals && meals.length > 0;

  // Find peak eating time
  const peakHour = hourlyData.reduce((max, d) => 
    d.calories > max.calories ? d : max, { calories: 0 }
  );

  const viewConfig = {
    calories: { key: 'calories', color: '#22c55e', label: 'Calories' }, // Green
    protein: { key: 'protein', color: '#ef4444', label: 'Protein' }, // Red
    carbs: { key: 'carbs', color: '#eab308', label: 'Carbs' }, // Yellow
    fat: { key: 'fat', color: '#a855f7', label: 'Fat' }, // Purple
  };

  const config = viewConfig[selectedView];

  const CustomTooltip = ({ data }) => (
    <div className="bg-[#0a0a0a] border border-white/10  px-3 py-2 shadow-lg">
      <div className="text-xs text-white/50 mb-1">{data.label}</div>
      <div className="font-mono font-bold text-lg" style={{ color: config.color }}>
        {Math.round(data[config.key])}{selectedView === 'calories' ? '' : 'g'}
      </div>
      <div className="text-xs text-white/40 mt-1">
        {data.mealCount} {data.mealCount === 1 ? 'meal' : 'meals'} logged
      </div>
    </div>
  );

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/40">
        <Clock size={32} className="mb-2 opacity-50" />
        <p>No meal timing data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-64"
      >
        <ResponsiveBar
          data={filteredData}
          keys={[config.key]}
          indexBy="label"
          margin={{ top: 10, right: 10, bottom: isMobile ? 60 : 40, left: isMobile ? 40 : 50 }}
          padding={0.3}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={[config.color]}
          borderRadius={4}
          borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 10,
            tickRotation: isMobile ? -45 : -45,
            tickValues: isMobile 
              ? filteredData.filter((_, i) => i % 4 === 0).map(d => d.label) // Show every 4th hour on mobile
              : filteredData.filter((_, i) => i % 2 === 0).map(d => d.label), // Show every 2nd hour on desktop
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 10,
            tickValues: 5,
          }}
          labelSkipWidth={12}
          labelSkipHeight={12}
          labelTextColor="transparent"
          enableGridY={true}
          gridYValues={5}
          tooltip={CustomTooltip}
          theme={{
            background: 'transparent',
            textColor: 'rgba(255,255,255,0.6)',
            fontSize: 11,
            fontFamily: 'Plus Jakarta Sans',
            axis: {
              ticks: {
                text: {
                  fontFamily: 'Plus Jakarta Sans',
                  fontSize: 10,
                }
              }
            },
            grid: {
              line: {
                stroke: 'rgba(255,255,255,0.05)',
                strokeWidth: 1
              }
            },
          }}
          animate={true}
          motionConfig="gentle"
        />
      </motion.div>

      {/* Insights */}
      {peakHour.calories > 0 && (
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="bg-white/5 border border-white/10  px-3 py-2">
            <span className="text-white/50">Peak eating time:</span>
            <span className="ml-2 font-mono font-medium text-white">
              {peakHour.hour.toString().padStart(2, '0')}:00
            </span>
          </div>
          <div className="bg-white/5 border border-white/10  px-3 py-2">
            <span className="text-white/50">Total meals:</span>
            <span className="ml-2 font-mono font-medium text-white">
              {meals.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

