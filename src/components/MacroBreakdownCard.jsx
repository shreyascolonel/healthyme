import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function MacroBreakdownCard({ dailyTotals, profile, onOpenDetail }) {
  const carbs = dailyTotals?.carbs || 0;
  const fat = dailyTotals?.fat || 0;
  const protein = dailyTotals?.protein || 0;

  const targetCarbs = profile?.carb_target_grams || 294;
  const targetFat = profile?.fat_target_grams || 59;
  const targetProtein = profile?.protein_target_grams || 107;

  const actualRatios = dailyTotals?.macroPercentages || { carb: 0, fat: 0, protein: 0 };
  const recCarb = profile?.carb_ratio_target || 55;
  const recFat = profile?.fat_ratio_target || 25;
  const recProtein = profile?.protein_ratio_target || 20;

  return (
    <div
      onClick={onOpenDetail}
      className="bg-[#181920] rounded-[28px] p-6 border border-[#262832] shadow-xl hover:border-neutral-600 transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-1.5">
          Nutrition info
        </h2>
        <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-white group-hover:translate-x-0.5 transition" />
      </div>

      {/* 3 Macro Stat Columns */}
      <div className="grid grid-cols-3 gap-3">
        {/* Carbs */}
        <div className="bg-[#1f2029] rounded-2xl p-3.5 border border-[#2d2f3c] flex flex-col items-center text-center">
          <span className="text-xs font-semibold text-[#b388ff] mb-1">Carb</span>
          <span className="text-xl font-extrabold text-white font-mono">
            {carbs.toFixed(1)}
            <span className="text-xs text-neutral-400 font-normal ml-0.5">g</span>
          </span>
          <span className="text-[11px] text-neutral-400 mt-1 font-medium">
            /{targetCarbs} g
          </span>
        </div>

        {/* Fat */}
        <div className="bg-[#1f2029] rounded-2xl p-3.5 border border-[#2d2f3c] flex flex-col items-center text-center">
          <span className="text-xs font-semibold text-[#ff7b72] mb-1">Fat</span>
          <span className="text-xl font-extrabold text-white font-mono">
            {fat.toFixed(1)}
            <span className="text-xs text-neutral-400 font-normal ml-0.5">g</span>
          </span>
          <span className="text-[11px] text-neutral-400 mt-1 font-medium">
            /{targetFat} g
          </span>
        </div>

        {/* Protein */}
        <div className="bg-[#1f2029] rounded-2xl p-3.5 border border-[#2d2f3c] flex flex-col items-center text-center">
          <span className="text-xs font-semibold text-[#ffd54f] mb-1">Protein</span>
          <span className="text-xl font-extrabold text-white font-mono">
            {protein.toFixed(1)}
            <span className="text-xs text-neutral-400 font-normal ml-0.5">g</span>
          </span>
          <span className="text-[11px] text-neutral-400 mt-1 font-medium">
            /{targetProtein} g
          </span>
        </div>
      </div>

      {/* Actual vs Recommended Stacked Ratio Bars */}
      <div className="mt-5 space-y-3">
        {/* Actual Macro Distribution */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
            <span className="text-neutral-400">Actual</span>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="text-[#b388ff]">{actualRatios.carb}%</span>
              <span className="text-[#ff7b72]">{actualRatios.fat}%</span>
              <span className="text-[#ffd54f]">{actualRatios.protein}%</span>
            </div>
          </div>
          <div className="h-3 w-full bg-[#242631] rounded-full overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${actualRatios.carb}%` }}
              className="bg-[#b388ff] h-full transition-all duration-500"
              title={`Carbs: ${actualRatios.carb}%`}
            />
            <div
              style={{ width: `${actualRatios.fat}%` }}
              className="bg-[#ff7b72] h-full transition-all duration-500"
              title={`Fat: ${actualRatios.fat}%`}
            />
            <div
              style={{ width: `${actualRatios.protein}%` }}
              className="bg-[#ffd54f] h-full transition-all duration-500"
              title={`Protein: ${actualRatios.protein}%`}
            />
          </div>
        </div>

        {/* Recommended Macro Distribution */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
            <span className="text-neutral-500">Recommended</span>
            <div className="flex items-center gap-3 text-[11px] text-neutral-400 font-medium">
              <span>{recCarb}%</span>
              <span>{recFat}%</span>
              <span>{recProtein}%</span>
            </div>
          </div>
          <div className="h-2 w-full bg-[#242631] rounded-full overflow-hidden flex opacity-70">
            <div
              style={{ width: `${recCarb}%` }}
              className="bg-[#b388ff]/80 h-full"
            />
            <div
              style={{ width: `${recFat}%` }}
              className="bg-[#ff7b72]/80 h-full"
            />
            <div
              style={{ width: `${recProtein}%` }}
              className="bg-[#ffd54f]/80 h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
