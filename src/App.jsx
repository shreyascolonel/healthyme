import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import DateNavigator from './components/DateNavigator';
import CalorieSummaryCard from './components/CalorieSummaryCard';
import MacroBreakdownCard from './components/MacroBreakdownCard';
import MealSection from './components/MealSection';
import SevenDayTrendCard from './components/SevenDayTrendCard';
import NutritionDetailView from './components/NutritionDetailView';
import TrendsView from './components/TrendsView';
import LogMealModal from './components/LogMealModal';
import SettingsModal from './components/SettingsModal';

import { 
  fetchDailyLogs, 
  logFoodItem, 
  quickAddCalories, 
  deleteLogEntry, 
  fetchNutritionBreakdown, 
  fetchAnalyticsTrends, 
  fetchHealthStats, 
  logWater, 
  logWeight,
  fetchSettings 
} from './services/api';

export default function App() {
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'nutrition' | 'trends'
  const [showSettings, setShowSettings] = useState(false);

  // Core Data
  const [dailyData, setDailyData] = useState(null);
  const [nutritionData, setNutritionData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverConnected, setServerConnected] = useState(true);

  // Food logger modal state
  const [activeLogMeal, setActiveLogMeal] = useState(null); // { mealType, mealTitle }

  // Load all daily data
  const loadDayData = useCallback(async (date) => {
    try {
      const [logsRes, nutRes, trendsRes, healthRes] = await Promise.all([
        fetchDailyLogs(date),
        fetchNutritionBreakdown(date),
        fetchAnalyticsTrends('days', date),
        fetchHealthStats(date)
      ]);

      setDailyData(logsRes);
      setProfile(logsRes.profile);
      setNutritionData(nutRes);
      setTrendsData(trendsRes);
      setHealthData(healthRes);
      setServerConnected(true);
    } catch (err) {
      console.warn('Error loading day data from server:', err.message);
      setServerConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDayData(currentDate);
  }, [currentDate, loadDayData]);

  // Handlers
  const handleDateChange = (newDate) => {
    setCurrentDate(newDate);
  };

  const handleOpenAddFood = (mealType, mealTitle) => {
    setActiveLogMeal({ mealType, mealTitle });
  };

  const handleLogFood = async (entry) => {
    try {
      await logFoodItem({ ...entry, date: currentDate });
      await loadDayData(currentDate);
    } catch (err) {
      alert('Failed to log food: ' + err.message);
    }
  };

  const handleQuickAdd = async (entry) => {
    try {
      await quickAddCalories({ ...entry, date: currentDate });
      await loadDayData(currentDate);
    } catch (err) {
      alert('Failed to add calories: ' + err.message);
    }
  };

  const handleDeleteLog = async (id) => {
    try {
      await deleteLogEntry(id);
      await loadDayData(currentDate);
    } catch (err) {
      alert('Failed to delete item: ' + err.message);
    }
  };

  const handleLogWater = async (amount_ml) => {
    try {
      await logWater(currentDate, amount_ml);
      const h = await fetchHealthStats(currentDate);
      setHealthData(h);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogWeight = async (weight_kg) => {
    try {
      await logWeight(currentDate, weight_kg);
      const h = await fetchHealthStats(currentDate);
      setHealthData(h);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSettingsSaved = (updatedProfile) => {
    setProfile(updatedProfile);
    loadDayData(currentDate);
  };

  // Header Title based on current view
  let headerTitle = 'Food';
  if (currentView === 'nutrition') headerTitle = 'Nutrition info';
  if (currentView === 'trends') headerTitle = 'Analytics & Trends';

  return (
    <div className="min-h-screen bg-[#0d0e12] text-[#f2f4f8] flex flex-col font-sans selection:bg-purple-500/20">
      {/* Top Header */}
      <Header
        currentView={currentView}
        title={headerTitle}
        serverOnline={serverConnected}
        onNavigate={(view) => {
          if (view === 'settings') {
            setShowSettings(true);
          } else {
            setCurrentView(view);
          }
        }}
      />

      {/* Reconnect notice if server connection drops */}
      {!serverConnected && (
        <div className="bg-rose-500/15 border-b border-rose-500/30 px-4 py-2 flex items-center justify-between text-xs text-rose-300">
          <span>Connection to HealthyMe server on port 4228 lost.</span>
          <button
            onClick={() => loadDayData(currentDate)}
            className="px-2.5 py-0.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-2 pb-12">
        {loading && !dailyData ? (
          <div className="py-24 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-xs text-neutral-400">Loading your nutrition data...</p>
          </div>
        ) : (
          <>
            {/* View 1: Main Dashboard (Screenshots 1 & 5) */}
            {currentView === 'dashboard' && (
              <div className="space-y-4">
                {/* Date Navigator (Mon, 26 Oct) */}
                <DateNavigator
                  currentDate={currentDate}
                  onDateChange={handleDateChange}
                />

                {/* Calorie Card with Optimal Intake Range */}
                <CalorieSummaryCard
                  dailyTotals={dailyData?.dailyTotals}
                  profile={profile}
                />

                {/* Macro Distribution Card (Carb, Fat, Protein with Actual vs Recommended) */}
                <MacroBreakdownCard
                  dailyTotals={dailyData?.dailyTotals}
                  profile={profile}
                  onOpenDetail={() => setCurrentView('nutrition')}
                />

                {/* Meals Section (Breakfast, Lunch, Dinner, Morning snack, etc.) */}
                <MealSection
                  meals={dailyData?.meals}
                  enabledMeals={dailyData?.enabledMeals}
                  onAddFood={handleOpenAddFood}
                  onDeleteLog={handleDeleteLog}
                />

                {/* 7-Day Calorie Sparkline Card (Screenshot 5) */}
                <SevenDayTrendCard
                  trendsData={trendsData}
                  currentDate={currentDate}
                  onOpenTrends={() => setCurrentView('trends')}
                />
              </div>
            )}

            {/* View 2: Detailed Nutrition Info (Screenshot 3) */}
            {currentView === 'nutrition' && (
              <div className="pt-2">
                <NutritionDetailView
                  nutritionData={nutritionData}
                  onBack={() => setCurrentView('dashboard')}
                />
              </div>
            )}

            {/* View 3: Trends & Analytics (Screenshot 4) */}
            {currentView === 'trends' && (
              <div className="pt-2">
                <TrendsView
                  trendsData={trendsData}
                  healthData={healthData}
                  onLogWater={handleLogWater}
                  onLogWeight={handleLogWeight}
                  currentDate={currentDate}
                  onSelectDate={(d) => {
                    setCurrentDate(d);
                    setCurrentView('dashboard');
                  }}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal: Food Logger (Screenshot 2: Favourites, My foods, Search, Barcode) */}
      {activeLogMeal && (
        <LogMealModal
          mealType={activeLogMeal.mealType}
          mealTitle={activeLogMeal.mealTitle}
          onClose={() => setActiveLogMeal(null)}
          onLogFood={handleLogFood}
          onQuickAdd={handleQuickAdd}
        />
      )}

      {/* Modal: Settings & Targets */}
      {showSettings && (
        <SettingsModal
          profile={profile}
          onClose={() => setShowSettings(false)}
          onSaved={handleSettingsSaved}
        />
      )}
    </div>
  );
}
