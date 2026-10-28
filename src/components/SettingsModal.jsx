import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Target, 
  Scale, 
  Bell, 
  Check, 
  Sliders, 
  Sparkles, 
  Activity, 
  Droplet, 
  Info,
  Clock,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { updateSettings } from '../services/api';
import { requestNotificationPermission, sendLocalNotification } from '../utils/notifications';

const ALL_MEALS = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'morning_snack', label: 'Morning snack' },
  { id: 'afternoon_snack', label: 'Afternoon snack' },
  { id: 'evening_snack', label: 'Evening snack' }
];

export default function SettingsModal({ profile, onClose, onSaved }) {
  const [activeTab, setActiveTab] = useState('targets'); // 'targets' | 'notifications' | 'meals'

  // BMI & Profile Form State
  const [gender, setGender] = useState(profile?.gender || 'female');
  const [age, setAge] = useState(profile?.age || 28);
  const [heightCm, setHeightCm] = useState(profile?.height_cm || 162.0);
  const [currentWeightKg, setCurrentWeightKg] = useState(profile?.current_weight_kg || profile?.weight_target_kg || 68.0);
  const [activityLevel, setActivityLevel] = useState(profile?.activity_level || 'sedentary');
  const [goalType, setGoalType] = useState(profile?.goal_type || 'lose_standard');
  const [targetMode, setTargetMode] = useState(profile?.target_mode || 'auto'); // 'auto' | 'manual'

  // Target values
  const [calorieTarget, setCalorieTarget] = useState(profile?.calorie_target || 2138);
  const [calorieMin, setCalorieMin] = useState(profile?.calorie_target_min || 1924);
  const [calorieMax, setCalorieMax] = useState(profile?.calorie_target_max || 2351);
  const [proteinGrams, setProteinGrams] = useState(profile?.protein_target_grams || 107);
  const [carbGrams, setCarbGrams] = useState(profile?.carb_target_grams || 294);
  const [fatGrams, setFatGrams] = useState(profile?.fat_target_grams || 59);
  const [waterTargetMl, setWaterTargetMl] = useState(profile?.water_target_ml || 2500);
  const [weightTargetKg, setWeightTargetKg] = useState(profile?.weight_target_kg || 65.0);

  // Enabled Meals
  const [enabledMeals, setEnabledMeals] = useState(
    profile?.enabled_meals || ['breakfast', 'lunch', 'dinner', 'morning_snack', 'afternoon_snack', 'evening_snack']
  );

  // Notifications State
  const [notificationsEnabled, setNotificationsEnabled] = useState(profile?.notifications_enabled === 1);
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [mealReminderTimes, setMealReminderTimes] = useState(
    profile?.meal_reminder_times || { breakfast: '08:30', lunch: '13:00', dinner: '20:00' }
  );
  const [waterIntervalMins, setWaterIntervalMins] = useState(profile?.water_reminder_interval_mins || 120);

  const [saving, setSaving] = useState(false);
  const [appliedNotice, setAppliedNotice] = useState(false);
  const [testNotifSent, setTestNotifSent] = useState(false);

  // --- BMI & TDEE Calculations ---
  const heightM = heightCm / 100;
  const bmi = heightM > 0 ? (currentWeightKg / (heightM * heightM)).toFixed(1) : 22.0;

  let bmiCategory = 'Normal';
  let bmiColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (bmi < 18.5) {
    bmiCategory = 'Underweight';
    bmiColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
  } else if (bmi >= 25.0 && bmi < 30.0) {
    bmiCategory = 'Overweight';
    bmiColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  } else if (bmi >= 30.0) {
    bmiCategory = 'Obese';
    bmiColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  }

  // BMR (Mifflin-St Jeor)
  const bmr = gender === 'male'
    ? 10 * currentWeightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * currentWeightKg + 6.25 * heightCm - 5 * age - 161;

  // Activity multipliers
  const actMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    extra: 1.9
  };
  const tdee = Math.round(bmr * (actMultipliers[activityLevel] || 1.2));

  // Auto-calculated target recommendations
  const computeRecommendedTargets = () => {
    let target = tdee;
    let protPerKg = 1.6;

    if (goalType === 'lose_standard') {
      target = tdee - 500;
      protPerKg = 1.8;
    } else if (goalType === 'lose_mild') {
      target = tdee - 250;
      protPerKg = 1.7;
    } else if (goalType === 'gain') {
      target = tdee + 350;
      protPerKg = 2.0;
    } else {
      // maintain
      target = tdee;
      protPerKg = 1.5;
    }

    // Safe floor
    const minSafe = gender === 'male' ? 1500 : 1200;
    target = Math.max(minSafe, Math.round(target));

    const recMin = Math.round(target * 0.9);
    const recMax = Math.round(target * 1.1);

    // Protein
    const recProtein = Math.round(currentWeightKg * protPerKg);
    const protCalories = recProtein * 4;

    // Fat: ~25% of calories or 0.8g per kg
    const fatCalories = Math.round(target * 0.25);
    const recFat = Math.round(fatCalories / 9);

    // Carbs: remainder
    const carbCalories = Math.max(0, target - protCalories - (recFat * 9));
    const recCarbs = Math.round(carbCalories / 4);

    // Water: 35 ml per kg, rounded to 50
    const recWater = Math.round((currentWeightKg * 35) / 50) * 50;

    return {
      target,
      min: recMin,
      max: recMax,
      protein: recProtein,
      fat: recFat,
      carbs: recCarbs,
      water: Math.max(1500, recWater)
    };
  };

  const handleApplyRecommended = () => {
    const rec = computeRecommendedTargets();
    setCalorieTarget(rec.target);
    setCalorieMin(rec.min);
    setCalorieMax(rec.max);
    setProteinGrams(rec.protein);
    setFatGrams(rec.fat);
    setCarbGrams(rec.carbs);
    setWaterTargetMl(rec.water);
    setTargetMode('auto');

    setAppliedNotice(true);
    setTimeout(() => setAppliedNotice(false), 2000);
  };

  const handleToggleMeal = (id) => {
    setEnabledMeals(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      setNotificationsEnabled(true);
      sendLocalNotification('🔔 Notifications Active!', {
        body: 'HealthyMe will send you reminders for meals and hydration.'
      });
    }
  };

  const handleSendTestNotification = () => {
    const sent = sendLocalNotification('💧 Hydration Test Reminder', {
      body: 'Time to drink water! Tap to log 250ml in HealthyMe.'
    });
    setTestNotifSent(true);
    setTimeout(() => setTestNotifSent(false), 2000);
    if (!sent) {
      alert('Notification blocked or not supported by your browser. Please allow notifications in site settings.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        calorie_target: parseInt(calorieTarget, 10),
        calorie_target_min: parseInt(calorieMin, 10),
        calorie_target_max: parseInt(calorieMax, 10),
        carb_target_grams: parseFloat(carbGrams),
        fat_target_grams: parseFloat(fatGrams),
        protein_target_grams: parseFloat(proteinGrams),
        water_target_ml: parseInt(waterTargetMl, 10),
        weight_target_kg: parseFloat(weightTargetKg),
        enabled_meals: enabledMeals,
        gender,
        age: parseInt(age, 10),
        height_cm: parseFloat(heightCm),
        current_weight_kg: parseFloat(currentWeightKg),
        activity_level: activityLevel,
        goal_type: goalType,
        target_mode: targetMode,
        notifications_enabled: notificationsEnabled ? 1 : 0,
        meal_reminder_times: mealReminderTimes,
        water_reminder_interval_mins: parseInt(waterIntervalMins, 10)
      };

      const res = await updateSettings(payload);
      if (onSaved) onSaved(res);
      onClose();
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const recommendedPreview = computeRecommendedTargets();

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#181920] rounded-[32px] p-5 sm:p-6 border border-[#2d2f3c] max-w-xl w-full shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-[#242633]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Goals & Targets</h2>
              <p className="text-xs text-neutral-400">BMI calculator, calorie goals, and reminders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 pt-3 pb-2 border-b border-[#232430]">
          <button
            type="button"
            onClick={() => setActiveTab('targets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
              activeTab === 'targets'
                ? 'bg-neutral-200 text-neutral-950 shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>BMI & Intake Targets</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
              activeTab === 'notifications'
                ? 'bg-neutral-200 text-neutral-950 shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Reminders</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('meals')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
              activeTab === 'meals'
                ? 'bg-neutral-200 text-neutral-950 shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Active Meals</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* TAB 1: BMI & INTAKE TARGETS */}
          {activeTab === 'targets' && (
            <div className="space-y-5">
              {/* BMI Calculator Inputs */}
              <div className="bg-[#14151b] p-4 rounded-2xl border border-[#262832] space-y-3.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    Personal Metrics & BMI Points
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${bmiColor}`}>
                    BMI {bmi} • {bmiCategory}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-[#1c1d25] border border-[#2c2e3c] rounded-xl px-2.5 py-2 text-xs text-white"
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Age (yrs)</label>
                    <input
                      type="number"
                      min="10"
                      max="110"
                      value={age}
                      onChange={(e) => setAge(parseInt(e.target.value) || 28)}
                      className="w-full bg-[#1c1d25] border border-[#2c2e3c] rounded-xl px-2.5 py-2 text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Height (cm)</label>
                    <input
                      type="number"
                      min="100"
                      max="240"
                      step="0.5"
                      value={heightCm}
                      onChange={(e) => setHeightCm(parseFloat(e.target.value) || 162)}
                      className="w-full bg-[#1c1d25] border border-[#2c2e3c] rounded-xl px-2.5 py-2 text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Current Wt (kg)</label>
                    <input
                      type="number"
                      min="30"
                      max="250"
                      step="0.1"
                      value={currentWeightKg}
                      onChange={(e) => setCurrentWeightKg(parseFloat(e.target.value) || 68)}
                      className="w-full bg-[#1c1d25] border border-[#2c2e3c] rounded-xl px-2.5 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Activity Level</label>
                    <select
                      value={activityLevel}
                      onChange={(e) => setActivityLevel(e.target.value)}
                      className="w-full bg-[#1c1d25] border border-[#2c2e3c] rounded-xl px-2.5 py-2 text-xs text-white"
                    >
                      <option value="sedentary">Sedentary (desk job, low exercise)</option>
                      <option value="light">Lightly Active (1-3 days/week exercise)</option>
                      <option value="moderate">Moderately Active (3-5 days/week)</option>
                      <option value="active">Very Active (6-7 days/week)</option>
                      <option value="extra">Extra Active (heavy physical job)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Health Goal</label>
                    <select
                      value={goalType}
                      onChange={(e) => setGoalType(e.target.value)}
                      className="w-full bg-[#1c1d25] border border-[#2c2e3c] rounded-xl px-2.5 py-2 text-xs text-white"
                    >
                      <option value="lose_standard">Lose Weight (-500 kcal deficit)</option>
                      <option value="lose_mild">Mild Fat Loss (-250 kcal deficit)</option>
                      <option value="maintain">Maintain Current Weight (TDEE)</option>
                      <option value="gain">Build Muscle / Gain (+350 kcal)</option>
                    </select>
                  </div>
                </div>

                {/* Live System Assessment Box */}
                <div className="bg-[#191b24] p-3 rounded-xl border border-[#2a2c3a] text-xs space-y-2">
                  <div className="flex justify-between items-center text-[11px] text-neutral-400">
                    <span>BMR: <strong className="text-white font-mono">{Math.round(bmr)} kcal</strong></span>
                    <span>TDEE: <strong className="text-white font-mono">{tdee} kcal</strong></span>
                    <span>BMI: <strong className="text-emerald-400 font-mono">{bmi}</strong></span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#262836]">
                    <div className="text-[11px] text-neutral-300">
                      Decided: <strong className="text-emerald-400">{recommendedPreview.target} kcal</strong>, 
                      Protein: <strong className="text-amber-300">{recommendedPreview.protein}g</strong>, 
                      Water: <strong className="text-cyan-300">{recommendedPreview.water}ml</strong>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyRecommended}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-neutral-950 font-bold text-xs transition cursor-pointer shadow"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{appliedNotice ? 'Applied!' : 'Apply Decided Targets'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Targets (Auto / Manual Adjustment) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                    Daily Nutrient & Calorie Targets
                  </h3>
                  <div className="flex gap-1 bg-[#14151b] p-1 rounded-xl border border-[#262832]">
                    <button
                      type="button"
                      onClick={() => setTargetMode('auto')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        targetMode === 'auto' ? 'bg-emerald-500 text-neutral-950' : 'text-neutral-400'
                      }`}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetMode('manual')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        targetMode === 'manual' ? 'bg-emerald-500 text-neutral-950' : 'text-neutral-400'
                      }`}
                    >
                      Manual
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Target (kcal)</label>
                    <input
                      type="number"
                      value={calorieTarget}
                      onChange={(e) => setCalorieTarget(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Min (kcal)</label>
                    <input
                      type="number"
                      value={calorieMin}
                      onChange={(e) => setCalorieMin(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Max (kcal)</label>
                    <input
                      type="number"
                      value={calorieMax}
                      onChange={(e) => setCalorieMax(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Macro Grams */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] text-[#b388ff] block mb-1">Carbs (g)</label>
                    <input
                      type="number"
                      value={carbGrams}
                      onChange={(e) => setCarbGrams(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#ff7b72] block mb-1">Fat (g)</label>
                    <input
                      type="number"
                      value={fatGrams}
                      onChange={(e) => setFatGrams(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-rose-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#ffd54f] block mb-1">Protein (g)</label>
                    <input
                      type="number"
                      value={proteinGrams}
                      onChange={(e) => setProteinGrams(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Water Target & Goal Weight */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-cyan-400 block mb-1">Water Target (ml)</label>
                    <input
                      type="number"
                      step="50"
                      value={waterTargetMl}
                      onChange={(e) => setWaterTargetMl(parseInt(e.target.value) || 2500)}
                      className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Target Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={weightTargetKg}
                      onChange={(e) => setWeightTargetKg(parseFloat(e.target.value) || 65)}
                      className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REMINDERS & NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              {/* Permission & Master Toggle */}
              <div className="bg-[#14151b] p-4 rounded-2xl border border-[#262832] flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-emerald-400" />
                    Opt-in for Reminders
                  </h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Receive scheduled reminders to log food and drink water
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Browser Permission Prompt */}
              {notifPermission !== 'granted' && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 flex items-center justify-between text-xs">
                  <span className="text-amber-300">
                    Browser notification permission is required for system push alerts.
                  </span>
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold shrink-0 cursor-pointer"
                  >
                    Allow
                  </button>
                </div>
              )}

              {/* Meal Reminders */}
              <div className="bg-[#14151b] p-4 rounded-2xl border border-[#262832] space-y-3">
                <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  Daily Meal Reminders
                </h4>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Breakfast</label>
                    <input
                      type="time"
                      value={mealReminderTimes.breakfast || '08:30'}
                      onChange={(e) => setMealReminderTimes({ ...mealReminderTimes, breakfast: e.target.value })}
                      className="w-full bg-[#1c1d25] border border-[#2c2e3c] rounded-xl px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Lunch</label>
                    <input
                      type="time"
                      value={mealReminderTimes.lunch || '13:00'}
                      onChange={(e) => setMealReminderTimes({ ...mealReminderTimes, lunch: e.target.value })}
                      className="w-full bg-[#1c1d25] border border-[#2c2e3c] rounded-xl px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Dinner</label>
                    <input
                      type="time"
                      value={mealReminderTimes.dinner || '20:00'}
                      onChange={(e) => setMealReminderTimes({ ...mealReminderTimes, dinner: e.target.value })}
                      className="w-full bg-[#1c1d25] border border-[#2c2e3c] rounded-xl px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Water Drink Reminders */}
              <div className="bg-[#14151b] p-4 rounded-2xl border border-[#262832] space-y-3">
                <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5 text-cyan-400" />
                  Hydration Reminders
                </h4>

                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Drink Water Reminder Frequency</label>
                  <select
                    value={waterIntervalMins}
                    onChange={(e) => setWaterIntervalMins(parseInt(e.target.value, 10))}
                    className="w-full bg-[#1c1d25] border border-[#2c2e3c] rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value={60}>Every 1 hour (between 9:00 AM - 9:00 PM)</option>
                    <option value={90}>Every 1.5 hours</option>
                    <option value={120}>Every 2 hours (Recommended)</option>
                    <option value={180}>Every 3 hours</option>
                  </select>
                </div>
              </div>

              {/* Test Notification Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleSendTestNotification}
                  className="px-4 py-2 rounded-xl bg-[#22242e] hover:bg-[#2c2f3d] text-neutral-300 hover:text-white text-xs font-semibold border border-[#2d2f3c] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{testNotifSent ? 'Notification Sent!' : 'Send Test Notification'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVE MEALS */}
          {activeTab === 'meals' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Visible Meal Sections on Dashboard
              </h3>
              <p className="text-xs text-neutral-400">
                Choose which meal timeframes appear on your food diary.
              </p>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {ALL_MEALS.map((meal) => {
                  const checked = enabledMeals.includes(meal.id);
                  return (
                    <div
                      key={meal.id}
                      onClick={() => handleToggleMeal(meal.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        checked
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                          : 'bg-[#121318] border-[#252632] text-neutral-400'
                      }`}
                    >
                      <span className="text-xs font-semibold">{meal.label}</span>
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center transition ${
                          checked ? 'bg-emerald-500 text-neutral-950' : 'bg-neutral-800'
                        }`}
                      >
                        {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Save Actions */}
          <div className="flex gap-3 pt-3 border-t border-[#242633]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-neutral-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Goals & Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
