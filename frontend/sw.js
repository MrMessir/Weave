// Weave Service Worker v1.0
const CACHE = 'weave-v1';
const STATIC = [
  '/',
  '/pages/feed.html',
  '/pages/login.html',
  '/pages/weave-register.html',
  '/pages/profile.html',
  '/pages/explore.html',
  '/pages/messages.html',
  '/pages/notifications.html',
  '/pages/settings.html',
  '/pages/404.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.json',
];

// Установка: кешируем статику
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

// Активация: удаляем старые кеши
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Запросы: сеть → кеш (Network First для API, Cache First для статики)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API запросы — только сеть, без кеша
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws')) {
    return;
  }

  // Статика — сначала сеть, при офлайн — кеш
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Кешируем свежий ответ
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => {
        // Офлайн — отдаём из кеша
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          // Если нет в кеше — офлайн-страница
          if (e.request.destination === 'document') {
            return caches.match('/pages/404.html');
          }
        });
      })
  );
});

// Push-уведомления (заготовка для будущего)
self.addEventListener('push', e => {
  if (!e.data) return;
  const data = e.data.json().catch(() => ({ title: 'Weave', body: e.data.text() }));
  e.waitUntil(
    data.then(d => self.registration.showNotification(d.title || 'Weave', {
      body: d.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-32.png',
      vibrate: [100, 50, 100],
      data: { url: d.url || '/pages/feed.html' }
    }))
  );
});

// Клик по уведомлению — открыть нужную страницу
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/pages/feed.html';
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
