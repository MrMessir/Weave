// frontend/js/auth.js
const auth = {
  async login(identifier, password, remember = false) {
    try {
      const data = await API.login(identifier, password);
      
      // Сохраняем токен
      if (remember) {
        localStorage.setItem('weave_token', data.token);
      } else {
        sessionStorage.setItem('weave_token', data.token);
      }
      localStorage.setItem('weave_current_user', JSON.stringify(data.user));
      
      // Обновляем store
      store.dispatch('login', { 
        user: data.user, 
        token: data.token,
        remember 
      });
      
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  async register(userData) {
    try {
      const data = await API.register(userData);
      
      localStorage.setItem('weave_token', data.token);
      localStorage.setItem('weave_current_user', JSON.stringify(data.user));
      
      store.dispatch('login', { 
        user: data.user, 
        token: data.token,
        remember: true 
      });
      
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  async logout() {
    await API.logout();
    store.dispatch('logout');
    router.navigate('/login');
  },
  
  checkAuth() {
    return store.state.isAuthenticated;
  },
  
  getCurrentUser() {
    return store.state.user;
  }
};