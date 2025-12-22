import { useState, useEffect } from 'react';
import { useGoals } from '../contexts/GoalsContext';
import { motion, AnimatePresence } from 'motion/react';
import { Target, ChevronDown, Timer, Bell, Save, X } from 'lucide-react';
import UserProfile from './UserProfile';

export default function SetGoals() {
  const { goals, updateGoals } = useGoals();
  const [isExpanded, setIsExpanded] = useState(false);
  const [tempGoals, setTempGoals] = useState({
    calories: goals?.calories || 2000,
    protein: goals?.protein || 150,
    carbs: goals?.carbs || 250,
    fat: goals?.fat || 65,
    fiber: goals?.fiber || 30,
    // Fasting goals
    fasting_enabled: goals?.fasting_enabled || false,
    fasting_schedule_type: goals?.fasting_schedule_type || '16:8',
    fasting_duration_hours: goals?.fasting_duration_hours || 16,
    fasting_start_time: goals?.fasting_start_time || '20:00',
    meal_reminder_enabled: goals?.meal_reminder_enabled !== false,
  });

  // Update tempGoals when goals context changes
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
    await updateGoals(tempGoals);
    setIsExpanded(false);
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
    setIsExpanded(false);
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
    <div className="card overflow-hidden">
      {/* Header - Always visible */}
      <div className="p-5 flex items-center justify-between border-b border-white/10">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-4 flex-1 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10  bg-primary-700/10 flex items-center justify-center">
            <Target size={20} className="text-primary-500" strokeWidth={2} />
          </div>
          <div className="text-left">
            <h3 className="font-heading font-semibold text-white">Daily Goals</h3>
            <p className="text-white/50 text-sm">
              {goals?.calories || 2000} kcal | {goals?.protein || 150}g P | {goals?.carbs || 250}g C | {goals?.fat || 65}g F
              {goals?.fasting_enabled && (
                <span className="text-orange-400"> | {goals.fasting_schedule_type} Fasting</span>
              )}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-3">
          <UserProfile />
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 bg-white/5 flex items-center justify-center transition-transform hover:bg-white/10"
            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <ChevronDown size={18} className="text-white/60" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-0 border-t border-white/10">
              <p className="text-white/50 text-sm mb-6">
                Set your daily nutrition targets manually, or use the Profile button above to calculate them automatically.
              </p>

              {/* Nutrition Goals */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {/* Calories */}
                <div>
                  <label className="input-label">Calories</label>
                  <input
                    type="number"
                    min="0"
                    value={tempGoals.calories}
                    onChange={(e) => setTempGoals({ ...tempGoals, calories: parseInt(e.target.value) || 0 })}
                    className="input text-center font-mono"
                  />
                </div>

                {/* Protein */}
                <div>
                  <label className="input-label">Protein (g)</label>
                  <input
                    type="number"
                    min="0"
                    value={tempGoals.protein}
                    onChange={(e) => setTempGoals({ ...tempGoals, protein: parseInt(e.target.value) || 0 })}
                    className="input text-center font-mono"
                  />
                </div>

                {/* Carbs */}
                <div>
                  <label className="input-label">Carbs (g)</label>
                  <input
                    type="number"
                    min="0"
                    value={tempGoals.carbs}
                    onChange={(e) => setTempGoals({ ...tempGoals, carbs: parseInt(e.target.value) || 0 })}
                    className="input text-center font-mono"
                  />
                </div>

                {/* Fat */}
                <div>
                  <label className="input-label">Fat (g)</label>
                  <input
                    type="number"
                    min="0"
                    value={tempGoals.fat}
                    onChange={(e) => setTempGoals({ ...tempGoals, fat: parseInt(e.target.value) || 0 })}
                    className="input text-center font-mono"
                  />
                </div>

                {/* Fiber */}
                <div>
                  <label className="input-label">Fiber (g)</label>
                  <input
                    type="number"
                    min="0"
                    value={tempGoals.fiber}
                    onChange={(e) => setTempGoals({ ...tempGoals, fiber: parseInt(e.target.value) || 0 })}
                    className="input text-center font-mono"
                  />
                </div>
              </div>

              {/* Fasting Settings Section */}
              <div className="border-t border-white/10 pt-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <Timer size={20} className="text-orange-400" />
                  <h4 className="font-medium text-white">Intermittent Fasting</h4>
                </div>

                {/* Fasting Enable Toggle */}
                <div className="flex items-center justify-between bg-white/5 p-4 mb-4">
                  <div>
                    <p className="text-white font-medium">Enable Fasting Goals</p>
                    <p className="text-white/50 text-sm">Set a fasting schedule and get reminders</p>
                  </div>
                  <button
                    onClick={() => setTempGoals({ ...tempGoals, fasting_enabled: !tempGoals.fasting_enabled })}
                    className={`w-12 h-6  transition-colors relative ${tempGoals.fasting_enabled ? 'bg-orange-500' : 'bg-white/20'
                      }`}
                  >
                    <div className={`w-5 h-5 bg-white  absolute top-0.5 transition-transform ${tempGoals.fasting_enabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                  </button>
                </div>

                {/* Fasting Options (only show when enabled) */}
                {tempGoals.fasting_enabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    {/* Schedule Type */}
                    <div>
                      <label className="input-label">Fasting Schedule</label>
                      <div className="flex flex-wrap gap-2">
                        {scheduleTypes.map((schedule) => (
                          <button
                            key={schedule.value}
                            onClick={() => handleScheduleChange(schedule.value)}
                            className={`px-4 py-2 text-sm font-medium transition ${tempGoals.fasting_schedule_type === schedule.value
                                ? 'bg-orange-500 text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                              } `}
                          >
                            {schedule.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Duration (only show for custom schedule) */}
                    {tempGoals.fasting_schedule_type === 'custom' && (
                      <div className="grid grid-cols-2 gap-4">
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
                      </div>
                    )}

                    {/* Fasting Start Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">Preferred Fasting Start Time</label>
                        <input
                          type="time"
                          value={tempGoals.fasting_start_time}
                          onChange={(e) => setTempGoals({ ...tempGoals, fasting_start_time: e.target.value })}
                          className="input text-center font-mono"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Reminders Section */}
              <div className="border-t border-white/10 pt-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <Bell size={20} className="text-primary-500" />
                  <h4 className="font-medium text-white">Reminders</h4>
                </div>

                <div className="flex items-center justify-between bg-white/5 p-4">
                  <div>
                    <p className="text-white font-medium">Meal Reminders</p>
                    <p className="text-white/50 text-sm">Get smart reminders based on your eating patterns</p>
                  </div>
                  <button
                    onClick={() => setTempGoals({ ...tempGoals, meal_reminder_enabled: !tempGoals.meal_reminder_enabled })}
                    className={`w-12 h-6  transition-colors relative ${tempGoals.meal_reminder_enabled ? 'bg-primary-700' : 'bg-white/20'
                      }`}
                  >
                    <div className={`w-5 h-5 bg-white  absolute top-0.5 transition-transform ${tempGoals.meal_reminder_enabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button onClick={handleSave} className="btn-primary">
                  <Save size={18} />
                  Save Goals
                </button>
                <button onClick={handleCancel} className="btn-ghost">
                  <X size={18} />
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
