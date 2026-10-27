import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Search, 
  Flame, 
  Star, 
  Plus, 
  Barcode, 
  Check, 
  X, 
  Globe2, 
  Sparkles,
  Sliders,
  UtensilsCrossed 
} from 'lucide-react';
import { 
  searchFoods, 
  fetchFavorites, 
  toggleFavorite, 
  fetchCustomFoods, 
  createCustomFood, 
  lookupBarcode 
} from '../services/api';

export default function LogMealModal({ 
  mealType, 
  mealTitle, 
  onClose, 
  onLogFood, 
  onQuickAdd 
}) {
  const [activeTab, setActiveTab] = useState('favourites'); // 'favourites' | 'my_foods' | 'search'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [customFoods, setCustomFoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasOnlineResults, setHasOnlineResults] = useState(false);

  // Barcode search modal
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);

  // Quick add calories modal
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickCalories, setQuickCalories] = useState('');
  const [quickName, setQuickName] = useState('');
  const [quickCarbs, setQuickCarbs] = useState('');
  const [quickFat, setQuickFat] = useState('');
  const [quickProtein, setQuickProtein] = useState('');

  // Create custom food modal
  const [showCreateFoodModal, setShowCreateFoodModal] = useState(false);
  const [newFood, setNewFood] = useState({
    name: '',
    brand: '',
    category: 'My Foods',
    serving_size: '1 serving (100 g)',
    serving_size_grams: 100,
    calories: '',
    carbs: '',
    fat: '',
    protein: '',
    fiber: '',
    sugar: '',
    saturated_fat: '',
    sodium: '',
    potassium: '',
    calcium: '',
    iron: '',
    vitamin_a: '',
    vitamin_c: ''
  });

  // Food detail & quantity adjuster modal
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState(1.0);

  // Load initial favorites & custom foods
  useEffect(() => {
    loadFavorites();
    loadCustomFoods();
    // Default search load
    handleSearch('');
  }, []);

  const loadFavorites = async () => {
    try {
      const favs = await fetchFavorites();
      setFavorites(favs);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCustomFoods = async () => {
    try {
      const c = await fetchCustomFoods();
      setCustomFoods(c);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async (query) => {
    setLoading(true);
    try {
      const res = await searchFoods(query);
      setSearchResults(res.results || []);
      setHasOnlineResults(res.hasOnlineResults || false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  const handleToggleFav = async (food, e) => {
    e.stopPropagation();
    try {
      await toggleFavorite(food.id);
      loadFavorites();
      // Update in current lists
      setSearchResults(prev =>
        prev.map(f => f.id === food.id ? { ...f, is_favorite: f.is_favorite === 1 ? 0 : 1 } : f)
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcodeInput) return;
    setLoading(true);
    try {
      const product = await lookupBarcode(barcodeInput);
      if (product) {
        setShowBarcodeModal(false);
        setSelectedFood(product);
        setQuantity(1.0);
      } else {
        alert('Product not found for barcode: ' + barcodeInput);
      }
    } catch (e) {
      alert('Barcode lookup failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAddSubmit = (e) => {
    e.preventDefault();
    if (!quickCalories) return;
    onQuickAdd({
      meal_type: mealType,
      name: quickName || 'Quick Calorie Add',
      calories: parseFloat(quickCalories),
      carbs: parseFloat(quickCarbs) || 0,
      fat: parseFloat(quickFat) || 0,
      protein: parseFloat(quickProtein) || 0
    });
    setShowQuickAddModal(false);
    onClose();
  };

  const handleCreateFoodSubmit = async (e) => {
    e.preventDefault();
    if (!newFood.name || !newFood.calories) return;
    try {
      const created = await createCustomFood(newFood);
      setShowCreateFoodModal(false);
      loadCustomFoods();
      setSelectedFood(created);
      setQuantity(1.0);
    } catch (e) {
      alert('Failed to create food: ' + e.message);
    }
  };

  const handleLogSelectedFood = () => {
    if (!selectedFood) return;
    const q = parseFloat(quantity) || 1.0;

    onLogFood({
      meal_type: mealType,
      food_id: selectedFood.id,
      food_name: selectedFood.name,
      quantity: q,
      unit: selectedFood.serving_unit || 'serving',
      calories: Math.round((selectedFood.calories || 0) * q),
      carbs: Number(((selectedFood.carbs || 0) * q).toFixed(1)),
      fat: Number(((selectedFood.fat || 0) * q).toFixed(1)),
      protein: Number(((selectedFood.protein || 0) * q).toFixed(1)),
      fiber: Number(((selectedFood.fiber || 0) * q).toFixed(1)),
      sugar: Number(((selectedFood.sugar || 0) * q).toFixed(1)),
      saturated_fat: Number(((selectedFood.saturated_fat || 0) * q).toFixed(1)),
      sodium: Number(((selectedFood.sodium || 0) * q).toFixed(1)),
      potassium: Number(((selectedFood.potassium || 0) * q).toFixed(1)),
      calcium: Number(((selectedFood.calcium || 0) * q).toFixed(1)),
      iron: Number(((selectedFood.iron || 0) * q).toFixed(1)),
      vitamin_a: Number(((selectedFood.vitamin_a || 0) * q).toFixed(1)),
      vitamin_c: Number(((selectedFood.vitamin_c || 0) * q).toFixed(1)),
      image_url: selectedFood.image_url
    });

    setSelectedFood(null);
    onClose();
  };

  // Determine which list to display based on active tab
  const displayList = activeTab === 'favourites' 
    ? favorites 
    : activeTab === 'my_foods' 
    ? customFoods 
    : searchResults;

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0e12] overflow-y-auto flex flex-col">
      {/* Header (Screenshot 2: < Morning snack) */}
      <header className="sticky top-0 z-20 bg-[#0d0e12]/95 backdrop-blur-md px-4 py-3 border-b border-[#23242c] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 active:scale-95 transition text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold tracking-tight text-white capitalize">
            {mealTitle}
          </h2>
        </div>

        <button
          onClick={() => setShowBarcodeModal(true)}
          className="p-2.5 rounded-full hover:bg-white/10 text-neutral-300 hover:text-white transition"
          title="Barcode Scanner / Lookup"
        >
          <Barcode className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 max-w-xl mx-auto w-full p-4 space-y-5">
        {/* "Choose how you want to log this meal" */}
        <div className="text-center pt-2 pb-1">
          <p className="text-xs text-neutral-400 font-medium">Choose how you want to log this meal.</p>
          
          <div className="flex justify-center gap-10 mt-4">
            {/* Search Button */}
            <button
              onClick={() => setActiveTab('search')}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition border active:scale-95 ${
                activeTab === 'search'
                  ? 'bg-neutral-200 text-neutral-950 border-white shadow-lg shadow-white/10'
                  : 'bg-[#1b1c24] text-white border-[#2d2f3c] hover:bg-[#252733]'
              }`}>
                <Search className="w-6 h-6" />
              </div>
              <span className={`text-xs font-semibold ${activeTab === 'search' ? 'text-white' : 'text-neutral-400'}`}>
                Search
              </span>
            </button>

            {/* Add Calories Button */}
            <button
              onClick={() => setShowQuickAddModal(true)}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-[#1b1c24] text-white border border-[#2d2f3c] hover:bg-[#252733] flex items-center justify-center transition active:scale-95">
                <Flame className="w-6 h-6 text-amber-400 fill-amber-400/20" />
              </div>
              <span className="text-xs font-semibold text-neutral-400 group-hover:text-white">
                Add calories
              </span>
            </button>
          </div>
        </div>

        {/* Live Search Input Box */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            placeholder="Search cooked dishes, home food, fruits, items..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            className="w-full bg-[#181920] border border-[#2d2f3c] rounded-2xl pl-11 pr-10 py-3.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition shadow-inner"
          />
          <Search className="w-5 h-5 text-neutral-400 absolute left-3.5 top-3.5" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                handleSearch('');
              }}
              className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </form>

        {/* Online Multi-Engine Indicator */}
        {searchResults.length > 0 && searchQuery && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Refined nutrition engine active: Cooked meals, home dishes & packaged foods</span>
          </div>
        )}

        {/* Tabs: Favourites | My foods | My meals / All */}
        <div className="flex items-center gap-2 border-b border-[#232530] pb-2 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('favourites')}
            className={`px-4 py-2 rounded-full transition ${
              activeTab === 'favourites'
                ? 'bg-neutral-200 text-neutral-950 shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Favourites
          </button>
          <button
            onClick={() => setActiveTab('my_foods')}
            className={`px-4 py-2 rounded-full transition ${
              activeTab === 'my_foods'
                ? 'bg-neutral-200 text-neutral-950 shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            My foods
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 rounded-full transition ${
              activeTab === 'search'
                ? 'bg-neutral-200 text-neutral-950 shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            All Database
          </button>
        </div>

        {/* Food Item Selection List (Screenshot 2: Radio circles + Title + kcal/serving) */}
        <div className="space-y-2">
          {activeTab === 'my_foods' && (
            <button
              onClick={() => setShowCreateFoodModal(true)}
              className="w-full py-3 px-4 rounded-2xl bg-[#1b1c24] hover:bg-[#252733] border border-dashed border-neutral-600 flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold transition mb-3"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Custom Food</span>
            </button>
          )}

          {loading ? (
            <div className="py-12 text-center text-neutral-400 text-sm">
              <div className="animate-spin w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full mx-auto mb-2"></div>
              Searching OpenFoodFacts & local foods...
            </div>
          ) : displayList.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-sm">
              {activeTab === 'favourites' ? 'No favourite foods starred yet.' :
               activeTab === 'my_foods' ? 'No custom foods created yet.' :
               'No food items matched your search.'}
            </div>
          ) : (
            displayList.map((food) => {
              const isFav = food.is_favorite === 1;

              return (
                <div
                  key={food.id}
                  onClick={() => {
                    setSelectedFood(food);
                    setQuantity(1.0);
                  }}
                  className="bg-[#181920] hover:bg-[#20222b] rounded-2xl p-4 border border-[#262832] flex items-center justify-between gap-3 cursor-pointer transition active:scale-99 group"
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    {/* Radio outline circle */}
                    <div className="w-6 h-6 rounded-full border-2 border-neutral-600 group-hover:border-emerald-400 flex items-center justify-center shrink-0 transition">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 opacity-0 group-hover:opacity-100 transition" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white tracking-tight truncate">
                          {food.name}
                        </h4>
                        {food.brand && (
                          <span className="text-[10px] text-neutral-400 bg-[#242631] px-1.5 py-0.5 rounded truncate max-w-[120px]">
                            {food.brand}
                          </span>
                        )}
                        {food.source === 'web_scraper' && (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase border border-emerald-500/20">
                            Cooked Dish
                          </span>
                        )}
                        {food.source === 'openfoodfacts' && (
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase border border-amber-500/20">
                            Packaged
                          </span>
                        )}
                        {food.source === 'seed' && (
                          <span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded uppercase border border-cyan-500/20">
                            Staple
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-neutral-400 mt-0.5 font-medium">
                        <strong className="text-neutral-200 font-semibold">{food.calories} kcal</strong>, {food.serving_size || '100 g'}
                      </p>

                      <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-1 font-mono">
                        <span className="text-[#b388ff]">C: {food.carbs}g</span>
                        <span className="text-[#ff7b72]">F: {food.fat}g</span>
                        <span className="text-[#ffd54f]">P: {food.protein}g</span>
                      </div>
                    </div>
                  </div>

                  {/* Favorite star */}
                  <button
                    onClick={(e) => handleToggleFav(food, e)}
                    className="p-2 text-neutral-500 hover:text-amber-400 transition"
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star className={`w-5 h-5 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Food Serving Size & Quantity Adjuster Modal */}
      {selectedFood && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-[#181920] rounded-t-[32px] sm:rounded-3xl p-6 border border-[#2d2f3c] max-w-md w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">{selectedFood.name}</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Base: {selectedFood.calories} kcal per {selectedFood.serving_size || '100 g'}
                </p>
              </div>
              <button
                onClick={() => setSelectedFood(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Quantity Selector */}
            <div className="bg-[#14151b] p-4 rounded-2xl border border-[#262832]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold text-neutral-300">Number of Servings</span>
                <span className="text-xl font-extrabold text-emerald-400 font-mono">
                  {quantity}x
                </span>
              </div>

              {/* Quick multipliers */}
              <div className="flex gap-2 mb-3">
                {[0.5, 1.0, 1.5, 2.0, 3.0].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setQuantity(m)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                      quantity === m
                        ? 'bg-emerald-500 text-neutral-950'
                        : 'bg-[#22242e] text-neutral-300 hover:bg-[#2d2f3d]'
                    }`}
                  >
                    {m}x
                  </button>
                ))}
              </div>

              <input
                type="range"
                min="0.25"
                max="5.0"
                step="0.25"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>

            {/* Recalculated Nutrition Snapshot */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-[#20222b] p-2.5 rounded-xl border border-[#2c2d3a]">
                <span className="text-[10px] text-neutral-400 block font-medium">Calories</span>
                <span className="text-base font-extrabold text-white font-mono">
                  {Math.round((selectedFood.calories || 0) * quantity)}
                </span>
              </div>
              <div className="bg-[#20222b] p-2.5 rounded-xl border border-[#2c2d3a]">
                <span className="text-[10px] text-[#b388ff] block font-medium">Carb</span>
                <span className="text-base font-extrabold text-white font-mono">
                  {((selectedFood.carbs || 0) * quantity).toFixed(1)}g
                </span>
              </div>
              <div className="bg-[#20222b] p-2.5 rounded-xl border border-[#2c2d3a]">
                <span className="text-[10px] text-[#ff7b72] block font-medium">Fat</span>
                <span className="text-base font-extrabold text-white font-mono">
                  {((selectedFood.fat || 0) * quantity).toFixed(1)}g
                </span>
              </div>
              <div className="bg-[#20222b] p-2.5 rounded-xl border border-[#2c2d3a]">
                <span className="text-[10px] text-[#ffd54f] block font-medium">Protein</span>
                <span className="text-base font-extrabold text-white font-mono">
                  {((selectedFood.protein || 0) * quantity).toFixed(1)}g
                </span>
              </div>
            </div>

            {/* Micronutrient preview if present */}
            {(selectedFood.fiber > 0 || selectedFood.sodium > 0 || selectedFood.vitamin_c > 0) && (
              <div className="text-[11px] text-neutral-400 flex flex-wrap gap-x-4 gap-y-1 bg-[#15161c] p-3 rounded-xl border border-[#252632]">
                {selectedFood.fiber > 0 && <span>Fibre: {((selectedFood.fiber || 0) * quantity).toFixed(1)}g</span>}
                {selectedFood.sugar > 0 && <span>Sugar: {((selectedFood.sugar || 0) * quantity).toFixed(1)}g</span>}
                {selectedFood.sodium > 0 && <span>Sodium: {Math.round((selectedFood.sodium || 0) * quantity)}mg</span>}
                {selectedFood.potassium > 0 && <span>Potassium: {Math.round((selectedFood.potassium || 0) * quantity)}mg</span>}
                {selectedFood.vitamin_c > 0 && <span>Vit C: {((selectedFood.vitamin_c || 0) * quantity).toFixed(1)}mg</span>}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedFood(null)}
                className="flex-1 py-3.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-sm transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogSelectedFood}
                className="flex-2 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20 active:scale-98"
              >
                Add to {mealTitle}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Lookup Modal */}
      {showBarcodeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181920] rounded-3xl p-6 border border-[#2d2f3c] max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Barcode className="w-5 h-5 text-emerald-400" />
              Scan or Enter Barcode
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              Enter any 8, 12, or 13-digit EAN/UPC product code to look up instantly from OpenFoodFacts.
            </p>
            <form onSubmit={handleBarcodeSubmit}>
              <input
                type="text"
                placeholder="e.g. 737628064500"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-4 py-2.5 text-white font-mono text-base focus:outline-none focus:border-emerald-500 mb-4"
                autoFocus
                required
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowBarcodeModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 font-semibold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition"
                >
                  {loading ? 'Searching...' : 'Lookup Barcode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Calories Modal */}
      {showQuickAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181920] rounded-3xl p-6 border border-[#2d2f3c] max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400 fill-amber-400/20" />
              Quick Add Calories
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              Directly log calories and macros for {mealTitle}.
            </p>

            <form onSubmit={handleQuickAddSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Afternoon coffee & biscuit"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Calories (kcal) *</label>
                <input
                  type="number"
                  placeholder="e.g. 250"
                  value={quickCalories}
                  onChange={(e) => setQuickCalories(e.target.value)}
                  className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3.5 py-2 text-base font-mono text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-[#b388ff] block mb-1">Carb (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={quickCarbs}
                    onChange={(e) => setQuickCarbs(e.target.value)}
                    className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#ff7b72] block mb-1">Fat (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={quickFat}
                    onChange={(e) => setQuickFat(e.target.value)}
                    className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#ffd54f] block mb-1">Protein (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={quickProtein}
                    onChange={(e) => setQuickProtein(e.target.value)}
                    className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 font-semibold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition"
                >
                  Log Calories
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Custom Food Modal */}
      {showCreateFoodModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181920] rounded-3xl p-6 border border-[#2d2f3c] max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-1">Create Custom Food</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Add your own food item to your local personal database.
            </p>

            <form onSubmit={handleCreateFoodSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Food Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Grandma's Apple Pie"
                  value={newFood.name}
                  onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                  className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Homemade"
                    value={newFood.brand}
                    onChange={(e) => setNewFood({ ...newFood, brand: e.target.value })}
                    className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Serving Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 1 slice (120 g)"
                    value={newFood.serving_size}
                    onChange={(e) => setNewFood({ ...newFood, serving_size: e.target.value })}
                    className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[11px] text-neutral-300 block mb-1">Calories *</label>
                  <input
                    type="number"
                    placeholder="200"
                    value={newFood.calories}
                    onChange={(e) => setNewFood({ ...newFood, calories: e.target.value })}
                    className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#b388ff] block mb-1">Carb (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="25"
                    value={newFood.carbs}
                    onChange={(e) => setNewFood({ ...newFood, carbs: e.target.value })}
                    className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#ff7b72] block mb-1">Fat (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="8"
                    value={newFood.fat}
                    onChange={(e) => setNewFood({ ...newFood, fat: e.target.value })}
                    className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#ffd54f] block mb-1">Protein (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="4"
                    value={newFood.protein}
                    onChange={(e) => setNewFood({ ...newFood, protein: e.target.value })}
                    className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Optional micronutrients */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-0.5">Fibre (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="2"
                    value={newFood.fiber}
                    onChange={(e) => setNewFood({ ...newFood, fiber: e.target.value })}
                    className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-2 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-0.5">Sugar (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="12"
                    value={newFood.sugar}
                    onChange={(e) => setNewFood({ ...newFood, sugar: e.target.value })}
                    className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-2 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-0.5">Sodium (mg)</label>
                  <input
                    type="number"
                    placeholder="150"
                    value={newFood.sodium}
                    onChange={(e) => setNewFood({ ...newFood, sodium: e.target.value })}
                    className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-2 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateFoodModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 font-semibold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition"
                >
                  Save Food
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
