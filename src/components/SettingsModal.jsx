import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Server, 
  ShieldCheck, 
  Sliders, 
  Target, 
  Check, 
  Info 
} from 'lucide-react';
import { updateSettings } from '../services/api';

const ALL_MEALS = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'morning_snack', label: 'Morning snack' },
  { id: 'afternoon_snack', label: 'Afternoon snack' },
  { id: 'evening_snack', label: 'Evening snack' }
];

export default function SettingsModal({ profile, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    calorie_target: profile?.calorie_target || 2138,
    calorie_target_min: profile?.calorie_target_min || 1924,
    calorie_target_max: profile?.calorie_target_max || 2351,
    carb_target_grams: profile?.carb_target_grams || 294,
    fat_target_grams: profile?.fat_target_grams || 59,
    protein_target_grams: profile?.protein_target_grams || 107,
    carb_ratio_target: profile?.carb_ratio_target || 55,
    fat_ratio_target: profile?.fat_ratio_target || 25,
    protein_ratio_target: profile?.protein_ratio_target || 20,
    water_target_ml: profile?.water_target_ml || 2500,
    weight_target_kg: profile?.weight_target_kg || 70.0,
    enabled_meals: profile?.enabled_meals || ['breakfast', 'lunch', 'dinner', 'morning_snack', 'afternoon_snack', 'evening_snack']
  });

  const [saving, setSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  const handleToggleMeal = (id) => {
    setFormData(prev => {
      const exists = prev.enabled_meals.includes(id);
      const updated = exists 
        ? prev.enabled_meals.filter(m => m !== id)
        : [...prev.enabled_meals, id];
      return { ...prev, enabled_meals: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateSettings(formData);
      onSaved(res);
      setShowSavedToast(true);
      setTimeout(() => {
        setShowSavedToast(false);
        onClose();
      }, 700);
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#181920] rounded-[32px] p-6 border border-[#2d2f3c] max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-4 border-b border-[#242633] mb-5">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Settings & Goals</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Calorie Goals */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Calorie Target & Range
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Target (kcal)</label>
                <input
                  type="number"
                  value={formData.calorie_target}
                  onChange={(e) => setFormData({ ...formData, calorie_target: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Min Range (kcal)</label>
                <input
                  type="number"
                  value={formData.calorie_target_min}
                  onChange={(e) => setFormData({ ...formData, calorie_target_min: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Max Range (kcal)</label>
                <input
                  type="number"
                  value={formData.calorie_target_max}
                  onChange={(e) => setFormData({ ...formData, calorie_target_max: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Macro Grams & Ratio */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Macronutrient Targets
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-[#b388ff] block mb-1 font-semibold">Carbs (g)</label>
                <input
                  type="number"
                  value={formData.carb_target_grams}
                  onChange={(e) => setFormData({ ...formData, carb_target_grams: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-neutral-500 mt-0.5 block">{formData.carb_ratio_target}% of calories</span>
              </div>
              <div>
                <label className="text-[11px] text-[#ff7b72] block mb-1 font-semibold">Fat (g)</label>
                <input
                  type="number"
                  value={formData.fat_target_grams}
                  onChange={(e) => setFormData({ ...formData, fat_target_grams: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-neutral-500 mt-0.5 block">{formData.fat_ratio_target}% of calories</span>
              </div>
              <div>
                <label className="text-[11px] text-[#ffd54f] block mb-1 font-semibold">Protein (g)</label>
                <input
                  type="number"
                  value={formData.protein_target_grams}
                  onChange={(e) => setFormData({ ...formData, protein_target_grams: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-neutral-500 mt-0.5 block">{formData.protein_ratio_target}% of calories</span>
              </div>
            </div>
          </div>

          {/* Enabled Meal Slots */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Enabled Meal Slots
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {ALL_MEALS.map((meal) => {
                const isChecked = formData.enabled_meals.includes(meal.id);
                return (
                  <label
                    key={meal.id}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer transition ${
                      isChecked
                        ? 'bg-[#1e202b] border-emerald-500/40 text-white'
                        : 'bg-[#13141a] border-[#252632] text-neutral-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleMeal(meal.id)}
                      className="accent-emerald-400 rounded w-4 h-4"
                    />
                    <span className="text-xs font-semibold">{meal.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Water & Weight Targets */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Water Target (ml)</label>
              <input
                type="number"
                value={formData.water_target_ml}
                onChange={(e) => setFormData({ ...formData, water_target_ml: parseInt(e.target.value) || 2500 })}
                className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Target Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={formData.weight_target_kg}
                onChange={(e) => setFormData({ ...formData, weight_target_kg: parseFloat(e.target.value) || 70.0 })}
                className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Reverse Proxy & Self-Hosting Diagnostics */}
          <div className="bg-[#12131a] rounded-2xl p-4 border border-[#232431] text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <Server className="w-4 h-4" />
              <span>Self-Hosted & Reverse Proxy Status</span>
            </div>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              HealthyMe is running on modern Node.js with built-in SQLite. Behind Nginx, Caddy, or Cloudflare Tunnel, headers like <code className="bg-[#1e202b] px-1 py-0.5 rounded text-neutral-300">X-Forwarded-For</code> and <code className="bg-[#1e202b] px-1 py-0.5 rounded text-neutral-300">X-Forwarded-Proto</code> are automatically handled.
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-neutral-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {saving ? 'Saving...' : showSavedToast ? 'Settings Saved!' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
