import React from 'react';
import { 
  ChevronLeft, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles 
} from 'lucide-react';

export default function NutritionDetailView({ nutritionData, onBack }) {
  const nutrients = nutritionData?.nutrients || [];

  return (
    <div className="pb-16 max-w-xl mx-auto">
      {/* Educational Banner (Matching Screenshot 3) */}
      <div className="bg-[#171922] rounded-[28px] p-6 border border-[#272935] mb-6 shadow-xl relative overflow-hidden">
        {/* Artistic Salad & Fork Illustration */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              🥗
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Checking your intake</h2>
          </div>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed font-normal">
          Your nutrient intake is shown on a bar with 3 colours that represent different intake ranges:
        </p>

        {/* 3 Range Color Pills */}
        <div className="flex flex-wrap items-center gap-3 my-3 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-neutral-400">
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-500 inline-block"></span>
            <span>Low intake</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
            <span>Adequate intake (recommended)</span>
          </div>
          <div className="flex items-center gap-1.5 text-orange-400">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
            <span>High intake</span>
          </div>
        </div>

        <p className="text-[11px] text-neutral-400 leading-normal">
          To form healthy eating habits, try to keep your intake within the green range for each nutrient. To help, the top 3 foods for each nutrient in your diet are listed below.
        </p>
      </div>

      {/* Nutrient List */}
      <div className="space-y-6">
        {nutrients.map((item) => {
          const isHigh = item.status === 'high';
          const isAdequate = item.status === 'adequate';
          const isLow = item.status === 'low';

          // Bar color determination
          let activeColorClass = 'bg-emerald-400';
          let textColorClass = 'text-emerald-400';
          if (isHigh) {
            activeColorClass = 'bg-orange-500';
            textColorClass = 'text-orange-400';
          } else if (isLow) {
            activeColorClass = 'bg-neutral-500';
            textColorClass = 'text-neutral-400';
          }

          return (
            <div
              key={item.key}
              className="bg-[#181920] rounded-[24px] p-5 border border-[#262832] shadow-md transition-all hover:border-neutral-700"
            >
              {/* Nutrient Header & Amount */}
              <div className="flex items-baseline justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-wide">{item.name}</h3>
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                    isAdequate ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    isHigh ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                    'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}>
                    {item.status}
                  </span>
                </div>
                
                <div className="text-right">
                  <span className="text-lg font-bold text-white font-mono">{item.amount.toLocaleString()}</span>
                  <span className="text-xs text-neutral-400 ml-1 font-medium">{item.unit}</span>
                </div>
              </div>

              {/* 3-Color Intake Range Bar */}
              <div className="mt-3">
                <div className="relative w-full h-3 bg-[#232530] rounded-full overflow-hidden flex">
                  {/* Progress Fill */}
                  <div
                    style={{ width: `${Math.min(100, item.progressPercent || 20)}%` }}
                    className={`${activeColorClass} h-full rounded-full transition-all duration-500`}
                  />
                </div>

                {/* Range Labels underneath */}
                <div className="flex justify-between items-center text-[11px] text-neutral-500 mt-1 font-mono">
                  <span>{item.minAdequate > 0 ? item.minAdequate.toLocaleString() : '0'}</span>
                  {item.maxAdequate && (
                    <span>{item.maxAdequate.toLocaleString()} {item.unit}</span>
                  )}
                </div>
              </div>

              {/* Top 3 Contributing Foods */}
              {item.topFoods && item.topFoods.length > 0 ? (
                <div className="mt-4 pt-3 border-t border-[#232530] space-y-1.5">
                  <span className="text-[11px] text-neutral-500 font-semibold tracking-wider uppercase block mb-1">
                    Top Contributing Foods
                  </span>
                  {item.topFoods.map((food, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-neutral-300 font-medium truncate pr-2">
                        {food.food_name}
                      </span>
                      <span className="text-neutral-400 font-mono shrink-0">
                        {food.amount.toLocaleString()} {food.unit}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 pt-2 text-[11px] text-neutral-500 italic">
                  No foods contributing to {item.name.toLowerCase()} logged today
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
