import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import DateNavigator from './components/DateNavigator';
import CalorieSummaryCard from './components/CalorieSummaryCard';
import MacroBreakdownCard from './components/MacroBreakdownCard';
import MealSection from './components/MealSection';
import SevenDayTrendCard from './components/SevenDayTrendCard';
import WaterIntakeCard from './components/WaterIntakeCard';
import NutritionDetailView from './components/NutritionDetailView';
import TrendsView from './components/TrendsView';
import LogMealModal from './components/LogMealModal';
import SettingsModal from './components/SettingsModal';
import LoginModal from './components/LoginModal';
import ForceChangePasswordModal from './components/ForceChangePasswordModal';
import AdminPanelModal from './components/AdminPanelModal';
import { Eye } from 'lucide-react';

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
  fetchSettings,
  fetchCurrentUser,
  logout,
  getStoredUser
} from './services/api';
import { getLocalDateString, shiftDateString } from './utils/dateUtils';
import { startNotificationScheduler } from './utils/notifications';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [authChecked, setAuthChecked] = useState(false);
  const [spectatingUser, setSpectatingUser] = useState(() => {
    const user = getStoredUser();
    if (user && user.is_admin) {
      return { id: 2, username: 'vinutha', display_name: 'Vinutha' };
    }
    return null;
  });

  const [currentDate, setCurrentDate] = useState(() => getLocalDateString());
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'nutrition' | 'trends'
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

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

  // Check initial user authentication
  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await fetchCurrentUser();
        setCurrentUser(user);
      } catch (e) {
        console.warn('Auth check error:', e);
      } finally {
        setAuthChecked(true);
      }
    }
    checkAuth();
  }, []);

  const isSpectating = !!(currentUser?.is_admin && spectatingUser);

  // Load all daily data for the current user or spectated user
  const loadDayData = useCallback(async (date, overrideSpectateId = null) => {
    if (!currentUser) return;
    try {
      const sId = overrideSpectateId !== null ? overrideSpectateId : (currentUser?.is_admin && spectatingUser ? spectatingUser.id : null);
      const [logsRes, nutRes, trendsRes, healthRes] = await Promise.all([
        fetchDailyLogs(date, sId),
        fetchNutritionBreakdown(date, sId),
        fetchAnalyticsTrends('days', date, sId),
        fetchHealthStats(date, sId)
      ]);

      setDailyData(logsRes);
      setProfile(logsRes.profile);
      setNutritionData(nutRes);
      setTrendsData(trendsRes);
      setHealthData(healthRes);
      setServerConnected(true);

      if (logsRes?.profile) {
        startNotificationScheduler(logsRes.profile);
      }
    } catch (err) {
      console.warn('Error loading day data from server:', err.message);
      setServerConnected(false);
    } finally {
      setLoading(false);
    }
  }, [currentUser, spectatingUser]);

  useEffect(() => {
    if (currentUser && !currentUser.must_change_password) {
      loadDayData(currentDate);
    }
  }, [currentDate, currentUser, spectatingUser, loadDayData]);

  // Handlers
  const handleDateChange = (newDate) => {
    setCurrentDate(newDate);
  };

  const handleOpenAddFood = (mealType, mealTitle) => {
    setActiveLogMeal({ mealType, mealTitle });
  };

  const getActiveTargetUserId = () => {
    return currentUser?.is_admin && spectatingUser ? spectatingUser.id : null;
  };

  const handleLogFood = async (entry) => {
    try {
      const targetUserId = getActiveTargetUserId();
      await logFoodItem({ ...entry, date: currentDate, spectate_user_id: targetUserId }, targetUserId);
      await loadDayData(currentDate);
    } catch (err) {
      alert('Failed to log food: ' + err.message);
    }
  };

  const handleQuickAdd = async (entry) => {
    try {
      const targetUserId = getActiveTargetUserId();
      await quickAddCalories({ ...entry, date: currentDate, spectate_user_id: targetUserId }, targetUserId);
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
      const targetUserId = getActiveTargetUserId();
      await logWater(currentDate, amount_ml, targetUserId);
      const h = await fetchHealthStats(currentDate, targetUserId);
      setHealthData(h);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogWeight = async (weight_kg) => {
    try {
      const targetUserId = getActiveTargetUserId();
      await logWeight(currentDate, weight_kg, targetUserId);
      const h = await fetchHealthStats(currentDate, targetUserId);
      setHealthData(h);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSettingsSaved = (updatedProfile) => {
    setProfile(updatedProfile);
    loadDayData(currentDate);
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setDailyData(null);
  };

  // If auth is still checking on startup
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0d0e12] flex items-center justify-center text-white">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Not logged in -> Show Login Screen
  if (!currentUser) {
    return (
      <LoginModal 
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          loadDayData(currentDate);
        }} 
      />
    );
  }

  // Forced password change screen (on initial login or admin reset)
  if (currentUser.must_change_password) {
    return (
      <ForceChangePasswordModal
        user={currentUser}
        onPasswordChanged={(updatedUser) => {
          setCurrentUser(updatedUser);
          loadDayData(currentDate);
        }}
      />
    );
  }

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
        currentUser={currentUser}
        spectatingUser={currentUser?.is_admin ? spectatingUser : null}
        onOpenAdmin={() => setShowAdmin(true)}
        onLogout={handleLogout}
        onNavigate={(view) => {
          if (view === 'settings') {
            setShowSettings(true);
          } else {
            setCurrentView(view);
          }
        }}
      />

      {/* Spectator Mode Banner for Admin */}
      {currentUser?.is_admin && spectatingUser && (
        <div className="bg-cyan-950/40 border-b border-cyan-500/20 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-cyan-300">
            <Eye className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Spectating: <strong className="text-white">{spectatingUser.display_name}</strong> (@{spectatingUser.username})</span>
          </div>
          <button
            onClick={() => setShowAdmin(true)}
            className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-lg transition cursor-pointer"
          >
            Switch User / Manage &rarr;
          </button>
        </div>
      )}

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
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-2 pb-12 safe-bottom-p">
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
                {/* Date Navigator */}
                <DateNavigator
                  currentDate={currentDate}
                  onDateChange={handleDateChange}
                />

                {/* Friendly banner when viewing Today with 0 logs */}
                {currentDate === getLocalDateString() && (dailyData?.dailyTotals?.calories || 0) === 0 && (
                  <div className="bg-[#181920] border border-[#272935] rounded-2xl px-4 py-3 flex items-center justify-between text-xs shadow-md">
                    <div className="flex items-center gap-2 text-neutral-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                      <span>No food logged today yet</span>
                    </div>
                    <button
                      onClick={() => handleDateChange(shiftDateString(currentDate, -1))}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg transition"
                    >
                      View Yesterday &rarr;
                    </button>
                  </div>
                )}

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
                  isSpectating={isSpectating}
                />

                {/* Water Intake Tracker Card */}
                <WaterIntakeCard
                  healthData={healthData}
                  onLogWater={handleLogWater}
                  isSpectating={isSpectating}
                />

                {/* 7-Day Calorie Sparkline Card */}
                <SevenDayTrendCard
                  trendsData={trendsData}
                  currentDate={currentDate}
                  onOpenTrends={() => setCurrentView('trends')}
                  onSelectDate={handleDateChange}
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

      {/* Modal: Admin Dashboard */}
      {showAdmin && currentUser?.is_admin && (
        <AdminPanelModal
          currentUser={currentUser}
          onClose={() => setShowAdmin(false)}
          onSpectateUser={(user) => {
            setSpectatingUser(user);
            loadDayData(currentDate, user.id);
          }}
        />
      )}
    </div>
  );
}
