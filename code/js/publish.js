(function () {
  let panel;
  let button;
  let status;
  let active = false;
  let busy = false;
  let savedDuringPublish = false;
  let pending;
  let pollTimer;
  const storageKey = 'portfolio-pending-publication';

  function message(text, error = false) {
    status.textContent = text;
    status.classList.toggle('is-error', error);
  }

  async function request(method) {
    const user = PortfolioFirebase.getAuthReady()?.currentUser;
    if (!PortfolioFirebase.isAdminUser(user)) throw new Error('请重新登录管理员账号。');
    const token = await user.getIdToken();
    const response = await fetch('/api/publish', {
      method, headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store', signal: AbortSignal.timeout(25000)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '发布服务暂时不可用，请稍后重试。');
    return result;
  }

  function remember(value) {
    pending = value;
    try {
      if (value) localStorage.setItem(storageKey, JSON.stringify(value));
      else localStorage.removeItem(storageKey);
    } catch {}
  }

  async function checkOnline() {
    if (!active || !pending) return;
    const target = pending;
    try {
      const response = await fetch(`published.json?version=${encodeURIComponent(pending.version)}`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('读取线上版本失败');
      const online = await response.json();
      if (!active || pending?.version !== target.version) return;
      if (online.version === target.version) {
        remember(null);
        busy = false;
        button.disabled = false;
        button.textContent = '发布';
        message(`已上线 · ${new Date(online.publishedAt).toLocaleString('zh-CN')}${savedDuringPublish ? '；另有已保存修改，需再次发布。' : ''}`);
        globalThis.portfolioPublication = online;
        return;
      }
    } catch {}
    if (!active || pending?.version !== target.version) return;
    if (Date.now() - target.startedAt >= 180000) {
      busy = false;
      button.disabled = false;
      button.textContent = '重试发布';
      message('尚未确认上线，请稍后刷新核对或重试。云端修改已保留。', true);
      return;
    }
    pollTimer = setTimeout(checkOnline, 4000);
  }

  async function publish() {
    if (busy) return;
    if (document.querySelector('.modal-overlay.active')) {
      message('请先保存或取消当前编辑，再发布。', true);
      return;
    }
    busy = true;
    savedDuringPublish = false;
    button.disabled = true;
    button.textContent = '发布中…';
    message('正在准备已保存内容，请保持网络连接。');
    try {
      const result = await request('POST');
      remember({ version: result.version, startedAt: Date.now() });
      message('发布请求已提交，正在等待网站更新。');
      await checkOnline();
    } catch (error) {
      busy = false;
      button.disabled = false;
      button.textContent = '重试发布';
      message(error.name === 'TimeoutError' || error.name === 'TypeError'
        ? '发布结果暂未确认，请保持 VPN 开启，刷新后核对状态。'
        : error.message, true);
    }
  }

  async function setActive(value) {
    active = value;
    panel.hidden = !value;
    clearTimeout(pollTimer);
    if (!value) return;
    try { pending = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch { pending = null; }
    if (pending && (typeof pending.version !== 'string' || !Number.isFinite(pending.startedAt))) remember(null);
    message('正在核对云端修改与已发布版本…');
    button.disabled = true;
    try {
      const state = await request('GET');
      if (!active) return;
      if (state.pending) {
        savedDuringPublish = state.changed;
        remember({ version: state.version, startedAt: pending?.version === state.version ? pending.startedAt : Date.parse(state.publishedAt) });
        busy = true;
        button.textContent = '发布中…';
        message('正在核对发布结果…');
        await checkOnline();
      } else {
        remember(null);
        busy = false;
        button.disabled = !state.configured;
        button.textContent = '发布';
        message(!state.configured ? '发布服务尚未配置，修改可以保存到云端。' : state.changed
          ? '云端有已保存的修改，尚未发布。'
          : `当前已发布 · ${new Date(state.publishedAt).toLocaleString('zh-CN')}`);
      }
    } catch (error) {
      busy = false;
      button.disabled = false;
      message(error.message || '无法核对状态，请检查 VPN 后重试。', true);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    panel = document.createElement('section');
    panel.className = 'publication-panel';
    panel.setAttribute('aria-label', '内容发布');
    panel.hidden = true;
    panel.innerHTML = '<div class="publication-copy"><strong>内容管理</strong><p>编辑与发布请保持 VPN 开启。保存到云端后，点击发布才会更新公开页面。</p><p class="publication-status" role="status" aria-live="polite"></p></div><button class="btn btn-solid" type="button">发布</button>';
    document.querySelector('nav').after(panel);
    button = panel.querySelector('button');
    status = panel.querySelector('[role="status"]');
    button.addEventListener('click', publish);
  });
  globalThis.addEventListener('portfolio-draft-saved', () => {
    if (busy) savedDuringPublish = true;
    if (active) message(busy ? '发布进行中；刚保存的修改需要在本次上线后再次发布。' : '修改已保存到云端，尚未发布。');
  });
  globalThis.PortfolioPublish = { setActive };
})();
