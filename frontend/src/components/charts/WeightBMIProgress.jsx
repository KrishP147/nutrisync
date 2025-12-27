import { ResponsiveLine } from '@nivo/line';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Scale, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function WeightBMIProgress({ goals, timeRange = 'weekly', currentDate = new Date() }) {
  const [showInfo, setShowInfo] = useState(false);
  const [weightData, setWeightData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState(null);
  const [unit, setUnit] = useState('kg'); // kg or lbs
  const [viewMode, setViewMode] = useState('weight'); // weight or bmi

  const formatDateLocal = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (timeRange === 'weekly') {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (timeRange === 'monthly') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    } else if (timeRange === 'yearly') {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  };

  useEffect(() => {
    fetchWeightHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, currentDate]);

  const fetchWeightHistory = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { start, end } = getDateRange();

    // Fetch weights within the time range
    const { data: weights, error } = await supabase
      .from('weight_history')
      .select('*')
      .eq('user_id', user.id)
      .gte('recorded_at', start.toISOString())
      .lte('recorded_at', end.toISOString())
      .order('recorded_at', { ascending: true });

    if (error) {
      console.error('Error fetching weight history:', error);
      setLoading(false);
      return;
    }

    // If no weights in this period, check if there's a most recent weight before this period
    if (!weights || weights.length === 0) {
      const { data: previousWeights } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user.id)
        .lt('recorded_at', start.toISOString())
        .order('recorded_at', { ascending: false })
        .limit(1);

      if (previousWeights && previousWeights.length > 0) {
        // Show the most recent weight before this period as a single point
        const w = previousWeights[0];
        const formattedData = [{
          x: 'Latest',
          fullDate: new Date(w.recorded_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
          weightKg: parseFloat(w.weight_kg),
          weightLbs: parseFloat((w.weight_kg * 2.20462).toFixed(1)),
          bmi: w.bmi ? parseFloat(w.bmi) : null,
          bmiCategory: w.bmi_category,
        }];
        setWeightData(formattedData);
        setTrend(null);
      } else {
        // No weight history at all before this period
        setWeightData([]);
        setTrend(null);
      }
      setLoading(false);
      return;
    }

    // Format the weights data
    const formattedData = weights.map(w => ({
      x: new Date(w.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: new Date(w.recorded_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      weightKg: parseFloat(w.weight_kg),
      weightLbs: parseFloat((w.weight_kg * 2.20462).toFixed(1)),
      bmi: w.bmi ? parseFloat(w.bmi) : null,
      bmiCategory: w.bmi_category,
    }));
    setWeightData(formattedData);

    if (weights.length >= 2) {
      const firstWeight = weights[0].weight_kg;
      const lastWeight = weights[weights.length - 1].weight_kg;
      const change = lastWeight - firstWeight;
      const percentChange = ((change / firstWeight) * 100).toFixed(1);

      setTrend({
        changeKg: change.toFixed(1),
        changeLbs: (change * 2.20462).toFixed(1),
        percent: percentChange,
        direction: change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'stable'
      });
    } else {
      setTrend(null);
    }

    setLoading(false);
  };


  if (loading) {
    return (
      <div className="h-72 flex items-center justify-center text-white/40">
        Loading weight data...
      </div>
    );
  }

  const getYValue = (d) => {
    if (viewMode === 'bmi') return d.bmi;
    return unit === 'kg' ? d.weightKg : d.weightLbs;
  };

  const lineData = weightData.length > 0 ? [{
    id: viewMode === 'bmi' ? 'BMI' : 'Weight',
    color: viewMode === 'bmi' ? '#f59e0b' : '#0ea5e9',
    data: weightData
      .filter(d => viewMode === 'weight' || d.bmi !== null)
      .map(d => ({
        x: d.x,
        y: getYValue(d),
        bmiCategory: d.bmiCategory,
        weightKg: d.weightKg,
        weightLbs: d.weightLbs,
        bmi: d.bmi,
      })),
  }] : [];

  const CustomTooltip = ({ point }) => (
    <div className="bg-black border border-white/10  px-3 py-2 shadow-lg">
      <div className="text-xs text-white/50 mb-1">{point.data.fullDate}</div>
      {viewMode === 'weight' ? (
        <>
          <div className="font-mono font-bold text-secondary-500">
            {unit === 'kg' ? `${point.data.weightKg} kg` : `${point.data.weightLbs} lbs`}
          </div>
          {point.data.bmi && (
            <div className="text-xs text-white/50 mt-1">
              BMI: {point.data.bmi} ({point.data.bmiCategory})
            </div>
          )}
        </>
      ) : (
        <>
          <div className="font-mono font-bold text-amber-400">{point.data.bmi}</div>
          <div className="text-xs text-white/50 mt-1">{point.data.bmiCategory}</div>
        </>
      )}
    </div>
  );

  return (
    <div className="relative" style={{ overflow: 'visible' }}>
      {/* Controls row */}
      <div className="flex items-center justify-between mb-4">
        {/* View toggles */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('weight')}
            className={`px-3 py-1.5  text-sm font-medium transition ${viewMode === 'weight' ? 'bg-secondary-500 text-white' : 'bg-white/5 text-white/60'
              }`}
          >
            Weight
          </button>
          <button
            onClick={() => setViewMode('bmi')}
            className={`px-3 py-1.5  text-sm font-medium transition ${viewMode === 'bmi' ? 'bg-amber-500 text-white' : 'bg-white/5 text-white/60'
              }`}
          >
            BMI
          </button>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Unit toggle (only for weight view) */}
          {viewMode === 'weight' && (
            <div className="flex gap-1">
              <button
                onClick={() => setUnit('kg')}
                className={`px-2 py-1  text-xs font-medium transition ${unit === 'kg' ? 'bg-primary-700 text-white' : 'bg-white/5 text-white/60'
                  }`}
              >
                kg
              </button>
              <button
                onClick={() => setUnit('lbs')}
                className={`px-2 py-1  text-xs font-medium transition ${unit === 'lbs' ? 'bg-primary-700 text-white' : 'bg-white/5 text-white/60'
                  }`}
              >
                lbs
              </button>
            </div>
          )}

          {/* Trend badge */}
          {trend && viewMode === 'weight' && (
            <div className={`flex items-center gap-1 px-2 py-1  text-xs font-medium ${trend.direction === 'up' ? 'bg-amber-500/10 text-amber-400' :
                trend.direction === 'down' ? 'bg-primary-700/10 text-primary-500' :
                  'bg-white/5 text-white/60'
              }`}>
              {trend.direction === 'up' ? <TrendingUp size={12} /> :
                trend.direction === 'down' ? <TrendingDown size={12} /> :
                  <Minus size={12} />}
              <span>
                {trend.direction !== 'stable' && (trend.changeKg > 0 ? '+' : '')}
                {unit === 'kg' ? trend.changeKg : trend.changeLbs} {unit}
              </span>
            </div>
          )}

          {/* Info */}
          <div
            onMouseEnter={() => setShowInfo(true)}
            onMouseLeave={() => setShowInfo(false)}
            className="relative"
          >
            <Info size={18} className="text-white/40 hover:text-white/70 cursor-help" />
            {showInfo && (
              <div className="absolute right-0 top-6 w-72 bg-black border border-white/10  p-3 text-xs text-white/70 z-20">
                Weight is automatically tracked when you update your profile. Go to <span className="text-primary-500">Profile</span> to log a new weight entry.
              </div>
            )}
          </div>
        </div>
      </div>

      {weightData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-white/40">
          <Scale size={32} className="mb-2 opacity-50" />
          <p>No weight history yet</p>
          <p className="text-sm mt-2 text-center max-w-xs">
            Update your weight in your <span className="text-primary-500">Profile</span> to start tracking progress automatically.
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-64"
          style={{ overflow: 'visible' }}
        >
          <ResponsiveLine
            data={lineData}
            margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
            xScale={{ type: 'point' }}
            yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
            curve="monotoneX"
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 0,
              tickPadding: 10,
              tickRotation: -45,
            }}
            axisLeft={{
              tickSize: 0,
              tickPadding: 10,
              legend: viewMode === 'bmi' ? 'BMI' : `Weight (${unit})`,
              legendPosition: 'middle',
              legendOffset: -45,
            }}
            colors={[viewMode === 'bmi' ? '#f59e0b' : '#0ea5e9']}
            lineWidth={3}
            pointSize={10}
            pointColor="#0a0a0a"
            pointBorderWidth={3}
            pointBorderColor={viewMode === 'bmi' ? '#f59e0b' : '#0ea5e9'}
            enableArea={true}
            areaOpacity={0.1}
            useMesh={true}
            tooltip={CustomTooltip}
            theme={{
              background: 'transparent',
              textColor: 'rgba(255,255,255,0.6)',
              fontSize: 11,
              fontFamily: 'Plus Jakarta Sans',
              axis: {
                legend: { text: { fontSize: 12, fill: 'rgba(255,255,255,0.6)' } },
                ticks: { text: { fill: 'rgba(255,255,255,0.6)' } }
              },
              grid: { line: { stroke: 'rgba(255,255,255,0.05)' } },
              tooltip: {
                container: {
                  background: 'transparent',
                  boxShadow: 'none',
                  padding: 0,
                  zIndex: 9999,
                }
              }
            }}
          />
        </motion.div>
      )}
    </div>
  );
}
