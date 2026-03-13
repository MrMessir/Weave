// frontend/js/pages/profile.js
const profilePage = {
  profileUser: null,
  profilePosts: [],
  currentTab: 'posts',
  isOwnProfile: false,
  
  async init(params = {}) {
    const username = params.username || store.state.user?.username;
    if (!username) {
      router.navigate('/login');
      return;
    }
    
    await this.loadProfile(username);
    this.setupEventListeners();
  },
  
  async loadProfile(username) {
    try {
      this.profileUser = await API.getUserProfile(username);
      this.isOwnProfile = store.state.user?.username === this.profileUser.username;
      
      this.renderHeader();
      await this.loadPosts();
      await this.loadStories();
    } catch (error) {
      utils.showToast('Ошибка загрузки профиля: ' + error.message, 'error');
    }
  },
  
  renderHeader() {
    if (!this.profileUser) return;
    
    const user = this.profileUser;
    const initials = ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() || '?';
    const bg = utils.getAvatarColor(user.avatarColor);
    
    document.getElementById('profile-avatar').style.background = bg;
    document.getElementById('profile-avatar').textContent = initials;
    document.getElementById('profile-username').textContent = `@${user.username}`;
    document.getElementById('profile-name').textContent = `${user.firstName} ${user.lastName || ''}`.trim();
    document.getElementById('profile-bio-text').textContent = user.bio || '';
    
    const websiteEl = document.getElementById('profile-website');
    if (user.website) {
      websiteEl.href = user.website.startsWith('http') ? user.website : `https://${user.website}`;
      websiteEl.textContent = user.website.replace(/^https?:\/\//, '');
      websiteEl.style.display = 'inline';
    } else {
      websiteEl.style.display = 'none';
    }
    
    document.getElementById('posts-count').textContent = user.stats?.posts || 0;
    document.getElementById('followers-count').textContent = user.stats?.followers || 0;
    document.getElementById('following-count').textContent = user.stats?.following || 0;
    
    this.renderActions();
  },
  
  renderActions() {
    const actionsDiv = document.getElementById('profile-actions');
    if (!actionsDiv) return;
    
    if (this.isOwnProfile) {
      actionsDiv.innerHTML = `
        <button class="btn-primary" onclick="profilePage.editProfile()">Редактировать</button>
        <button class="btn-secondary" onclick="utils.showToast('⚙️ Настройки')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
          </svg>
        </button>
      `;
    } else {
      actionsDiv.innerHTML = `
        <button class="btn-primary" onclick="profilePage.followUser(this)">Подписаться</button>
        <button class="btn-secondary" onclick="router.navigate('/messages/${this.profileUser.id}')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      `;
    }
  },
  
  async loadPosts() {
    if (!this.profileUser) return;
    
    try {
      this.profilePosts = await API.getPosts('profile', this.profileUser.id);
      this.renderPosts();
    } catch (error) {
      console.error('Error loading posts:', error);
      document.getElementById('posts-feed').innerHTML = '<div class="empty-f">Ошибка загрузки постов</div>';
    }
  },
  
  renderPosts() {
    const container = document.getElementById('posts-feed');
    if (!container) return;
    
    if (!this.profilePosts.length) {
      container.innerHTML = '<div class="empty-f"><p>Нет постов</p></div>';
      return;
    }
    
    container.innerHTML = this.profilePosts.map((post, index) => this.buildPostHTML(post, index)).join('');
  },
  
  buildPostHTML(p, index) {
    const bg = utils.getAvatarColor(p.author?.avatarColor);
    
    let imgs = '';
    if (p.images?.length) {
      const n = Math.min(p.images.length, 4);
      imgs = `<div class="pimgs i${n}">` + 
        p.images.slice(0,4).map(src => 
          `<img class="pimg" src="${src}" onclick="utils.openLightbox('${src}')" loading="lazy"/>`
        ).join('') + 
      '</div>';
    }
    
    return `
    <div class="post" style="animation-delay:${index * 0.05}s">
      <div class="ph">
        <div class="pa" style="background:${bg}" onclick="utils.goToProfile('${p.author?.username}')">
          ${(p.author?.firstName?.[0] || '') + (p.author?.lastName?.[0] || '')}
        </div>
        <div class="pm">
          <div class="pn" onclick="utils.goToProfile('${p.author?.username}')">
            ${p.author?.firstName} ${p.author?.lastName || ''}
          </div>
          <div class="pt">@${p.author?.username} · ${utils.formatTime(p.createdAt)}</div>
        </div>
      </div>
      <div class="pbody">${utils.formatText(p.text)}</div>
      ${imgs}
      <div class="pacts">
        <button class="pact ${p.liked ? 'liked' : ''}" onclick="profilePage.toggleLike('${p.id}', this)">
          <svg viewBox="0 0 24 24" fill="${p.liked ? 'currentColor' : 'none'}" stroke="currentColor">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span>${p.likes}</span>
        </button>
        <button class="pact" onclick="router.navigate('/feed?post=${p.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>${p.comments || 0}</span>
        </button>
      </div>
    </div>`;
  },
  
  async toggleLike(postId, btn) {
    try {
      const result = await API.likePost(postId);
      btn.classList.toggle('liked', result.liked);
      btn.querySelector('svg').setAttribute('fill', result.liked ? 'currentColor' : 'none');
      btn.querySelector('span').textContent = result.likes;
    } catch (error) {
      utils.showToast('Ошибка: ' + error.message, 'error');
    }
  },
  
  async followUser(btn) {
    if (!this.profileUser) return;
    
    try {
      const result = await API.followUser(this.profileUser.id);
      btn.textContent = result.following ? '✓ Подписан' : 'Подписаться';
      utils.showToast(result.following ? '✓ Подписались' : 'Отписались');
      
      const followersSpan = document.getElementById('followers-count');
      const current = parseInt(followersSpan.textContent);
      followersSpan.textContent = result.following ? current + 1 : current - 1;
    } catch (error) {
      utils.showToast('Ошибка: ' + error.message, 'error');
    }
  },
  
  async loadStories() {
    try {
      const stories = await API.getStories();
      const userStories = stories.filter(s => s.author?.id === this.profileUser?.id);
      
      const highlightsEl = document.getElementById('highlights');
      if (userStories.length) {
        highlightsEl.innerHTML = userStories.map(() => `
          <div class="highlight-item" onclick="utils.showToast('📖 История')">
            <div class="highlight-ring">
              <div class="highlight-inner">📸</div>
            </div>
            <div class="highlight-label">История</div>
          </div>
        `).join('');
      } else {
        highlightsEl.innerHTML = '';
      }
    } catch (error) {
      console.error('Error loading stories:', error);
    }
  },
  
  switchTab(tab, btn) {
    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    this.currentTab = tab;
    
    if (tab === 'posts') {
      this.renderPosts();
    } else if (tab === 'replies') {
      document.getElementById('posts-feed').innerHTML = '<div class="empty-f">Комментарии будут позже</div>';
    } else if (tab === 'saved') {
      const container = document.getElementById('posts-feed');
      if (this.isOwnProfile) {
        const saved = this.profilePosts.filter(p => p.bookmarked);
        if (saved.length) {
          container.innerHTML = saved.map((post, index) => this.buildPostHTML(post, index)).join('');
        } else {
          container.innerHTML = '<div class="empty-f">Нет сохраненных постов</div>';
        }
      } else {
        container.innerHTML = '<div class="empty-f">Это приватная информация</div>';
      }
    }
  },
  
  editProfile() {
    utils.showToast('Редактирование профиля будет позже');
  },
  
  setupEventListeners() {
    // Обработка табов
    document.querySelectorAll('.profile-tab').forEach((btn, index) => {
      btn.onclick = (e) => {
        const tabs = ['posts', 'replies', 'saved'];
        this.switchTab(tabs[index], btn);
      };
    });
  }
};

window.profilePage = profilePage;