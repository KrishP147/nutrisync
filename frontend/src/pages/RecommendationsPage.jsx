import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useGoals } from '../contexts/GoalsContext';
import { useFasting } from '../contexts/FastingContext';
import { motion as Motion } from 'motion/react';
import { Leaf, Droplets } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Recommendations from '../components/Recommendations';
import api from '../services/api';

export default function RecommendationsPage() {
  const { goals } = useGoals();
  const { isFasting, elapsedTime, remainingTime } = useFasting();
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [dietaryRestrictions, setDietaryRestrictions] = useState([]);
  const [recommendationsRefreshTrigger, setRecommendationsRefreshTrigger] = useState(0);

  useEffect(() => {
    let channel = null;

    const setupSubscriptions = async () => {
      await fetchDietaryRestrictions();

      // Set up real-time subscription for profile changes (dietary restrictions)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        channel = supabase
          .channel('profile-changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'user_profile',
            filter: `user_id=eq.${user.id}`
          }, () => {
            fetchDietaryRestrictions();
            setRecommendationsRefreshTrigger(prev => prev + 1);
          })
          .subscribe();
      }
    };

    setupSubscriptions();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const fetchDietaryRestrictions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_profile')
      .select('dietary_restrictions')
      .eq('user_id', user.id)
      .single();

    if (data?.dietary_restrictions) {
      setDietaryRestrictions(data.dietary_restrictions);
    }
  };

  const handleChat = useCallback(async () => {
    if (!chatMessage.trim()) return;

    setChatLoading(true);
    const userMessage = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      // Get recent meal data for context
      const { data: { user } } = await supabase.auth.getUser();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentMeals } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .gte('consumed_at', sevenDaysAgo.toISOString());

      const mealCount = recentMeals?.length || 0;
      const avgProtein = mealCount > 0 ? recentMeals.reduce((sum, m) => sum + (m.total_protein_g || 0), 0) / 7 : 0;
      const avgCarbs = mealCount > 0 ? recentMeals.reduce((sum, m) => sum + (m.total_carbs_g || 0), 0) / 7 : 0;
      const avgFat = mealCount > 0 ? recentMeals.reduce((sum, m) => sum + (m.total_fat_g || 0), 0) / 7 : 0;
      const avgFiber = mealCount > 0 ? recentMeals.reduce((sum, m) => sum + (m.total_fiber_g || 0), 0) / 7 : 0;

      const response = await api.post('/api/chat', {
        message: userMessage,
        userGoals: goals,
        recentMeals: { avgProtein, avgCarbs, avgFat, avgFiber },
        dietaryRestrictions: dietaryRestrictions,
        isFasting: isFasting
      });

      if (response.data?.response) {
        setChatHistory(prev => [...prev, { role: 'assistant', content: response.data.response }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had trouble processing that. Please try again.'
      }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatMessage, goals, dietaryRestrictions, isFasting]);


  const restrictionLabels = {
    halal: 'Halal', kosher: 'Kosher', vegetarian: 'Vegetarian', vegan: 'Vegan',
    gluten_free: 'Gluten-Free', dairy_free: 'Dairy-Free', nut_free: 'Nut-Free',
    shellfish_free: 'Shellfish-Free', low_sodium: 'Low Sodium', low_carb: 'Low Carb'
  };

  // Format time for display
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Fasting tips to rotate through
  const fastingTips = [
    { title: "Stay Hydrated", message: "Drink plenty of water, herbal tea, or black coffee to stay hydrated during your fast." },
    { title: "Mental Clarity", message: "Many people experience enhanced focus during fasting. Use this time for productive work." },
    { title: "Black Coffee is OK", message: "Unsweetened black coffee or tea won't break your fast and may help suppress appetite." },
    { title: "Keep Going!", message: "Your body is switching to fat-burning mode. The longer you fast, the more benefits you'll see." }
  ];

  const currentTip = fastingTips[Math.floor(elapsedTime / 3600) % fastingTips.length];

  return (
    <Sidebar>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <Motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-heading font-bold text-white">
            AI Insights
          </Motion.h1>
          <p className="text-white/50 mt-1">Personalized nutrition recommendations</p>
        </div>

        {/* Fasting Mode Banner */}
        {isFasting && (
          <Motion.div             initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 border-orange-500/50 bg-orange-500/5"
          >
            <div className="flex-1">
              <h2 className="text-xl font-heading font-semibold text-white mb-1">Fasting Mode Active</h2>
              <p className="text-white/60 mb-4">
                You've been fasting for <span className="text-orange-400 font-mono font-bold">{formatTime(elapsedTime)}</span>.
                {remainingTime > 0 && <span> {formatTime(remainingTime)} remaining.</span>}
              </p>

              {/* Current Tip */}
              <div className="bg-black/30 p-4 border border-white/10">
                <div>
                  <p className="font-medium text-white">{currentTip.title}</p>
                  <p className="text-white/60 text-sm">{currentTip.message}</p>
                </div>
              </div>
            </div>
          </Motion.div>
        )}

        {/* Active Dietary Restrictions */}
        {dietaryRestrictions.length > 0 && (
          <Motion.div             initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 bg-primary-700/10 border border-primary-700/30 "
          >
            <Leaf size={20} className="text-primary-500" />
            <span className="text-white/60 text-sm">Active restrictions:</span>
            <div className="flex flex-wrap gap-2">
              {dietaryRestrictions.map(key => (
                <span key={key} className="px-2 py-1 bg-primary-700/30 text-primary-400  text-xs">
                  {restrictionLabels[key] || key}
                </span>
              ))}
            </div>
          </Motion.div>
        )}

        {/* AI Recommendations from Dashboard - Only show when not fasting */}
        {!isFasting && (
          <Motion.div             initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Recommendations limit={5} refreshTrigger={recommendationsRefreshTrigger} />
          </Motion.div>
        )}

        {/* AI Chat Section */}
        <Motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card p-6">
          <div className="mb-6">
            <h2 className="text-lg font-heading font-semibold text-white">Chat with NutriSync AI</h2>
            <p className="text-white/50 text-sm">Get personalized nutrition advice</p>
          </div>

          {/* Chat History */}
          <div className="space-y-4 mb-6 max-h-64 overflow-y-auto custom-scrollbar">
            {chatHistory.length === 0 && (
              <div className="text-center text-white/40 py-8">
                <p>Ask me anything about nutrition!</p>
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3  ${msg.role === 'user' ? 'bg-primary-700 text-white' : 'bg-white/5 text-white/80'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 px-4 py-3 ">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-white/40  animate-bounce" />
                    <div className="w-2 h-2 bg-white/40  animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-white/40  animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="flex gap-3">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChat()}
              placeholder="Ask about nutrition, meal planning, or diet tips..."
              className="input flex-1"
            />
            <button onClick={handleChat} disabled={chatLoading || !chatMessage.trim()} className="btn-primary">
              Ask
            </button>
          </div>
        </Motion.div>
      </div>
    </Sidebar>
  );
}
