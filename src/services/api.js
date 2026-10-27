// Client API service with relative routes for reverse proxy friendliness

const API_BASE = '/api';

export async function fetchDailyLogs(date) {
  const res = await fetch(`${API_BASE}/logs?date=${date}`);
  if (!res.ok) throw new Error('Failed to fetch daily logs');
  return res.json();
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
  const res = await fetch(`${API_BASE}/foods/search?q=${encodeURIComponent(query || '')}`);
  if (!res.ok) throw new Error('Failed to search foods');
  return res.json();
}

export async function fetchFavorites() {
  const res = await fetch(`${API_BASE}/foods/favorites`);
  if (!res.ok) throw new Error('Failed to fetch favorites');
  return res.json();
}

export async function toggleFavorite(id) {
  const res = await fetch(`${API_BASE}/foods/favorite/${id}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to toggle favorite');
  return res.json();
}

export async function fetchCustomFoods() {
  const res = await fetch(`${API_BASE}/foods/custom`);
  if (!res.ok) throw new Error('Failed to fetch custom foods');
  return res.json();
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
  const res = await fetch(`${API_BASE}/foods/barcode/${encodeURIComponent(barcode)}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Barcode lookup failed');
  }
  return res.json();
}

export async function fetchNutritionBreakdown(date) {
  const res = await fetch(`${API_BASE}/nutrition?date=${date}`);
  if (!res.ok) throw new Error('Failed to fetch nutrition breakdown');
  return res.json();
}

export async function fetchAnalyticsTrends(period, date) {
  const res = await fetch(`${API_BASE}/analytics/trends?period=${period}&date=${date}`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function fetchHealthStats(date) {
  const res = await fetch(`${API_BASE}/health?date=${date}`);
  if (!res.ok) throw new Error('Failed to fetch health stats');
  return res.json();
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
