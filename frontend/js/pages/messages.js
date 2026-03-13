// frontend/js/pages/messages.js
const messagesPage = {
  currentChatId: null,
  pollInterval: null,

  async init(params = {}) {
    if (params.userId) {
      this.currentChatId = params.userId;
    }
    await this.loadChats();
    this.setupEventListeners();

    if (this.currentChatId) {
      await this.openChat(this.currentChatId);
    }
  },

  async loadChats() {
    const container = document.getElementById('chats-list');
    if (!container) return;

    try {
      const chats = await API.getChats();
      store.dispatch('setChats', chats);

      if (!chats.length) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--tx2,#6B6B8F);font-size:14px">Нет диалогов</div>';
        return;
      }

      container.innerHTML = chats.map(chat => {
        const bg = utils.getAvatarColor(chat.avatarColor);
        const initials = ((chat.firstName?.[0] || '') + (chat.lastName?.[0] || '')).toUpperCase();
        const lastText = chat.lastMessage?.text || '';
        const preview = lastText.length > 40 ? lastText.slice(0, 40) + '…' : lastText;
        const time = chat.lastMessage ? utils.formatTime(chat.lastMessage.createdAt) : '';
        const unread = chat.unreadCount > 0;

        return `
          <div class="chat-item ${this.currentChatId === chat.id ? 'active' : ''}"
               onclick="messagesPage.openChat('${chat.id}')"
               style="display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;border-radius:10px;transition:background .15s;${this.currentChatId === chat.id ? 'background:var(--bg2,rgba(124,58,237,.12));' : ''}">
            <div style="width:42px;height:42px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:14px;flex-shrink:0">${initials}</div>
            <div style="flex:1;overflow:hidden">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-weight:600;font-size:14px">${chat.firstName} ${chat.lastName || ''}</span>
                <span style="font-size:11px;color:var(--tx2,#6B6B8F)">${time}</span>
              </div>
              <div style="font-size:13px;color:var(--tx2,#6B6B8F);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${preview}</div>
            </div>
            ${unread ? `<span style="background:var(--accent,#7C3AED);color:#fff;border-radius:10px;padding:2px 7px;font-size:11px;font-weight:600">${chat.unreadCount}</span>` : ''}
          </div>`;
      }).join('');
    } catch (error) {
      if (container) container.innerHTML = `<div style="padding:20px;color:#F87171">Ошибка: ${error.message}</div>`;
    }
  },

  async openChat(userId) {
    this.currentChatId = userId;

    // Обновляем URL без перезагрузки
    window.history.replaceState({}, '', `/messages/${userId}`);

    // Подсвечиваем активный чат
    document.querySelectorAll('.chat-item').forEach(el => {
      el.classList.remove('active');
      el.style.background = '';
    });
    const items = document.querySelectorAll('.chat-item');
    items.forEach(el => {
      if (el.getAttribute('onclick')?.includes(userId)) {
        el.style.background = 'var(--bg2,rgba(124,58,237,.12))';
      }
    });

    // Загружаем сообщения
    await this.loadMessages(userId);

    // Запускаем поллинг
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => this.loadMessages(userId), 5000);
  },

  async loadMessages(userId) {
    const container = document.getElementById('messages-feed');
    if (!container) return;

    try {
      const messages = await API.getMessages(userId);
      const currentUserId = store.state.user?.id;

      container.innerHTML = messages.map(m => {
        const isOwn = m.fromId === currentUserId;
        return `
          <div style="display:flex;justify-content:${isOwn ? 'flex-end' : 'flex-start'};margin:4px 0">
            <div style="max-width:70%;background:${isOwn ? 'var(--accent,#7C3AED)' : 'var(--bg2,rgba(255,255,255,.08))'};color:${isOwn ? '#fff' : 'var(--tx1,#E8E4FF)'};padding:10px 14px;border-radius:${isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};font-size:14px;line-height:1.4">
              ${utils.formatText(m.text)}
              <div style="font-size:10px;opacity:.6;margin-top:4px;text-align:right">${utils.formatTime(m.createdAt)}</div>
            </div>
          </div>`;
      }).join('');

      // Скроллим вниз
      container.scrollTop = container.scrollHeight;
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  },

  async sendMessage() {
    const input = document.getElementById('msg-input');
    const text = input?.value.trim();
    if (!text || !this.currentChatId) return;

    try {
      const msg = await API.sendMessage(this.currentChatId, text);
      input.value = '';
      store.dispatch('addMessage', msg);
      await this.loadMessages(this.currentChatId);
    } catch (error) {
      utils.showToast('Ошибка отправки: ' + error.message, 'error');
    }
  },

  setupEventListeners() {
    // Enter для отправки
    const input = document.getElementById('msg-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    // Очищаем поллинг при уходе со страницы
    window.addEventListener('popstate', () => {
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
    }, { once: true });
  }
};

window.messagesPage = messagesPage;
