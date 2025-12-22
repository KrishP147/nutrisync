import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell, ChevronRight, Timer, Utensils, AlertCircle } from 'lucide-react';
import { useFasting } from '../../contexts/FastingContext';
import { useGoals } from '../../contexts/GoalsContext';
import { supabase } from '../../supabaseClient';

export default function RemindersCard() {
    const { isFasting, activeFast, remainingTime } = useFasting();
    const { goals } = useGoals();
    const [reminder, setReminder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        generateReminder();
        const interval = setInterval(generateReminder, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [isFasting, activeFast, goals]);

    const generateReminder = async () => {
        setLoading(true);

        try {
            const now = new Date();
            const currentHour = now.getHours();

            // Priority 1: Fasting-related reminders
            if (isFasting && activeFast) {
                const hoursRemaining = Math.floor(remainingTime / 3600);
                const minutesRemaining = Math.floor((remainingTime % 3600) / 60);

                if (remainingTime <= 0) {
                    setReminder({
                        type: 'fasting_complete',
                        icon: Timer,
                        title: 'Fasting Goal Reached! 🎉',
                        message: 'Congratulations! You can now break your fast with a nutritious meal.',
                        priority: 'high',
                        color: 'green'
                    });
                } else if (hoursRemaining <= 1) {
                    setReminder({
                        type: 'fasting_ending_soon',
                        icon: Timer,
                        title: 'Almost There!',
                        message: `Only ${minutesRemaining} minutes left in your fast. Stay strong!`,
                        priority: 'medium',
                        color: 'orange'
                    });
                } else {
                    setReminder({
                        type: 'fasting_active',
                        icon: Timer,
                        title: 'Fasting in Progress',
                        message: `${hoursRemaining}h ${minutesRemaining}m remaining. Stay hydrated!`,
                        priority: 'low',
                        color: 'orange'
                    });
                }
                setLoading(false);
                return;
            }

            // Priority 2: Fasting schedule reminders (if enabled but not fasting)
            if (goals?.fasting_enabled && goals?.fasting_start_time) {
                const [scheduledHour] = goals.fasting_start_time.split(':').map(Number);
                const hoursUntilFast = (scheduledHour - currentHour + 24) % 24;

                if (hoursUntilFast <= 2 && hoursUntilFast > 0) {
                    setReminder({
                        type: 'fasting_scheduled',
                        icon: Timer,
                        title: 'Fasting Window Approaching',
                        message: `Your ${goals.fasting_schedule_type} fasting window starts in ${hoursUntilFast} hour${hoursUntilFast > 1 ? 's' : ''}.`,
                        priority: 'medium',
                        color: 'orange'
                    });
                    setLoading(false);
                    return;
                }
            }

            // Priority 3: Meal reminders based on common eating patterns
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Check last meal time
                const { data: lastMeal } = await supabase
                    .from('meals')
                    .select('consumed_at, meal_type')
                    .eq('user_id', user.id)
                    .order('consumed_at', { ascending: false })
                    .limit(1)
                    .single();

                if (lastMeal) {
                    const lastMealTime = new Date(lastMeal.consumed_at);
                    const hoursSinceLastMeal = (now - lastMealTime) / (1000 * 60 * 60);

                    // Suggest next meal based on patterns
                    if (hoursSinceLastMeal > 5 && currentHour >= 11 && currentHour <= 14) {
                        setReminder({
                            type: 'meal_suggestion',
                            icon: Utensils,
                            title: 'Lunch Time',
                            message: "It's been a while since your last meal. Consider having a balanced lunch.",
                            priority: 'medium',
                            color: 'primary'
                        });
                        setLoading(false);
                        return;
                    } else if (hoursSinceLastMeal > 5 && currentHour >= 17 && currentHour <= 20) {
                        setReminder({
                            type: 'meal_suggestion',
                            icon: Utensils,
                            title: 'Dinner Time',
                            message: "Time for dinner. Log your meal to track your daily nutrition.",
                            priority: 'medium',
                            color: 'primary'
                        });
                        setLoading(false);
                        return;
                    } else if (hoursSinceLastMeal > 4 && currentHour >= 6 && currentHour <= 10) {
                        setReminder({
                            type: 'meal_suggestion',
                            icon: Utensils,
                            title: 'Breakfast',
                            message: "Start your day right with a nutritious breakfast.",
                            priority: 'low',
                            color: 'primary'
                        });
                        setLoading(false);
                        return;
                    }
                }

                // Check today's nutrition gaps
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const { data: todaysMeals } = await supabase
                    .from('meals')
                    .select('total_protein_g, total_fiber_g')
                    .eq('user_id', user.id)
                    .gte('consumed_at', today.toISOString());

                if (todaysMeals && todaysMeals.length > 0) {
                    const totalProtein = todaysMeals.reduce((sum, m) => sum + (m.total_protein_g || 0), 0);
                    const totalFiber = todaysMeals.reduce((sum, m) => sum + (m.total_fiber_g || 0), 0);
                    const proteinGoal = goals?.protein || 150;
                    const fiberGoal = goals?.fiber || 28;

                    if (totalProtein < proteinGoal * 0.5 && currentHour >= 14) {
                        setReminder({
                            type: 'nutrition_gap',
                            icon: AlertCircle,
                            title: 'Protein Intake Low',
                            message: `You've had ${Math.round(totalProtein)}g of ${proteinGoal}g protein today. Consider a protein-rich meal.`,
                            priority: 'medium',
                            color: 'amber'
                        });
                        setLoading(false);
                        return;
                    }

                    if (totalFiber < fiberGoal * 0.3 && currentHour >= 16) {
                        setReminder({
                            type: 'nutrition_gap',
                            icon: AlertCircle,
                            title: 'Fiber Intake Low',
                            message: `Add some vegetables or whole grains to boost your fiber intake.`,
                            priority: 'low',
                            color: 'blue'
                        });
                        setLoading(false);
                        return;
                    }
                }
            }

            // Default reminder
            setReminder({
                type: 'general',
                icon: Bell,
                title: 'Track Your Nutrition',
                message: 'Log your meals to stay on top of your health goals.',
                priority: 'low',
                color: 'white'
            });
        } catch (error) {
            console.error('Error generating reminder:', error);
            setReminder(null);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !reminder) {
        return null;
    }

    const colorClasses = {
        orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
        green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
        primary: { bg: 'bg-primary-700/10', text: 'text-primary-500', border: 'border-primary-700/30' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
        blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
        white: { bg: 'bg-white/5', text: 'text-white/60', border: 'border-white/10' }
    };

    const colors = colorClasses[reminder.color] || colorClasses.white;
    const Icon = reminder.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`card p-4 border ${colors.border}`}
        >
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                    <Icon size={20} className={colors.text} />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white">{reminder.title}</h4>
                    <p className="text-white/60 text-sm mt-0.5">{reminder.message}</p>
                </div>
                {reminder.type === 'meal_suggestion' && (
                    <a href="/logging" className="text-primary-500 hover:text-primary-400 p-2">
                        <ChevronRight size={20} />
                    </a>
                )}
            </div>
        </motion.div>
    );
}
