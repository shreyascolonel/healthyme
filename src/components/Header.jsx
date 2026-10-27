import React from 'react';
import { BarChart3, Settings, ShieldCheck, ChevronLeft } from 'lucide-react';

export default function Header({ currentView, onNavigate, title = 'Food', serverOnline = true }) {
  const isSubView = currentView !== 'dashboard';

  return (
    <header className="sticky top-0 z-30 bg-[#0d0e12]/90 backdrop-blur-md px-4 py-3 border-b border-[#23242c] flex items-center justify-between">
      <div className="flex items-center gap-3">
        {isSubView ? (
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 active:scale-95 transition text-[#e6e8ec]"
            title="Back to Food"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        ) : null}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            {title}
            {serverOnline ? (
              <span className="flex h-2 w-2 relative" title="Backend Server Online on port 4228">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            ) : (
              <span className="flex h-2 w-2 relative" title="Server Disconnected - ensure server is running on port 4228">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            )}
          </h1>
          {currentView === 'dashboard' && (
            <p className="text-xs text-neutral-400">Self-Hosted Health Tracker</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onNavigate(currentView === 'trends' ? 'dashboard' : 'trends')}
          className={`p-2.5 rounded-full transition active:scale-95 ${
            currentView === 'trends'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'hover:bg-white/10 text-neutral-300 hover:text-white'
          }`}
          title="Trends & Analytics"
        >
          <BarChart3 className="w-5 h-5" />
        </button>

        <button
          onClick={() => onNavigate('settings')}
          className="p-2.5 rounded-full hover:bg-white/10 active:scale-95 transition text-neutral-300 hover:text-white"
          title="Settings & Targets"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
