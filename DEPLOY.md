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


---

## ⚠️ Важно: сохранность данных (SQLite + Render)

Render Free план использует **временный диск** — при каждом рестарте сервера база данных (сообщения, посты, пользователи) **сбрасывается**.

### Решение A — Render Disk ($1/месяц, рекомендуется)

1. Dashboard → твой сервис → **Disks** → **Add Disk**
2. Настройки:
   - Mount Path: `/data`
   - Size: 1 GB
3. В **Environment Variables** добавь:
   ```
   DB_PATH=/data/weave.db
   ```
4. Redeploy — теперь база данных сохраняется навсегда

### Решение B — бесплатно (UptimeRobot не даёт засыпать)

Если не хочешь платить $1 — настрой UptimeRobot (см. выше).  
Сервер не будет засыпать → рестарты редкие → данные живут дольше.  
Но при деплое нового кода данные всё равно сбросятся.


---

## 💾 ВАЖНО: Persistent Disk (чтобы данные не терялись)

На бесплатном Render файловая система **эфемерная** — при рестарте сервера все данные SQLite стираются.

### Решение — Render Disk (бесплатно не даётся, $0.25/GB/мес)

1. Render Dashboard → твой сервис → **Disks** → **Add Disk**
2. Заполни:
   - Name: `weave-data`
   - Mount Path: `/data`
   - Size: 1 GB (~$0.25/мес)
3. Environment Variables → добавь:
   ```
   DB_PATH=/data/weave.db
   ```

### Бесплатная альтернатива — Railway ($5 кредитов в месяц)

Railway даёт persistent storage бесплатно. Если бюджет = 0:
1. Зарегистрируйся на **railway.app**
2. New Project → Deploy from GitHub → тот же репо
3. Переменные те же: `NODE_ENV=production`, `JWT_SECRET=...`
4. Storage персистентный по умолчанию ✅


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
