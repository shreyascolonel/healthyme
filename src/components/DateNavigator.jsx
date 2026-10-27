import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export default function DateNavigator({ currentDate, onDateChange }) {
  const dateInputRef = useRef(null);

  const curDateObj = new Date(currentDate + 'T00:00:00');
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = currentDate === todayStr;

  // Format date like "Mon, 26 Oct"
  const formattedDate = curDateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  const handlePrevDay = () => {
    const prev = new Date(curDateObj.getTime() - 86400000);
    onDateChange(prev.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const next = new Date(curDateObj.getTime() + 86400000);
    onDateChange(next.toISOString().split('T')[0]);
  };

  const handleDatePick = (e) => {
    if (e.target.value) {
      onDateChange(e.target.value);
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto w-full">
      <button
        onClick={handlePrevDay}
        className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition text-neutral-300 hover:text-white"
        title="Previous day"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="relative">
        <button
          onClick={() => dateInputRef.current?.showPicker ? dateInputRef.current.showPicker() : dateInputRef.current?.focus()}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#1e2027] hover:bg-[#282a34] active:scale-98 transition border border-[#2d2f3c] text-sm font-semibold tracking-wide text-white shadow-sm"
        >
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span>{isToday ? `Today, ${formattedDate}` : formattedDate}</span>
        </button>
        <input
          ref={dateInputRef}
          type="date"
          value={currentDate}
          onChange={handleDatePick}
          className="absolute inset-0 opacity-0 cursor-pointer pointer-events-none"
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
      </div>
    </div>
  );
}
