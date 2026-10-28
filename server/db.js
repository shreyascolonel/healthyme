import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_FOODS, getInitialSeedLogs } from './seedData.js';
import { hashPassword, DEFAULT_PASSWORD } from './cryptoUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'healthyme.sqlite');
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for high performance
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

function addColumnIfNotExists(table, colName, colDef) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!cols.some(c => c.name === colName)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${colName} ${colDef};`);
    }
  } catch (err) {
    console.warn(`Could not check/add column ${colName} to ${table}:`, err.message);
  }
}

export function initDatabase() {
  // 1. Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      must_change_password INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 2. Sessions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  `);

  // 3. User Profile Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      calorie_target INTEGER NOT NULL DEFAULT 2138,
      calorie_target_min INTEGER NOT NULL DEFAULT 1924,
      calorie_target_max INTEGER NOT NULL DEFAULT 2351,
      carb_target_grams REAL NOT NULL DEFAULT 294,
      fat_target_grams REAL NOT NULL DEFAULT 59,
      protein_target_grams REAL NOT NULL DEFAULT 107,
      carb_ratio_target REAL NOT NULL DEFAULT 55.0,
      fat_ratio_target REAL NOT NULL DEFAULT 25.0,
      protein_ratio_target REAL NOT NULL DEFAULT 20.0,
      water_target_ml INTEGER NOT NULL DEFAULT 2500,
      weight_target_kg REAL NOT NULL DEFAULT 70.0,
      enabled_meals TEXT NOT NULL DEFAULT '["breakfast","lunch","dinner","morning_snack","afternoon_snack","evening_snack"]',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  addColumnIfNotExists('user_profile', 'user_id', 'INTEGER');
  addColumnIfNotExists('user_profile', 'gender', "TEXT DEFAULT 'female'");
  addColumnIfNotExists('user_profile', 'age', "INTEGER DEFAULT 28");
  addColumnIfNotExists('user_profile', 'height_cm', "REAL DEFAULT 162.0");
  addColumnIfNotExists('user_profile', 'current_weight_kg', "REAL DEFAULT 68.0");
  addColumnIfNotExists('user_profile', 'activity_level', "TEXT DEFAULT 'sedentary'");
  addColumnIfNotExists('user_profile', 'goal_type', "TEXT DEFAULT 'lose_standard'");
  addColumnIfNotExists('user_profile', 'target_mode', "TEXT DEFAULT 'auto'");
  addColumnIfNotExists('user_profile', 'notifications_enabled', "INTEGER DEFAULT 0");
  addColumnIfNotExists('user_profile', 'meal_reminder_times', "TEXT DEFAULT '{\"breakfast\":\"08:30\",\"lunch\":\"13:00\",\"dinner\":\"20:00\"}'");
  addColumnIfNotExists('user_profile', 'water_reminder_interval_mins', "INTEGER DEFAULT 120");

  // 4. Foods Table (local + OpenFoodFacts cache + custom shared foods)
  db.exec(`
    CREATE TABLE IF NOT EXISTS foods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT,
      category TEXT,
      serving_size TEXT,
      serving_size_grams REAL DEFAULT 100,
      serving_unit TEXT DEFAULT 'g',
      calories REAL NOT NULL,
      carbs REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      protein REAL NOT NULL DEFAULT 0,
      fiber REAL NOT NULL DEFAULT 0,
      sugar REAL NOT NULL DEFAULT 0,
      saturated_fat REAL NOT NULL DEFAULT 0,
      sodium REAL NOT NULL DEFAULT 0,
      potassium REAL NOT NULL DEFAULT 0,
      calcium REAL NOT NULL DEFAULT 0,
      iron REAL NOT NULL DEFAULT 0,
      vitamin_a REAL NOT NULL DEFAULT 0,
      vitamin_c REAL NOT NULL DEFAULT 0,
      image_url TEXT,
      source TEXT DEFAULT 'custom',
      is_favorite INTEGER DEFAULT 0,
      is_custom INTEGER DEFAULT 0,
      created_by_user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  addColumnIfNotExists('foods', 'created_by_user_id', 'INTEGER');

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_foods_name ON foods (name);
    CREATE INDEX IF NOT EXISTS idx_foods_favorite ON foods (is_favorite);
  `);

  // 5. Meal Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS meal_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      food_id TEXT,
      food_name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1.0,
      unit TEXT DEFAULT 'serving',
      calories REAL NOT NULL,
      carbs REAL NOT NULL DEFAULT 0,
      fat REAL NOT NULL DEFAULT 0,
      protein REAL NOT NULL DEFAULT 0,
      fiber REAL NOT NULL DEFAULT 0,
      sugar REAL NOT NULL DEFAULT 0,
      saturated_fat REAL NOT NULL DEFAULT 0,
      sodium REAL NOT NULL DEFAULT 0,
      potassium REAL NOT NULL DEFAULT 0,
      calcium REAL NOT NULL DEFAULT 0,
      iron REAL NOT NULL DEFAULT 0,
      vitamin_a REAL NOT NULL DEFAULT 0,
      vitamin_c REAL NOT NULL DEFAULT 0,
      image_url TEXT,
      logged_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  addColumnIfNotExists('meal_logs', 'user_id', 'INTEGER NOT NULL DEFAULT 1');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON meal_logs (user_id, date);
  `);

  // 6. Water Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS water_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1,
      date TEXT NOT NULL,
      amount_ml INTEGER NOT NULL,
      logged_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  addColumnIfNotExists('water_logs', 'user_id', 'INTEGER NOT NULL DEFAULT 1');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_water_logs_user_date ON water_logs (user_id, date);
  `);

  // 7. Weight Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS weight_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1,
      date TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      logged_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  addColumnIfNotExists('weight_logs', 'user_id', 'INTEGER NOT NULL DEFAULT 1');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs (user_id, date);
  `);

  // Seed default users if users table is empty
  const defaultPasswordHash = hashPassword(DEFAULT_PASSWORD);

  // Ensure Admin user
  let admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!admin) {
    const res = db.prepare(`
      INSERT INTO users (username, password_hash, display_name, is_admin, must_change_password)
      VALUES (?, ?, ?, 1, 1)
    `).run('admin', defaultPasswordHash, 'Administrator');
    admin = { id: Number(res.lastInsertRowid) };
  }

  // Ensure Vinutha user
  let vinutha = db.prepare('SELECT id FROM users WHERE username = ?').get('vinutha');
  if (!vinutha) {
    const res = db.prepare(`
      INSERT INTO users (username, password_hash, display_name, is_admin, must_change_password)
      VALUES (?, ?, ?, 1, 1)
    `).run('vinutha', defaultPasswordHash, 'Vinutha');
    vinutha = { id: Number(res.lastInsertRowid) };
  }

  // Migrate existing data to Vinutha as requested:
  // "Existing data will be migrated to the user 'vinutha'"
  if (vinutha && vinutha.id) {
    try {
      db.prepare('UPDATE meal_logs SET user_id = ? WHERE user_id IS NULL OR user_id = 1').run(vinutha.id);
      db.prepare('UPDATE water_logs SET user_id = ? WHERE user_id IS NULL OR user_id = 1').run(vinutha.id);
      db.prepare('UPDATE weight_logs SET user_id = ? WHERE user_id IS NULL OR user_id = 1').run(vinutha.id);
      
      // Attribute all seed / custom foods to Vinutha so they show up under "My foods"
      db.prepare("UPDATE foods SET is_custom = 1, created_by_user_id = ? WHERE source = 'seed' OR created_by_user_id IS NULL").run(vinutha.id);
      
      const vProfile = db.prepare('SELECT id FROM user_profile WHERE user_id = ?').get(vinutha.id);
      if (!vProfile) {
        // Link existing default profile to vinutha
        db.prepare('UPDATE user_profile SET user_id = ? WHERE id = 1 AND (user_id IS NULL OR user_id = 1)').run(vinutha.id);
      }
    } catch (e) {
      console.warn('Migration to Vinutha warning:', e.message);
    }
  }

  // Ensure Admin has their profile
  if (admin && admin.id) {
    const adminProfile = db.prepare('SELECT id FROM user_profile WHERE user_id = ?').get(admin.id);
    if (!adminProfile) {
      db.prepare(`
        INSERT INTO user_profile (user_id, calorie_target, calorie_target_min, calorie_target_max, carb_target_grams, fat_target_grams, protein_target_grams, carb_ratio_target, fat_ratio_target, protein_ratio_target, water_target_ml, weight_target_kg)
        VALUES (?, 2138, 1924, 2351, 294, 59, 107, 55.0, 25.0, 20.0, 2500, 70.0)
      `).run(admin.id);
    }
  }

  // Ensure Vinutha has their profile
  if (vinutha && vinutha.id) {
    const vinuthaProfile = db.prepare('SELECT id FROM user_profile WHERE user_id = ?').get(vinutha.id);
    if (!vinuthaProfile) {
      db.prepare(`
        INSERT INTO user_profile (user_id, calorie_target, calorie_target_min, calorie_target_max, carb_target_grams, fat_target_grams, protein_target_grams, carb_ratio_target, fat_ratio_target, protein_ratio_target, water_target_ml, weight_target_kg)
        VALUES (?, 2138, 1924, 2351, 294, 59, 107, 55.0, 25.0, 20.0, 2500, 70.0)
      `).run(vinutha.id);
    }
  }

  // Seed standard nutritious foods if table is empty
  const foodCountRow = db.prepare('SELECT count(*) as count FROM foods').get();
  if (foodCountRow.count === 0) {
    const insertFood = db.prepare(`
      INSERT INTO foods (id, name, brand, category, serving_size, serving_size_grams, serving_unit, calories, carbs, fat, protein, fiber, sugar, saturated_fat, sodium, potassium, calcium, iron, vitamin_a, vitamin_c, source, is_favorite, is_custom)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const food of SEED_FOODS) {
      insertFood.run(
        food.id,
        food.name,
        food.brand || '',
        food.category || 'General',
        food.serving_size || '100 g',
        food.serving_size_grams || 100,
        food.serving_unit || 'g',
        food.calories,
        food.carbs,
        food.fat,
        food.protein,
        food.fiber,
        food.sugar,
        food.saturated_fat,
        food.sodium,
        food.potassium,
        food.calcium,
        food.iron,
        food.vitamin_a,
        food.vitamin_c,
        food.source || 'seed',
        food.is_favorite || 0,
        0
      );
    }
  }
}

export function getUserProfile(userId) {
  let profile = db.prepare('SELECT * FROM user_profile WHERE user_id = ?').get(userId);
  if (!profile) {
    db.prepare(`
      INSERT INTO user_profile (user_id, calorie_target, calorie_target_min, calorie_target_max, carb_target_grams, fat_target_grams, protein_target_grams, carb_ratio_target, fat_ratio_target, protein_ratio_target, water_target_ml, weight_target_kg)
      VALUES (?, 2138, 1924, 2351, 294, 59, 107, 55.0, 25.0, 20.0, 2500, 70.0)
    `).run(userId);
    profile = db.prepare('SELECT * FROM user_profile WHERE user_id = ?').get(userId);
  }
  return profile;
}

export default db;
