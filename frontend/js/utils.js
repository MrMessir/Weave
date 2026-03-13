// frontend/js/utils.js
const utils = {
  showToast(message, type = 'info', duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  },
  
  formatTime(isoString) {
    if (!isoString) return 'только что';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    return date.toLocaleDateString();
  },
  
  formatText(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/#(\w+)/g, '<span class="tag" onclick="utils.searchTag(\'#$1\')">#$1</span>')
      .replace(/@(\w+)/g, '<span class="mention" onclick="utils.goToProfile(\'$1\')">@$1</span>');
  },
  
  searchTag(tag) {
    document.getElementById('srch').value = tag;
    if (window.feedPage) {
      window.feedPage.search(tag);
    } else {
      router.navigate(`/feed?tag=${encodeURIComponent(tag)}`);
    }
  },
  
  goToProfile(username) {
    router.navigate(`/profile/${username}`);
  },
  
  openLightbox(src) {
    const lb = document.createElement('div');
    lb.className = 'lb';
    lb.style.cssText = 'position:fixed; inset:0; z-index:400; background:rgba(0,0,0,.92); display:flex; align-items:center; justify-content:center;';
    lb.innerHTML = `
      <button class="lb-x" style="position:absolute; top:18px; right:18px; width:38px; height:38px; border-radius:50%; background:rgba(255,255,255,.1); border:none; cursor:pointer; color:#fff; display:grid; place-items:center;" onclick="this.parentElement.remove()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <img src="${src}" style="max-width:90vw; max-height:90vh; border-radius:12px; object-fit:contain;"/>
    `;
    lb.onclick = (e) => { if (e.target === lb) lb.remove(); };
    document.body.appendChild(lb);
  },
  
  growTextarea(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  },
  
  getAvatarColor(index = 0) {
    const colors = [
      'linear-gradient(135deg,#7C3AED,#2563EB)',
      'linear-gradient(135deg,#DB2777,#7C3AED)',
      'linear-gradient(135deg,#059669,#2563EB)',
      'linear-gradient(135deg,#D97706,#DB2777)',
      'linear-gradient(135deg,#06B6D4,#7C3AED)',
      'linear-gradient(135deg,#7C3AED,#06B6D4)'
    ];
    return colors[index % colors.length];
  }
};

// Делаем утилиты глобальными
window.utils = utils;