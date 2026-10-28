import React, { useState } from 'react';
import { Droplet, Plus, RotateCcw, Check, GlassWater } from 'lucide-react';

export default function WaterIntakeCard({ healthData, onLogWater, isSpectating }) {
  const water = healthData?.water || { total_ml: 0, target_ml: 2500, percentage: 0 };
  const totalMl = water.total_ml || 0;
  const targetMl = water.target_ml || 2500;
  const percentage = Math.min(100, Math.round((totalMl / targetMl) * 100));

  const glassesCount = Math.round(totalMl / 250);
  const targetGlasses = Math.round(targetMl / 250);

  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customMl, setCustomMl] = useState('250');
  const [justAdded, setJustAdded] = useState(false);

  const handleQuickAdd = async (amount) => {
    if (isSpectating) return;
    try {
      await onLogWater(amount);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1200);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    const ml = parseInt(customMl, 10);
    if (ml && ml > 0) {
      await handleQuickAdd(ml);
      setShowCustomModal(false);
    }
  };

  return (
    <div className="bg-[#181920] rounded-[28px] p-6 border border-[#262832] shadow-xl relative overflow-hidden transition">
      {/* Background ambient water glow */}
      <div 
        className="absolute -right-10 -bottom-10 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"
      />

      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Droplet className="w-5 h-5 fill-cyan-400/20" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <span>Water Intake</span>
              {justAdded && (
                <span className="text-[11px] font-bold text-cyan-400 bg-cyan-500/15 px-2 py-0.5 rounded-full animate-bounce">
                  +Added!
                </span>
              )}
            </h3>
            <p className="text-xs text-neutral-400">
              {glassesCount} of {targetGlasses} glasses (250 ml/glass)
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xl font-extrabold text-white font-mono">
            {totalMl.toLocaleString()}
          </span>
          <span className="text-xs text-neutral-400 font-mono"> / {targetMl.toLocaleString()} ml</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#14151b] h-3 rounded-full overflow-hidden p-0.5 border border-[#252632] mb-4">
        <div
          style={{ width: `${percentage}%` }}
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500 shadow-sm shadow-cyan-500/50"
        />
      </div>

      {/* Quick Add Buttons */}
      {!isSpectating && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => handleQuickAdd(250)}
            className="flex-1 py-2.5 rounded-2xl bg-[#1f212b] hover:bg-cyan-500/20 active:scale-95 border border-[#2c2e3c] text-neutral-200 hover:text-cyan-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>+250 ml</span>
          </button>

          <button
            onClick={() => handleQuickAdd(500)}
            className="flex-1 py-2.5 rounded-2xl bg-[#1f212b] hover:bg-cyan-500/20 active:scale-95 border border-[#2c2e3c] text-neutral-200 hover:text-cyan-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>+500 ml</span>
          </button>

          <button
            onClick={() => setShowCustomModal(true)}
            className="px-3 py-2.5 rounded-2xl bg-[#1f212b] hover:bg-[#282a37] active:scale-95 border border-[#2c2e3c] text-neutral-300 hover:text-white text-xs font-semibold transition cursor-pointer"
            title="Custom amount"
          >
            Custom
          </button>
        </div>
      )}

      {isSpectating && (
        <div className="text-[11px] text-neutral-500 italic text-center pt-1">
          Water logging is disabled in spectator mode.
        </div>
      )}

      {/* Custom Water Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181920] rounded-3xl p-5 border border-[#2d2f3c] max-w-xs w-full shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Droplet className="w-4 h-4 text-cyan-400" />
              Log Custom Water
            </h4>

            <form onSubmit={handleCustomSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Amount in Millilitres (ml)</label>
                <input
                  type="number"
                  step="50"
                  min="50"
                  max="5000"
                  value={customMl}
                  onChange={(e) => setCustomMl(e.target.value)}
                  className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="flex-1 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-xs font-bold cursor-pointer"
                >
                  Log Water
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
