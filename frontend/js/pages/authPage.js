// frontend/js/pages/authPage.js
// Инициализация страниц авторизации (login/register)
// Страницы login.html и weave-register.html — standalone файлы,
// поэтому роутер при переходе перенаправляет напрямую на них.

const authPage = {
  initLogin() {
    // Страница входа — standalone HTML, загружается напрямую
    // Если мы внутри SPA (router), перенаправляем на login.html
    window.location.href = '/pages/login.html';
  },

  initRegister() {
    // Страница регистрации — standalone HTML
    window.location.href = '/pages/weave-register.html';
  }
};

window.authPage = authPage;
