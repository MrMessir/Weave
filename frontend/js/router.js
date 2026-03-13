// frontend/js/router.js
const router = {
  routes: {
    '/': 'feed',
    '/feed': 'feed',
    '/profile': 'profile',
    '/profile/:username': 'profile',
    '/messages': 'messages',
    '/messages/:userId': 'messages',
    '/login': 'login',
    '/register': 'register',
    '/explore': 'explore',
    '/reels': 'reels',
    '/admin': 'admin'
  },
  
  currentRoute: null,
  params: {},
  
  init() {
    // Обработка навигации браузера
    window.addEventListener('popstate', () => this.handleRoute());
    
    // Перехватываем все клики по ссылкам
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && link.href && link.href.startsWith(window.location.origin)) {
        e.preventDefault();
        const path = link.pathname;
        this.navigate(path);
      }
    });
    
    // Обрабатываем текущий маршрут
    this.handleRoute();
  },
  
  async handleRoute() {
    const path = window.location.pathname || '/';
    this.currentRoute = path;
    
    // Проверка авторизации (публичные маршруты)
    const publicRoutes = ['/login', '/register'];
    if (!store.state.isAuthenticated && !publicRoutes.includes(path) && !path.startsWith('/profile/')) {
      // Для profile/:username разрешаем без авторизации
      if (!path.match(/^\/profile\/[^\/]+$/)) {
        this.navigate('/login');
        return;
      }
    }
    
    // Парсим маршрут
    let routeName = null;
    this.params = {};
    
    for (const [pattern, name] of Object.entries(this.routes)) {
      if (pattern.includes(':')) {
        const patternParts = pattern.split('/');
        const pathParts = path.split('/');
        
        if (patternParts.length === pathParts.length) {
          let match = true;
          const tempParams = {};
          
          for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i].startsWith(':')) {
              tempParams[patternParts[i].substring(1)] = pathParts[i];
            } else if (patternParts[i] !== pathParts[i]) {
              match = false;
              break;
            }
          }
          
          if (match) {
            routeName = name;
            this.params = tempParams;
            break;
          }
        }
      } else if (pattern === path) {
        routeName = name;
        break;
      }
    }
    
    if (!routeName) {
      routeName = 'not-found';
    }
    
    // Загружаем страницу
    await this.loadPage(routeName);
  },
  
  async loadPage(pageName) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    try {
      // Показываем загрузку
      mainContent.innerHTML = '<div class="loading-spinner">Загрузка...</div>';
      
      // Загружаем HTML шаблон
      let html = '';
      switch (pageName) {
        case 'feed':
          html = await fetch('/pages/feed.html').then(r => r.text());
          break;
        case 'profile':
          html = await fetch('/pages/profile.html').then(r => r.text());
          break;
        case 'messages':
          html = await fetch('/pages/messages.html').then(r => r.text());
          break;
        case 'login':
          html = await fetch('/pages/login.html').then(r => r.text());
          break;
        case 'register':
          html = await fetch('/pages/register.html').then(r => r.text());
          break;
        case 'explore':
          html = '<div class="empty-f">Страница поиска в разработке</div>';
          break;
        case 'reels':
          html = '<div class="empty-f">Reels в разработке</div>';
          break;
        case 'admin':
          html = await fetch('/pages/admin.html').then(r => r.text());
          break;
        default:
          html = '<div class="empty-f">404 - Страница не найдена</div>';
      }
      
      mainContent.innerHTML = html;
      
      // Инициализируем страницу
      this.initPage(pageName);
      
      // Обновляем активный пункт меню
      this.updateActiveNav();
      
    } catch (error) {
      console.error('Error loading page:', error);
      mainContent.innerHTML = '<div class="empty-f">Ошибка загрузки страницы</div>';
    }
  },
  
  initPage(pageName) {
    switch (pageName) {
      case 'feed':
        if (window.feedPage) feedPage.init();
        break;
      case 'profile':
        if (window.profilePage) profilePage.init(this.params);
        break;
      case 'messages':
        if (window.messagesPage) messagesPage.init(this.params);
        break;
      case 'login':
        if (window.authPage) authPage.initLogin();
        break;
      case 'register':
        if (window.authPage) authPage.initRegister();
        break;
      case 'admin':
        if (window.adminPage) adminPage.init();
        break;
    }
  },
  
  navigate(path) {
    window.history.pushState({}, '', path);
    this.handleRoute();
  },
  
  updateActiveNav() {
    document.querySelectorAll('.sn-item').forEach(item => {
      const href = item.getAttribute('data-href') || 
                   item.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
      if (href) {
        // Точное совпадение или начало пути с /
        const isActive = this.currentRoute === href || 
          (href !== '/' && this.currentRoute.startsWith(href + '/'));
        item.classList.toggle('active', isActive);
      } else {
        item.classList.remove('active');
      }
    });
  }
};