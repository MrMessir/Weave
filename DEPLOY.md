# 🚀 Деплой Weave на Railway

## Шаг 1 — GitHub

```bash
cd WeaveAdmin
git init
git add .
git commit -m "Weave v1.0 🚀"
```

Создай репо на **github.com** (New repository → назови `weave` → Create), затем:

```bash
git remote add origin https://github.com/ТВОЙник/weave.git
git push -u origin main
```

---

## Шаг 2 — Railway

1. Зайди на **railway.app** → **Login with GitHub**
2. **New Project** → **Deploy from GitHub repo**
3. Выбери репо `weave` → **Deploy Now**
4. Railway сам определит Node.js и запустит `npm install` + `node server.js`

---

## Шаг 3 — Переменные окружения

Railway Dashboard → твой сервис → **Variables** → добавь:

| Переменная | Значение |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | любая длинная строка, например `Weave2024_xK9mPnQrT8zV` |

Нажми **Deploy** после добавления переменных.

---

## Шаг 4 — Домен

Railway Dashboard → **Settings** → **Networking** → **Generate Domain**

Получишь: `weave-production.up.railway.app`

---

## Шаг 5 — CORS (важно после получения домена)

Variables → добавь ещё одну:

| `ALLOWED_ORIGINS` | `https://weave-production.up.railway.app` |

→ **Redeploy**

---

## ✅ Готово!

Railway **не засыпает** и **не теряет данные** — SQLite хранится постоянно.

### Обновление кода:
```bash
git add .
git commit -m "update"
git push
```
Railway задеплоит автоматически.

---

## 💰 Стоимость

| | |
|---|---|
| Railway Hobby план | $5 кредитов/мес |
| ~500 часов работы сервера | бесплатно |
| Домен railway.app | бесплатно |
| **Итого для старта** | **0 ₽** |

> Когда кредиты закончатся (через несколько месяцев активного использования) — $5/мес (~450₽).
