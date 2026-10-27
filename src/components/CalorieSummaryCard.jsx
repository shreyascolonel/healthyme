import React from 'react';
import { Target, Disc3 } from 'lucide-react';

export default function CalorieSummaryCard({ dailyTotals, profile }) {
  const currentCalories = dailyTotals?.calories || 0;
  const targetCalories = profile?.calorie_target || 2138;
  const targetMin = profile?.calorie_target_min || 1924;
  const targetMax = profile?.calorie_target_max || 2351;

  // Scale max value for progress bar (about 1.25x the target max, e.g. ~2779)
  const maxScale = Math.round(targetMax * 1.18);

  const currentPercent = Math.min(100, Math.max(0, (currentCalories / maxScale) * 100));
  const rangeLeftPercent = (targetMin / maxScale) * 100;
  const rangeWidthPercent = ((targetMax - targetMin) / maxScale) * 100;
  const targetMarkerPercent = (targetCalories / maxScale) * 100;

  const diff = targetCalories - currentCalories;
  const inRange = currentCalories >= targetMin && currentCalories <= targetMax;

  return (
    <div className="bg-[#181920] rounded-[28px] p-6 border border-[#262832] shadow-xl relative overflow-hidden transition-all">
      {/* Background glow when in optimal range */}
      {inRange && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-extrabold tracking-tight text-white font-mono">
              {currentCalories.toLocaleString()}
            </span>
            <span className="text-neutral-400 font-semibold text-lg">kcal</span>
          </div>
          <p className="text-xs text-neutral-400 mt-1 font-medium">
            {diff > 0 ? (
              <span>
                <strong className="text-emerald-400 font-semibold">{diff.toLocaleString()} kcal</strong> remaining
              </span>
            ) : diff === 0 ? (
              <span className="text-emerald-400 font-semibold">Perfect target reached!</span>
            ) : (
              <span>
                <strong className="text-amber-400 font-semibold">{Math.abs(diff).toLocaleString()} kcal</strong> above target
              </span>
            )}
          </p>
        </div>

        {/* Target and Range Badges */}
        <div className="flex flex-col items-end gap-1.5 text-xs text-neutral-300">
          <div className="flex items-center gap-1.5 bg-[#22242e] px-2.5 py-1 rounded-full border border-[#2e303d]">
            <Target className="w-3.5 h-3.5 text-neutral-400" />
            <span className="font-semibold text-white">{targetCalories.toLocaleString()}</span>
            <span className="text-neutral-400">kcal</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#22242e] px-2.5 py-1 rounded-full border border-[#2e303d]">
            <Disc3 className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-neutral-300">
              {targetMin.toLocaleString()} - {targetMax.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Samsung Health Style Progress Bar with Optimal Range Zone */}
      <div className="mt-6">
        <div className="relative w-full h-3 bg-[#242631] rounded-full overflow-hidden">
          {/* Target Range Checkered/Striped Zone */}
          <div
            className="absolute top-0 bottom-0 bg-[#343845] opacity-80"
            style={{
              left: `${rangeLeftPercent}%`,
              width: `${rangeWidthPercent}%`,
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.06) 3px, rgba(255,255,255,0.06) 6px)'
            }}
            title={`Optimal intake range: ${targetMin} - ${targetMax} kcal`}
          />

          {/* Current Calorie Progress Fill */}
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${currentPercent}%` }}
          />

          {/* Target Marker Pin */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white/70 shadow-sm"
            style={{ left: `${targetMarkerPercent}%` }}
            title={`Target: ${targetCalories} kcal`}
          />
        </div>

        {/* Bar End Labels */}
        <div className="flex justify-between items-center text-[11px] text-neutral-500 mt-1.5 font-medium">
          <span>0</span>
          <span>{maxScale.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
