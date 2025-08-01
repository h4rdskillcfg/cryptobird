const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const CryptoBirdBot = require('./bot');

class GameServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.db = new sqlite3.Database(process.env.DB_PATH || './database/crypto_bird.db');
        
        this.setupMiddleware();
        this.setupRoutes();
        this.initBot();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org", "https://cdn.jsdelivr.net"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "https://api.telegram.org"]
                }
            }
        }));
        
        this.app.use(compression());
        this.app.use(cors());
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        });
        this.app.use('/api/', limiter);

        // Static files
        this.app.use(express.static('public'));
        this.app.use('/crm', express.static('crm'));
    }

    setupRoutes() {
        // Game API routes
        this.setupGameAPI();
        
        // CRM routes
        this.setupCRMRoutes();
        
        // Serve game
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });
    }

    setupGameAPI() {
        // Save game session
        this.app.post('/api/game/save-session', [
            body('telegram_id').isString().notEmpty(),
            body('score').isInt({ min: 0 }),
            body('level').isInt({ min: 1 }),
            body('coins_earned').isInt({ min: 0 }),
            body('duration').isInt({ min: 0 })
        ], async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { telegram_id, score, level, coins_earned, duration } = req.body;

            try {
                // Save game session
                await this.saveGameSession(telegram_id, score, level, coins_earned, duration);
                
                // Update daily stats
                await this.updateDailyStats(telegram_id, score, coins_earned);
                
                // Check for achievements
                const achievements = await this.checkAchievements(telegram_id, score);
                
                res.json({ 
                    success: true, 
                    achievements: achievements,
                    message: 'Game session saved successfully' 
                });
            } catch (error) {
                console.error('Error saving game session:', error);
                res.status(500).json({ error: 'Failed to save game session' });
            }
        });

        // Get user stats
        this.app.get('/api/user/:telegram_id/stats', async (req, res) => {
            const { telegram_id } = req.params;

            try {
                const stats = await this.getUserStats(telegram_id);
                res.json(stats);
            } catch (error) {
                console.error('Error fetching user stats:', error);
                res.status(500).json({ error: 'Failed to fetch user stats' });
            }
        });

        // Get leaderboard
        this.app.get('/api/leaderboard', async (req, res) => {
            const limit = parseInt(req.query.limit) || 10;

            try {
                const leaderboard = await this.getLeaderboard(limit);
                res.json(leaderboard);
            } catch (error) {
                console.error('Error fetching leaderboard:', error);
                res.status(500).json({ error: 'Failed to fetch leaderboard' });
            }
        });

        // Get user achievements
        this.app.get('/api/user/:telegram_id/achievements', async (req, res) => {
            const { telegram_id } = req.params;

            try {
                const achievements = await this.getUserAchievements(telegram_id);
                res.json(achievements);
            } catch (error) {
                console.error('Error fetching achievements:', error);
                res.status(500).json({ error: 'Failed to fetch achievements' });
            }
        });
    }

    setupCRMRoutes() {
        // CRM Dashboard
        this.app.get('/crm', (req, res) => {
            res.sendFile(path.join(__dirname, 'crm', 'index.html'));
        });

        // CRM API - Overview stats
        this.app.get('/api/crm/overview', async (req, res) => {
            try {
                const stats = await this.getCRMOverview();
                res.json(stats);
            } catch (error) {
                console.error('Error fetching CRM overview:', error);
                res.status(500).json({ error: 'Failed to fetch overview' });
            }
        });

        // CRM API - Users list
        this.app.get('/api/crm/users', async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const offset = (page - 1) * limit;

            try {
                const users = await this.getCRMUsers(limit, offset);
                res.json(users);
            } catch (error) {
                console.error('Error fetching CRM users:', error);
                res.status(500).json({ error: 'Failed to fetch users' });
            }
        });

        // CRM API - Game sessions
        this.app.get('/api/crm/sessions', async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 100;
            const offset = (page - 1) * limit;

            try {
                const sessions = await this.getCRMSessions(limit, offset);
                res.json(sessions);
            } catch (error) {
                console.error('Error fetching CRM sessions:', error);
                res.status(500).json({ error: 'Failed to fetch sessions' });
            }
        });

        // CRM API - Analytics data
        this.app.get('/api/crm/analytics', async (req, res) => {
            const days = parseInt(req.query.days) || 30;

            try {
                const analytics = await this.getCRMAnalytics(days);
                res.json(analytics);
            } catch (error) {
                console.error('Error fetching CRM analytics:', error);
                res.status(500).json({ error: 'Failed to fetch analytics' });
            }
        });
    }

    // Database methods
    async saveGameSession(telegram_id, score, level, coins_earned, duration) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO game_sessions (telegram_id, score, level, coins_earned, duration) 
                 VALUES (?, ?, ?, ?, ?)`,
                [telegram_id, score, level, coins_earned, duration],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async updateDailyStats(telegram_id, score, coins_earned) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO game_stats (telegram_id, games_played, total_score, total_coins, best_score, total_time)
                 VALUES (?, 1, ?, ?, ?, 0)
                 ON CONFLICT(telegram_id, date) DO UPDATE SET
                 games_played = games_played + 1,
                 total_score = total_score + ?,
                 total_coins = total_coins + ?,
                 best_score = MAX(best_score, ?)`,
                [telegram_id, score, coins_earned, score, score, coins_earned, score],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    async checkAchievements(telegram_id, score) {
        const achievements = [];
        
        // First game achievement
        const firstGame = await this.checkFirstGameAchievement(telegram_id);
        if (firstGame) achievements.push(firstGame);

        // Score achievements
        const scoreAchievements = await this.checkScoreAchievements(telegram_id, score);
        achievements.push(...scoreAchievements);

        // Games count achievements
        const gamesAchievements = await this.checkGamesCountAchievements(telegram_id);
        achievements.push(...gamesAchievements);

        return achievements;
    }

    async checkFirstGameAchievement(telegram_id) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT COUNT(*) as count FROM game_sessions WHERE telegram_id = ?`,
                [telegram_id],
                (err, result) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (result.count === 1) {
                        // Award first game achievement
                        this.db.run(
                            `INSERT OR IGNORE INTO achievements 
                             (telegram_id, achievement_type, achievement_name, description) 
                             VALUES (?, ?, ?, ?)`,
                            [telegram_id, 'first_game', 'Первая игра', 'Сыграли в Crypto Bird впервые!'],
                            (err) => {
                                if (err) reject(err);
                                else resolve({
                                    type: 'first_game',
                                    name: 'Первая игра',
                                    description: 'Сыграли в Crypto Bird впервые!'
                                });
                            }
                        );
                    } else {
                        resolve(null);
                    }
                }
            );
        });
    }

    async checkScoreAchievements(telegram_id, score) {
        const achievements = [];
        const milestones = [
            { score: 100, name: 'Новичок', desc: 'Набрали 100 очков' },
            { score: 500, name: 'Опытный игрок', desc: 'Набрали 500 очков' },
            { score: 1000, name: 'Мастер', desc: 'Набрали 1000 очков' },
            { score: 2500, name: 'Эксперт', desc: 'Набрали 2500 очков' },
            { score: 5000, name: 'Легенда', desc: 'Набрали 5000 очков' }
        ];

        for (const milestone of milestones) {
            if (score >= milestone.score) {
                const achievement = await this.awardAchievement(
                    telegram_id, 
                    `score_${milestone.score}`, 
                    milestone.name, 
                    milestone.desc
                );
                if (achievement) achievements.push(achievement);
            }
        }

        return achievements;
    }

    async checkGamesCountAchievements(telegram_id) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT COUNT(*) as count FROM game_sessions WHERE telegram_id = ?`,
                [telegram_id],
                async (err, result) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const achievements = [];
                    const count = result.count;
                    const milestones = [
                        { count: 10, name: 'Постоянный игрок', desc: 'Сыграли 10 игр' },
                        { count: 50, name: 'Фанат игры', desc: 'Сыграли 50 игр' },
                        { count: 100, name: 'Преданный игрок', desc: 'Сыграли 100 игр' }
                    ];

                    for (const milestone of milestones) {
                        if (count >= milestone.count) {
                            const achievement = await this.awardAchievement(
                                telegram_id,
                                `games_${milestone.count}`,
                                milestone.name,
                                milestone.desc
                            );
                            if (achievement) achievements.push(achievement);
                        }
                    }

                    resolve(achievements);
                }
            );
        });
    }

    async awardAchievement(telegram_id, type, name, description) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR IGNORE INTO achievements 
                 (telegram_id, achievement_type, achievement_name, description) 
                 VALUES (?, ?, ?, ?)`,
                [telegram_id, type, name, description],
                function(err) {
                    if (err) {
                        reject(err);
                    } else if (this.changes > 0) {
                        resolve({ type, name, description });
                    } else {
                        resolve(null); // Achievement already exists
                    }
                }
            );
        });
    }

    async getUserStats(telegram_id) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT u.*, 
                        COUNT(gs.id) as total_games,
                        MAX(gs.score) as best_score,
                        SUM(gs.score) as total_score,
                        SUM(gs.coins_earned) as total_coins,
                        AVG(gs.score) as avg_score
                 FROM users u
                 LEFT JOIN game_sessions gs ON u.telegram_id = gs.telegram_id
                 WHERE u.telegram_id = ?
                 GROUP BY u.id`,
                [telegram_id],
                (err, result) => {
                    if (err) reject(err);
                    else resolve(result || null);
                }
            );
        });
    }

    async getLeaderboard(limit) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT u.first_name, u.username, u.telegram_id,
                        MAX(gs.score) as best_score,
                        COUNT(gs.id) as total_games,
                        SUM(gs.score) as total_score
                 FROM users u
                 LEFT JOIN game_sessions gs ON u.telegram_id = gs.telegram_id
                 GROUP BY u.telegram_id
                 ORDER BY best_score DESC
                 LIMIT ?`,
                [limit],
                (err, result) => {
                    if (err) reject(err);
                    else resolve(result || []);
                }
            );
        });
    }

    async getUserAchievements(telegram_id) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM achievements WHERE telegram_id = ? ORDER BY earned_at DESC`,
                [telegram_id],
                (err, result) => {
                    if (err) reject(err);
                    else resolve(result || []);
                }
            );
        });
    }

    // CRM Methods
    async getCRMOverview() {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT 
                    (SELECT COUNT(*) FROM users) as total_users,
                    (SELECT COUNT(*) FROM game_sessions) as total_games,
                    (SELECT COUNT(*) FROM users WHERE date(created_at) = date('now')) as new_users_today,
                    (SELECT COUNT(*) FROM game_sessions WHERE date(created_at) = date('now')) as games_today,
                    (SELECT AVG(score) FROM game_sessions) as avg_score,
                    (SELECT MAX(score) FROM game_sessions) as max_score`,
                (err, result) => {
                    if (err) reject(err);
                    else resolve(result || {});
                }
            );
        });
    }

    async getCRMUsers(limit, offset) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT u.*, 
                        COUNT(gs.id) as total_games,
                        MAX(gs.score) as best_score,
                        SUM(gs.score) as total_score
                 FROM users u
                 LEFT JOIN game_sessions gs ON u.telegram_id = gs.telegram_id
                 GROUP BY u.id
                 ORDER BY u.created_at DESC
                 LIMIT ? OFFSET ?`,
                [limit, offset],
                (err, result) => {
                    if (err) reject(err);
                    else resolve(result || []);
                }
            );
        });
    }

    async getCRMSessions(limit, offset) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT gs.*, u.first_name, u.username
                 FROM game_sessions gs
                 LEFT JOIN users u ON gs.telegram_id = u.telegram_id
                 ORDER BY gs.created_at DESC
                 LIMIT ? OFFSET ?`,
                [limit, offset],
                (err, result) => {
                    if (err) reject(err);
                    else resolve(result || []);
                }
            );
        });
    }

    async getCRMAnalytics(days) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT 
                    date(created_at) as date,
                    COUNT(*) as games_count,
                    COUNT(DISTINCT telegram_id) as unique_users,
                    AVG(score) as avg_score,
                    MAX(score) as max_score,
                    SUM(coins_earned) as total_coins
                 FROM game_sessions
                 WHERE created_at >= date('now', '-${days} days')
                 GROUP BY date(created_at)
                 ORDER BY date DESC`,
                (err, result) => {
                    if (err) reject(err);
                    else resolve(result || []);
                }
            );
        });
    }

    initBot() {
        this.bot = new CryptoBirdBot();
        this.bot.start();
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🚀 Server running on port ${this.port}`);
            console.log(`🎮 Game URL: http://localhost:${this.port}`);
            console.log(`📊 CRM URL: http://localhost:${this.port}/crm`);
        });
    }
}

// Initialize and start server
const server = new GameServer();
server.start();