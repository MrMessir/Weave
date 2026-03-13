# 🚀 Деплой Weave на Render (бесплатно)

## Шаг 1 — Залить код на GitHub

```bash
cd WeaveAdmin
git init
git add .
git commit -m "Weave v1.0 🚀"
```

Создай репозиторий на github.com (кнопка «New repository»), затем:

```bash
git remote add origin https://github.com/ТВОЙник/weave.git
git push -u origin main
```

---

## Шаг 2 — Деплой на Render

1. Зайди на **render.com** → Sign Up (через GitHub — бесплатно)
2. Dashboard → **New +** → **Web Service**
3. Подключи свой GitHub и выбери репо `weave`
4. Заполни настройки:

| Поле | Значение |
|---|---|
| **Name** | weave |
| **Root Directory** | `backend` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | Free |

5. Раздел **Environment Variables** — добавь:

| Ключ | Значение |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | придумай длинную строку, например: `Weave2024SuperSecretKey_xK9mP3nQ7rT` |

6. Нажми **Create Web Service** → ждёшь ~2 минуты

Получишь ссылку: `https://weave.onrender.com`

---

## Шаг 3 — Добавить домен в CORS (важно!)

После деплоя → Environment Variables → добавь:

| Ключ | Значение |
|---|---|
| `ALLOWED_ORIGINS` | `https://weave.onrender.com` |

→ Manual Deploy → Deploy latest commit

---

## ⚠️ Важно про бесплатный Render

- Сервис **засыпает** через 15 минут неактивности
- При первом запросе после сна — **задержка ~30 секунд** (cold start)
- Чтобы не засыпал — используй [UptimeRobot](https://uptimerobot.com) (бесплатно):
  1. Зарегистрируйся на uptimerobot.com
  2. New Monitor → HTTP(S)
  3. URL: `https://weave.onrender.com/api/health`
  4. Интервал: 5 минут
  
  UptimeRobot будет пинговать сервер — он не заснёт.

---

## 📱 Как установить PWA

### Android (Chrome):
1. Открыть сайт → меню **⋮** → «Добавить на главный экран»
2. Или дождаться баннера «Установить Weave»

### iOS (Safari):
1. Открыть в **Safari** (не Chrome!)
2. Кнопка «Поделиться» → «Добавить на экран Домой»

---

## 💰 Стоимость: 0 рублей

| | |
|---|---|
| Render Free план | $0 |
| Домен onrender.com | $0 (встроенный) |
| UptimeRobot | $0 |
| **Итого** | **0 ₽** |
