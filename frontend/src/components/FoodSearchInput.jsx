import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Plus, Star, Database } from 'lucide-react';
import api from '../services/api';
import { supabase } from '../supabaseClient';

export default function FoodSearchInput({ onFoodSelect, initialValue = '' }) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [customFoods, setCustomFoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setCustomFoods([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [dbResponse, customResponse] = await Promise.all([
          api.get(`/api/search-food?query=${encodeURIComponent(query)}`),
          searchCustomFoods(query)
        ]);

        setResults(dbResponse.data.foods || []);
        setCustomFoods(customResponse);
        setShowDropdown(true);
      } catch (error) {
        console.error('[FoodSearch] Search failed:', error);
        setResults([]);
        setCustomFoods([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const searchCustomFoods = async (searchQuery) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_foods')
      .select('*')
      .eq('user_id', user.id)
      .ilike('name', `%${searchQuery}%`)
      .limit(5);

    if (error) {
      console.error('[FoodSearch] Custom foods error:', error);
      return [];
    }

    return (data || []).map(food => ({
      name: food.name,
      portion: '100g',
      calories: food.base_calories,
      protein_g: food.base_protein_g,
      carbs_g: food.base_carbs_g,
      fat_g: food.base_fat_g,
      fiber_g: food.base_fiber_g,
      isCustom: true,
      customFoodId: food.id
    }));
  };

  const handleSelect = (food) => {
    const multipliedFood = {
      ...food,
      portion: `${quantity} x ${food.portion}`,
      calories: Math.round(food.calories * quantity),
      protein_g: parseFloat((food.protein_g * quantity).toFixed(1)),
      carbs_g: parseFloat((food.carbs_g * quantity).toFixed(1)),
      fat_g: parseFloat((food.fat_g * quantity).toFixed(1)),
      fiber_g: parseFloat((food.fiber_g * quantity).toFixed(1)),
    };

    setQuery(food.name);
    onFoodSelect(multipliedFood);
    setResults([]);
    setShowDropdown(false);
    setQuantity(1);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
          min="0.1"
          step="0.1"
          className="w-full sm:w-20 px-3 py-2 bg-black border border-white/10 focus:ring-2 focus:ring-primary-700 focus:border-transparent text-white font-mono"
          placeholder="Qty"
        />
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Search food..."
            className="w-full pl-10 pr-4 py-2 bg-black border border-white/10 focus:ring-2 focus:ring-primary-700 focus:border-transparent text-white placeholder-white/40"
          />
        </div>
      </div>

      {loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a0a0a] border border-white/10  shadow-lg p-3 flex items-center justify-center gap-2 text-white/50 text-sm z-50">
          <Loader2 size={16} className="animate-spin" />
          Searching...
        </div>
      )}

      {showDropdown && (customFoods.length > 0 || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a0a0a] border border-white/10  shadow-lg max-h-64 overflow-y-auto z-50">
          {/* Custom Foods Section */}
          {customFoods.length > 0 && (
            <>
              <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs font-semibold text-amber-400 flex items-center gap-2">
                <Star size={14} />
                MY CUSTOM FOODS
              </div>
              {customFoods.map((food, idx) => (
                <button
                  key={`custom-${idx}`}
                  onClick={() => handleSelect(food)}
                  className="w-full px-4 py-3 text-left hover:bg-amber-500/10 border-b border-white/5 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{food.name}</span>
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 ">My Food</span>
                  </div>
                  <div className="text-sm text-white/50 mt-1 font-mono">
                    {Math.round(food.calories * quantity)} cal |
                    P: {(food.protein_g * quantity).toFixed(1)}g |
                    C: {(food.carbs_g * quantity).toFixed(1)}g |
                    F: {(food.fat_g * quantity).toFixed(1)}g
                    <span className="text-white/30 ml-2">({quantity} x {food.portion})</span>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Database Foods Section */}
          {results.length > 0 && (
            <>
              {customFoods.length > 0 && (
                <div className="px-4 py-2 bg-white/5 border-b border-white/10 text-xs font-semibold text-white/40 flex items-center gap-2">
                  <Database size={14} />
                  DATABASE FOODS
                </div>
              )}
              {results.map((food, idx) => (
                <button
                  key={`db-${idx}`}
                  onClick={() => handleSelect(food)}
                  className="w-full px-4 py-3 text-left hover:bg-primary-700/10 border-b border-white/5 last:border-b-0 transition"
                >
                  <div className="font-medium text-white">{food.name}</div>
                  <div className="text-sm text-white/50 mt-1 font-mono">
                    {Math.round(food.calories * quantity)} cal |
                    P: {(food.protein_g * quantity).toFixed(1)}g |
                    C: {(food.carbs_g * quantity).toFixed(1)}g |
                    F: {(food.fat_g * quantity).toFixed(1)}g
                    <span className="text-white/30 ml-2">({quantity} x {food.portion})</span>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {showDropdown && !loading && results.length === 0 && customFoods.length === 0 && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a0a0a] border border-white/10  shadow-lg p-4 z-50">
          <p className="text-center text-white/50 text-sm mb-3">
            No foods found. Try a different search term or add manually:
          </p>
          <button
            onClick={() => {
              const manualFood = {
                name: query,
                portion: `${quantity} serving`,
                calories: 0,
                protein_g: 0,
                carbs_g: 0,
                fat_g: 0,
                fiber_g: 0,
              };
              onFoodSelect(manualFood);
            }}
            className="w-full px-4 py-2 bg-primary-700 text-white  hover:bg-primary-600 text-sm font-medium flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add "{query}" manually
          </button>
        </div>
      )}
    </div>
  );
}
