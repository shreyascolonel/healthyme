import React, { useState } from 'react';
import { 
  Plus, 
  Flame, 
  Sun, 
  Moon, 
  Coffee, 
  Apple, 
  Sunset, 
  Trash2, 
  Edit3, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';

const MEAL_CONFIGS = {
  breakfast: {
    title: 'Breakfast',
    icon: Coffee,
    color: '#ffb74d',
    bgColor: 'bg-[#ffb74d]/10'
  },
  lunch: {
    title: 'Lunch',
    icon: Sun,
    color: '#ffd54f',
    bgColor: 'bg-[#ffd54f]/10'
  },
  dinner: {
    title: 'Dinner',
    icon: Moon,
    color: '#90caf9',
    bgColor: 'bg-[#90caf9]/10'
  },
  morning_snack: {
    title: 'Morning snack',
    icon: Apple,
    color: '#a5d6a7',
    bgColor: 'bg-[#a5d6a7]/10'
  },
  afternoon_snack: {
    title: 'Afternoon snack',
    icon: Sunset,
    color: '#ffab91',
    bgColor: 'bg-[#ffab91]/10'
  },
  evening_snack: {
    title: 'Evening snack',
    icon: Moon,
    color: '#ce93d8',
    bgColor: 'bg-[#ce93d8]/10'
  }
};

export default function MealSection({ 
  meals = {}, 
  enabledMeals = Object.keys(MEAL_CONFIGS), 
  onAddFood, 
  onDeleteLog,
  onEditLog 
}) {
  const [expandedMeal, setExpandedMeal] = useState(null);

  const toggleExpand = (mealType) => {
    setExpandedMeal(prev => (prev === mealType ? null : mealType));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-bold text-white tracking-wide">Log meal</h2>
      </div>

      <div className="space-y-3">
        {enabledMeals.map((mealType) => {
          const config = MEAL_CONFIGS[mealType] || {
            title: mealType.replace('_', ' '),
            icon: Apple,
            color: '#a5d6a7',
            bgColor: 'bg-[#a5d6a7]/10'
          };
          const IconComponent = config.icon;
          const mealData = meals[mealType] || { items: [], totals: { calories: 0, macroPercentages: { carb: 0, fat: 0, protein: 0 } } };
          const hasItems = mealData.items && mealData.items.length > 0;
          const isExpanded = expandedMeal === mealType;

          return (
            <div
              key={mealType}
              className="bg-[#181920] rounded-[24px] border border-[#262832] overflow-hidden transition-all duration-200 hover:border-neutral-700 shadow-md"
            >
              {/* Meal Summary Row */}
              <div className="p-4 flex items-center justify-between gap-3">
                {/* Left: Meal Icon & Details */}
                <div 
                  onClick={() => hasItems && toggleExpand(mealType)}
                  className={`flex items-center gap-3.5 flex-1 min-w-0 ${hasItems ? 'cursor-pointer' : ''}`}
                >
                  <div className={`w-12 h-12 rounded-2xl ${config.bgColor} flex items-center justify-center shrink-0 border border-white/5`}>
                    <IconComponent className="w-6 h-6" style={{ color: config.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white tracking-tight">{config.title}</h3>
                      {hasItems && (
                        <span className="text-[11px] text-neutral-400 bg-[#22242e] px-2 py-0.5 rounded-full font-medium">
                          {mealData.items.length} {mealData.items.length === 1 ? 'item' : 'items'}
                        </span>
                      )}
                    </div>

                    {hasItems ? (
                      <>
                        <p className="text-xs text-neutral-400 truncate mt-0.5 font-medium">
                          {mealData.summary || mealData.items.map(i => i.food_name).join(', ')}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1 text-xs font-semibold text-neutral-200">
                            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            {mealData.totals.calories} kcal
                          </span>

                          {/* Mini Macro Ratio Indicators */}
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-400">
                            <span className="text-[#b388ff]">• {mealData.totals.macroPercentages?.carb || 0}%</span>
                            <span className="text-[#ff7b72]">• {mealData.totals.macroPercentages?.fat || 0}%</span>
                            <span className="text-[#ffd54f]">• {mealData.totals.macroPercentages?.protein || 0}%</span>
                          </div>
                        </div>

                        {/* Mini Macro Bar */}
                        <div className="h-1.5 w-32 bg-[#262833] rounded-full overflow-hidden flex mt-1.5">
                          <div
                            style={{ width: `${mealData.totals.macroPercentages?.carb || 0}%` }}
                            className="bg-[#b388ff] h-full"
                          />
                          <div
                            style={{ width: `${mealData.totals.macroPercentages?.fat || 0}%` }}
                            className="bg-[#ff7b72] h-full"
                          />
                          <div
                            style={{ width: `${mealData.totals.macroPercentages?.protein || 0}%` }}
                            className="bg-[#ffd54f] h-full"
                          />
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-neutral-500 mt-0.5">No food logged yet</p>
                    )}
                  </div>
                </div>

                {/* Right: Expand Toggle & Add Button */}
                <div className="flex items-center gap-1 shrink-0">
                  {hasItems && (
                    <button
                      onClick={() => toggleExpand(mealType)}
                      className="p-2 text-neutral-400 hover:text-white rounded-full transition"
                      title={isExpanded ? 'Hide items' : 'View items'}
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  )}

                  <button
                    onClick={() => onAddFood(mealType, config.title)}
                    className="w-10 h-10 rounded-full bg-[#232530] hover:bg-[#2e3140] active:scale-95 text-neutral-200 hover:text-white flex items-center justify-center border border-[#303342] transition shadow-sm"
                    title={`Add food to ${config.title}`}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Expanded Item List */}
              {isExpanded && hasItems && (
                <div className="border-t border-[#232530] bg-[#14151b] px-4 py-3 divide-y divide-[#1f2027]">
                  {mealData.items.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white tracking-wide truncate">
                          {item.food_name}
                        </div>
                        <div className="flex items-center gap-2 text-neutral-400 mt-0.5">
                          <span>
                            {item.calories} kcal ({item.quantity} {item.unit || 'serving'})
                          </span>
                          <span className="text-neutral-600">|</span>
                          <span className="text-[#b388ff]">C: {item.carbs}g</span>
                          <span className="text-[#ff7b72]">F: {item.fat}g</span>
                          <span className="text-[#ffd54f]">P: {item.protein}g</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => onDeleteLog(item.id)}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
