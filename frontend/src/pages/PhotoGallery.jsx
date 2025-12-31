import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { Image, X, Trash2, Calendar, Flame } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';

export default function PhotoGallery() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .not('photo_url', 'is', null)
      .order('consumed_at', { ascending: false });

    if (!error && data) {
      setPhotos(data);
    }
    setLoading(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const extractFilePathFromUrl = (url) => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const bucketIndex = pathParts.indexOf('meal-photos');
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        return pathParts.slice(bucketIndex + 1).join('/');
      }
      const match = url.match(/meal-photos\/(.+)$/);
      return match ? match[1] : null;
    } catch (err) {
      console.error('Error extracting file path:', err);
      return null;
    }
  };

  const handleDeletePhoto = async (meal) => {
    if (!window.confirm('Delete this photo? The meal record will be kept.')) return;

    setDeletingPhotoId(meal.id);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const filePath = extractFilePathFromUrl(meal.photo_url);
      
      if (filePath) {
        await supabase.storage.from('meal-photos').remove([filePath]);
      }

      const { error } = await supabase
        .from('meals')
        .update({ photo_url: null })
        .eq('id', meal.id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setPhotos(photos.filter(p => p.id !== meal.id));
      if (viewingPhoto?.id === meal.id) setViewingPhoto(null);
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo');
    } finally {
      setDeletingPhotoId(null);
    }
  };

  if (loading) {
    return (
      <Sidebar>
        <div className="flex items-center justify-center h-64">
          <div className="text-white/60">Loading gallery...</div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <Motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-heading font-bold text-white">
            Photo Gallery
          </Motion.h1>
          <p className="text-white/50 mt-1">{photos.length} meal photos</p>
        </div>

        {/* Gallery Grid */}
        {photos.length === 0 ? (
          <div className="card p-12 text-center">
            <Image size={48} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No meal photos yet</p>
            <p className="text-white/40 text-sm mt-2">Photos you take when logging meals will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((meal, index) => (
              <Motion.div                 key={meal.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="card overflow-hidden group cursor-pointer"
                onClick={() => setViewingPhoto(meal)}
              >
                <div className="relative aspect-square">
                  <img src={meal.photo_url} alt={meal.meal_name} className="w-full h-full object-cover" />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePhoto(meal); }}
                      disabled={deletingPhotoId === meal.id}
                      className="p-3  bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                    >
                      {deletingPhotoId === meal.id ? (
                        <div className="w-5 h-5 border-2 border-red-400 border-t-transparent  animate-spin" />
                      ) : (
                        <Trash2 size={20} />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Info */}
                <div className="p-3">
                  <p className="text-white font-medium text-sm truncate">{meal.meal_name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                    <span className="flex items-center gap-1">
                      <Flame size={12} />
                      {meal.total_calories} kcal
                    </span>
                  </div>
                </div>
              </Motion.div>
            ))}
          </div>
        )}

        {/* Photo Modal */}
        <AnimatePresence>
          {viewingPhoto && (
            <Motion.div               initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={() => setViewingPhoto(null)}
            >
              <Motion.div                 initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative max-w-4xl w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setViewingPhoto(null)}
                  className="absolute -top-12 right-0 p-2  bg-white/10 text-white hover:bg-white/20 transition"
                >
                  <X size={24} />
                </button>
                
                <img src={viewingPhoto.photo_url} alt={viewingPhoto.meal_name} className="w-full " />
                
                <div className="mt-4 card p-4">
                  <h3 className="text-xl font-heading font-semibold text-white">{viewingPhoto.meal_name}</h3>
                  <div className="flex items-center gap-4 mt-2 text-white/60 text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {formatDate(viewingPhoto.consumed_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame size={14} />
                      {viewingPhoto.total_calories} kcal
                    </span>
                  </div>
                  <div className="flex gap-4 mt-3 text-sm">
                    <span className="text-secondary-400">{viewingPhoto.total_protein_g}g P</span>
                    <span className="text-amber-400">{viewingPhoto.total_carbs_g}g C</span>
                    <span className="text-blue-400">{viewingPhoto.total_fat_g}g F</span>
                  </div>
                  
                  <button
                    onClick={() => handleDeletePhoto(viewingPhoto)}
                    disabled={deletingPhotoId === viewingPhoto.id}
                    className="mt-4 btn-ghost text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 size={16} />
                    Delete Photo
                  </button>
                </div>
              </Motion.div>
            </Motion.div>
          )}
        </AnimatePresence>
      </div>
    </Sidebar>
  );
}