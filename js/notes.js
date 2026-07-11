/* ============================================
   notes.js - 笔记分页 + 管理员 CRUD
   ============================================ */

let allNotes = [];
let portfolioData = null;
let currentPage = 1;
let isAdminMode = false;
let editingNoteId = null;
let deleteTargetId = null;

const PAGE_SIZE = 6;
const SESSION_KEY = 'portfolio_admin_auth';
const NOTE_ICON_PATHS = {
  default: 'assets/notes-icons/note-default.svg',
  featured: 'assets/notes-icons/note-featured.svg',
  ai: 'assets/notes-icons/note-ai.svg',
  docs: 'assets/notes-icons/note-docs.svg',
  analytics: 'assets/notes-icons/note-analytics.svg',
  live: 'assets/notes-icons/note-live.svg'
};
const CATEGORY_ICON_MAP = {
  'ai学习': NOTE_ICON_PATHS.ai,
  'ai学习合集': NOTE_ICON_PATHS.ai,
  '常用文档': NOTE_ICON_PATHS.docs,
  '数据分析': NOTE_ICON_PATHS.analytics,
  '用户行为': NOTE_ICON_PATHS.live,
  '直播': NOTE_ICON_PATHS.live
};
const TAG_ICON_RULES = [
  { icon: NOTE_ICON_PATHS.analytics, keywords: ['数据分析', 'sql', 'bi', '报表', '分析', '指标', '监控'] },
  { icon: NOTE_ICON_PATHS.ai, keywords: ['ai', 'agent', '提示词', '模型', '大模型', '自动化'] },
  { icon: NOTE_ICON_PATHS.docs, keywords: ['文档', '资料', '清单', '模板', '手册'] },
  { icon: NOTE_ICON_PATHS.live, keywords: ['直播', '用户行为', '复盘', '演示', '转化', '增长'] }
];

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value || '';
  return div.innerHTML;
}

function generateId() {
  return `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function normalizeMatchValue(value) {
  return String(value || '').trim().toLowerCase();
}

function renderIconImage(src, className) {
  return `<img src="${src}" alt="" aria-hidden="true" class="${className}" loading="lazy" decoding="async">`;
}

function renderEmptyState(message, iconSrc = NOTE_ICON_PATHS.default, actionHtml = '') {
  return `
    <div class="empty-state" style="grid-column:1/-1;">
      <span class="empty-icon">${renderIconImage(iconSrc, 'empty-icon-image')}</span>
      <p>${escapeHtml(message)}</p>
      ${actionHtml}
    </div>
  `;
}

function resolveNoteIcon(note, isFeatured) {
  if (isFeatured) return NOTE_ICON_PATHS.featured;

  const category = normalizeMatchValue(note?.category);
  if (category && CATEGORY_ICON_MAP[category]) {
    return CATEGORY_ICON_MAP[category];
  }

  const tagText = Array.isArray(note?.tags)
    ? note.tags.map((tag) => normalizeMatchValue(tag)).join(' ')
    : '';

  for (const rule of TAG_ICON_RULES) {
    if (rule.keywords.some((keyword) => tagText.includes(normalizeMatchValue(keyword)))) {
      return rule.icon;
    }
  }

  return NOTE_ICON_PATHS.default;
}

function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

function getFilteredNotes() {
  const query = (document.getElementById('notesSearchInput')?.value || '').trim().toLowerCase();
  if (!query) return allNotes;
  return allNotes.filter((note) => {
    const title = note.title.toLowerCase();
    const excerpt = note.excerpt.toLowerCase();
    return title.includes(query) || excerpt.includes(query);
  });
}

/* --- Admin auth --- */
function isSignedInAdmin() {
  return PortfolioFirebase.isAdminUser(PortfolioFirebase.getAuthReady()?.currentUser) &&
         sessionStorage.getItem(SESSION_KEY) === 'true';
}

function setLoginError(message) {
  const el = document.getElementById('loginError');
  if (!el) return;
  el.textContent = message;
  el.style.display = message ? 'block' : 'none';
}

function showLoginModal() {
  setLoginError('');
  document.getElementById('inputLoginPassword').value = '';
  document.getElementById('passwordModal').classList.add('active');
  setTimeout(() => document.getElementById('inputLoginPassword').focus(), 100);
}

function hideLoginModal() {
  document.getElementById('passwordModal').classList.remove('active');
}

async function verifyLogin() {
  const password = document.getElementById('inputLoginPassword').value.trim();
  if (!password) { setLoginError('请输入登录密码。'); return; }
  setLoginError('');
  const result = await PortfolioFirebase.signInAdmin(password);
  if (!result.ok) { setLoginError(result.error || '登录失败'); return; }
  hideLoginModal();
  sessionStorage.setItem(SESSION_KEY, 'true');

  // 登录后自动迁移笔记（仅首次）
  await autoMigrateNotes();

  enterAdminMode();
  showToast('管理员登录成功');
}

async function autoMigrateNotes() {
  const dataResult = await PortfolioFirebase.loadPortfolioData();
  if (!dataResult.ok) return;
  const pd = dataResult.data;
  if (Array.isArray(pd.notes) && pd.notes.length) return;
  if (!Array.isArray(pd.categories)) return;
  const notes = [];
  const workNames = ['【抖音 达人种草 数据分析 自动化报表】','【抖音电商 数据监控 BI看板】','电商 达人种草 洞察分析 报告','抖音 电商直播 用户行为 分析','日常清单网页','作品集网页','音乐合集'];
  for (const cat of pd.categories) {
    if (!Array.isArray(cat.projects)) continue;
    for (const p of cat.projects) {
      if (workNames.includes(p.name)) continue;
      notes.push({
        id: PortfolioFirebase.generateId('n'),
        title: p.name || '',
        excerpt: p.description || '',
        tags: Array.isArray(p.tags) ? p.tags : [],
        date: p.createdAt || '',
        readTime: '5 分钟阅读',
        category: cat.name || '其他',
        url: p.url || ''
      });
    }
  }
  if (!notes.length) return;
  pd.notes = notes;
  const save = await PortfolioFirebase.savePortfolioData(pd);
  if (save.ok) showToast(`笔记迁移完成: ${notes.length} 条`);
}

function setManageButtonState() {
  const fab = document.getElementById('fabManage');
  const fabAdd = document.getElementById('fabAdd');
  if (!fab || !fabAdd) return;
  if (isAdminMode) {
    fab.classList.add('active');
    fab.innerHTML = '✕';
    fabAdd.classList.add('visible');
  } else {
    fab.classList.remove('active');
    fab.innerHTML = '⚙';
    fabAdd.classList.remove('visible');
  }
}

function enterAdminMode() {
  if (!isSignedInAdmin()) { showLoginModal(); return; }
  isAdminMode = true;
  setManageButtonState();
  renderAll();
}

function exitAdminMode() {
  isAdminMode = false;
  sessionStorage.removeItem(SESSION_KEY);
  PortfolioFirebase.signOutAdmin();
  setManageButtonState();
  renderAll();
  showToast('已退出管理模式');
}

function toggleAdminMode() {
  if (isAdminMode) { exitAdminMode(); return; }
  if (isSignedInAdmin()) { enterAdminMode(); return; }
  showLoginModal();
}

/* --- CRUD --- */
function setFormError(message) {
  const el = document.getElementById('formError');
  if (!el) return;
  el.textContent = message;
  el.style.display = message ? 'block' : 'none';
}

function showFormModal(note) {
  editingNoteId = note ? note.id : null;
  setFormError('');
  document.getElementById('formModalTitle').textContent = note ? '编辑笔记' : '添加笔记';
  document.getElementById('inputTitle').value = note ? note.title : '';
  document.getElementById('inputExcerpt').value = note ? (note.excerpt || '') : '';
  document.getElementById('inputUrl').value = note ? (note.url || '') : '';
  document.getElementById('inputTags').value = note && Array.isArray(note.tags) ? note.tags.join(', ') : '';
  document.getElementById('inputCategory').value = note ? (note.category || '') : '';
  document.getElementById('formModal').classList.add('active');
  setTimeout(() => document.getElementById('inputTitle').focus(), 100);
}

function hideFormModal() {
  document.getElementById('formModal').classList.remove('active');
  editingNoteId = null;
  setFormError('');
}

async function saveNote() {
  if (!isSignedInAdmin()) { setFormError('请先登录管理员账号'); return; }
  const isEditing = Boolean(editingNoteId);
  const title = document.getElementById('inputTitle').value.trim();
  const excerpt = document.getElementById('inputExcerpt').value.trim();
  const url = document.getElementById('inputUrl').value.trim();
  const rawTags = document.getElementById('inputTags').value.trim();
  const category = document.getElementById('inputCategory').value.trim();
  const tags = rawTags ? rawTags.split(/[,，\n]+/).map(t => t.trim()).filter(Boolean) : [];
  if (!title) { setFormError('笔记标题不能为空'); document.getElementById('inputTitle').focus(); return; }

  const previousData = cloneData(portfolioData);
  if (!Array.isArray(portfolioData.notes)) portfolioData.notes = [];

  if (editingNoteId) {
    const idx = portfolioData.notes.findIndex(n => n.id === editingNoteId);
    if (idx !== -1) {
      portfolioData.notes[idx] = { ...portfolioData.notes[idx], title, excerpt, url, tags, category: category || '其他' };
    }
  } else {
    portfolioData.notes.push({
      id: generateId(),
      title,
      excerpt,
      url,
      tags,
      date: new Date().toISOString().slice(0, 10),
      readTime: '5 分钟阅读',
      category: category || '其他'
    });
  }

  const saveResult = await PortfolioFirebase.savePortfolioData(portfolioData);
  if (!saveResult.ok) {
    portfolioData = previousData;
    setFormError(saveResult.error || '保存失败');
    showToast('保存失败', 'error');
    return;
  }
  hideFormModal();
  await reloadData();
  showToast(isEditing ? '笔记已更新' : '笔记已添加');
}

function confirmDelete(noteId, noteTitle) {
  deleteTargetId = noteId;
  document.getElementById('confirmNoteTitle').textContent = `「${noteTitle}」`;
  document.getElementById('confirmModal').classList.add('active');
}

function hideConfirmModal() {
  document.getElementById('confirmModal').classList.remove('active');
  deleteTargetId = null;
}

async function executeDelete() {
  if (!deleteTargetId || !isSignedInAdmin()) return;
  const previousData = cloneData(portfolioData);
  if (Array.isArray(portfolioData.notes)) {
    portfolioData.notes = portfolioData.notes.filter(n => n.id !== deleteTargetId);
  }
  const saveResult = await PortfolioFirebase.savePortfolioData(portfolioData);
  if (!saveResult.ok) {
    portfolioData = previousData;
    document.getElementById('confirmModal').classList.remove('active');
    deleteTargetId = null;
    showToast('删除失败', 'error');
    return;
  }
  deleteTargetId = null;
  document.getElementById('confirmModal').classList.remove('active');
  await reloadData();
  showToast('笔记已删除');
}

/* --- Featured toggle --- */
async function toggleFeatured(noteId, isFeatured) {
  if (!isSignedInAdmin()) return;
  const previousData = cloneData(portfolioData);
  let featured = Array.isArray(portfolioData.featuredNotes) ? [...portfolioData.featuredNotes] : [];
  if (isFeatured) {
    featured = featured.filter(id => id !== noteId);
  } else {
    if (!featured.includes(noteId)) featured.push(noteId);
  }
  portfolioData.featuredNotes = featured;
  const saveResult = await PortfolioFirebase.savePortfolioData(portfolioData);
  if (!saveResult.ok) {
    portfolioData = previousData;
    showToast('保存失败', 'error');
    return;
  }
  renderAll();
  showToast(isFeatured ? '已取消精选' : '已设为精选');
}

/* --- Rendering --- */
function renderFeaturedNote() {
  const container = document.getElementById('featuredNoteSection');
  if (!container) return;
  container.innerHTML = '';
}

function renderNotes() {
  const grid = document.getElementById('notesGrid');
  if (!grid) return;

  const filtered = getFilteredNotes();
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageNotes = filtered.slice(start, end);
  const featuredNotes = Array.isArray(portfolioData?.featuredNotes) ? portfolioData.featuredNotes : [];

  if (!filtered.length) {
    const query = (document.getElementById('notesSearchInput')?.value || '').trim();
    grid.innerHTML = renderEmptyState(query ? '没有找到匹配的笔记' : '暂无笔记，敬请期待');
    return;
  }

  grid.innerHTML = pageNotes.map((note) => {
    const tags = Array.isArray(note.tags) ? note.tags : [];
    const isFeatured = featuredNotes.includes(note.id);
    const iconSrc = resolveNoteIcon(note, isFeatured);
    const cardActions = isAdminMode ? `
      <div class="note-card-footer" style="border-top:1px solid var(--border-light);padding-top:12px;margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-xs ${isFeatured ? 'btn-solid' : 'btn-outline'}" onclick="window.toggleFeatured('${note.id}', ${isFeatured})">${isFeatured ? '★ 精选' : '☆ 标记'}</button>
        <button class="btn btn-outline btn-xs" onclick="window.editNote('${note.id}')">✏ 编辑</button>
        <button class="btn btn-danger btn-xs" onclick="window.confirmDelete('${note.id}','${escapeHtml(note.title).replace(/'/g, "\\'")}')">🗑 删除</button>
      </div>
    ` : '';

    return `
      <div class="note-card">
        <div class="note-card-icon">${renderIconImage(iconSrc, 'note-card-icon-image')}</div>
        ${isFeatured ? '<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:var(--accent-orange-light);color:var(--accent-orange);font-size:11px;font-weight:600;margin-bottom:8px;">精选笔记</span>' : ''}
        <h3 class="note-card-title">${escapeHtml(note.title)}</h3>
        <p class="note-card-excerpt">${escapeHtml(note.excerpt || '')}</p>
        <div class="note-card-tags">${tags.map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join('')}</div>
        <div class="note-card-footer">
          <span>${escapeHtml(note.date || '')}</span>
          ${note.url ? `<a href="${escapeHtml(note.url)}" target="_blank" rel="noopener" class="note-card-read" onclick="event.stopPropagation();">阅读全文</a>` : '<span class="note-card-read">阅读全文</span>'}
        </div>
        ${cardActions}
      </div>
    `;
  }).join('');
}

function renderPagination() {
  const container = document.getElementById('notesPagination');
  if (!container) return;
  const filtered = getFilteredNotes();
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = `<button type="button" class="page-btn" data-page="${currentPage - 1}"${currentPage === 1 ? ' disabled' : ''}>← 上一页</button>`;
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);

  if (startPage > 1) {
    html += '<button type="button" class="page-btn" data-page="1">1</button>';
    if (startPage > 2) html += `<span class="page-ellipsis">...</span>`;
  }
  for (let i = startPage; i <= endPage; i++) {
    html += `<button type="button" class="page-btn${i === currentPage ? ' active' : ''}" data-page="${i}"${i === currentPage ? ' aria-current="page"' : ''}>${i}</button>`;
  }
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += `<span class="page-ellipsis">...</span>`;
    html += `<button type="button" class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
  }
  html += `<button type="button" class="page-btn" data-page="${currentPage + 1}"${currentPage === totalPages ? ' disabled' : ''}>下一页 →</button>`;
  container.innerHTML = html;

  container.querySelectorAll('.page-btn:not(:disabled)').forEach((btn) => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page, 10);
      if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderAll();
        document.getElementById('notesGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

function renderAll() {
  renderFeaturedNote();
  renderNotes();
  renderPagination();
}

function initSearch() {
  const input = document.getElementById('notesSearchInput');
  if (!input) return;
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { currentPage = 1; renderAll(); }, 300);
  });
}

function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 300));
}

async function reloadData() {
  const result = await PortfolioFirebase.loadPortfolioData();
  if (!result.ok) return;
  portfolioData = result.data;
  allNotes = Array.isArray(portfolioData.notes) ? [...portfolioData.notes] : [];
  currentPage = 1;
  renderAll();
}

async function bootstrapNotes() {
  const grid = document.getElementById('notesGrid');
  if (grid) grid.innerHTML = renderEmptyState('正在加载笔记数据...');

  const initResult = await PortfolioFirebase.initFirebase();
  if (!initResult.ok) {
    if (grid) grid.innerHTML = renderEmptyState(initResult.error || '初始化失败', NOTE_ICON_PATHS.default, '<div class="mt-16"><button class="btn btn-outline btn-sm" onclick="location.reload()">重新加载</button></div>');
    return;
  }

  const dataResult = await PortfolioFirebase.loadPortfolioData();
  if (!dataResult.ok) {
    if (grid) grid.innerHTML = renderEmptyState(dataResult.error || '数据加载失败', NOTE_ICON_PATHS.default, '<div class="mt-16"><button class="btn btn-outline btn-sm" onclick="location.reload()">重新加载</button></div>');
    return;
  }

  portfolioData = dataResult.data;
  allNotes = Array.isArray(portfolioData.notes) ? [...portfolioData.notes] : [];

  if (!allNotes.length) {
    if (grid) grid.innerHTML = renderEmptyState('暂无笔记，点击右下角 + 添加第一篇笔记吧');
    return;
  }

  renderAll();
  initSearch();

  // Restore admin mode
  if (PortfolioFirebase.isAdminUser(initResult.auth?.currentUser) && sessionStorage.getItem(SESSION_KEY) === 'true') {
    enterAdminMode();
  }
}

// Expose globals
window.editNote = function(nid) {
  if (!isSignedInAdmin()) return;
  const note = allNotes.find(n => n.id === nid);
  if (note) showFormModal(note);
};
window.confirmDelete = confirmDelete;
window.toggleFeatured = toggleFeatured;

document.addEventListener('DOMContentLoaded', () => {
  initBackToTop();

  bootstrapNotes().catch((error) => {
    const grid = document.getElementById('notesGrid');
    if (grid) grid.innerHTML = renderEmptyState(`页面初始化失败：${error && error.message ? error.message : '未知错误'}`, NOTE_ICON_PATHS.default, '<div class="mt-16"><button class="btn btn-outline btn-sm" onclick="location.reload()">重新加载</button></div>');
  });

  document.getElementById('fabManage')?.addEventListener('click', toggleAdminMode);
  document.getElementById('fabAdd')?.addEventListener('click', () => {
    if (!isSignedInAdmin()) { showLoginModal(); return; }
    showFormModal(null);
  });
  document.getElementById('btnPwdConfirm')?.addEventListener('click', verifyLogin);
  document.getElementById('btnPwdCancel')?.addEventListener('click', hideLoginModal);
  document.getElementById('inputLoginPassword')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') verifyLogin(); });
  document.getElementById('passwordModal')?.addEventListener('click', function(e) { if (e.target === this) hideLoginModal(); });

  document.getElementById('btnFormSave')?.addEventListener('click', saveNote);
  document.getElementById('btnFormCancel')?.addEventListener('click', hideFormModal);
  document.getElementById('formModal')?.addEventListener('click', function(e) { if (e.target === this) hideFormModal(); });

  document.getElementById('btnConfirmDelete')?.addEventListener('click', executeDelete);
  document.getElementById('btnConfirmCancel')?.addEventListener('click', hideConfirmModal);
  document.getElementById('confirmModal')?.addEventListener('click', function(e) { if (e.target === this) hideConfirmModal(); });
});
