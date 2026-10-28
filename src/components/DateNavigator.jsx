import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { getLocalDateString, shiftDateString, formatDisplayDate } from '../utils/dateUtils';

export default function DateNavigator({ currentDate, onDateChange }) {
  const dateInputRef = useRef(null);

  const todayStr = getLocalDateString();
  const yesterdayStr = shiftDateString(todayStr, -1);
  const isToday = currentDate === todayStr;
  const isYesterday = currentDate === yesterdayStr;

  const formattedDate = formatDisplayDate(currentDate);

  const handlePrevDay = () => {
    onDateChange(shiftDateString(currentDate, -1));
  };

  const handleNextDay = () => {
    onDateChange(shiftDateString(currentDate, 1));
  };

  const handleDatePick = (e) => {
    if (e.target.value) {
      onDateChange(e.target.value);
    }
  };

  let displayLabel = formattedDate;
  if (isToday) {
    displayLabel = `Today, ${formattedDate}`;
  } else if (isYesterday) {
    displayLabel = `Yesterday, ${formattedDate}`;
  }

  return (
    <div className="flex items-center justify-between px-3 py-3 max-w-md mx-auto w-full">
      <button
        onClick={handlePrevDay}
        className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition text-neutral-300 hover:text-white"
        title="Previous day"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Date Pill with invisible native date input overlay for 100% reliable iOS Safari touch */}
      <div className="relative inline-flex items-center">
        <div
          className="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full bg-[#1e2027] hover:bg-[#282a34] active:scale-98 transition border border-[#2d2f3c] text-xs sm:text-sm font-semibold tracking-wide text-white shadow-sm pointer-events-none"
        >
          <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="whitespace-nowrap">{displayLabel}</span>
        </div>
        <input
          ref={dateInputRef}
          type="date"
          value={currentDate}
          onChange={handleDatePick}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          aria-label="Select date"
        />
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleNextDay}
          className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition text-neutral-300 hover:text-white"
          title="Next day"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        {!isToday && (
          <button
            onClick={() => onDateChange(todayStr)}
            className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-md transition"
            title="Jump to Today"
          >
            Today
          </button>
        )}
        {isToday && (
          <button
            onClick={() => onDateChange(yesterdayStr)}
            className="text-[11px] font-semibold text-neutral-400 bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md transition"
            title="Jump to Yesterday"
          >
            Yest.
          </button>
        )}
      </div>
    </div>
  );
}
