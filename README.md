# Weave 🕸️

> Социальная сеть — плети свою историю вместе с миром

![Node.js](https://img.shields.io/badge/Node.js-22+-green)
![SQLite](https://img.shields.io/badge/SQLite-3-blue)
![PWA](https://img.shields.io/badge/PWA-ready-purple)

## ✨ Возможности

- 📝 Лента постов с лайками, комментариями, закладками
- 💬 Мессенджер с E2E-шифрованием и голосовыми сообщениями
- 📸 Истории (Stories) с просмотром
- 🔔 Уведомления в реальном времени (WebSocket)
- 🔍 Поиск по пользователям, постам и хэштегам
- 👤 Профили с фото, подписки/подписчики
- 🛡️ Админ-панель + консоль разработчика
- 📱 PWA — устанавливается как приложение на Android/iOS

## 🚀 Запуск локально

### Требования
- Node.js 18+
- npm

### Установка

```bash
# Клонируй репозиторий
git clone https://github.com/твой-ник/weave.git
cd weave

# Установи зависимости
cd backend
npm install

# Создай .env файл
cp ../.env.example .env
# Отредактируй .env — впиши JWT_SECRET

# Запусти сервер
npm start
```

Открой **http://localhost:3001/pages/feed.html**

Для разработки (авто-перезапуск):
```bash
npm run dev
```

### Первый вход
При первом запуске автоматически создаётся аккаунт администратора:
- Email: `gadji4913@gmail.com`  
- Пароль: `admin2024`

> ⚠️ Смени пароль сразу после первого входа!

## 📦 Деплой на Railway (бесплатно)

Смотри подробную инструкцию в [DEPLOY.md](./DEPLOY.md)

Краткий путь:
1. `git push` на GitHub
2. railway.app → New Project → GitHub repo
3. Добавить переменную `JWT_SECRET`
4. Готово 🎉

## 🗂️ Структура проекта

```
weave/
├── backend/
│   ├── server.js          # Express сервер + WebSocket
│   ├── data/
│   │   └── init.js        # Инициализация SQLite
│   └── package.json
├── frontend/
│   ├── pages/             # HTML страницы
│   │   ├── feed.html      # Лента
│   │   ├── messages.html  # Мессенджер
│   │   ├── profile.html   # Профиль
│   │   ├── explore.html   # Поиск
│   │   ├── notifications.html
│   │   ├── settings.html
│   │   └── admin.html     # Панель администратора
│   ├── css/               # Стили
│   ├── icons/             # Иконки приложения
│   ├── manifest.json      # PWA манифест
│   └── sw.js              # Service Worker
├── .env.example           # Пример переменных окружения
├── .gitignore
├── DEPLOY.md              # Инструкция по деплою
└── README.md
```

## 🔧 Технологии

| | |
|---|---|
| Backend | Node.js, Express, WebSocket (ws) |
| База данных | SQLite (node:sqlite) |
| Аутентификация | JWT + bcrypt |
| Frontend | Vanilla JS, HTML, CSS |
| Шифрование | Web Crypto API (E2E в чатах) |
| Деплой | Railway / Render |

## 📝 Лицензия

MIT — используй как хочешь.
