import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const FastingContext = createContext();

export function useFasting() {
    const context = useContext(FastingContext);
    if (!context) {
        throw new Error('useFasting must be used within a FastingProvider');
    }
    return context;
}

export function FastingProvider({ children }) {
    const [activeFast, setActiveFast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [elapsedTime, setElapsedTime] = useState(0);

    // Fetch active fasting session on mount
    useEffect(() => {
        fetchActiveFast();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                fetchActiveFast();
            } else {
                setActiveFast(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Update elapsed time every second when fasting
    useEffect(() => {
        if (!activeFast) {
            setElapsedTime(0);
            return;
        }

        const updateElapsed = () => {
            const started = new Date(activeFast.started_at);
            const now = new Date();
            const elapsed = Math.floor((now - started) / 1000);
            setElapsedTime(elapsed);
        };

        updateElapsed();
        const interval = setInterval(updateElapsed, 1000);

        return () => clearInterval(interval);
    }, [activeFast]);

    const fetchActiveFast = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('fasting_sessions')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching active fast:', error);
            }

            setActiveFast(data || null);
        } catch (error) {
            console.error('Error in fetchActiveFast:', error);
        } finally {
            setLoading(false);
        }
    };

    const startFast = useCallback(async (durationHours, aiRecommended = false) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            const { data, error } = await supabase
                .from('fasting_sessions')
                .insert({
                    user_id: user.id,
                    started_at: new Date().toISOString(),
                    planned_duration_hours: durationHours,
                    status: 'active',
                    ai_recommended: aiRecommended
                })
                .select()
                .single();

            if (error) throw error;

            setActiveFast(data);
            return { success: true, data };
        } catch (error) {
            console.error('Error starting fast:', error);
            return { success: false, error: error.message };
        }
    }, []);

    const endFast = useCallback(async (cancelled = false) => {
        if (!activeFast) return { success: false, error: 'No active fast' };

        try {
            const endedAt = new Date();
            const startedAt = new Date(activeFast.started_at);
            const actualHours = (endedAt - startedAt) / (1000 * 60 * 60);

            const { error } = await supabase
                .from('fasting_sessions')
                .update({
                    ended_at: endedAt.toISOString(),
                    actual_duration_hours: Math.round(actualHours * 100) / 100,
                    status: cancelled ? 'cancelled' : 'completed'
                })
                .eq('id', activeFast.id);

            if (error) throw error;

            setActiveFast(null);
            return { success: true };
        } catch (error) {
            console.error('Error ending fast:', error);
            return { success: false, error: error.message };
        }
    }, [activeFast]);

    const updateFastDuration = useCallback(async (newDurationHours) => {
        if (!activeFast) return { success: false, error: 'No active fast' };

        try {
            const { data, error } = await supabase
                .from('fasting_sessions')
                .update({ planned_duration_hours: newDurationHours })
                .eq('id', activeFast.id)
                .select()
                .single();

            if (error) throw error;

            setActiveFast(data);
            return { success: true, data };
        } catch (error) {
            console.error('Error updating fast duration:', error);
            return { success: false, error: error.message };
        }
    }, [activeFast]);

    const getFastingHistory = useCallback(async (startDate, endDate) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            let query = supabase
                .from('fasting_sessions')
                .select('*')
                .eq('user_id', user.id)
                .in('status', ['completed', 'cancelled'])
                .order('started_at', { ascending: false });

            if (startDate) {
                query = query.gte('started_at', startDate.toISOString());
            }
            if (endDate) {
                query = query.lte('started_at', endDate.toISOString());
            }

            const { data, error } = await query;

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching fasting history:', error);
            return [];
        }
    }, []);

    const getFastingStats = useCallback(async (startDate, endDate) => {
        const history = await getFastingHistory(startDate, endDate);

        const completed = history.filter(f => f.status === 'completed');
        const totalHours = completed.reduce((sum, f) => sum + (f.actual_duration_hours || 0), 0);
        const averageHours = completed.length > 0 ? totalHours / completed.length : 0;

        return {
            totalSessions: completed.length,
            totalHours: Math.round(totalHours * 10) / 10,
            averageHours: Math.round(averageHours * 10) / 10,
            completionRate: history.length > 0
                ? Math.round((completed.length / history.length) * 100)
                : 0
        };
    }, [getFastingHistory]);

    // Calculate remaining time in seconds
    const remainingTime = activeFast
        ? Math.max(0, (activeFast.planned_duration_hours * 3600) - elapsedTime)
        : 0;

    // Progress percentage (0-100)
    const progress = activeFast
        ? Math.min(100, (elapsedTime / (activeFast.planned_duration_hours * 3600)) * 100)
        : 0;

    // Is the planned fast duration complete?
    const isComplete = activeFast && remainingTime === 0;

    return (
        <FastingContext.Provider value={{
            activeFast,
            loading,
            elapsedTime,
            remainingTime,
            progress,
            isComplete,
            isFasting: !!activeFast,
            startFast,
            endFast,
            updateFastDuration,
            getFastingHistory,
            getFastingStats,
            refreshFast: fetchActiveFast
        }}>
            {children}
        </FastingContext.Provider>
    );
}
