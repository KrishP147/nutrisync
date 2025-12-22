import { motion } from 'motion/react';

const getColor = (percent) => {
  if (percent > 100) return '#0ea5e9'; // Sky blue - exceeding
  if (percent >= 81) return '#10b981'; // Green - on track
  if (percent >= 51) return '#f59e0b'; // Amber - getting there
  return '#ef4444'; // Red - needs work
};

function ProgressRing({ value, max, label, unit, color, delay = 0 }) {
  const percent = max > 0 ? Math.min((value / max) * 100, 150) : 0;
  const displayPercent = Math.min(percent, 100);
  const strokeWidth = 8;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayPercent / 100) * circumference;
  const ringColor = color || getColor(percent);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center group"
    >
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background ring */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <motion.circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ delay: delay + 0.2, duration: 1, ease: 'easeOut' }}
          />
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.5, duration: 0.3 }}
            className="text-2xl font-mono font-bold"
            style={{ color: ringColor }}
          >
            {Math.round(percent)}%
          </motion.span>
          <span className="text-xs text-white/40 mt-0.5">{label}</span>
        </div>
      </div>
      
      {/* Value display */}
      <div className="mt-3 text-center">
        <p className="font-mono text-sm text-white">
          <span style={{ color: ringColor }}>{Math.round(value)}</span>
          <span className="text-white/40"> / {max}{unit}</span>
        </p>
      </div>
      
      {/* Hover tooltip */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#0a0a0a] border border-white/10  px-2 py-1 text-xs text-white/70 whitespace-nowrap z-10">
        {max - value > 0 ? `${Math.round(max - value)}${unit} remaining` : 'Goal reached!'}
      </div>
    </motion.div>
  );
}

export default function ProgressRings({ data, goals }) {
  const rings = [
    { 
      value: data?.calories || 0, 
      max: goals?.calories || 2000, 
      label: 'Calories', 
      unit: '', 
      color: '#047857' 
    },
    { 
      value: data?.protein || 0, 
      max: goals?.protein || 150, 
      label: 'Protein', 
      unit: 'g', 
      color: '#0ea5e9' 
    },
    { 
      value: data?.carbs || 0, 
      max: goals?.carbs || 200, 
      label: 'Carbs', 
      unit: 'g', 
      color: '#f59e0b' 
    },
    { 
      value: data?.fat || 0, 
      max: goals?.fat || 67, 
      label: 'Fat', 
      unit: 'g', 
      color: '#a855f7' 
    },
    { 
      value: data?.fiber || 0, 
      max: goals?.fiber || 30, 
      label: 'Fiber', 
      unit: 'g', 
      color: '#ef4444' 
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 py-4">
      {rings.map((ring, index) => (
        <ProgressRing
          key={ring.label}
          {...ring}
          delay={index * 0.1}
        />
      ))}
    </div>
  );
}

