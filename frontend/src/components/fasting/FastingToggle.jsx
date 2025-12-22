import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Play, Square, Edit2, Sparkles } from 'lucide-react';
import { useFasting } from '../../contexts/FastingContext';
import { useGoals } from '../../contexts/GoalsContext';
import api from '../../services/api';

export default function FastingToggle() {
    const {
        activeFast,
        isFasting,
        loading,
        elapsedTime,
        remainingTime,
        progress,
        isComplete,
        startFast,
        endFast,
        updateFastDuration
    } = useFasting();
    const { goals } = useGoals();

    const [showEdit, setShowEdit] = useState(false);
    const [editDuration, setEditDuration] = useState(16);
    const [isStarting, setIsStarting] = useState(false);
    const [aiRecommendation, setAiRecommendation] = useState(null);
    const [showRecommendation, setShowRecommendation] = useState(false);

    // Format time display
    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStartFast = async () => {
        setIsStarting(true);

        try {
            // Get AI recommendation
            const response = await api.post('/api/fasting/recommend', {
                goals: goals,
                current_time: new Date().toISOString()
            });

            if (response.data?.recommended_duration) {
                setAiRecommendation(response.data);
                setEditDuration(response.data.recommended_duration);
                setShowRecommendation(true);
            } else {
                // Use default from goals or 16 hours
                const defaultDuration = goals?.fasting_duration_hours || 16;
                setEditDuration(defaultDuration);
                setShowRecommendation(true);
                setAiRecommendation({
                    recommended_duration: defaultDuration,
                    reasoning: `Based on your ${goals?.fasting_schedule_type || '16:8'} fasting schedule.`
                });
            }
        } catch (error) {
            console.error('Error getting AI recommendation:', error);
            // Fallback to defaults
            const defaultDuration = goals?.fasting_duration_hours || 16;
            setEditDuration(defaultDuration);
            setShowRecommendation(true);
            setAiRecommendation({
                recommended_duration: defaultDuration,
                reasoning: 'Using your default fasting schedule.'
            });
        } finally {
            setIsStarting(false);
        }
    };

    const confirmStartFast = async () => {
        const result = await startFast(editDuration, !!aiRecommendation);
        if (result.success) {
            setShowRecommendation(false);
            setAiRecommendation(null);
        }
    };

    const cancelStartFast = () => {
        setShowRecommendation(false);
        setAiRecommendation(null);
    };

    const handleEndFast = async () => {
        if (confirm('Are you sure you want to end your fast?')) {
            await endFast(false);
        }
    };

    const handleCancelFast = async () => {
        if (confirm('Are you sure you want to cancel your fast? This will mark it as cancelled.')) {
            await endFast(true);
        }
    };

    const handleSaveDuration = async () => {
        await updateFastDuration(editDuration);
        setShowEdit(false);
    };

    if (loading) {
        return (
            <div className="card p-5 border border-orange-500/20">
                <div className="flex items-center gap-3">
                    <span className="text-white/50">Loading fasting status...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`card p-5 border ${isFasting ? 'border-orange-500/50 bg-orange-500/5' : 'border-white/10'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left side - Status and Timer */}
                <div className="flex items-center gap-4">

                    <div>
                        <h3 className="font-heading font-semibold text-white flex items-center gap-2">
                            Intermittent Fasting
                            {isFasting && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-orange-500/20 text-orange-400">
                                    ACTIVE
                                </span>
                            )}
                        </h3>

                        {isFasting ? (
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-2xl font-mono font-bold text-orange-400">
                                    {formatTime(elapsedTime)}
                                </span>
                                <span className="text-white/40 text-sm">
                                    / {activeFast?.planned_duration_hours}h goal
                                </span>
                            </div>
                        ) : (
                            <p className="text-white/50 text-sm">
                                {goals?.fasting_enabled
                                    ? `${goals.fasting_schedule_type} schedule configured`
                                    : 'Start a fasting session'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right side - Controls */}
                <div className="flex items-center gap-2">
                    {isFasting ? (
                        <>
                            {/* Progress indicator */}
                            <div className="hidden sm:flex items-center gap-2 mr-4">
                                <div className="w-24 h-2 bg-white/10 overflow-hidden">
                                    <motion.div
                                        className={`h-full ${isComplete ? 'bg-green-500' : 'bg-orange-500'}`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                    />
                                </div>
                                <span className="text-xs text-white/40">{Math.round(progress)}%</span>
                            </div>

                            {/* Edit button */}
                            {!showEdit && (
                                <button
                                    onClick={() => {
                                        setEditDuration(activeFast?.planned_duration_hours || 16);
                                        setShowEdit(true);
                                    }}
                                    className="btn-ghost p-2"
                                    title="Edit duration"
                                >
                                    Edit
                                </button>
                            )}

                            {/* End/Complete button */}
                            <button
                                onClick={handleEndFast}
                                className={`px-4 py-2 font-medium flex items-center gap-2 ${isComplete
                                        ? 'bg-green-500 text-white hover:bg-green-600'
                                        : 'bg-orange-500 text-white hover:bg-orange-600'
                                    }  transition`}
                            >
                                {isComplete ? 'Complete Fast' : 'End Fast'}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleStartFast}
                            disabled={isStarting}
                            className="btn-primary px-6 py-2.5 flex items-center gap-2"
                        >
                            {isStarting ? (
                                <>
                                    Getting AI recommendation...
                                </>
                            ) : (
                                <>
                                    Start Fasting
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Edit Duration Panel */}
            <AnimatePresence>
                {showEdit && isFasting && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-4">
                            <span className="text-white/60 text-sm">Adjust duration:</span>
                            <input
                                type="number"
                                min="1"
                                max="72"
                                value={editDuration}
                                onChange={(e) => setEditDuration(parseInt(e.target.value) || 1)}
                                className="w-20 bg-black border border-white/20 px-3 py-1.5 text-white text-center"
                            />
                            <span className="text-white/40 text-sm">hours</span>
                            <button onClick={handleSaveDuration} className="btn-primary p-2">
                                ✓
                            </button>
                            <button onClick={() => setShowEdit(false)} className="btn-ghost p-2">
                                ×
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* AI Recommendation Modal */}
            <AnimatePresence>
                {showRecommendation && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                        onClick={cancelStartFast}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#111] border border-white/10 p-6 max-w-md w-full"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-orange-500/10 flex items-center justify-center">
                                    <Sparkles size={20} className="text-orange-400" />
                                </div>
                                <h3 className="font-heading font-semibold text-white text-lg">Start Fasting Session</h3>
                            </div>

                            {aiRecommendation && (
                                <div className="bg-orange-500/10 border border-orange-500/20 p-4 mb-4">
                                    <p className="text-orange-400 text-sm font-medium mb-1">AI Recommendation</p>
                                    <p className="text-white/70 text-sm">{aiRecommendation.reasoning}</p>
                                </div>
                            )}

                            <div className="mb-6">
                                <label className="text-white/60 text-sm mb-2 block">Fasting Duration (hours)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="72"
                                    value={editDuration}
                                    onChange={(e) => setEditDuration(parseInt(e.target.value) || 1)}
                                    className="w-full bg-black border border-white/20 px-4 py-3 text-white text-center text-xl font-mono"
                                />
                                <div className="flex justify-center gap-2 mt-3">
                                    {[12, 14, 16, 18, 20, 24].map((h) => (
                                        <button
                                            key={h}
                                            onClick={() => setEditDuration(h)}
                                            className={`px-3 py-1 text-sm ${editDuration === h
                                                    ? 'bg-orange-500 text-white'
                                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                                }  transition`}
                                        >
                                            {h}h
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={confirmStartFast} className="btn-primary flex-1 py-3">
                                    <Play size={18} />
                                    Start {editDuration}h Fast
                                </button>
                                <button onClick={cancelStartFast} className="btn-ghost px-4">
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
