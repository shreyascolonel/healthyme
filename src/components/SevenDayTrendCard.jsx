import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function SevenDayTrendCard({ trendsData, currentDate, onOpenTrends, onSelectDate }) {
  const dailyStats = trendsData?.dailyStats || [];
  const avgCalories = trendsData?.averageCalories || 2138;
  const targetCalories = trendsData?.targetCalories || 2138;

  // Max value for bar heights
  const maxCal = Math.max(
    ...dailyStats.map(d => d.calories),
    targetCalories,
    2500
  );

  return (
    <div
      onClick={onOpenTrends}
      className="bg-[#181920] rounded-[28px] p-6 border border-[#262832] shadow-xl hover:border-neutral-600 transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-wide">
            Calorie intake over last 7 days
          </h3>
          <p className="text-[11px] text-neutral-400 mt-0.5">Tap any day to view its meal logs</p>
        </div>
        <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-white group-hover:translate-x-0.5 transition shrink-0" />
      </div>

      <div className="relative pt-6 pb-2">
        {/* Average/Target dotted reference line */}
        <div 
          className="absolute left-0 right-0 border-t border-dotted border-neutral-600/60 flex justify-end"
          style={{ bottom: `${Math.min(90, Math.max(15, (avgCalories / maxCal) * 100))}%` }}
        >
          <span className="text-[10px] text-neutral-400 bg-[#22242e] px-1.5 py-0.5 rounded -mt-2.5 font-mono border border-neutral-700">
            Avg. {avgCalories.toLocaleString()}
          </span>
        </div>

        {/* 7 Vertical Day Bars */}
        <div className="flex items-end justify-between h-28 gap-2 pt-2">
          {dailyStats.slice(-7).map((day) => {
            const isSelected = day.date === currentDate;
            const barHeightPct = Math.min(100, Math.max(8, (day.calories / maxCal) * 100));

            return (
              <div
                key={day.date}
                onClick={(e) => {
                  if (onSelectDate) {
                    e.stopPropagation();
                    onSelectDate(day.date);
                  }
                }}
                className="flex-1 flex flex-col items-center gap-2 group/bar p-1 rounded-xl hover:bg-white/5 active:scale-95 transition"
              >
                {/* Bar */}
                <div className="w-full flex justify-center items-end h-20">
                  <div
                    style={{ height: `${barHeightPct}%` }}
                    className={`w-3.5 sm:w-4 rounded-full transition-all duration-300 ${
                      isSelected
                        ? 'bg-emerald-400 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/30'
                        : day.calories > 0
                        ? 'bg-[#313444] group-hover/bar:bg-emerald-400/60'
                        : 'bg-[#22242e]'
                    }`}
                    title={`${day.date}: ${day.calories} kcal`}
                  />
                </div>

                {/* Day Number Label */}
                <span
                  className={`text-xs font-semibold ${
                    isSelected ? 'text-emerald-400 font-bold' : 'text-neutral-500 group-hover/bar:text-neutral-300'
                  }`}
                >
                  {day.dayNum}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
