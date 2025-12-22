import { useState } from 'react';
import { supabase } from '../supabaseClient';
import FoodSearchInput from './FoodSearchInput';

export default function ReplaceFoodModal({ food, onReplace, onClose }) {
  const [activeTab, setActiveTab] = useState('database');
  const [customFoods, setCustomFoods] = useState([]);
  const [loadingCustom, setLoadingCustom] = useState(false);

  // For "Create New" tab
  const [newFoodName, setNewFoodName] = useState('');
  const [newCalories, setNewCalories] = useState('');
  const [newProtein, setNewProtein] = useState('');
  const [newCarbs, setNewCarbs] = useState('');
  const [newFat, setNewFat] = useState('');
  const [newFiber, setNewFiber] = useState('');

  const loadCustomFoods = async () => {
    if (customFoods.length > 0) return;

    setLoadingCustom(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('user_foods')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCustomFoods(data);
    }
    setLoadingCustom(false);
  };

  const handleDatabaseFoodSelect = (selectedFood) => {
    onReplace({
      name: selectedFood.name,
      base_calories: selectedFood.calories,
      base_protein_g: selectedFood.protein_g,
      base_carbs_g: selectedFood.carbs_g,
      base_fat_g: selectedFood.fat_g,
      base_fiber_g: selectedFood.fiber_g || 0,
      portion_size: food.portion_size,
      portion_unit: 'g'
    });
  };

  const handleCustomFoodSelect = (customFood) => {
    onReplace({
      name: customFood.name,
      base_calories: customFood.base_calories,
      base_protein_g: customFood.base_protein_g,
      base_carbs_g: customFood.base_carbs_g,
      base_fat_g: customFood.base_fat_g,
      base_fiber_g: customFood.base_fiber_g,
      portion_size: food.portion_size,
      portion_unit: 'g',
      custom_food_id: customFood.id
    });
  };

  const handleCreateNew = () => {
    if (!newFoodName || !newCalories) {
      alert('Please enter at least a name and calories');
      return;
    }

    onReplace({
      name: newFoodName,
      base_calories: parseInt(newCalories) || 0,
      base_protein_g: parseFloat(newProtein) || 0,
      base_carbs_g: parseFloat(newCarbs) || 0,
      base_fat_g: parseFloat(newFat) || 0,
      base_fiber_g: parseFloat(newFiber) || 0,
      portion_size: food.portion_size,
      portion_unit: 'g'
    });
  };

  const tabs = [
    { id: 'database', label: 'Database Foods', icon: Database, color: 'secondary' },
    { id: 'custom', label: 'My Foods', icon: Star, color: 'amber' },
    { id: 'create', label: 'Create New', icon: Plus, color: 'primary' },
  ];

  const colorClasses = {
    secondary: 'border-secondary-500 text-secondary-400',
    amber: 'border-amber-500 text-amber-400',
    primary: 'border-primary-700 text-primary-500',
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-white/10  shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-heading font-bold text-white">
              Replace "{food.component_name || food.name}"
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5  transition text-white/60 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-white/50 mt-1">
            Current portion: <span className="font-mono text-white/70">{Math.round(food.portion_size)}g</span> — Will keep same portion size
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'custom') loadCustomFoods();
                }}
                className={`flex-1 py-3 px-4 font-medium transition flex items-center justify-center gap-2 text-sm ${
                  isActive
                    ? `border-b-2 ${colorClasses[tab.color]}`
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 max-h-[500px]">
          {activeTab === 'database' && (
            <div>
              <p className="text-sm text-white/50 mb-4">
                Search USDA database for a food to replace with:
              </p>
              <FoodSearchInput onFoodSelect={handleDatabaseFoodSelect} />
            </div>
          )}

          {activeTab === 'custom' && (
            <div>
              {loadingCustom ? (
                <div className="flex items-center justify-center gap-2 text-white/50 py-8">
                  <Loader2 size={20} className="animate-spin" />
                  Loading custom foods...
                </div>
              ) : customFoods.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12  bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <Star size={24} className="text-white/30" />
                  </div>
                  <p className="text-white/60 mb-2">No custom foods saved yet</p>
                  <p className="text-sm text-white/40">
                    Save custom foods by editing them and clicking "Save as Custom Food"
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customFoods.map((customFood) => (
                    <button
                      key={customFood.id}
                      onClick={() => handleCustomFoodSelect(customFood)}
                      className="w-full text-left p-4 bg-amber-500/10 border border-amber-500/20  hover:border-amber-500/50 hover:bg-amber-500/20 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <Star size={14} className="text-amber-400" />
                            <p className="font-medium text-white">{customFood.name}</p>
                          </div>
                          {customFood.original_food_name && (
                            <p className="text-xs text-white/40 mt-1">Based on: {customFood.original_food_name}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-semibold text-amber-400">{customFood.base_calories} cal</p>
                          <p className="text-xs text-white/40">per 100g</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-white/50 font-mono">
                        <div>P: {customFood.base_protein_g}g</div>
                        <div>C: {customFood.base_carbs_g}g</div>
                        <div>F: {customFood.base_fat_g}g</div>
                        <div>Fiber: {customFood.base_fiber_g}g</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <div className="space-y-4">
              <p className="text-sm text-white/50 mb-4">
                Create a new food (values per 100g):
              </p>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Food Name *
                </label>
                <input
                  type="text"
                  value={newFoodName}
                  onChange={(e) => setNewFoodName(e.target.value)}
                  placeholder="e.g., Homemade Pizza"
                  className="w-full px-4 py-2 bg-black border border-white/10  focus:ring-2 focus:ring-primary-700 text-white placeholder-white/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Calories * (per 100g)
                  </label>
                  <input
                    type="number"
                    value={newCalories}
                    onChange={(e) => setNewCalories(e.target.value)}
                    placeholder="200"
                    min="0"
                    className="w-full px-4 py-2 bg-black border border-white/10  focus:ring-2 focus:ring-primary-700 text-white placeholder-white/40 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newProtein}
                    onChange={(e) => setNewProtein(e.target.value)}
                    placeholder="10"
                    className="w-full px-4 py-2 bg-black border border-white/10  focus:ring-2 focus:ring-primary-700 text-white placeholder-white/40 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newCarbs}
                    onChange={(e) => setNewCarbs(e.target.value)}
                    placeholder="25"
                    className="w-full px-4 py-2 bg-black border border-white/10  focus:ring-2 focus:ring-primary-700 text-white placeholder-white/40 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Fat (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newFat}
                    onChange={(e) => setNewFat(e.target.value)}
                    placeholder="8"
                    className="w-full px-4 py-2 bg-black border border-white/10  focus:ring-2 focus:ring-primary-700 text-white placeholder-white/40 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Fiber (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newFiber}
                    onChange={(e) => setNewFiber(e.target.value)}
                    placeholder="2"
                    className="w-full px-4 py-2 bg-black border border-white/10  focus:ring-2 focus:ring-primary-700 text-white placeholder-white/40 font-mono"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateNew}
                className="w-full bg-primary-700 text-white py-3  hover:bg-primary-600 transition font-medium mt-4 flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Replace with This Food
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full bg-white/5 border border-white/10 text-white/70 py-2  hover:bg-white/10 hover:text-white transition font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
