(function () {
  'use strict';
  const PUBLIC_PAGES = ['index.html','']; 
  const current = location.pathname.split('/').pop();
  if (!PUBLIC_PAGES.includes(current) && !window.CORE.getCurrentUser()) {
    location.href = 'index.html';
    return;
  }

  let toastTimer = null;
  window.toast = function (msg, ok) {
    let el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.toggle('ok', !!ok);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  };

  window.escapeHTML = function (s) {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  };

  window.renderNav = function () {
    const nav = document.getElementById('topnav');
    if (!nav) return;
    const u = window.CORE.getCurrentUser();
    const tabs = [
      { id:'index.html', label:'Home' }, { id:'descobrir.html', label:'Descobrir' },
      { id:'avatar.html', label:'Avatar' }, { id:'mercado.html', label:'Mercado' },
      { id:'custards.html', label:'Custards' }, { id:'codigos.html', label:'Códigos' },
      { id:'studio.html', label:'Studio' }
    ];
    const cur = location.pathname.split('/').pop() || 'index.html';
    let userArea = '';
    if (u) {
      const bodyColor = (window.CORE.getMarketItem(u.avatar.body) || {}).color || '#7b2fbe';
      userArea = `
        <div class="user-area">
          <div class="balance-chip">💰 ${u.custards}</div>
          <div class="user-chip"><span class="mini-avatar" style="background:${bodyColor}"></span>@${window.escapeHTML(u.username)}</div>
          <button class="btn" onclick="window.CORE.logout();location.href='index.html'">Sair</button>
        </div>`;
    }
    nav.innerHTML = `
      <div class="logo" onclick="location.href='index.html'">CUSTARD<span>BRICKS</span></div>
      <div class="nav-links">
        ${tabs.map(t => `<button class="nav-link ${t.id === cur ? 'active' : ''}" onclick="location.href='${t.id}'">${t.label}</button>`).join('')}
      </div>
      ${userArea}
    `;
  };

  window.addEventListener('focus', () => { if (window.CORE.getCurrentUser()) window.renderNav(); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderNav);
  else renderNav();
})();
