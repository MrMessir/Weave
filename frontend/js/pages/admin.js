// frontend/js/pages/admin.js
const adminPage = {
  users: [],
  posts: [],
  userSearch: '',
  userRole: 'all',
  userLimit: 50,
  userOffset: 0,
  postSearch: '',
  postAuthorSearch: '',
  postLimit: 50,
  postOffset: 0,

  async init() {
    const me = store.state.user;
    if (!me || !(me.isAdmin || me.isModerator)) {
      router.navigate('/feed');
      return;
    }

    this.updateHeader();
    await this.reloadAll();
  },

  async reloadAll() {
    await Promise.all([this.loadUsers(), this.loadPosts()]);
  },

  async reloadUsers() {
    this.userOffset = 0;
    await this.loadUsers();
  },

  async reloadPosts() {
    this.postOffset = 0;
    await this.loadPosts();
  },

  updateHeader() {
    const me = store.state.user;
    const initials = ((me?.firstName?.[0] || '') + (me?.lastName?.[0] || '')).toUpperCase() || '?';
    const bg = utils.getAvatarColor(me?.avatarColor);
    const ava = document.getElementById('admin-ava');
    const subtitle = document.getElementById('admin-subtitle');
    if (ava) {
      ava.textContent = initials;
      ava.style.background = bg;
    }
    if (subtitle) {
      const role = me.isAdmin ? 'Администратор' : 'Модератор';
      subtitle.textContent = `${role} · расширенные права`;
    }
  },

  async loadUsers() {
    const container = document.getElementById('admin-users');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner" style="padding:16px;">Загрузка пользователей...</div>';
    try {
      this.users = await API.getAdminUsers({
        q: this.userSearch.trim() || undefined,
        role: this.userRole,
        limit: this.userLimit,
        offset: this.userOffset
      });
      this.renderUsers();
    } catch (error) {
      container.innerHTML = `<div class="empty-f">Ошибка загрузки: ${error.message}</div>`;
    }
  },

  renderUsers() {
    const container = document.getElementById('admin-users');
    if (!container) return;
    const me = store.state.user;
    if (!this.users.length) {
      container.innerHTML = '<div class="empty-f"><p>Пользователей нет</p></div>';
      return;
    }

    container.innerHTML = this.users.map(u => {
      const isMe = u.id === me.id;
      const badges = [];
      if (u.isAdmin) badges.push('<span class="badge badge-admin">ADMIN</span>');
      if (u.isModerator) badges.push('<span class="badge badge-mod">MOD</span>');
      if (u.isBanned) badges.push('<span class="badge badge-ban">BANNED</span>');

      const canToggleMod = me.isAdmin && !isMe;
      const canBan = (me.isAdmin || me.isModerator) && !isMe && (!u.isAdmin || me.isAdmin);

      return `
        <div class="admin-user-row">
          <div class="admin-user-main" onclick="utils.goToProfile('${u.username}')">
            <div class="pa" style="background:${utils.getAvatarColor(u.avatarColor)}">
              ${(u.firstName?.[0] || '') + (u.lastName?.[0] || '')}
            </div>
            <div>
              <div class="admin-user-name">
                ${u.firstName} ${u.lastName || ''} 
                <span class="admin-user-handle">@${u.username}</span>
              </div>
              <div class="admin-user-badges">
                ${badges.join(' ')}
              </div>
            </div>
          </div>
          <div class="admin-user-actions">
            ${canToggleMod ? `
              <button class="btn-secondary small" onclick="adminPage.toggleModerator('${u.id}', ${u.isModerator})">
                ${u.isModerator ? 'Снять модератора' : 'Сделать модератором'}
              </button>
            ` : ''}
            ${canBan ? `
              <button class="btn-${u.isBanned ? 'secondary' : 'danger'} small" onclick="adminPage.toggleBan('${u.id}', ${u.isBanned})">
                ${u.isBanned ? 'Разблокировать' : 'Забанить'}
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  async toggleModerator(userId, currentState) {
    try {
      const updated = await API.setModerator(userId, !currentState);
      this.users = this.users.map(u => u.id === updated.id ? updated : u);
      this.renderUsers();
      utils.showToast(!currentState ? 'Пользователь назначен модератором' : 'Права модератора сняты');
    } catch (error) {
      utils.showToast('Ошибка: ' + error.message, 'error');
    }
  },

  async toggleBan(userId, currentState) {
    try {
      const updated = await API.setBan(userId, !currentState);
      this.users = this.users.map(u => u.id === updated.id ? updated : u);
      this.renderUsers();
      utils.showToast(!currentState ? 'Аккаунт заблокирован' : 'Аккаунт разблокирован');
    } catch (error) {
      utils.showToast('Ошибка: ' + error.message, 'error');
    }
  },

  async loadPosts() {
    const container = document.getElementById('admin-posts');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner" style="padding:16px;">Загрузка постов...</div>';
    try {
      this.posts = await API.getAdminPosts({
        q: this.postSearch.trim() || undefined,
        // authorId будет установлен отдельно после поиска по нику, здесь пока без него
        limit: this.postLimit,
        offset: this.postOffset
      });
      this.renderPosts();
    } catch (error) {
      container.innerHTML = `<div class="empty-f">Ошибка загрузки: ${error.message}</div>`;
    }
  },

  renderPosts() {
    const container = document.getElementById('admin-posts');
    if (!container) return;
    if (!this.posts.length) {
      container.innerHTML = '<div class="empty-f"><p>Постов нет</p></div>';
      return;
    }

    container.innerHTML = this.posts.slice(0, 50).map(p => {
      const bg = utils.getAvatarColor(p.author?.avatarColor);
      return `
        <div class="admin-post-row" id="admin-post-${p.id}">
          <div class="admin-post-main">
            <div class="pa" style="background:${bg}" onclick="utils.goToProfile('${p.author?.username}')">
              ${(p.author?.firstName?.[0] || '') + (p.author?.lastName?.[0] || '')}
            </div>
            <div>
              <div class="admin-post-title">
                <span onclick="utils.goToProfile('${p.author?.username}')">
                  ${p.author?.firstName} ${p.author?.lastName || ''} 
                  <span class="admin-user-handle">@${p.author?.username}</span>
                </span>
              </div>
              <div class="admin-post-text">${utils.formatText(p.text || '').slice(0, 200) || '<i>(без текста)</i>'}</div>
              <div class="admin-post-meta">
                ${utils.formatTime(p.createdAt)} · ❤ ${p.likes} · 💬 ${p.comments || 0}
              </div>
            </div>
          </div>
          <div class="admin-post-actions">
            <button class="btn-danger small" onclick="adminPage.deletePost('${p.id}')">
              Удалить пост
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  async deletePost(postId) {
    if (!confirm('Удалить этот пост для всех пользователей?')) return;
    try {
      await API.deletePost(postId);
      this.posts = this.posts.filter(p => p.id !== postId);
      const row = document.getElementById(`admin-post-${postId}`);
      if (row) row.remove();
      utils.showToast('Пост удалён');
    } catch (error) {
      utils.showToast('Ошибка: ' + error.message, 'error');
    }
  }

  ,

  setUserSearch(q) {
    this.userSearch = q;
    this.userOffset = 0;
    this.loadUsers();
  },

  setUserRole(role) {
    this.userRole = role;
    this.userOffset = 0;
    this.loadUsers();
  },

  setPostSearch(q) {
    this.postSearch = q;
    this.postOffset = 0;
    this.loadPosts();
  },

  async setPostAuthorSearch(username) {
    this.postAuthorSearch = username;
    this.postOffset = 0;
    if (!username.trim()) {
      await this.loadPosts();
      return;
    }
    try {
      const profile = await API.getUserProfile(username.replace(/^@/, ''));
      this.posts = await API.getAdminPosts({
        authorId: profile.id,
        q: this.postSearch.trim() || undefined,
        limit: this.postLimit,
        offset: this.postOffset
      });
      this.renderPosts();
    } catch (error) {
      this.posts = [];
      this.renderPosts();
    }
  }
};

window.adminPage = adminPage;

