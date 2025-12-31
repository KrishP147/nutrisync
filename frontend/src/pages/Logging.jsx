import { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/layout/Sidebar';
import MealForm from '../components/MealForm';
import PhotoMealUpload from '../components/PhotoMealUpload';
import MealList from '../components/MealList';
import { useFasting } from '../contexts/FastingContext';

export default function Logging() {
  const { isFasting, elapsedTime, endFast } = useFasting();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('photo');
  const [allPhotos, setAllPhotos] = useState([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showFastingWarning, setShowFastingWarning] = useState(false);

  // My Foods state
  const [customFoods, setCustomFoods] = useState([]);
  const [editingFood, setEditingFood] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [creatingFood, setCreatingFood] = useState(false);
  const [newFoodValues, setNewFoodValues] = useState({
    name: '', base_calories: 0, base_protein_g: 0, base_carbs_g: 0, base_fat_g: 0, base_fiber_g: 0
  });

  useEffect(() => {
    fetchAllPhotos();
    fetchCustomFoods();
  }, [refreshTrigger]);

  const fetchAllPhotos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('meals')
      .select('id, photo_url, meal_name, consumed_at, total_calories')
      .eq('user_id', user.id)
      .not('photo_url', 'is', null)
      .order('consumed_at', { ascending: false })
      .limit(50);

    if (data) {
      setAllPhotos(data);
    }
  };

  const fetchCustomFoods = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('user_foods').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (!error && data) setCustomFoods(data);
  };

  const handleMealAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const openGallery = (index) => {
    setCurrentPhotoIndex(index);
    setGalleryOpen(true);
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % allPhotos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
  };

  // My Foods handlers
  const handleEditFood = (food) => {
    setEditingFood(food.id);
    setEditValues({
      name: food.name,
      base_calories: food.base_calories,
      base_protein_g: food.base_protein_g,
      base_carbs_g: food.base_carbs_g,
      base_fat_g: food.base_fat_g,
      base_fiber_g: food.base_fiber_g
    });
  };

  const handleSaveFood = async (foodId) => {
    const { error } = await supabase.from('user_foods').update(editValues).eq('id', foodId);
    if (!error) {
      await fetchCustomFoods();
      setEditingFood(null);
      setEditValues({});
    }
  };

  const handleDeleteFood = async (foodId) => {
    if (!confirm('Delete this custom food?')) return;
    const { error } = await supabase.from('user_foods').delete().eq('id', foodId);
    if (!error) await fetchCustomFoods();
  };

  const handleCreateFood = async () => {
    if (!newFoodValues.name.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('user_foods').insert([{
      user_id: user.id,
      ...newFoodValues,
      source: 'manual_creation'
    }]);
    if (!error) {
      await fetchCustomFoods();
      setCreatingFood(false);
      setNewFoodValues({ name: '', base_calories: 0, base_protein_g: 0, base_carbs_g: 0, base_fat_g: 0, base_fiber_g: 0 });
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!galleryOpen) return;
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'Escape') setGalleryOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryOpen, allPhotos.length]);

  // Format elapsed time for display
  const formatElapsedTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const handleEndFastEarly = async () => {
    await endFast(true);
    setShowFastingWarning(false);
  };

  const handleLoggingAttempt = (e) => {
    if (isFasting) {
      e.preventDefault();
      setShowFastingWarning(true);
    }
  };

  return (
    <Sidebar>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <Motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-heading font-bold text-white"
          >
            Log Meals
          </Motion.h1>
          <p className="text-white/50 mt-1">Track your nutrition throughout the day</p>
        </div>

        {/* Fasting Warning Banner (non-blocking) */}
        {isFasting && (
          <Motion.div             initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-4 border-orange-500/30 bg-orange-500/5 flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} className="text-orange-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">Fasting Mode Active</p>
              <p className="text-white/60 text-sm">
                You've been fasting for <span className="text-orange-400 font-mono">{formatElapsedTime(elapsedTime)}</span>. Logging food will show a warning.
              </p>
            </div>
          </Motion.div>
        )}

        {/* Fasting Warning Modal */}
        <AnimatePresence>
          {showFastingWarning && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowFastingWarning(false)}>
              <Motion.div                 initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <Motion.div                 initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="relative bg-[#111] border border-orange-500/30 p-8 max-w-md w-full z-10"
              >
                <button
                  onClick={() => setShowFastingWarning(false)}
                  className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={24} className="text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-heading font-semibold text-white">Fasting Mode Active</h3>
                    <p className="text-white/60 text-sm">You're currently fasting</p>
                  </div>
                </div>

                <div className="mb-6 space-y-3">
                  <p className="text-white/80">
                    You've been fasting for <span className="text-orange-400 font-mono font-bold">{formatElapsedTime(elapsedTime)}</span>.
                  </p>
                  <p className="text-white/60 text-sm">
                    Logging a meal will break your fast. Would you like to end your fasting session or continue fasting?
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setShowFastingWarning(false)}
                    className="btn-ghost w-full"
                  >
                    Continue Fasting
                  </button>
                  <button
                    onClick={handleEndFastEarly}
                    className="btn-primary bg-orange-500 hover:bg-orange-600 w-full"
                  >
                    End Fast & Log Meal
                  </button>
                </div>
              </Motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Logging UI (always shown, but intercepts clicks if fasting) */}
        <>
            {/* Logging Method Tabs */}
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  handleLoggingAttempt(e);
                  if (!isFasting) setActiveTab('photo');
                }}
                className={`flex items-center gap-2 px-5 py-3  font-medium transition-all ${activeTab === 'photo'
                  ? 'bg-primary-700 text-white'
                  : 'bg-[#0a0a0a] text-white/60 hover:text-white border border-white/10'
                  }`}
              >
                Photo Analysis
              </button>
              <button
                onClick={(e) => {
                  handleLoggingAttempt(e);
                  if (!isFasting) setActiveTab('manual');
                }}
                className={`flex items-center gap-2 px-5 py-3  font-medium transition-all ${activeTab === 'manual'
                  ? 'bg-primary-700 text-white'
                  : 'bg-[#0a0a0a] text-white/60 hover:text-white border border-white/10'
                  }`}
              >
                Manual Entry
              </button>
            </div>

            {/* Logging Form - wrapping with click handler */}
            <Motion.div               key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              onClick={handleLoggingAttempt}
              className={isFasting ? 'cursor-not-allowed opacity-60' : ''}
            >
              {activeTab === 'photo' ? (
                <PhotoMealUpload onMealAdded={handleMealAdded} disabled={isFasting} />
              ) : (
                <MealForm onMealAdded={handleMealAdded} disabled={isFasting} />
              )}
            </Motion.div>

            {/* Logged Today Section */}
            <Motion.div               initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-heading font-semibold text-white mb-4">Logged Today</h2>
              <div className="card p-6 max-h-[600px] overflow-y-auto custom-scrollbar">
                <MealList
                  refreshTrigger={refreshTrigger}
                  onMealDeleted={handleMealAdded}
                  onMealUpdated={handleMealAdded}
                  limit={20}
                />
              </div>
            </Motion.div>

            {/* My Foods Section */}
            <Motion.div               initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-heading font-semibold text-white">My Foods</h2>
                  <p className="text-white/50 text-sm">{customFoods.length} custom foods saved</p>
                </div>
                <button
                  onClick={(e) => {
                    handleLoggingAttempt(e);
                    if (!isFasting) setCreatingFood(true);
                  }}
                  className="btn-primary"
                >
                  Add Food
                </button>
              </div>

              {/* Create New Food Form */}
              {creatingFood && (
                <div className="bg-[#0a0a0a] border border-white/10  p-4 mb-6">
                  <h3 className="font-medium text-white mb-4">Create New Food</h3>
                  <div className="space-y-3 mb-4">
                    <input type="text" placeholder="Food name" value={newFoodValues.name} onChange={(e) => setNewFoodValues({ ...newFoodValues, name: e.target.value })}
                      className="input w-full" />
                    <div className="overflow-x-auto -mx-4 px-4">
                      <div className="grid grid-cols-5 gap-2 min-w-[500px] sm:min-w-0">
                        <input type="number" placeholder="Calories" min="0" value={newFoodValues.base_calories} onChange={(e) => setNewFoodValues({ ...newFoodValues, base_calories: e.target.value })}
                          className="input text-center text-xs sm:text-sm" />
                        <input type="number" placeholder="Protein" min="0" step="0.1" value={newFoodValues.base_protein_g} onChange={(e) => setNewFoodValues({ ...newFoodValues, base_protein_g: e.target.value })}
                          className="input text-center text-xs sm:text-sm" />
                        <input type="number" placeholder="Carbs" min="0" step="0.1" value={newFoodValues.base_carbs_g} onChange={(e) => setNewFoodValues({ ...newFoodValues, base_carbs_g: e.target.value })}
                          className="input text-center text-xs sm:text-sm" />
                        <input type="number" placeholder="Fat" min="0" step="0.1" value={newFoodValues.base_fat_g} onChange={(e) => setNewFoodValues({ ...newFoodValues, base_fat_g: e.target.value })}
                          className="input text-center text-xs sm:text-sm" />
                        <input type="number" placeholder="Fiber" min="0" step="0.1" value={newFoodValues.base_fiber_g} onChange={(e) => setNewFoodValues({ ...newFoodValues, base_fiber_g: e.target.value })}
                          className="input text-center text-xs sm:text-sm" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCreateFood} className="btn-primary">Save</button>
                    <button onClick={() => setCreatingFood(false)} className="btn-secondary">Cancel</button>
                  </div>
                </div>
              )}

              {/* Custom Foods List */}
              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                {customFoods.length === 0 ? (
                  <p className="text-white/40 text-center py-8">No custom foods yet. Add your favorite foods for quick logging!</p>
                ) : (
                  customFoods.map((food) => (
                    <div key={food.id} className="bg-[#0a0a0a] border border-white/5  p-4">
                      {editingFood === food.id ? (
                        <div className="space-y-3">
                          <input type="text" value={editValues.name} onChange={(e) => setEditValues({ ...editValues, name: e.target.value })} className="input w-full" />
                          <div className="overflow-x-auto -mx-4 px-4">
                            <div className="grid grid-cols-5 gap-2 min-w-[500px] sm:min-w-0">
                              <input type="number" min="0" value={editValues.base_calories} onChange={(e) => setEditValues({ ...editValues, base_calories: e.target.value })} className="input text-center text-xs sm:text-sm" placeholder="Cal" />
                              <input type="number" min="0" step="0.1" value={editValues.base_protein_g} onChange={(e) => setEditValues({ ...editValues, base_protein_g: e.target.value })} className="input text-center text-xs sm:text-sm" placeholder="P" />
                              <input type="number" min="0" step="0.1" value={editValues.base_carbs_g} onChange={(e) => setEditValues({ ...editValues, base_carbs_g: e.target.value })} className="input text-center text-xs sm:text-sm" placeholder="C" />
                              <input type="number" min="0" step="0.1" value={editValues.base_fat_g} onChange={(e) => setEditValues({ ...editValues, base_fat_g: e.target.value })} className="input text-center text-xs sm:text-sm" placeholder="F" />
                              <input type="number" min="0" step="0.1" value={editValues.base_fiber_g} onChange={(e) => setEditValues({ ...editValues, base_fiber_g: e.target.value })} className="input text-center text-xs sm:text-sm" placeholder="Fiber" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleSaveFood(food.id)} className="btn-primary text-sm">Save</button>
                            <button onClick={() => setEditingFood(null)} className="btn-secondary text-sm">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-white">{food.name}</p>
                            <p className="text-white/50 text-sm">
                              {food.base_calories} cal | {food.base_protein_g}g P | {food.base_carbs_g}g C | {food.base_fat_g}g F | {food.base_fiber_g}g Fiber
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditFood(food)} className="p-2  bg-white/5 text-white/60 hover:text-white hover:bg-white/10 text-sm">
                              Edit
                            </button>
                            <button onClick={() => handleDeleteFood(food.id)} className="p-2  bg-white/5 text-red-400 hover:bg-red-500/10 text-sm">
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Motion.div>

            {/* Photo Gallery */}
            {allPhotos.length > 0 && (
              <Motion.div                 initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="card p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-heading font-semibold text-white">Gallery</h2>
                    <p className="text-white/50 text-sm">{allPhotos.length} meal photos</p>
                  </div>
                </div>

                {/* Photo Grid */}
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {allPhotos.slice(0, 16).map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={() => openGallery(index)}
                      className="aspect-square  overflow-hidden bg-white/5 hover:ring-2 hover:ring-primary-700 transition group relative"
                    >
                      <img
                        src={photo.photo_url}
                        alt={photo.meal_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {index === 15 && allPhotos.length > 16 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white font-mono font-bold">+{allPhotos.length - 16}</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </Motion.div>
            )}
          </>
      </div>

      {/* Lightbox Gallery */}
      <AnimatePresence>
        {galleryOpen && allPhotos[currentPhotoIndex] && (
          <Motion.div             initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
            onClick={() => setGalleryOpen(false)}
          >
            {/* Close button */}
            <button
              onClick={() => setGalleryOpen(false)}
              className="absolute top-4 right-4 p-2  bg-white/10 hover:bg-white/20 text-white transition"
            >
              ×
            </button>

            {/* Previous button */}
            <button
              onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
              className="absolute left-4 p-3  bg-white/10 hover:bg-white/20 text-white transition"
            >
              ‹
            </button>

            {/* Image */}
            <Motion.div               key={currentPhotoIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-4xl max-h-[80vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={allPhotos[currentPhotoIndex].photo_url}
                alt={allPhotos[currentPhotoIndex].meal_name}
                className="max-w-full max-h-[80vh] object-contain "
              />

              {/* Caption */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 -b-lg">
                <p className="text-white font-medium">{allPhotos[currentPhotoIndex].meal_name}</p>
                <p className="text-white/60 text-sm">
                  {allPhotos[currentPhotoIndex].total_calories} cal •
                  {new Date(allPhotos[currentPhotoIndex].consumed_at).toLocaleDateString()}
                </p>
              </div>
            </Motion.div>

            {/* Next button */}
            <button
              onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
              className="absolute right-4 p-3  bg-white/10 hover:bg-white/20 text-white transition"
            >
              ›
            </button>

            {/* Photo counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 px-4 py-2  text-white text-sm font-mono">
              {currentPhotoIndex + 1} / {allPhotos.length}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </Sidebar>
  );
}
