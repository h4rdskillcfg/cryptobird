const { Telegraf, Markup } = require('telegraf');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

class CryptoBirdBot {
    constructor() {
        this.bot = new Telegraf(process.env.BOT_TOKEN);
        this.db = new sqlite3.Database(process.env.DB_PATH || './database/crypto_bird.db');
        this.setupCommands();
        this.setupMiddleware();
    }

    setupMiddleware() {
        // Log all interactions
        this.bot.use(async (ctx, next) => {
            const telegramId = ctx.from?.id?.toString();
            const command = ctx.message?.text || ctx.callbackQuery?.data || 'unknown';
            
            if (telegramId) {
                this.logInteraction(telegramId, command, JSON.stringify(ctx.message || ctx.callbackQuery));
                await this.updateUserActivity(ctx.from);
            }
            
            return next();
        });
    }

    setupCommands() {
        // Start command
        this.bot.command('start', async (ctx) => {
            const user = ctx.from;
            const referrerId = ctx.message.text.split(' ')[1];
            
            await this.registerUser(user, referrerId);
            
            const welcomeMessage = `
🎮 Добро пожаловать в Crypto Bird!

🚀 Управляйте птичкой, собирайте монеты и достигайте новых высот!

💎 Игровые команды:
/play - Играть в игру
/stats - Моя статистика
/leaderboard - Топ игроков
/achievements - Мои достижения

💰 Дополнительно:
/referral - Пригласить друзей
/help - Помощь

Готовы начать? Нажмите кнопку ниже! 👇`;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.webApp('🎮 Играть', process.env.GAME_URL)],
                [Markup.button.callback('📊 Статистика', 'stats')],
                [Markup.button.callback('🏆 Топ игроков', 'leaderboard')]
            ]);

            await ctx.reply(welcomeMessage, keyboard);
        });

        // Play command - launch web app
        this.bot.command('play', async (ctx) => {
            const keyboard = Markup.inlineKeyboard([
                [Markup.button.webApp('🎮 Играть в Crypto Bird', process.env.GAME_URL)]
            ]);
            
            await ctx.reply('🚀 Запускаем игру Crypto Bird!', keyboard);
        });

        // Stats command
        this.bot.command('stats', async (ctx) => {
            await this.showUserStats(ctx);
        });

        // Leaderboard command
        this.bot.command('leaderboard', async (ctx) => {
            await this.showLeaderboard(ctx);
        });

        // Achievements command
        this.bot.command('achievements', async (ctx) => {
            await this.showAchievements(ctx);
        });

        // Referral command
        this.bot.command('referral', async (ctx) => {
            const telegramId = ctx.from.id.toString();
            const botUsername = ctx.botInfo.username;
            const referralLink = `https://t.me/${botUsername}?start=${telegramId}`;
            
            const message = `
🎁 Пригласите друзей и получайте бонусы!

🔗 Ваша реферальная ссылка:
${referralLink}

💰 За каждого приглашенного друга вы получите:
• 100 монет
• +10% к очкам в первых 5 играх

📊 Статистика рефералов: /referral_stats`;

            await ctx.reply(message);
        });

        // Referral stats
        this.bot.command('referral_stats', async (ctx) => {
            await this.showReferralStats(ctx);
        });

        // Help command
        this.bot.command('help', async (ctx) => {
            const helpMessage = `
❓ Помощь по Crypto Bird Bot

🎮 Основные команды:
/start - Начать игру
/play - Запустить игру
/stats - Показать статистику
/leaderboard - Топ игроков
/achievements - Достижения
/referral - Пригласить друзей
/help - Эта справка

🎯 Как играть:
1. Нажмите /play или кнопку "Играть"
2. Управляйте птичкой тапами
3. Собирайте монеты и избегайте препятствий
4. Достигайте новых рекордов!

💎 Система достижений:
• Первая игра
• 100, 500, 1000 очков
• 10, 50, 100 игр
• Специальные достижения

🎁 Реферальная программа:
Приглашайте друзей и получайте бонусы!

Удачи в игре! 🚀`;

            await ctx.reply(helpMessage);
        });

        // Callback query handlers
        this.bot.action('stats', async (ctx) => {
            await ctx.answerCbQuery();
            await this.showUserStats(ctx);
        });

        this.bot.action('leaderboard', async (ctx) => {
            await ctx.answerCbQuery();
            await this.showLeaderboard(ctx);
        });

        this.bot.action('achievements', async (ctx) => {
            await ctx.answerCbQuery();
            await this.showAchievements(ctx);
        });

        // Admin commands
        this.bot.command('admin', async (ctx) => {
            const adminId = process.env.ADMIN_TELEGRAM_ID;
            if (ctx.from.id.toString() === adminId) {
                const keyboard = Markup.inlineKeyboard([
                    [Markup.button.url('📊 CRM Dashboard', `http://localhost:${process.env.PORT}/crm`)],
                    [Markup.button.callback('👥 Пользователи', 'admin_users')],
                    [Markup.button.callback('📈 Статистика', 'admin_stats')]
                ]);
                
                await ctx.reply('🔐 Панель администратора', keyboard);
            } else {
                await ctx.reply('❌ У вас нет прав администратора');
            }
        });

        this.bot.action('admin_users', async (ctx) => {
            await ctx.answerCbQuery();
            if (ctx.from.id.toString() === process.env.ADMIN_TELEGRAM_ID) {
                await this.showAdminStats(ctx);
            }
        });
    }

    // Database methods
    async registerUser(user, referrerId = null) {
        return new Promise((resolve, reject) => {
            const telegramId = user.id.toString();
            
            this.db.run(
                `INSERT OR IGNORE INTO users (telegram_id, username, first_name, last_name, referrer_id) 
                 VALUES (?, ?, ?, ?, ?)`,
                [telegramId, user.username, user.first_name, user.last_name, referrerId],
                function(err) {
                    if (err) {
                        console.error('Error registering user:', err);
                        reject(err);
                    } else {
                        // Handle referral bonus
                        if (referrerId && this.changes > 0) {
                            // Award referral bonus
                            console.log(`New referral: ${telegramId} referred by ${referrerId}`);
                        }
                        resolve(this.changes);
                    }
                }
            );
        });
    }

    async updateUserActivity(user) {
        const telegramId = user.id.toString();
        
        this.db.run(
            `UPDATE users SET last_active = CURRENT_TIMESTAMP, username = ?, first_name = ?, last_name = ? 
             WHERE telegram_id = ?`,
            [user.username, user.first_name, user.last_name, telegramId]
        );
    }

    logInteraction(telegramId, command, message) {
        this.db.run(
            `INSERT INTO bot_interactions (telegram_id, command, message) VALUES (?, ?, ?)`,
            [telegramId, command, message]
        );
    }

    async showUserStats(ctx) {
        const telegramId = ctx.from.id.toString();
        
        this.db.get(
            `SELECT u.*, 
                    COUNT(gs.id) as total_games,
                    MAX(gs.score) as best_score,
                    SUM(gs.score) as total_score,
                    SUM(gs.coins_earned) as total_coins
             FROM users u
             LEFT JOIN game_sessions gs ON u.telegram_id = gs.telegram_id
             WHERE u.telegram_id = ?
             GROUP BY u.id`,
            [telegramId],
            (err, user) => {
                if (err) {
                    console.error('Error fetching user stats:', err);
                    ctx.reply('❌ Ошибка получения статистики');
                    return;
                }

                if (!user) {
                    ctx.reply('👤 Пользователь не найден. Используйте /start');
                    return;
                }

                const statsMessage = `
📊 Ваша статистика

👤 Игрок: ${user.first_name || 'Неизвестно'}
🎮 Всего игр: ${user.total_games || 0}
🏆 Лучший счет: ${user.best_score || 0}
💯 Общий счет: ${user.total_score || 0}
💰 Всего монет: ${user.total_coins || 0}
📅 Регистрация: ${new Date(user.created_at).toLocaleDateString('ru-RU')}
⏰ Последняя активность: ${new Date(user.last_active).toLocaleDateString('ru-RU')}

🎯 Продолжайте играть, чтобы улучшить результаты!`;

                const keyboard = Markup.inlineKeyboard([
                    [Markup.button.webApp('🎮 Играть', process.env.GAME_URL)],
                    [Markup.button.callback('🏆 Топ игроков', 'leaderboard')]
                ]);

                ctx.reply(statsMessage, keyboard);
            }
        );
    }

    async showLeaderboard(ctx) {
        this.db.all(
            `SELECT u.first_name, u.username, 
                    MAX(gs.score) as best_score,
                    COUNT(gs.id) as total_games,
                    SUM(gs.score) as total_score
             FROM users u
             LEFT JOIN game_sessions gs ON u.telegram_id = gs.telegram_id
             GROUP BY u.telegram_id
             ORDER BY best_score DESC
             LIMIT 10`,
            (err, users) => {
                if (err) {
                    console.error('Error fetching leaderboard:', err);
                    ctx.reply('❌ Ошибка получения топа игроков');
                    return;
                }

                let leaderboard = '🏆 Топ 10 игроков\n\n';
                
                users.forEach((user, index) => {
                    const position = index + 1;
                    const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
                    const name = user.first_name || user.username || 'Аноним';
                    const score = user.best_score || 0;
                    
                    leaderboard += `${medal} ${name} - ${score} очков\n`;
                });

                if (users.length === 0) {
                    leaderboard += 'Пока никто не играл. Будьте первым! 🚀';
                }

                const keyboard = Markup.inlineKeyboard([
                    [Markup.button.webApp('🎮 Играть', process.env.GAME_URL)],
                    [Markup.button.callback('📊 Моя статистика', 'stats')]
                ]);

                ctx.reply(leaderboard, keyboard);
            }
        );
    }

    async showAchievements(ctx) {
        const telegramId = ctx.from.id.toString();
        
        this.db.all(
            `SELECT * FROM achievements WHERE telegram_id = ? ORDER BY earned_at DESC`,
            [telegramId],
            (err, achievements) => {
                if (err) {
                    console.error('Error fetching achievements:', err);
                    ctx.reply('❌ Ошибка получения достижений');
                    return;
                }

                let message = '🏅 Ваши достижения\n\n';
                
                if (achievements.length === 0) {
                    message += 'У вас пока нет достижений.\nИграйте больше, чтобы их получить! 🎮';
                } else {
                    achievements.forEach(achievement => {
                        const date = new Date(achievement.earned_at).toLocaleDateString('ru-RU');
                        message += `🏆 ${achievement.achievement_name}\n`;
                        message += `📝 ${achievement.description}\n`;
                        message += `📅 ${date}\n\n`;
                    });
                }

                const keyboard = Markup.inlineKeyboard([
                    [Markup.button.webApp('🎮 Играть', process.env.GAME_URL)]
                ]);

                ctx.reply(message, keyboard);
            }
        );
    }

    async showReferralStats(ctx) {
        const telegramId = ctx.from.id.toString();
        
        this.db.get(
            `SELECT COUNT(*) as referral_count FROM referrals WHERE referrer_telegram_id = ?`,
            [telegramId],
            (err, result) => {
                if (err) {
                    console.error('Error fetching referral stats:', err);
                    ctx.reply('❌ Ошибка получения статистики рефералов');
                    return;
                }

                const count = result.referral_count || 0;
                const message = `
🎁 Статистика рефералов

👥 Приглашено друзей: ${count}
💰 Бонус получен: ${count * 100} монет
🎯 Бонус к очкам: ${count > 0 ? 'Активен' : 'Неактивен'}

💡 Приглашайте больше друзей для получения дополнительных бонусов!`;

                ctx.reply(message);
            }
        );
    }

    async showAdminStats(ctx) {
        this.db.all(
            `SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM game_sessions) as total_games,
                (SELECT COUNT(*) FROM users WHERE date(created_at) = date('now')) as new_users_today,
                (SELECT COUNT(*) FROM game_sessions WHERE date(created_at) = date('now')) as games_today`,
            (err, result) => {
                if (err) {
                    console.error('Error fetching admin stats:', err);
                    return;
                }

                const stats = result[0] || {};
                const message = `
📊 Статистика системы

👥 Всего пользователей: ${stats.total_users || 0}
🎮 Всего игр: ${stats.total_games || 0}
📈 Новых пользователей сегодня: ${stats.new_users_today || 0}
🎯 Игр сегодня: ${stats.games_today || 0}

💻 CRM: http://localhost:${process.env.PORT}/crm`;

                ctx.reply(message);
            }
        );
    }

    start() {
        this.bot.launch();
        console.log('🤖 Crypto Bird Bot запущен!');
        
        // Graceful stop
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }
}

module.exports = CryptoBirdBot;