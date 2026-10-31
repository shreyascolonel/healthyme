// Client API service with authentication & reverse proxy friendliness

const API_BASE = '/api';

export function getAuthToken() {
  return localStorage.getItem('healthyme_token') || '';
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('healthyme_token', token);
  } else {
    localStorage.removeItem('healthyme_token');
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('healthyme_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) {
    localStorage.setItem('healthyme_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('healthyme_user');
  }
}

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/* ================= AUTH API ================= */

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');

  setAuthToken(data.token);
  setStoredUser(data.user);
  return data;
}

export async function changePassword(new_password, confirm_password) {
  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ new_password, confirm_password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to change password');

  if (data.user) {
    setStoredUser(data.user);
  }
  return data;
}

export async function fetchCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      if (res.status === 401) {
        setAuthToken(null);
        setStoredUser(null);
      }
      return null;
    }
    const data = await res.json();
    setStoredUser(data.user);
    return data.user;
  } catch {
    return getStoredUser();
  }
}

export async function logout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
  } catch {}
  setAuthToken(null);
  setStoredUser(null);
}

/* ================= ADMIN API ================= */

export async function fetchAdminUsers() {
  const res = await fetch(`${API_BASE}/admin/users`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
  return data;
}

export async function createAdminUser(userData) {
  const res = await fetch(`${API_BASE}/admin/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(userData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create user');
  return data;
}

export async function resetUserPassword(userId, temp_password) {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/reset-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ temp_password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to reset password');
  return data;
}

export async function deleteAdminUser(userId) {
  const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete user');
  return data;
}

export async function updateUserPrivileges(userId, is_admin) {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/privileges`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ is_admin })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update privileges');
  return data;
}

export async function fetchUserActivity(userId) {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/activity`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch user activity');
  return data;
}

export async function createAdminFood(foodData) {
  const res = await fetch(`${API_BASE}/admin/foods`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(foodData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to add shared food');
  return data;
}

export async function fetchAdminFoods() {
  const res = await fetch(`${API_BASE}/admin/foods`, {
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch admin foods');
  return data;
}

export async function deleteAdminFood(foodId) {
  const res = await fetch(`${API_BASE}/admin/foods/${foodId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete food');
  return data;
}

/* ================= LOGS & NUTRITION API ================= */

export async function fetchDailyLogs(date, spectateUserId = null) {
  try {
    const spectateParam = spectateUserId ? `&spectate_user_id=${spectateUserId}` : '';
    const res = await fetch(`${API_BASE}/logs?date=${date}${spectateParam}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch daily logs`);
    return await res.json();
  } catch (err) {
    console.warn('API fetchDailyLogs:', err.message);
    throw err;
  }
}

export async function logFoodItem(entry, spectateUserId = null) {
  const sId = spectateUserId || entry.spectate_user_id;
  const spectateParam = sId ? `?spectate_user_id=${sId}` : '';
  const res = await fetch(`${API_BASE}/logs${spectateParam}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ...entry, spectate_user_id: sId })
  });
  if (!res.ok) throw new Error('Failed to log food');
  return res.json();
}

export async function quickAddCalories(entry, spectateUserId = null) {
  const sId = spectateUserId || entry.spectate_user_id;
  const spectateParam = sId ? `?spectate_user_id=${sId}` : '';
  const res = await fetch(`${API_BASE}/logs/quick${spectateParam}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ...entry, spectate_user_id: sId })
  });
  if (!res.ok) throw new Error('Failed to quick add calories');
  return res.json();
}

export async function updateLogEntry(id, data) {
  const res = await fetch(`${API_BASE}/logs/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update log');
  return res.json();
}

export async function deleteLogEntry(id) {
  const res = await fetch(`${API_BASE}/logs/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete log entry');
  return res.json();
}

/* ================= FOODS & SEARCH API ================= */

export async function searchFoods(query) {
  try {
    const res = await fetch(`${API_BASE}/foods/search?q=${encodeURIComponent(query || '')}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to search foods`);
    return await res.json();
  } catch (err) {
    console.warn('API searchFoods:', err.message);
    return { query: query || '', results: [], count: 0, hasOnlineResults: false, error: err.message };
  }
}

export async function fetchFavorites() {
  try {
    const res = await fetch(`${API_BASE}/foods/favorites`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch favorites`);
    return await res.json();
  } catch (err) {
    console.warn('API fetchFavorites:', err.message);
    return [];
  }
}

export async function toggleFavorite(id) {
  const res = await fetch(`${API_BASE}/foods/favorite/${id}`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to toggle favorite');
  return res.json();
}

export async function fetchCustomFoods() {
  try {
    const res = await fetch(`${API_BASE}/foods/custom`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch custom foods`);
    return await res.json();
  } catch (err) {
    console.warn('API fetchCustomFoods:', err.message);
    return [];
  }
}

export async function createCustomFood(food) {
  const res = await fetch(`${API_BASE}/foods/custom`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(food)
  });
  if (!res.ok) throw new Error('Failed to create custom food');
  return res.json();
}

export async function lookupBarcode(barcode) {
  try {
    const res = await fetch(`${API_BASE}/foods/barcode/${encodeURIComponent(barcode)}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error('Barcode lookup failed');
    }
    return await res.json();
  } catch (err) {
    console.warn('API lookupBarcode:', err.message);
    return null;
  }
}

/* ================= NUTRITION & TRENDS API ================= */

export async function fetchNutritionBreakdown(date, spectateUserId = null) {
  try {
    const spectateParam = spectateUserId ? `&spectate_user_id=${spectateUserId}` : '';
    const res = await fetch(`${API_BASE}/nutrition?date=${date}${spectateParam}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch nutrition`);
    return await res.json();
  } catch (err) {
    console.warn('API fetchNutritionBreakdown:', err.message);
    return { date, nutrients: [] };
  }
}

export async function fetchAnalyticsTrends(period, date, spectateUserId = null) {
  try {
    const spectateParam = spectateUserId ? `&spectate_user_id=${spectateUserId}` : '';
    const res = await fetch(`${API_BASE}/analytics/trends?period=${period}&date=${date}${spectateParam}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch analytics`);
    return await res.json();
  } catch (err) {
    console.warn('API fetchAnalyticsTrends:', err.message);
    return { dailyStats: [], averageCalories: 0, targetCalories: 2138, mealAverages: {} };
  }
}

export async function fetchHealthStats(date, spectateUserId = null) {
  try {
    const spectateParam = spectateUserId ? `&spectate_user_id=${spectateUserId}` : '';
    const res = await fetch(`${API_BASE}/health?date=${date}${spectateParam}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch health stats`);
    return await res.json();
  } catch (err) {
    console.warn('API fetchHealthStats:', err.message);
    return { date, water: { total_ml: 0, target_ml: 2500, percentage: 0 }, weight: { current_kg: 70, target_kg: 70 } };
  }
}

export async function logWater(date, amount_ml, spectateUserId = null) {
  const spectateParam = spectateUserId ? `?spectate_user_id=${spectateUserId}` : '';
  const res = await fetch(`${API_BASE}/health/water${spectateParam}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ date, amount_ml, spectate_user_id: spectateUserId })
  });
  if (!res.ok) throw new Error('Failed to log water');
  return res.json();
}

export async function logWeight(date, weight_kg, spectateUserId = null) {
  const spectateParam = spectateUserId ? `?spectate_user_id=${spectateUserId}` : '';
  const res = await fetch(`${API_BASE}/health/weight${spectateParam}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ date, weight_kg, spectate_user_id: spectateUserId })
  });
  if (!res.ok) throw new Error('Failed to log weight');
  return res.json();
}

export async function fetchSettings() {
  const res = await fetch(`${API_BASE}/settings`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(settings) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(settings)
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export async function fetchHealthCheck() {
  const res = await fetch(`${API_BASE}/healthcheck`);
  if (!res.ok) throw new Error('Server unreachable');
  return res.json();
}
