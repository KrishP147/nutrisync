import { useState, useEffect } from 'react';
import { useGoals } from '../contexts/GoalsContext';
import { Timer, Bell, Save, X } from 'lucide-react';

export default function FastingSettings() {
  const { goals, updateGoals } = useGoals();
  const [saving, setSaving] = useState(false);
  const [tempGoals, setTempGoals] = useState({
    calories: goals?.calories || 2000,
    protein: goals?.protein || 150,
    carbs: goals?.carbs || 250,
    fat: goals?.fat || 65,
    fiber: goals?.fiber || 30,
    fasting_enabled: goals?.fasting_enabled || false,
    fasting_schedule_type: goals?.fasting_schedule_type || '16:8',
    fasting_duration_hours: goals?.fasting_duration_hours || 16,
    fasting_start_time: goals?.fasting_start_time || '20:00',
    meal_reminder_enabled: goals?.meal_reminder_enabled !== false,
  });

  useEffect(() => {
    if (!goals) return;
    setTempGoals({
      calories: goals.calories || 2000,
      protein: goals.protein || 150,
      carbs: goals.carbs || 250,
      fat: goals.fat || 65,
      fiber: goals.fiber || 30,
      fasting_enabled: goals.fasting_enabled || false,
      fasting_schedule_type: goals.fasting_schedule_type || '16:8',
      fasting_duration_hours: goals.fasting_duration_hours || 16,
      fasting_start_time: goals.fasting_start_time || '20:00',
      meal_reminder_enabled: goals.meal_reminder_enabled !== false,
    });
  }, [goals]);

  const handleSave = async () => {
    setSaving(true);
    await updateGoals(tempGoals);
    setSaving(false);
  };

  const handleCancel = () => {
    setTempGoals({
      calories: goals.calories || 2000,
      protein: goals.protein || 150,
      carbs: goals.carbs || 250,
      fat: goals.fat || 65,
      fiber: goals.fiber || 30,
      fasting_enabled: goals.fasting_enabled || false,
      fasting_schedule_type: goals.fasting_schedule_type || '16:8',
      fasting_duration_hours: goals.fasting_duration_hours || 16,
      fasting_start_time: goals.fasting_start_time || '20:00',
      meal_reminder_enabled: goals.meal_reminder_enabled !== false,
    });
  };

  const scheduleTypes = [
    { value: '12:12', label: '12:12', hours: 12 },
    { value: '14:10', label: '14:10', hours: 14 },
    { value: '16:8', label: '16:8', hours: 16 },
    { value: '18:6', label: '18:6', hours: 18 },
    { value: '20:4', label: '20:4', hours: 20 },
    { value: 'custom', label: 'Custom', hours: null },
  ];

  const handleScheduleChange = (scheduleType) => {
    const schedule = scheduleTypes.find(s => s.value === scheduleType);
    setTempGoals({
      ...tempGoals,
      fasting_schedule_type: scheduleType,
      fasting_duration_hours: schedule?.hours || tempGoals.fasting_duration_hours
    });
  };

  return (
    <div className="space-y-6">
      {/* Fasting Settings Section */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Timer size={24} className="text-orange-400" />
          <h2 className="text-lg font-heading font-semibold text-white">Intermittent Fasting</h2>
        </div>

        {/* Fasting Enable Toggle */}
        <div className="flex items-center justify-between bg-white/5 p-4 mb-6">
          <div>
            <p className="text-white font-medium">Enable Fasting Goals</p>
            <p className="text-white/50 text-sm">Set a fasting schedule and get reminders</p>
          </div>
          <button
            onClick={() => setTempGoals({ ...tempGoals, fasting_enabled: !tempGoals.fasting_enabled })}
            className={`w-12 h-6 transition-colors relative ${
              tempGoals.fasting_enabled ? 'bg-orange-500' : 'bg-white/20'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white absolute top-0.5 transition-transform ${
                tempGoals.fasting_enabled ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Fasting Options */}
        {tempGoals.fasting_enabled && (
          <Motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6"
          >
            {/* Schedule Type */}
            <div>
              <label className="input-label">Fasting Schedule</label>
              <div className="flex flex-wrap gap-2">
                {scheduleTypes.map((schedule) => (
                  <button
                    key={schedule.value}
                    onClick={() => handleScheduleChange(schedule.value)}
                    className={`px-4 py-2 text-sm font-medium transition ${
                      tempGoals.fasting_schedule_type === schedule.value
                        ? 'bg-orange-500 text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {schedule.label}
                  </button>
                ))}
              </div>
              <p className="text-white/50 text-sm mt-2">
                {tempGoals.fasting_schedule_type === '16:8' && 'Fast for 16 hours, eat within 8 hours (most popular)'}
                {tempGoals.fasting_schedule_type === '18:6' && 'Fast for 18 hours, eat within 6 hours (advanced)'}
                {tempGoals.fasting_schedule_type === '20:4' && 'Fast for 20 hours, eat within 4 hours (warrior diet)'}
                {tempGoals.fasting_schedule_type === '14:10' && 'Fast for 14 hours, eat within 10 hours (beginner friendly)'}
                {tempGoals.fasting_schedule_type === '12:12' && 'Fast for 12 hours, eat within 12 hours (gentle introduction)'}
                {tempGoals.fasting_schedule_type === 'custom' && 'Set your own custom fasting duration'}
              </p>
            </div>

            {/* Custom Duration */}
            {tempGoals.fasting_schedule_type === 'custom' && (
              <div>
                <label className="input-label">Fasting Duration (hours)</label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={tempGoals.fasting_duration_hours}
                  onChange={(e) => setTempGoals({ ...tempGoals, fasting_duration_hours: parseInt(e.target.value) || 16 })}
                  className="input text-center font-mono"
                />
              </div>
            )}

            {/* Fasting Start Time */}
            <div>
              <label className="input-label">Preferred Fasting Start Time</label>
              <input
                type="time"
                value={tempGoals.fasting_start_time}
                onChange={(e) => setTempGoals({ ...tempGoals, fasting_start_time: e.target.value })}
                className="input w-48 text-center font-mono"
              />
              <p className="text-white/50 text-sm mt-2">
                This is when you typically finish your last meal and begin fasting
              </p>
            </div>
          </Motion.div>
        )}
      </div>

      {/* Nutrition Goals Summary */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary-700/10 flex items-center justify-center">
            <Timer size={20} className="text-primary-500" />
          </div>
          <h2 className="text-lg font-heading font-semibold text-white">Daily Nutrition Goals</h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white/5 p-4 text-center">
            <p className="text-white/50 text-sm mb-1">Calories</p>
            <p className="text-white font-mono text-lg">{tempGoals.calories}</p>
          </div>
          <div className="bg-white/5 p-4 text-center">
            <p className="text-white/50 text-sm mb-1">Protein</p>
            <p className="text-white font-mono text-lg">{tempGoals.protein}g</p>
          </div>
          <div className="bg-white/5 p-4 text-center">
            <p className="text-white/50 text-sm mb-1">Carbs</p>
            <p className="text-white font-mono text-lg">{tempGoals.carbs}g</p>
          </div>
          <div className="bg-white/5 p-4 text-center">
            <p className="text-white/50 text-sm mb-1">Fat</p>
            <p className="text-white font-mono text-lg">{tempGoals.fat}g</p>
          </div>
          <div className="bg-white/5 p-4 text-center">
            <p className="text-white/50 text-sm mb-1">Fiber</p>
            <p className="text-white font-mono text-lg">{tempGoals.fiber}g</p>
          </div>
        </div>
        <p className="text-white/50 text-sm mt-4 text-center">
          To edit these values, use the Daily Goals card on the Dashboard or visit your Profile
        </p>
      </div>

      {/* Reminders Section */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell size={24} className="text-primary-500" />
          <h2 className="text-lg font-heading font-semibold text-white">Reminders</h2>
        </div>

        <div className="flex items-center justify-between bg-white/5 p-4">
          <div>
            <p className="text-white font-medium">Meal Reminders</p>
            <p className="text-white/50 text-sm">Get smart reminders based on your eating patterns</p>
          </div>
          <button
            onClick={() => setTempGoals({ ...tempGoals, meal_reminder_enabled: !tempGoals.meal_reminder_enabled })}
            className={`w-12 h-6 transition-colors relative ${
              tempGoals.meal_reminder_enabled ? 'bg-primary-700' : 'bg-white/20'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white absolute top-0.5 transition-transform ${
                tempGoals.meal_reminder_enabled ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button onClick={handleCancel} className="btn-ghost">
          <X size={18} />
          Cancel
        </button>
      </div>
    </div>
  );
}
