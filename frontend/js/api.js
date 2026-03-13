// frontend/js/api.js
const API = {
  baseURL: 'http://localhost:3001/api',
  
  getToken() {
    return localStorage.getItem('weave_token') || sessionStorage.getItem('weave_token');
  },
  
  async request(endpoint, options = {}) {
    const token = this.getToken();
    
    try {
      const res = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers
        }
      });
      
      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }
      
      if (!res.ok) {
        if (res.status === 401) {
          // Токен истек - разлогиниваем
          store.dispatch('logout');
          router.navigate('/login');
          throw new Error('Сессия истекла');
        }
        throw new Error(data.error || `Ошибка ${res.status}`);
      }
      
      return data;
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        throw new Error('Сервер недоступен. Запустите backend на порту 3001');
      }
      throw error;
    }
  },
  
  // ========== АВТОРИЗАЦИЯ ==========
  async login(identifier, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
    return data;
  },
  
  async register(userData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    return data;
  },
  
  async logout() {
    return this.request('/auth/logout', { method: 'POST' }).catch(() => {});
  },
  
  // ========== ПОСТЫ ==========
  async getPosts(tab = 'all', userId = null) {
    let url = `/posts?tab=${tab}`;
    if (userId) url += `&userId=${userId}`;
    return this.request(url);
  },
  
  async createPost(data) {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  async updatePost(id, data) {
    return this.request(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  async deletePost(id) {
    return this.request(`/posts/${id}`, { method: 'DELETE' });
  },
  
  async likePost(postId) {
    return this.request(`/posts/${postId}/like`, { method: 'POST' });
  },
  
  async bookmarkPost(postId) {
    return this.request(`/posts/${postId}/bookmark`, { method: 'POST' });
  },
  
  // ========== КОММЕНТАРИИ ==========
  async getComments(postId) {
    return this.request(`/posts/${postId}/comments`);
  },
  
  async createComment(data) {
    return this.request('/comments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  async deleteComment(commentId) {
    return this.request(`/comments/${commentId}`, { method: 'DELETE' });
  },
  
  // ========== ИСТОРИИ ==========
  async getStories() {
    return this.request('/stories');
  },
  
  async createStory(slides) {
    return this.request('/stories', {
      method: 'POST',
      body: JSON.stringify({ slides })
    });
  },
  
  async viewStory(storyId) {
    return this.request(`/stories/${storyId}/view`, { method: 'POST' });
  },
  
  // ========== ПОЛЬЗОВАТЕЛИ ==========
  async getUserProfile(identifier) {
    return this.request(`/users/${identifier}`);
  },
  
  async updateProfile(data) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  async followUser(userId) {
    return this.request(`/users/${userId}/follow`, { method: 'POST' });
  },
  
  async getFollowers(userId) {
    return this.request(`/users/${userId}/followers`);
  },
  
  async getFollowing(userId) {
    return this.request(`/users/${userId}/following`);
  },
  
  // ========== СООБЩЕНИЯ ==========
  async getChats() {
    return this.request('/chats');
  },
  
  async getMessages(userId) {
    return this.request(`/messages/${userId}`);
  },
  
  async sendMessage(toId, text) {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify({ toId, text })
    });
  },
  
  // ========== ПОИСК ==========
  async search(query, type = 'all') {
    return this.request(`/search?q=${encodeURIComponent(query)}&type=${type}`);
  },
  
  // ========== АДМИНКА ==========
  async getAdminUsers(options = {}) {
    const params = new URLSearchParams();
    if (options.q) params.append('q', options.q);
    if (options.role) params.append('role', options.role);
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);
    const qs = params.toString();
    return this.request('/admin/users' + (qs ? `?${qs}` : ''));
  },
  
  async setModerator(userId, isModerator) {
    return this.request(`/admin/users/${userId}/moderator`, {
      method: 'POST',
      body: JSON.stringify({ isModerator })
    });
  },
  
  async setBan(userId, isBanned) {
    return this.request(`/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ isBanned })
    });
  },
  
  async getAdminPosts(options = {}) {
    const params = new URLSearchParams();
    if (options.q) params.append('q', options.q);
    if (options.authorId) params.append('authorId', options.authorId);
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);
    const qs = params.toString();
    return this.request('/admin/posts' + (qs ? `?${qs}` : ''));
  }
};