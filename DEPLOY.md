# 🚀 Деплой Weave на Railway

## Шаг 1 — Залить код на GitHub

```bash
git init
git add .
git commit -m "Weave v1.0 — готово к деплою"
git remote add origin https://github.com/ТВО_ИМЯ/weave.git
git push -u origin main
```

## Шаг 2 — Railway

1. Зайди на **railway.app** → Sign Up (через GitHub)
2. New Project → Deploy from GitHub repo → выбери `weave`
3. Railway автоматически определит Node.js

## Шаг 3 — Переменные окружения

В Railway → Variables добавь:
```
NODE_ENV=production
PORT=3001
JWT_SECRET=придумай_длинный_секретный_ключ_минимум_32_символа
ALLOWED_ORIGINS=https://твой-домен.railway.app
```

## Шаг 4 — Домен

Railway → Settings → Domains → Generate Domain
Получишь: `weave-production.up.railway.app`

## Шаг 5 — Сбросить БД перед запуском

Перед первым запуском в Railway → Terminal:
```bash
rm -f backend/data/weave.db
```

---

## 📱 PWA — как установить пользователям

### Android (Chrome):
1. Открыть сайт в Chrome
2. Меню (⋮) → «Добавить на главный экран»
3. Или дождаться баннера «Установить Weave»

### iOS (Safari):
1. Открыть сайт в **Safari** (не Chrome!)
2. Нажать кнопку «Поделиться» (квадрат со стрелкой)
3. «Добавить на экран «Домой»»

### Компьютер (Chrome/Edge):
1. Открыть сайт
2. В адресной строке появится иконка установки (📥)
3. Нажать → «Установить»

---

## 💰 Стоимость

| | Цена |
|---|---|
| Railway бесплатный план | $0 (5$ кредитов/мес) |
| Домен railway.app | $0 (встроенный) |
| Свой домен .ru | ~150₽/год |
| Google Play (опционально) | $25 разово |

**Итого для старта: 0 рублей.**
