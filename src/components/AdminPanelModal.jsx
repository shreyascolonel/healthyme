import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UtensilsCrossed, 
  X, 
  Plus, 
  RotateCcw, 
  Trash2, 
  ShieldCheck, 
  Shield, 
  Activity, 
  Eye, 
  Sparkles, 
  Clock, 
  Droplet, 
  Calendar,
  ChevronRight
} from 'lucide-react';
import { 
  fetchAdminUsers, 
  createAdminUser, 
  resetUserPassword, 
  deleteAdminUser,
  updateUserPrivileges,
  fetchUserActivity,
  fetchAdminFoods,
  deleteAdminFood,
  createAdminFood
} from '../services/api';

export default function AdminPanelModal({ currentUser, onClose, onSpectateUser }) {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'foods'
  const [users, setUsers] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Add User Form State
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);

  // Reset Password Dialog State
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [tempPassword, setTempPassword] = useState('welcome123');

  // User Activity Drawer / Modal State
  const [activityTargetUser, setActivityTargetUser] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);

  // Add Food Form State
  const [showAddFood, setShowAddFood] = useState(false);
  const [newFood, setNewFood] = useState({
    name: '',
    brand: '',
    category: 'Cooked Dishes',
    serving_name: '1 serving',
    serving_size_grams: 100,
    calories: '',
    carbs: '',
    fat: '',
    protein: '',
    fiber: '',
    sugar: '',
    sodium: ''
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'users') {
        const u = await fetchAdminUsers();
        setUsers(u);
      } else {
        const f = await fetchAdminFoods();
        setFoods(f);
      }
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || !newDisplayName.trim()) return;

    setError('');
    try {
      const res = await createAdminUser({
        username: newUsername.trim(),
        display_name: newDisplayName.trim(),
        is_admin: newIsAdmin
      });
      setMessage(`User "${res.username}" created successfully with default password "welcome123"!`);
      setShowAddUser(false);
      setNewUsername('');
      setNewDisplayName('');
      setNewIsAdmin(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTogglePrivileges = async (user) => {
    if (user.id === currentUser?.id && user.is_admin) {
      setError('You cannot remove your own admin privileges.');
      return;
    }

    const action = user.is_admin ? 'remove Admin privileges from' : 'grant Admin privileges to';
    if (!window.confirm(`Are you sure you want to ${action} @${user.username}?`)) return;

    setError('');
    try {
      const res = await updateUserPrivileges(user.id, !user.is_admin);
      setMessage(res.message);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenActivity = async (user) => {
    setActivityTargetUser(user);
    setActivityLoading(true);
    setActivityData(null);
    try {
      const data = await fetchUserActivity(user.id);
      setActivityData(data);
    } catch (err) {
      setError('Failed to fetch user activity: ' + err.message);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetTargetUser) return;

    setError('');
    try {
      const res = await resetUserPassword(resetTargetUser.id, tempPassword);
      setMessage(res.message);
      setResetTargetUser(null);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.username}" and all their logs?`)) return;

    setError('');
    try {
      await deleteAdminUser(user.id);
      setMessage(`User "${user.username}" deleted successfully`);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateFood = async (e) => {
    e.preventDefault();
    if (!newFood.name || !newFood.calories) return;

    setError('');
    try {
      const grams = parseFloat(newFood.serving_size_grams) || 100;
      const servingLabel = `${newFood.serving_name || '1 serving'} (${grams} g)`;

      await createAdminFood({
        ...newFood,
        serving_size: servingLabel,
        serving_size_grams: grams,
        serving_unit: 'g'
      });
      setMessage(`Shared food "${newFood.name}" added successfully!`);
      setShowAddFood(false);
      setNewFood({
        name: '',
        brand: '',
        category: 'Cooked Dishes',
        serving_name: '1 serving',
        serving_size_grams: 100,
        calories: '',
        carbs: '',
        fat: '',
        protein: '',
        fiber: '',
        sugar: '',
        sodium: ''
      });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteFood = async (food) => {
    if (!window.confirm(`Delete "${food.name}" from shared food database?`)) return;

    try {
      await deleteAdminFood(food.id);
      setMessage(`Food "${food.name}" removed from shared database`);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Nutrition per 100g preview calculation
  const enteredGrams = parseFloat(newFood.serving_size_grams) || 100;
  const ratio100 = enteredGrams > 0 ? 100 / enteredGrams : 1;
  const calsPer100 = newFood.calories ? Math.round(parseFloat(newFood.calories) * ratio100) : 0;
  const carbsPer100 = newFood.carbs ? (parseFloat(newFood.carbs) * ratio100).toFixed(1) : 0;
  const fatPer100 = newFood.fat ? (parseFloat(newFood.fat) * ratio100).toFixed(1) : 0;
  const proteinPer100 = newFood.protein ? (parseFloat(newFood.protein) * ratio100).toFixed(1) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#181920] rounded-[32px] p-5 sm:p-6 border border-[#2d2f3c] max-w-2xl w-full shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-[#242633]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Admin Dashboard</h2>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                  Spectator Mode
                </span>
              </div>
              <p className="text-xs text-neutral-400">Spectate user diaries, manage privileges, and catalog foods</p>
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
        <div className="flex gap-2 pt-4 pb-2 border-b border-[#232430]">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
              activeTab === 'users'
                ? 'bg-neutral-200 text-neutral-950 shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users & Privileges</span>
          </button>
          <button
            onClick={() => setActiveTab('foods')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
              activeTab === 'foods'
                ? 'bg-neutral-200 text-neutral-950 shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Shared Food Catalog</span>
          </button>
        </div>

        {/* Status Messages */}
        {message && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-3 my-2 text-xs text-emerald-300 flex items-center justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        )}
        {error && (
          <div className="bg-rose-500/15 border border-rose-500/30 rounded-2xl p-3 my-2 text-xs text-rose-300 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Registered Users ({users.length})
                </span>
                <button
                  onClick={() => setShowAddUser(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition shadow cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add User</span>
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-neutral-400">Loading users...</div>
              ) : (
                <div className="space-y-3">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="bg-[#14151b] rounded-2xl p-4 border border-[#262832] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-neutral-700 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white truncate">{u.display_name}</h4>
                          <span className="text-[11px] text-neutral-400 font-mono">@{u.username}</span>
                          {u.is_admin ? (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase border border-emerald-500/20">
                              Admin
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full uppercase">
                              Participant
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 mt-1">
                          <span>{u.meal_count || 0} meals logged</span>
                          {u.last_active_date && (
                            <span className="text-neutral-500">• Last active: {u.last_active_date}</span>
                          )}
                          {u.must_change_password ? (
                            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-semibold border border-amber-500/20">
                              Password change pending
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-semibold">
                              Active
                            </span>
                          )}
                        </div>
                      </div>

                      {/* User Actions */}
                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                        {/* Spectate Button */}
                        <button
                          onClick={() => {
                            if (onSpectateUser) onSpectateUser(u);
                            onClose();
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition cursor-pointer"
                          title="Spectate this user's diary"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Spectate</span>
                        </button>

                        {/* Activity Button */}
                        <button
                          onClick={() => handleOpenActivity(u)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#22242e] hover:bg-[#2c2f3d] text-neutral-300 text-xs font-semibold border border-[#2d2f3c] transition cursor-pointer"
                          title="View user activity and log history"
                        >
                          <Activity className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Activity</span>
                        </button>

                        {/* Privilege Toggle Button */}
                        <button
                          onClick={() => handleTogglePrivileges(u)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            u.is_admin
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20'
                              : 'bg-[#22242e] border-[#2d2f3c] text-neutral-400 hover:text-white'
                          }`}
                          title={u.is_admin ? 'Demote from Admin' : 'Promote to Admin'}
                        >
                          {u.is_admin ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Shield className="w-3.5 h-3.5 text-neutral-400" />}
                          <span className="hidden sm:inline">{u.is_admin ? 'Admin' : 'Make Admin'}</span>
                        </button>

                        {/* Reset Password Button */}
                        <button
                          onClick={() => {
                            setResetTargetUser(u);
                            setTempPassword('welcome123');
                          }}
                          className="p-1.5 rounded-xl bg-[#22242e] hover:bg-amber-500/20 hover:text-amber-400 text-neutral-400 border border-[#2d2f3c] transition cursor-pointer"
                          title="Reset Password"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete User Button */}
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-xl text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FOODS TAB */}
          {activeTab === 'foods' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                    Shared Custom Foods ({foods.length})
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    Visible to all users under "My foods"
                  </span>
                </div>
                <button
                  onClick={() => setShowAddFood(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition shadow cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Food</span>
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-neutral-400">Loading foods...</div>
              ) : foods.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 text-xs">
                  No custom foods added yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {foods.map((food) => (
                    <div
                      key={food.id}
                      className="bg-[#14151b] rounded-2xl p-3.5 border border-[#262832] flex items-center justify-between gap-3 hover:border-neutral-700 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white truncate">{food.name}</h4>
                          {food.creator_username && (
                            <span className="text-[10px] text-neutral-400 bg-[#22242e] px-1.5 py-0.5 rounded">
                              by {food.creator_display_name || food.creator_username}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-neutral-400 mt-0.5">
                          <strong className="text-white">{food.calories} kcal</strong>, {food.serving_size || '100 g'}
                        </p>

                        <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-1 font-mono">
                          <span className="text-[#b388ff]">C: {food.carbs}g</span>
                          <span className="text-[#ff7b72]">F: {food.fat}g</span>
                          <span className="text-[#ffd54f]">P: {food.protein}g</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteFood(food)}
                        className="p-1.5 rounded-xl text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0 cursor-pointer"
                        title="Delete Food"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SUBMODAL: Create User */}
        {showAddUser && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#181920] rounded-3xl p-6 border border-[#2d2f3c] max-w-sm w-full shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Add New User
              </h3>
              <p className="text-xs text-neutral-400">
                Default password is <strong className="text-white">welcome123</strong>. User will be forced to change password upon first login.
              </p>

              <form onSubmit={handleCreateUser} className="space-y-3">
                <div>
                  <label className="text-xs text-neutral-300 block mb-1">Username (Login ID) *</label>
                  <input
                    type="text"
                    placeholder="e.g. rahul"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-300 block mb-1">Display Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsAdmin}
                    onChange={(e) => setNewIsAdmin(e.target.checked)}
                    className="w-4 h-4 accent-emerald-400 rounded cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-neutral-300">Grant Admin Privileges</span>
                </label>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold cursor-pointer"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SUBMODAL: Reset Password */}
        {resetTargetUser && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#181920] rounded-3xl p-6 border border-[#2d2f3c] max-w-sm w-full shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                Reset Password
              </h3>
              <p className="text-xs text-neutral-400">
                Resetting password for <strong className="text-white">@{resetTargetUser.username}</strong> will invalidate their active session and require them to set a new password on their next login.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-3">
                <div>
                  <label className="text-xs text-neutral-300 block mb-1">Temporary Password</label>
                  <input
                    type="text"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetTargetUser(null)}
                    className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SUBMODAL: View User Activity & Spectate */}
        {activityTargetUser && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#181920] rounded-3xl p-6 border border-[#2d2f3c] max-w-lg w-full shadow-2xl max-h-[88vh] flex flex-col space-y-4">
              <div className="flex justify-between items-start pb-2 border-b border-[#242633]">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    Activity: {activityTargetUser.display_name} (@{activityTargetUser.username})
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Member since {activityTargetUser.created_at?.split(' ')[0] || 'Recently'}
                  </p>
                </div>
                <button
                  onClick={() => setActivityTargetUser(null)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {activityLoading ? (
                <div className="py-12 text-center text-xs text-neutral-400">Loading user activity...</div>
              ) : activityData ? (
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {/* Summary Stat Cards */}
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="bg-[#14151b] p-3 rounded-2xl border border-[#252632]">
                      <span className="text-[10px] text-neutral-400 block font-medium">Meals Logged</span>
                      <span className="text-lg font-black text-emerald-400 font-mono">
                        {activityData.activity.mealLogsCount}
                      </span>
                    </div>
                    <div className="bg-[#14151b] p-3 rounded-2xl border border-[#252632]">
                      <span className="text-[10px] text-neutral-400 block font-medium">Water Logged</span>
                      <span className="text-lg font-black text-cyan-400 font-mono">
                        {(activityData.activity.waterTotalMl / 1000).toFixed(1)} L
                      </span>
                    </div>
                    <div className="bg-[#14151b] p-3 rounded-2xl border border-[#252632]">
                      <span className="text-[10px] text-neutral-400 block font-medium">Active Days</span>
                      <span className="text-lg font-black text-amber-400 font-mono">
                        {activityData.activity.activeDaysCount}
                      </span>
                    </div>
                  </div>

                  {/* Spectate Button */}
                  <button
                    onClick={() => {
                      if (onSpectateUser) onSpectateUser(activityTargetUser);
                      setActivityTargetUser(null);
                      onClose();
                    }}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Open & Spectate {activityTargetUser.display_name}'s Diary</span>
                  </button>

                  {/* Recent Meals List */}
                  <div>
                    <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      Recent Food Entries
                    </h4>

                    {activityData.activity.recentMeals.length === 0 ? (
                      <p className="text-xs text-neutral-500 py-4 text-center">No meal entries found yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {activityData.activity.recentMeals.map((m) => (
                          <div
                            key={m.id}
                            className="bg-[#14151b] p-2.5 rounded-xl border border-[#232430] flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-semibold text-white block">{m.food_name}</span>
                              <span className="text-[10px] text-neutral-400">
                                {m.date} • {m.meal_type.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-emerald-400 font-mono">{m.calories} kcal</span>
                              <span className="text-[10px] text-neutral-500 block">
                                C:{m.carbs} F:{m.fat} P:{m.protein}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* SUBMODAL: Add Shared Food with Auto-Calculated Serving Size */}
        {showAddFood && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#181920] rounded-3xl p-6 border border-[#2d2f3c] max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[#242633]">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-emerald-400" />
                  Add Shared Food
                </h3>
                <button onClick={() => setShowAddFood(false)} className="cursor-pointer text-neutral-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-neutral-400">
                Define the food's base serving size and nutritional contents. Serving sizes for participants will be automatically scaled based on these values.
              </p>

              <form onSubmit={handleCreateFood} className="space-y-3.5">
                <div>
                  <label className="text-xs text-neutral-300 block mb-1">Food Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Masala Dosa, Paneer Bhurji"
                    value={newFood.name}
                    onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                    className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-neutral-300 block mb-1">Brand / Style</label>
                    <input
                      type="text"
                      placeholder="e.g. Homemade, Restaurant"
                      value={newFood.brand}
                      onChange={(e) => setNewFood({ ...newFood, brand: e.target.value })}
                      className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-300 block mb-1">Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Breakfast, Curries"
                      value={newFood.category}
                      onChange={(e) => setNewFood({ ...newFood, category: e.target.value })}
                      className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Serving Size Definition */}
                <div className="bg-[#14151b] p-3 rounded-2xl border border-[#262832] space-y-2">
                  <span className="text-xs font-bold text-neutral-300 block">Base Serving Size</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">Serving Name</label>
                      <input
                        type="text"
                        placeholder="e.g. 1 plate, 1 bowl, 1 piece"
                        value={newFood.serving_name}
                        onChange={(e) => setNewFood({ ...newFood, serving_name: e.target.value })}
                        className="w-full bg-[#1e2029] border border-[#2d2f3c] rounded-xl px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">Weight / Volume (g/ml)</label>
                      <input
                        type="number"
                        placeholder="180"
                        value={newFood.serving_size_grams}
                        onChange={(e) => setNewFood({ ...newFood, serving_size_grams: e.target.value })}
                        className="w-full bg-[#1e2029] border border-[#2d2f3c] rounded-xl px-2.5 py-1.5 text-xs text-white"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Nutrition for this serving */}
                <div>
                  <span className="text-xs font-bold text-neutral-300 block mb-1.5">
                    Nutrition for this serving ({newFood.serving_name || '1 serving'} - {newFood.serving_size_grams || 100}g)
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Calories *</label>
                      <input
                        type="number"
                        placeholder="220"
                        value={newFood.calories}
                        onChange={(e) => setNewFood({ ...newFood, calories: e.target.value })}
                        className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-2 py-1.5 text-xs font-bold text-white font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#b388ff] block mb-1">Carb (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="30"
                        value={newFood.carbs}
                        onChange={(e) => setNewFood({ ...newFood, carbs: e.target.value })}
                        className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-2 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#ff7b72] block mb-1">Fat (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="8"
                        value={newFood.fat}
                        onChange={(e) => setNewFood({ ...newFood, fat: e.target.value })}
                        className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-2 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#ffd54f] block mb-1">Prot (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="12"
                        value={newFood.protein}
                        onChange={(e) => setNewFood({ ...newFood, protein: e.target.value })}
                        className="w-full bg-[#121318] border border-[#2d2f3c] rounded-xl px-2 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Auto-Calculated 100g Preview */}
                {newFood.calories && (
                  <div className="bg-[#14151b] p-2.5 rounded-xl border border-[#252632] text-[11px] text-neutral-400 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <Sparkles className="w-3.5 h-3.5" />
                      Auto-calculated per 100g:
                    </span>
                    <span className="font-mono text-white">
                      {calsPer100} kcal | C:{carbsPer100}g | F:{fatPer100}g | P:{proteinPer100}g
                    </span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddFood(false)}
                    className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold shadow-md cursor-pointer"
                  >
                    Save & Share Food
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
