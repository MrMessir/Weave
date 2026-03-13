// frontend/js/store.js
const store = {
  state: {
    user: null,
    token: localStorage.getItem('weave_token') || sessionStorage.getItem('weave_token') || null,
    isAuthenticated: false,
    posts: [],
    stories: [],
    chats: [],
    currentChat: null,
    notifications: []
  },
  
  listeners: [],
  
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  },
  
  notify() {
    this.listeners.forEach(listener => listener(this.state));
  },
  
  dispatch(action, payload) {
    switch (action) {
      case 'login':
        this.state.user = payload.user;
        this.state.token = payload.token;
        this.state.isAuthenticated = true;
        break;
        
      case 'logout':
        this.state.user = null;
        this.state.token = null;
        this.state.isAuthenticated = false;
        this.state.posts = [];
        this.state.stories = [];
        this.state.chats = [];
        localStorage.removeItem('weave_token');
        localStorage.removeItem('weave_current_user');
        sessionStorage.removeItem('weave_token');
        break;
        
      case 'setPosts':
        this.state.posts = payload;
        break;
        
      case 'addPost':
        this.state.posts = [payload, ...this.state.posts];
        break;
        
      case 'updatePost':
        const index = this.state.posts.findIndex(p => p.id === payload.id);
        if (index !== -1) {
          this.state.posts[index] = { ...this.state.posts[index], ...payload };
        }
        break;
        
      case 'removePost':
        this.state.posts = this.state.posts.filter(p => p.id !== payload);
        break;
        
      case 'setStories':
        this.state.stories = payload;
        break;
        
      case 'setChats':
        this.state.chats = payload;
        break;
        
      case 'setCurrentChat':
        this.state.currentChat = payload;
        break;
        
      case 'addMessage':
        if (this.state.currentChat) {
          if (!this.state.currentChat.messages) {
            this.state.currentChat.messages = [];
          }
          this.state.currentChat.messages = [
            ...this.state.currentChat.messages,
            payload
          ];
        }
        break;
    }
    
    this.notify();
  },
  
  getState() {
    return this.state;
  }
};

// Восстанавливаем пользователя из localStorage
const savedUser = localStorage.getItem('weave_current_user');
if (savedUser && store.state.token) {
  try {
    store.state.user = JSON.parse(savedUser);
    store.state.isAuthenticated = true;
  } catch (e) {
    console.error('Failed to parse saved user', e);
  }
}