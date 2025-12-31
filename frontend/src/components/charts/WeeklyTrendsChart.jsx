import { ResponsiveLine } from '@nivo/line';
import { motion as Motion } from 'motion/react';
import { TrendingUp, Calendar } from 'lucide-react';

const MACRO_COLORS = {
  Calories: '#047857',
  Protein: '#0ea5e9',
  Carbs: '#f59e0b',
  Fat: '#a855f7',
  Fiber: '#ef4444',
};

export default function WeeklyTrendsChart({ data }) {
  // data format: [{ date: 'Mon', calories, protein, carbs, fat, fiber }, ...]
  
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/40">
        <Calendar size={32} className="mb-2 opacity-50" />
        <p>No data available</p>
      </div>
    );
  }

  const chartData = [
    {
      id: 'Calories',
      color: MACRO_COLORS.Calories,
      data: data.map(d => ({ x: d.date, y: d.calories || 0 })),
    },
    {
      id: 'Protein',
      color: MACRO_COLORS.Protein,
      data: data.map(d => ({ x: d.date, y: d.protein || 0 })),
    },
    {
      id: 'Carbs',
      color: MACRO_COLORS.Carbs,
      data: data.map(d => ({ x: d.date, y: d.carbs || 0 })),
    },
    {
      id: 'Fat',
      color: MACRO_COLORS.Fat,
      data: data.map(d => ({ x: d.date, y: d.fat || 0 })),
    },
  ];

  const CustomTooltip = ({ point }) => (
    <div className="bg-[#0a0a0a] border border-white/10  px-3 py-2 shadow-lg">
      <div className="text-xs text-white/50 mb-1">{point.data.x}</div>
      <div className="flex items-center gap-2">
        <div 
          className="w-3 h-3 " 
          style={{ backgroundColor: point.serieColor }}
        />
        <span className="text-white font-medium">{point.serieId}</span>
        <span className="font-mono font-bold" style={{ color: point.serieColor }}>
          {point.data.y}{point.serieId === 'Calories' ? '' : 'g'}
        </span>
      </div>
    </div>
  );

  return (
    <Motion.div       initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-72"
    >
      <ResponsiveLine
        data={chartData}
        margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
        xScale={{ type: 'point' }}
        yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false }}
        curve="cardinal"
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 0,
          tickPadding: 12,
          tickRotation: 0,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 12,
          tickValues: 5,
        }}
        enableGridX={false}
        gridYValues={5}
        colors={{ datum: 'color' }}
        lineWidth={2}
        pointSize={8}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        enableArea={false}
        areaOpacity={0.1}
        useMesh={true}
        enableSlices={false}
        tooltip={CustomTooltip}
        legends={[
          {
            anchor: 'bottom',
            direction: 'row',
            justify: false,
            translateX: 0,
            translateY: 45,
            itemsSpacing: 16,
            itemDirection: 'left-to-right',
            itemWidth: 80,
            itemHeight: 20,
            itemOpacity: 0.75,
            symbolSize: 10,
            symbolShape: 'circle',
            itemTextColor: 'rgba(255,255,255,0.6)',
            effects: [
              {
                on: 'hover',
                style: {
                  itemBackground: 'rgba(255,255,255,0.05)',
                  itemOpacity: 1,
                  itemTextColor: '#ffffff',
                }
              }
            ]
          }
        ]}
        theme={{
          background: 'transparent',
          textColor: 'rgba(255,255,255,0.6)',
          fontSize: 12,
          fontFamily: 'Plus Jakarta Sans',
          axis: {
            domain: {
              line: {
                stroke: 'rgba(255,255,255,0.1)',
                strokeWidth: 1
              }
            },
            ticks: {
              text: {
                fontFamily: 'Plus Jakarta Sans',
                fontSize: 11,
              }
            }
          },
          grid: {
            line: {
              stroke: 'rgba(255,255,255,0.05)',
              strokeWidth: 1
            }
          },
          crosshair: {
            line: {
              stroke: 'rgba(255,255,255,0.3)',
              strokeWidth: 1,
              strokeDasharray: '4 4',
            }
          },
        }}
        motionConfig="gentle"
      />
    </Motion.div>
  );
}

