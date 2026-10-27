import React, { useState } from 'react';
import { 
  Droplet, 
  Scale, 
  Sparkles, 
  Activity, 
  ChevronRight, 
  Plus, 
  Check, 
  Flame 
} from 'lucide-react';

export default function TrendsView({ 
  trendsData, 
  healthData, 
  onLogWater, 
  onLogWeight,
  currentDate,
  onSelectDate 
}) {
  const [timeframe, setTimeframe] = useState('days'); // 'days' | 'weeks' | 'months'
  const [metric, setMetric] = useState('calories'); // 'calories' | 'macros'
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState(healthData?.weight?.current_kg || 68.5);

  const dailyStats = trendsData?.dailyStats || [];
  const avgCalories = trendsData?.averageCalories || 0;
  const targetCalories = trendsData?.targetCalories || 2138;
  const mealAverages = trendsData?.mealAverages || {};

  const maxCal = Math.max(
    ...dailyStats.map(d => d.calories),
    targetCalories,
    2500
  );

  const handleWeightSubmit = (e) => {
    e.preventDefault();
    if (newWeight > 0) {
      onLogWeight(parseFloat(newWeight));
      setShowWeightModal(false);
    }
  };

  return (
    <div className="pb-16 max-w-xl mx-auto space-y-6">
      {/* Timeframe Tabs: Days | Weeks | Months */}
      <div className="flex bg-[#181920] p-1.5 rounded-full border border-[#272935] max-w-xs mx-auto">
        {['days', 'weeks', 'months'].map((t) => (
          <button
            key={t}
            onClick={() => setTimeframe(t)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-full transition capitalize ${
              timeframe === t
                ? 'bg-[#292c3a] text-white shadow'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Metric Toggle: Calories | Macronutrients */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMetric('calories')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
              metric === 'calories'
                ? 'bg-neutral-200 text-neutral-900'
                : 'bg-[#181920] text-neutral-400 hover:text-white border border-[#272935]'
            }`}
          >
            Calories
          </button>
          <button
            onClick={() => setMetric('macros')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
              metric === 'macros'
                ? 'bg-neutral-200 text-neutral-900'
                : 'bg-[#181920] text-neutral-400 hover:text-white border border-[#272935]'
            }`}
          >
            Macronutrients
          </button>
        </div>

        <span className="text-xs text-neutral-400 font-medium">
          Last {dailyStats.length} days
        </span>
      </div>

      {/* Average Summary Card */}
      <div className="bg-[#181920] rounded-[28px] p-6 border border-[#262832] shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider bg-[#22242e] px-2.5 py-1 rounded-full">
              Average
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-extrabold text-white font-mono">
                {avgCalories.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-neutral-400">kcal / day</span>
            </div>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            🥗
          </div>
        </div>

        {/* Meal Averages Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-[#242633] text-xs">
          <div>
            <span className="text-neutral-500 block font-medium">Breakfast</span>
            <span className="font-bold text-white font-mono mt-0.5 block">
              {mealAverages.breakfast || 0} kcal
            </span>
          </div>
          <div>
            <span className="text-neutral-500 block font-medium">Lunch</span>
            <span className="font-bold text-white font-mono mt-0.5 block">
              {mealAverages.lunch || 0} kcal
            </span>
          </div>
          <div>
            <span className="text-neutral-500 block font-medium">Dinner</span>
            <span className="font-bold text-white font-mono mt-0.5 block">
              {mealAverages.dinner || 0} kcal
            </span>
          </div>
          <div>
            <span className="text-neutral-500 block font-medium">Morning snack</span>
            <span className="font-bold text-white font-mono mt-0.5 block">
              {mealAverages.morning_snack || 0} kcal
            </span>
          </div>
        </div>

        {/* Vertical Bar Chart */}
        <div className="relative pt-10 pb-4 mt-6">
          {/* Target Reference Line */}
          <div
            className="absolute left-0 right-0 border-t border-dashed border-neutral-600/50 flex justify-between px-1"
            style={{ bottom: `${Math.min(92, Math.max(15, (targetCalories / maxCal) * 100))}%` }}
          >
            <span className="text-[10px] text-neutral-400 -mt-2 bg-[#181920] px-1 font-mono">
              Target: {targetCalories}
            </span>
          </div>

          {/* Average Reference Line */}
          <div
            className="absolute left-0 right-0 border-t border-dotted border-emerald-500/40 flex justify-end"
            style={{ bottom: `${Math.min(90, Math.max(15, (avgCalories / maxCal) * 100))}%` }}
          >
            <span className="text-[10px] text-emerald-400 -mt-2 bg-[#181920] px-1 font-mono">
              Avg. {avgCalories}
            </span>
          </div>

          {/* Bar Columns */}
          <div className="flex items-end justify-between h-44 gap-2 pt-4">
            {dailyStats.map((day) => {
              const isSelected = day.date === currentDate;
              const barHeightPct = Math.min(100, Math.max(6, (day.calories / maxCal) * 100));

              return (
                <div
                  key={day.date}
                  onClick={() => onSelectDate && onSelectDate(day.date)}
                  className="flex-1 flex flex-col items-center gap-2 cursor-pointer group"
                >
                  <div className="w-full flex justify-center items-end h-32">
                    {metric === 'calories' ? (
                      <div
                        style={{ height: `${barHeightPct}%` }}
                        className={`w-4 sm:w-5 rounded-full transition-all duration-300 ${
                          isSelected
                            ? 'bg-emerald-400 shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-400/40'
                            : day.calories > 0
                            ? 'bg-[#2f3242] group-hover:bg-neutral-500'
                            : 'bg-[#22242e]'
                        }`}
                        title={`${day.date}: ${day.calories} kcal`}
                      />
                    ) : (
                      /* Macro Segmented Bar */
                      <div
                        style={{ height: `${barHeightPct}%` }}
                        className="w-4 sm:w-5 rounded-full overflow-hidden flex flex-col-reverse bg-[#242631]"
                        title={`Carb: ${day.macroPercent?.carb}%, Fat: ${day.macroPercent?.fat}%, Prot: ${day.macroPercent?.protein}%`}
                      >
                        <div
                          style={{ height: `${day.macroPercent?.carb || 0}%` }}
                          className="bg-[#b388ff] w-full"
                        />
                        <div
                          style={{ height: `${day.macroPercent?.fat || 0}%` }}
                          className="bg-[#ff7b72] w-full"
                        />
                        <div
                          style={{ height: `${day.macroPercent?.protein || 0}%` }}
                          className="bg-[#ffd54f] w-full"
                        />
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <span
                      className={`text-xs block font-semibold ${
                        isSelected ? 'text-emerald-400 font-bold' : 'text-neutral-400'
                      }`}
                    >
                      {day.dayNum}
                    </span>
                    <span className="text-[10px] text-neutral-600 block uppercase">
                      {day.dayName}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* "Other data from this period" (Water, Body weight, Antioxidant Index) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider px-1">
          Other data from this period
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Water Tracker Card */}
          <div className="bg-[#181920] rounded-[24px] p-5 border border-[#262832] flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                <Droplet className="w-6 h-6 fill-cyan-400/30 text-cyan-400" />
              </div>
              <div>
                <span className="text-xs font-semibold text-neutral-400 block">Water</span>
                <span className="text-lg font-bold text-white font-mono">
                  {healthData?.water?.total_ml || 0}
                  <span className="text-xs text-neutral-400 ml-1 font-normal">
                    / {healthData?.water?.target_ml || 2500} ml
                  </span>
                </span>
                <div className="h-1.5 w-24 bg-[#232530] rounded-full overflow-hidden mt-1.5">
                  <div
                    style={{ width: `${healthData?.water?.percentage || 0}%` }}
                    className="h-full bg-cyan-400 rounded-full"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => onLogWater(250)}
              className="p-2.5 rounded-full bg-[#242633] hover:bg-cyan-500/20 hover:text-cyan-400 text-neutral-300 transition active:scale-95 border border-[#303344]"
              title="Add 250ml glass of water"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Body Weight / Composition Card */}
          <div className="bg-[#181920] rounded-[24px] p-5 border border-[#262832] flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <Scale className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <span className="text-xs font-semibold text-neutral-400 block">Body composition</span>
                <span className="text-lg font-bold text-white font-mono">
                  {healthData?.weight?.current_kg || 68.5}
                  <span className="text-xs text-neutral-400 ml-1 font-normal">kg</span>
                </span>
                <span className="text-[11px] text-neutral-500 block mt-0.5">
                  Target: {healthData?.weight?.target_kg || 70.0} kg
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowWeightModal(true)}
              className="px-3 py-1.5 rounded-full bg-[#242633] hover:bg-[#303344] text-xs font-semibold text-neutral-200 transition"
            >
              Log
            </button>
          </div>

          {/* Antioxidant Index */}
          <div className="bg-[#181920] rounded-[24px] p-5 border border-[#262832] flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <span className="text-xs font-semibold text-neutral-400 block">Antioxidant index</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">Excellent</span>
              <span className="text-[11px] text-neutral-500 block mt-0.5">
                High in Vitamin C & Phytochemicals
              </span>
            </div>
          </div>

          {/* Blood Glucose / Metabolic Health */}
          <div className="bg-[#181920] rounded-[24px] p-5 border border-[#262832] flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
              <Activity className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <span className="text-xs font-semibold text-neutral-400 block">Metabolic balance</span>
              <span className="text-lg font-bold text-white font-mono">Normal</span>
              <span className="text-[11px] text-neutral-500 block mt-0.5">
                Fibre to Carb ratio: 1:5 (Healthy)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Log Weight Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b1c24] rounded-3xl p-6 border border-[#2d2f3c] max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Log Body Weight</h3>
            <form onSubmit={handleWeightSubmit}>
              <div className="mb-4">
                <label className="text-xs text-neutral-400 block mb-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-4 py-2.5 text-white font-mono text-lg focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowWeightModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm transition"
                >
                  Save Weight
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
