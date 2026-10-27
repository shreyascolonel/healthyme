import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_FOODS, getInitialSeedLogs } from './seedData.js';

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

export function initDatabase() {
  // 1. User Profile Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY,
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

  // Ensure default profile exists
  const existingProfile = db.prepare('SELECT id FROM user_profile WHERE id = 1').get();
  if (!existingProfile) {
    db.prepare(`
      INSERT INTO user_profile (id, calorie_target, calorie_target_min, calorie_target_max, carb_target_grams, fat_target_grams, protein_target_grams, carb_ratio_target, fat_ratio_target, protein_ratio_target, water_target_ml, weight_target_kg)
      VALUES (1, 2138, 1924, 2351, 294, 59, 107, 55.0, 25.0, 20.0, 2500, 70.0)
    `).run();
  }

  // 2. Foods Table (local + OpenFoodFacts cache + custom foods)
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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Index for rapid food search
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_foods_name ON foods (name);
    CREATE INDEX IF NOT EXISTS idx_foods_favorite ON foods (is_favorite);
  `);

  // 3. Meal Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS meal_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_meal_logs_date ON meal_logs (date);
    CREATE INDEX IF NOT EXISTS idx_meal_logs_date_meal ON meal_logs (date, meal_type);
  `);

  // 4. Water Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS water_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      amount_ml INTEGER NOT NULL,
      logged_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_water_logs_date ON water_logs (date);
  `);

  // 5. Weight Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS weight_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      logged_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_weight_logs_date ON weight_logs (date);
  `);

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

  // Pre-seed today and recent days if no logs exist
  const logCountRow = db.prepare('SELECT count(*) as count FROM meal_logs').get();
  if (logCountRow.count === 0) {
    const today = new Date().toISOString().split('T')[0];
    const initialLogs = getInitialSeedLogs(today);
    const insertLog = db.prepare(`
      INSERT INTO meal_logs (date, meal_type, food_id, food_name, quantity, unit, calories, carbs, fat, protein, fiber, sugar, saturated_fat, sodium, potassium, calcium, iron, vitamin_a, vitamin_c)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const log of initialLogs) {
      insertLog.run(
        log.date,
        log.meal_type,
        log.food_id,
        log.food_name,
        log.quantity,
        log.unit,
        log.calories,
        log.carbs,
        log.fat,
        log.protein,
        log.fiber,
        log.sugar,
        log.saturated_fat,
        log.sodium,
        log.potassium,
        log.calcium,
        log.iron,
        log.vitamin_a,
        log.vitamin_c
      );
    }

    // Seed water logs for today
    db.prepare('INSERT INTO water_logs (date, amount_ml) VALUES (?, ?)').run(today, 1750);
    // Seed weight log for today
    db.prepare('INSERT INTO weight_logs (date, weight_kg) VALUES (?, ?)').run(today, 68.5);

    // Also seed a couple of previous days for analytics chart
    for (let i = 1; i <= 6; i++) {
      const prevDate = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      const calVariation = [1850, 2100, 1980, 2250, 1650, 2040][i - 1];
      const carbVar = (calVariation * 0.55) / 4;
      const fatVar = (calVariation * 0.25) / 9;
      const protVar = (calVariation * 0.20) / 4;

      insertLog.run(
        prevDate,
        'breakfast',
        'seed_oats_upma',
        'Healthy Breakfast Mix',
        1,
        'serving',
        Math.round(calVariation * 0.3),
        Math.round(carbVar * 0.3),
        Math.round(fatVar * 0.3),
        Math.round(protVar * 0.3),
        6,
        4,
        2,
        350,
        300,
        100,
        3,
        40,
        30
      );

      insertLog.run(
        prevDate,
        'lunch',
        'seed_chicken_breast',
        'Nutritious Lunch Plate',
        1,
        'serving',
        Math.round(calVariation * 0.4),
        Math.round(carbVar * 0.4),
        Math.round(fatVar * 0.4),
        Math.round(protVar * 0.4),
        8,
        3,
        3,
        500,
        450,
        150,
        4,
        60,
        45
      );

      insertLog.run(
        prevDate,
        'dinner',
        'seed_dal_tadka',
        'Light Dinner & Salad',
        1,
        'serving',
        Math.round(calVariation * 0.3),
        Math.round(carbVar * 0.3),
        Math.round(fatVar * 0.3),
        Math.round(protVar * 0.3),
        7,
        5,
        2,
        400,
        380,
        90,
        2.5,
        50,
        35
      );

      db.prepare('INSERT INTO water_logs (date, amount_ml) VALUES (?, ?)').run(prevDate, 1500 + i * 150);
      db.prepare('INSERT INTO weight_logs (date, weight_kg) VALUES (?, ?)').run(prevDate, 68.8 - i * 0.05);
    }
  }
}

export default db;
