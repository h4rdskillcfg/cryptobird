# 🎮 Crypto Bird - Telegram Mini App + CRM System

Полная система для HTML игры Crypto Bird с интеграцией Telegram бота, CRM панелью и аналитикой.

## 🚀 Возможности

### 🤖 Telegram Bot
- Регистрация пользователей
- Запуск мини-приложения
- Статистика игрока
- Таблица лидеров  
- Система достижений
- Реферальная программа
- Команды администратора

### 🎮 HTML Игра
- Crypto Bird - увлекательная игра в стиле Flappy Bird
- Интеграция с Telegram Web App
- Отправка статистики в реальном времени
- Система достижений
- Разные уровни сложности

### 📊 CRM Dashboard
- Обзор всех пользователей
- Аналитика игровых сессий
- Интерактивные графики
- Фильтры по периодам
- Экспорт данных

## 🛠 Установка

### Быстрый старт с Docker

1. **Клонируйте репозиторий:**
```bash
git clone <repository-url>
cd crypto-bird-bot-crm
```

2. **Настройте переменные окружения:**
```bash
cp .env.example .env
# Отредактируйте .env файл
```

3. **Запустите с Docker Compose:**
```bash
docker-compose up -d
```

### Ручная установка

1. **Установите Node.js (версия 16+)**

2. **Установите зависимости:**
```bash
npm install
```

3. **Инициализируйте базу данных:**
```bash
npm run init-db
```

4. **Запустите сервер:**
```bash
npm start
```

## ⚙️ Конфигурация

### Обязательные переменные окружения:

```env
# Telegram Bot Token (получите у @BotFather)
BOT_TOKEN=your_bot_token_here

# URL вашего приложения (для production)
GAME_URL=https://your-domain.com

# Telegram ID администратора
ADMIN_TELEGRAM_ID=123456789
```

### Дополнительные настройки:

```env
# Порт сервера (по умолчанию 3000)
PORT=3000

# Путь к базе данных
DB_PATH=./database/crypto_bird.db

# Секретный ключ для JWT
JWT_SECRET=your-super-secret-key

# Пароль для CRM (для демо)
CRM_PASSWORD=admin123
```

## 🚀 Настройка Telegram Бота

1. **Создайте бота у @BotFather:**
   - Отправьте `/newbot`
   - Выберите имя и username для бота
   - Скопируйте токен в `.env` файл

2. **Настройте Mini App:**
   - Отправьте `/newapp` в @BotFather
   - Выберите своего бота
   - Укажите URL: `https://your-domain.com`
   - Загрузите иконку (512x512 px)

3. **Настройте команды бота:**
```
start - Начать игру
play - Играть в Crypto Bird
stats - Показать статистику
leaderboard - Топ игроков
achievements - Мои достижения
referral - Пригласить друзей
help - Помощь
admin - Панель администратора (только для админов)
```

## 📱 Использование

### Для игроков:
1. Найдите бота в Telegram
2. Нажмите `/start`
3. Играйте через кнопку "🎮 Играть"
4. Просматривайте статистику: `/stats`
5. Соревнуйтесь в таблице лидеров: `/leaderboard`

### Для администраторов:
1. Используйте команду `/admin` в боте
2. Переходите в CRM: `http://your-domain.com/crm`
3. Анализируйте данные и статистику

## 🏗 Архитектура

```
├── server.js           # Основной сервер Express
├── bot.js             # Telegram бот
├── index.html         # HTML игра с интеграцией
├── crm/
│   └── index.html     # CRM Dashboard
├── scripts/
│   └── init-db.js     # Инициализация БД
├── database/          # SQLite база данных
├── public/            # Статические файлы
└── docker/            # Docker конфигурация
```

## 🗄 База данных

Система использует SQLite с следующими таблицами:
- `users` - Пользователи
- `game_sessions` - Игровые сессии
- `game_stats` - Ежедневная статистика
- `achievements` - Достижения
- `referrals` - Рефералы
- `bot_interactions` - Взаимодействия с ботом

## 📊 API Endpoints

### Game API:
- `POST /api/game/save-session` - Сохранить игровую сессию
- `GET /api/user/:telegram_id/stats` - Статистика пользователя
- `GET /api/leaderboard` - Таблица лидеров
- `GET /api/user/:telegram_id/achievements` - Достижения

### CRM API:
- `GET /api/crm/overview` - Общая статистика
- `GET /api/crm/users` - Список пользователей
- `GET /api/crm/sessions` - Игровые сессии
- `GET /api/crm/analytics` - Аналитические данные

## 🔧 Разработка

### Локальная разработка:
```bash
npm run dev  # Запуск с nodemon
```

### Структура проекта:
- Бот работает автономно
- Веб-сервер обслуживает игру и API
- CRM работает как SPA
- Все компоненты интегрированы

## 🚀 Деплой

### На VPS/сервер:
1. Установите Docker и Docker Compose
2. Клонируйте репозиторий
3. Настройте `.env`
4. Запустите: `docker-compose up -d`

### На Heroku:
1. Создайте приложение
2. Добавьте переменные окружения
3. Деплойте через Git

### На Railway/Render:
1. Подключите GitHub репозиторий
2. Настройте переменные окружения
3. Автоматический деплой

## 🔐 Безопасность

- Rate limiting для API
- Helmet.js для безопасности
- Validation всех входящих данных
- CORS настройки
- Environment variables для секретов

## 📈 Мониторинг

- Health check endpoint: `/health`
- Логирование всех действий
- Error handling
- Auto-restart при падении

## 🤝 Поддержка

Если у вас есть вопросы или проблемы:
1. Проверьте логи: `docker-compose logs`
2. Проверьте переменные окружения
3. Убедитесь что бот настроен правильно
4. Проверьте доступность сервера

## 📝 Лицензия

MIT License - используйте свободно для коммерческих и некоммерческих проектов.