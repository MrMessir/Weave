// frontend/js/pages/feed.js
const feedPage = {
  currentTab: 'all',
  posts: [],
  pendImgs: [],
  
  async init() {
    this.render();
    await this.loadPosts();
    await this.loadStories();
    this.setupEventListeners();
  },
  
  render() {
    // HTML уже загружен из шаблона, просто обновляем данные
    this.updateUserUI();
  },
  
  updateUserUI() {
    const user = store.state.user;
    if (!user) return;
    
    const initials = ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() || '?';
    const bg = utils.getAvatarColor(user.avatarColor);
    
    ['sn-ava', 'cmp-ava'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = initials;
        el.style.background = bg;
      }
    });
    
    document.getElementById('sn-name').textContent = `${user.firstName} ${user.lastName || ''}`.trim();
    document.getElementById('sn-handle').textContent = `@${user.username}`;
  },
  
  async loadPosts() {
    try {
      this.posts = await API.getPosts(this.currentTab);
      this.renderPosts();
      this.updateBookmarkBadge();
    } catch (error) {
      utils.showToast('Ошибка загрузки постов: ' + error.message, 'error');
    }
  },
  
  renderPosts() {
    const container = document.getElementById('feed');
    if (!container) return;
    
    if (!this.posts.length) {
      const messages = {
        all: 'Постов пока нет',
        following: 'Подпишись на кого-нибудь',
        trending: 'Нет популярных постов',
        bookmarks: 'Нет закладок'
      };
      container.innerHTML = `<div class="empty-f"><p>${messages[this.currentTab]}</p></div>`;
      return;
    }
    
    container.innerHTML = this.posts.map((post, index) => this.buildPostHTML(post, index)).join('');
  },
  
  buildPostHTML(p, index) {
    const user = store.state.user;
    const isOwner = p.author?.id === user?.id;
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
    <div class="post" id="post-${p.id}" style="animation-delay:${index * 0.05}s">
      <div class="ph">
        <div class="pa" style="background:${bg}" onclick="utils.goToProfile('${p.author?.username}')">
          ${(p.author?.firstName?.[0] || '') + (p.author?.lastName?.[0] || '')}
        </div>
        <div class="pm">
          <div class="pn" onclick="utils.goToProfile('${p.author?.username}')">
            ${p.author?.firstName} ${p.author?.lastName || ''}
            ${p.edited ? '<span class="edited-badge">(ред.)</span>' : ''}
          </div>
          <div class="pt">@${p.author?.username} · ${utils.formatTime(p.createdAt)}</div>
        </div>
        <div class="pmenu-wrap">
          <button class="pmenu-btn" onclick="feedPage.toggleMenu('${p.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
          <div class="pdrop" id="menu-${p.id}" style="display:none">
            ${isOwner ? `
              <div class="pd-it" onclick="feedPage.editPost('${p.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Редактировать
              </div>
              <div class="pd-it red" onclick="feedPage.deletePost('${p.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                Удалить
              </div>
            ` : `
              <div class="pd-it" onclick="feedPage.reportPost('${p.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                Пожаловаться
              </div>
            `}
            <div class="pd-it" onclick="feedPage.sharePost('${p.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/></svg>
              Поделиться
            </div>
          </div>
        </div>
      </div>
      <div class="pbody">${utils.formatText(p.text)}</div>
      ${imgs}
      <div class="pacts">
        <button class="pact ${p.liked ? 'liked' : ''}" onclick="feedPage.toggleLike('${p.id}', this)">
          <svg viewBox="0 0 24 24" fill="${p.liked ? 'currentColor' : 'none'}" stroke="currentColor">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span>${p.likes}</span>
        </button>
        <button class="pact" onclick="feedPage.toggleComments('${p.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span>${p.comments || 0}</span>
        </button>
        <button class="pact ${p.bookmarked ? 'bm' : ''}" onclick="feedPage.toggleBookmark('${p.id}', this)">
          <svg viewBox="0 0 24 24" fill="${p.bookmarked ? 'currentColor' : 'none'}" stroke="currentColor"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>
      <div class="cs" id="comments-${p.id}" style="display:none">
        <!-- Комментарии загружаются динамически -->
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
  
  async toggleBookmark(postId, btn) {
    try {
      const result = await API.bookmarkPost(postId);
      btn.classList.toggle('bm', result.bookmarked);
      btn.querySelector('svg').setAttribute('fill', result.bookmarked ? 'currentColor' : 'none');
      this.updateBookmarkBadge();
      utils.showToast(result.bookmarked ? '🔖 Добавлено в закладки' : 'Убрано из закладок');
    } catch (error) {
      utils.showToast('Ошибка: ' + error.message, 'error');
    }
  },
  
  updateBookmarkBadge() {
    const count = this.posts.filter(p => p.bookmarked).length;
    const badge = document.getElementById('bm-badge');
    if (badge) {
      badge.style.display = count > 0 ? '' : 'none';
      badge.textContent = count;
    }
  },
  
  toggleMenu(postId) {
    const menu = document.getElementById(`menu-${postId}`);
    if (menu) {
      const isVisible = menu.style.display !== 'none';
      this.closeAllMenus();
      menu.style.display = isVisible ? 'none' : 'block';
    }
  },
  
  closeAllMenus() {
    document.querySelectorAll('.pdrop').forEach(m => m.style.display = 'none');
  },
  
  async deletePost(postId) {
    if (!confirm('Удалить пост?')) return;
    
    try {
      await API.deletePost(postId);
      const postEl = document.getElementById(`post-${postId}`);
      if (postEl) {
        postEl.style.opacity = '0';
        postEl.style.transform = 'scale(0.95)';
        setTimeout(() => {
          this.posts = this.posts.filter(p => p.id !== postId);
          this.renderPosts();
        }, 200);
      }
      utils.showToast('Пост удален');
    } catch (error) {
      utils.showToast('Ошибка: ' + error.message, 'error');
    }
  },
  
  async loadStories() {
    try {
      const stories = await API.getStories();
      this.renderStories(stories);
    } catch (error) {
      console.error('Error loading stories:', error);
    }
  },
  
  renderStories(stories) {
    const container = document.getElementById('stories-scroll');
    if (!container) return;
    
    const user = store.state.user;
    const userInitials = user ? ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() : '?';
    
    container.innerHTML = `
      <div class="story-item" onclick="feedPage.addStory()">
        <div class="story-ring mine-ring">
          <div class="story-inner" style="background:${utils.getAvatarColor(user?.avatarColor)}">${userInitials}</div>
        </div>
        <div class="story-label mine">Моя история</div>
      </div>
    ` + stories.map(s => `
      <div class="story-item" onclick="feedPage.viewStory('${s.id}')">
        <div class="story-ring ${s.viewed ? 'seen' : ''}">
          <div class="story-inner" style="background:${utils.getAvatarColor(s.author?.avatarColor)}">
            ${(s.author?.firstName?.[0] || '') + (s.author?.lastName?.[0] || '')}
          </div>
        </div>
        <div class="story-label">${s.author?.firstName || 'Пользователь'}</div>
      </div>
    `).join('');
  },
  
  async addStory() {
    const text = prompt('Текст истории:');
    if (!text) return;
    
    try {
      await API.createStory([{
        type: 'text',
        text,
        bg: 'linear-gradient(135deg,#7C3AED,#06B6D4)',
        time: 'только что'
      }]);
      await this.loadStories();
      utils.showToast('✨ История добавлена');
    } catch (error) {
      utils.showToast('Ошибка: ' + error.message, 'error');
    }
  },
  
  async publish() {
    const ta = document.getElementById('cmp-ta');
    const text = ta.value.trim();
    
    if (!text && !this.pendImgs.length) return;
    
    try {
      await API.createPost({
        text,
        images: this.pendImgs
      });
      
      ta.value = '';
      this.pendImgs = [];
      document.getElementById('cmp-imgs').innerHTML = '';
      document.getElementById('btn-post').disabled = true;
      
      await this.loadPosts();
      utils.showToast('✓ Пост опубликован');
    } catch (error) {
      utils.showToast('Ошибка: ' + error.message, 'error');
    }
  },
  
  async toggleComments(postId) {
    const cs = document.getElementById(`comments-${postId}`);
    if (!cs) return;
    
    if (cs.style.display !== 'none') {
      cs.style.display = 'none';
      return;
    }
    
    cs.style.display = 'block';
    cs.innerHTML = '<div class="loading-spinner" style="padding:12px;text-align:center;color:var(--tx2)">Загрузка...</div>';
    
    try {
      const comments = await API.getComments(postId);
      
      if (!comments.length) {
        cs.innerHTML = '<div style="padding:12px;text-align:center;color:var(--tx2);font-size:13px">Комментариев пока нет</div>';
      } else {
        cs.innerHTML = comments.map(c => {
          const bg = utils.getAvatarColor(c.author?.avatarColor);
          return `
            <div class="comment" style="display:flex;gap:10px;padding:10px 0;border-top:1px solid var(--border)">
              <div class="pa" style="background:${bg};width:32px;height:32px;font-size:12px;flex-shrink:0" onclick="utils.goToProfile('${c.author?.username}')">
                ${(c.author?.firstName?.[0] || '') + (c.author?.lastName?.[0] || '')}
              </div>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:600;cursor:pointer" onclick="utils.goToProfile('${c.author?.username}')">${c.author?.firstName} ${c.author?.lastName || ''}</div>
                <div style="font-size:13px;color:var(--tx2);margin:2px 0">${utils.formatText(c.text)}</div>
                <div style="font-size:11px;color:var(--tx3)">${utils.formatTime(c.createdAt)}</div>
              </div>
            </div>`;
        }).join('');
      }
      
      // Форма для нового комментария
      cs.innerHTML += `
        <div style="display:flex;gap:10px;padding:10px 0;border-top:1px solid var(--border)">
          <textarea id="cmnt-input-${postId}" placeholder="Написать комментарий..." 
            style="flex:1;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:8px 12px;font-size:13px;color:var(--tx1);resize:none;min-height:36px;font-family:inherit"
            oninput="utils.growTextarea(this)"></textarea>
          <button onclick="feedPage.submitComment('${postId}')" 
            style="background:var(--accent);color:#fff;border:none;border-radius:10px;padding:8px 14px;cursor:pointer;font-size:13px;align-self:flex-end">
            Отправить
          </button>
        </div>`;
    } catch (error) {
      cs.innerHTML = `<div style="padding:12px;color:var(--error)">Ошибка загрузки: ${error.message}</div>`;
    }
  },
  
  async submitComment(postId) {
    const input = document.getElementById(`cmnt-input-${postId}`);
    const text = input?.value.trim();
    if (!text) return;
    
    try {
      await API.createComment({ postId, text });
      input.value = '';
      // Перезагружаем комментарии
      const cs = document.getElementById(`comments-${postId}`);
      if (cs) cs.style.display = 'none';
      await this.toggleComments(postId);
      // Обновляем счётчик комментариев
      const countEl = document.querySelector(`#post-${postId} .pact:nth-child(2) span`);
      if (countEl) countEl.textContent = parseInt(countEl.textContent || '0') + 1;
    } catch (error) {
      utils.showToast('Ошибка: ' + error.message, 'error');
    }
  },
  
  async editPost(postId) {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return;
    
    const newText = prompt('Редактировать пост:', post.text);
    if (newText === null || newText.trim() === post.text) return;
    if (!newText.trim()) {
      utils.showToast('Текст поста не может быть пустым', 'error');
      return;
    }
    
    try {
      await API.updatePost(postId, { text: newText.trim() });
      post.text = newText.trim();
      post.edited = true;
      this.renderPosts();
      utils.showToast('✓ Пост обновлён');
    } catch (error) {
      utils.showToast('Ошибка: ' + error.message, 'error');
    }
  },
  
  reportPost(postId) {
    utils.showToast('🚩 Жалоба отправлена. Спасибо!');
    this.closeAllMenus();
  },
  
  sharePost(postId) {
    const url = `${window.location.origin}/feed?post=${postId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        utils.showToast('🔗 Ссылка скопирована');
      }).catch(() => {
        utils.showToast('🔗 ' + url);
      });
    } else {
      utils.showToast('🔗 ' + url);
    }
    this.closeAllMenus();
  },
  
  viewStory(storyId) {
    const stories = document.querySelectorAll('.story-item');
    const story = Array.from(stories).find(s => 
      s.getAttribute('onclick')?.includes(storyId)
    );
    
    // Отмечаем как просмотренную
    if (story) {
      story.querySelector('.story-ring')?.classList.add('seen');
    }
    
    API.viewStory(storyId).catch(() => {});
    
    // Простой просмотрщик историй
    const storyData = Array.from(document.querySelectorAll('.story-item'))
      .find(el => el.onclick?.toString().includes(storyId));
    
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="width:min(360px,100vw);height:min(640px,100vh);border-radius:16px;overflow:hidden;position:relative;background:#111;">
        <div id="story-slide" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:40px;text-align:center;font-size:22px;color:#fff;font-weight:600;word-break:break-word;"></div>
        <button onclick="this.closest('div[style*=fixed]').remove()" 
          style="position:absolute;top:14px;right:14px;background:rgba(255,255,255,.2);border:none;border-radius:50%;width:32px;height:32px;color:#fff;cursor:pointer;font-size:18px;">✕</button>
      </div>`;
    
    document.body.appendChild(overlay);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    
    // Загружаем данные истории из уже загруженных историй через API
    API.getStories().then(allStories => {
      const s = allStories.find(st => st.id === storyId);
      if (!s || !s.slides?.length) return;
      
      let slideIdx = 0;
      const slideEl = overlay.querySelector('#story-slide');
      const container = slideEl.parentElement;
      
      const showSlide = (idx) => {
        const slide = s.slides[idx];
        container.style.background = slide.bg || '#222';
        slideEl.textContent = slide.text || '';
      };
      
      showSlide(0);
      
      // Автопереключение
      const timer = setInterval(() => {
        slideIdx++;
        if (slideIdx >= s.slides.length) {
          clearInterval(timer);
          overlay.remove();
        } else {
          showSlide(slideIdx);
        }
      }, 3000);
      
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) clearInterval(timer);
      });
    }).catch(() => {});
  },

  setupEventListeners() {
    // Закрытие меню при клике вне
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.pmenu-wrap')) {
        this.closeAllMenus();
      }
    });
    
    // Обработка ввода в textarea
    const ta = document.getElementById('cmp-ta');
    if (ta) {
      ta.addEventListener('input', (e) => {
        utils.growTextarea(e.target);
        const btn = document.getElementById('btn-post');
        btn.disabled = e.target.value.trim().length === 0 && this.pendImgs.length === 0;
      });
    }
  }
};

window.feedPage = feedPage;