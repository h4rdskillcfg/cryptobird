const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.dirname(process.env.DB_PATH || './database/crypto_bird.db');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || './database/crypto_bird.db';
const db = new sqlite3.Database(dbPath);

console.log('🚀 Initializing database...');

db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT UNIQUE NOT NULL,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_premium BOOLEAN DEFAULT 0,
        referrer_id TEXT,
        total_score INTEGER DEFAULT 0,
        total_games INTEGER DEFAULT 0
    )`);

    // Game sessions table
    db.run(`CREATE TABLE IF NOT EXISTS game_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        telegram_id TEXT NOT NULL,
        score INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        coins_earned INTEGER DEFAULT 0,
        duration INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Game statistics table
    db.run(`CREATE TABLE IF NOT EXISTS game_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT NOT NULL,
        date DATE DEFAULT (date('now')),
        games_played INTEGER DEFAULT 0,
        total_score INTEGER DEFAULT 0,
        total_coins INTEGER DEFAULT 0,
        best_score INTEGER DEFAULT 0,
        total_time INTEGER DEFAULT 0,
        UNIQUE(telegram_id, date)
    )`);

    // Bot interactions table
    db.run(`CREATE TABLE IF NOT EXISTS bot_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT NOT NULL,
        command TEXT,
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Achievements table
    db.run(`CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT NOT NULL,
        achievement_type TEXT NOT NULL,
        achievement_name TEXT NOT NULL,
        description TEXT,
        earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(telegram_id, achievement_type)
    )`);

    // Referrals table
    db.run(`CREATE TABLE IF NOT EXISTS referrals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        referrer_telegram_id TEXT NOT NULL,
        referred_telegram_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        bonus_given BOOLEAN DEFAULT 0,
        UNIQUE(referred_telegram_id)
    )`);

    console.log('✅ Database tables created successfully!');
});

db.close((err) => {
    if (err) {
        console.error('❌ Error closing database:', err);
    } else {
        console.log('✅ Database connection closed.');
    }
});