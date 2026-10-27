// Client API service with relative routes for reverse proxy friendliness

const API_BASE = '/api';

export async function fetchDailyLogs(date) {
  try {
    const res = await fetch(`${API_BASE}/logs?date=${date}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch daily logs`);
    return await res.json();
  } catch (err) {
    console.warn('API fetchDailyLogs:', err.message);
    throw err;
  }
}

export async function logFoodItem(entry) {
  const res = await fetch(`${API_BASE}/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  });
  if (!res.ok) throw new Error('Failed to log food');
  return res.json();
}

export async function quickAddCalories(entry) {
  const res = await fetch(`${API_BASE}/logs/quick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  });
  if (!res.ok) throw new Error('Failed to quick add calories');
  return res.json();
}

export async function updateLogEntry(id, data) {
  const res = await fetch(`${API_BASE}/logs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update log');
  return res.json();
}

export async function deleteLogEntry(id) {
  const res = await fetch(`${API_BASE}/logs/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete log entry');
  return res.json();
}

export async function searchFoods(query) {
  try {
    const res = await fetch(`${API_BASE}/foods/search?q=${encodeURIComponent(query || '')}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to search foods`);
    return await res.json();
  } catch (err) {
    console.warn('API searchFoods:', err.message);
    return { query: query || '', results: [], count: 0, hasOnlineResults: false, error: err.message };
  }
}

export async function fetchFavorites() {
  try {
    const res = await fetch(`${API_BASE}/foods/favorites`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch favorites`);
    return await res.json();
  } catch (err) {
    console.warn('API fetchFavorites:', err.message);
    return [];
  }
}

export async function toggleFavorite(id) {
  const res = await fetch(`${API_BASE}/foods/favorite/${id}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to toggle favorite');
  return res.json();
}

export async function fetchCustomFoods() {
  try {
    const res = await fetch(`${API_BASE}/foods/custom`);
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(food)
  });
  if (!res.ok) throw new Error('Failed to create custom food');
  return res.json();
}

export async function lookupBarcode(barcode) {
  try {
    const res = await fetch(`${API_BASE}/foods/barcode/${encodeURIComponent(barcode)}`);
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

export async function fetchNutritionBreakdown(date) {
  try {
    const res = await fetch(`${API_BASE}/nutrition?date=${date}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch nutrition`);
    return await res.json();
  } catch (err) {
    console.warn('API fetchNutritionBreakdown:', err.message);
    return { date, nutrients: [] };
  }
}

export async function fetchAnalyticsTrends(period, date) {
  try {
    const res = await fetch(`${API_BASE}/analytics/trends?period=${period}&date=${date}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch analytics`);
    return await res.json();
  } catch (err) {
    console.warn('API fetchAnalyticsTrends:', err.message);
    return { dailyStats: [], averageCalories: 0, targetCalories: 2138, mealAverages: {} };
  }
}

export async function fetchHealthStats(date) {
  try {
    const res = await fetch(`${API_BASE}/health?date=${date}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch health stats`);
    return await res.json();
  } catch (err) {
    console.warn('API fetchHealthStats:', err.message);
    return { date, water: { total_ml: 0, target_ml: 2500, percentage: 0 }, weight: { current_kg: 70, target_kg: 70 } };
  }
}

export async function logWater(date, amount_ml) {
  const res = await fetch(`${API_BASE}/health/water`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, amount_ml })
  });
  if (!res.ok) throw new Error('Failed to log water');
  return res.json();
}

export async function logWeight(date, weight_kg) {
  const res = await fetch(`${API_BASE}/health/weight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, weight_kg })
  });
  if (!res.ok) throw new Error('Failed to log weight');
  return res.json();
}

export async function fetchSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(settings) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
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
