/* ============================================
   works.js - 作品分页 + 管理员 CRUD
   ============================================ */

let allProjects = [];
let filteredProjects = [];
let portfolioData = null;
let currentPage = 1;
let isAdminMode = false;
let editingProjectId = null;
let deleteTargetId = null;

const PAGE_SIZE = 9;
const SESSION_KEY = 'portfolio_admin_auth';

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value || '';
  return div.innerHTML;
}

function escapeUrl(value) {
  if (!value) return '#';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `https://${value}`;
}

function generateId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function getProjectNoteKey(value) {
  return `${String(value?.title || value?.name || '').trim()}|${String(value?.url || '').trim()}`;
}

function collectWorkProjects(data) {
  if (!data || !Array.isArray(data.categories)) return [];
  const noteKeys = new Set((Array.isArray(data.notes) ? data.notes : []).map(getProjectNoteKey));
  const projects = [];

  data.categories.forEach((cat) => {
    (cat.projects || []).forEach((p) => {
      if (noteKeys.has(getProjectNoteKey(p))) return;
      projects.push({ ...p, categoryName: cat.name });
    });
  });

  return projects;
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
  renderProjects();
}

function exitAdminMode() {
  isAdminMode = false;
  sessionStorage.removeItem(SESSION_KEY);
  PortfolioFirebase.signOutAdmin();
  setManageButtonState();
  renderProjects();
}

function toggleAdminMode() {
  if (isAdminMode) { exitAdminMode(); showToast('已退出管理模式'); return; }
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

function showFormModal(project) {
  editingProjectId = project ? project.id : null;
  setFormError('');
  document.getElementById('formModalTitle').textContent = project ? '编辑作品' : '添加作品';
  document.getElementById('inputName').value = project ? project.name : '';
  document.getElementById('inputUrl').value = project ? (project.url || '') : '';
  document.getElementById('inputDesc').value = project ? (project.description || '') : '';
  document.getElementById('inputTags').value = project && Array.isArray(project.tags) ? project.tags.join(', ') : '';
  document.getElementById('formModal').classList.add('active');
  setTimeout(() => document.getElementById('inputName').focus(), 100);
}

function hideFormModal() {
  document.getElementById('formModal').classList.remove('active');
  editingProjectId = null;
  setFormError('');
}

async function saveProject() {
  if (!isSignedInAdmin()) { setFormError('请先登录管理员账号'); return; }
  const name = document.getElementById('inputName').value.trim();
  const url = document.getElementById('inputUrl').value.trim();
  const description = document.getElementById('inputDesc').value.trim();
  const rawTags = document.getElementById('inputTags').value.trim();
  const tags = rawTags ? rawTags.split(/[,，\n]+/).map(t => t.trim()).filter(Boolean) : [];
  if (!name) { setFormError('作品名称不能为空'); document.getElementById('inputName').focus(); return; }

  const previousData = cloneData(portfolioData);
  const firstCat = portfolioData.categories[0];
  if (!firstCat) { setFormError('数据异常'); return; }

  if (editingProjectId) {
    // Find project across categories
    for (const cat of portfolioData.categories) {
      const idx = (cat.projects || []).findIndex(p => p.id === editingProjectId);
      if (idx !== -1) {
        cat.projects[idx] = { ...cat.projects[idx], name, url, description, tags };
        break;
      }
    }
  } else {
    firstCat.projects.push({ id: generateId(), name, url, description, tags, status: '待补充', createdAt: new Date().toISOString().slice(0, 10) });
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
  showToast(editingProjectId ? '作品已更新' : '作品已添加');
}

function confirmDelete(projectId, projectName) {
  deleteTargetId = projectId;
  document.getElementById('confirmProjectName').textContent = `「${projectName}」`;
  document.getElementById('confirmModal').classList.add('active');
}

function hideConfirmModal() {
  document.getElementById('confirmModal').classList.remove('active');
  deleteTargetId = null;
}

async function executeDelete() {
  if (!deleteTargetId || !isSignedInAdmin()) return;
  const previousData = cloneData(portfolioData);
  for (const cat of portfolioData.categories) {
    cat.projects = (cat.projects || []).filter(p => p.id !== deleteTargetId);
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
  showToast('作品已删除');
}

/* --- Featured toggle --- */
async function toggleFeatured(projectId, isFeatured) {
  if (!isSignedInAdmin()) return;
  const previousData = cloneData(portfolioData);
  let featured = Array.isArray(portfolioData.featuredWorks) ? [...portfolioData.featuredWorks] : [];
  if (isFeatured) {
    featured = featured.filter(id => id !== projectId);
  } else {
    if (!featured.includes(projectId)) featured.push(projectId);
  }
  portfolioData.featuredWorks = featured;
  const saveResult = await PortfolioFirebase.savePortfolioData(portfolioData);
  if (!saveResult.ok) {
    portfolioData = previousData;
    showToast('保存失败', 'error');
    return;
  }
  renderProjects();
  showToast(isFeatured ? '已取消精选' : '已设为精选');
}

/* --- Rendering --- */
function applyFilters() {
  const query = (document.getElementById('worksSearchInput')?.value || '').trim().toLowerCase();
  filteredProjects = allProjects.filter((p) => {
    if (query) {
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      if (!name.includes(query) && !desc.includes(query)) return false;
    }
    return true;
  });
  renderProjects();
  renderPagination();
}

function renderAdminExtra() {
  const cards = document.querySelectorAll('.project-card');
  cards.forEach((card) => {
    card.classList.add('admin-mode');
  });
  // Add action buttons to each card
  document.querySelectorAll('.project-card').forEach((card) => {
    if (card.querySelector('.project-actions')) return;
    const pid = card.dataset.projectId;
    if (!pid) return;
    const project = allProjects.find(p => p.id === pid);
    if (!project) return;
    const isFeatured = Array.isArray(portfolioData.featuredWorks) && portfolioData.featuredWorks.includes(pid);
    const actions = document.createElement('div');
    actions.className = 'project-actions';
    actions.addEventListener('click', (event) => {
      event.stopPropagation();
    });
    actions.innerHTML = `
      <button type="button" class="btn btn-sm ${isFeatured ? 'btn-solid' : 'btn-outline'}" onclick="event.stopPropagation(); window.toggleFeatured('${pid}', ${isFeatured})">${isFeatured ? '★ 精选' : '☆ 标记精选'}</button>
      <button type="button" class="btn btn-outline btn-sm" onclick="event.stopPropagation(); window.editProject('${pid}')">✏ 编辑</button>
      <button type="button" class="btn btn-danger btn-sm" onclick="event.stopPropagation(); window.confirmDelete('${pid}','${escapeHtml(project.name).replace(/'/g, "\\'")}')">🗑 删除</button>
    `;
    card.appendChild(actions);
  });
  // Show manage button for fab visibility
}

function renderProjects() {
  const grid = document.getElementById('worksGrid');
  if (!grid) return;

  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageProjects = filteredProjects.slice(start, end);

  if (!filteredProjects.length) {
    grid.innerHTML = '<div class="empty-state fade-in"><span class="empty-icon">🔍</span><p>暂无匹配作品</p></div>';
    return;
  }

  const featuredWorks = Array.isArray(portfolioData?.featuredWorks) ? portfolioData.featuredWorks : [];

  grid.innerHTML = pageProjects.map((project, idx) => {
    const tags = Array.isArray(project.tags) ? project.tags : [];
    const isFeatured = featuredWorks.includes(project.id);
    const isLinked = !isAdminMode && project.url;
    const clickAttrs = isLinked
      ? `onclick="window.open('${escapeUrl(project.url)}','_blank')"`
      : '';
    const cardClasses = [
      'project-card',
      isFeatured ? 'project-card-featured' : '',
      isLinked ? 'project-card-clickable' : '',
      isAdminMode ? 'admin-mode' : '',
      'reveal',
      `delay-${Math.min(idx + 1, 6)}`
    ].filter(Boolean).join(' ');

    return `
      <div class="${cardClasses}" data-project-id="${project.id}" ${clickAttrs}>
        <div class="card-body">
          <div class="project-card-topline">
            <span class="project-kicker">${escapeHtml(project.categoryName || '作品')}</span>
            ${isFeatured ? '<span class="project-featured-badge">精选</span>' : ''}
          </div>
          <div class="project-name">${escapeHtml(project.name)}</div>
          <div class="project-desc">${escapeHtml(project.description || '暂无简介')}</div>
          <div class="project-meta">
            <div class="tag-list project-tag-list">
              ${tags.length ? tags.map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join('') : '<span class="tag-pill tag-empty">暂无标签</span>'}
            </div>
          </div>
        </div>
        ${!isAdminMode && project.url ? `
          <div class="card-footer">
            <a href="${escapeUrl(project.url)}" target="_blank" class="project-link-btn" draggable="false" onclick="event.stopPropagation();">查看作品<span class="project-link-arrow">→</span></a>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  if (isAdminMode) renderAdminExtra();

  requestAnimationFrame(() => {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
  });
}

function renderPagination() {
  const container = document.getElementById('worksPagination');
  if (!container) return;
  const totalPages = Math.ceil(filteredProjects.length / PAGE_SIZE);
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = `<span class="page-btn${currentPage === 1 ? ' disabled' : ''}" data-page="${currentPage - 1}">← 上一页</span>`;
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);

  if (startPage > 1) {
    html += `<span class="page-btn" data-page="1">1</span>`;
    if (startPage > 2) html += `<span class="page-ellipsis">...</span>`;
  }
  for (let i = startPage; i <= endPage; i++) html += `<span class="page-btn${i === currentPage ? ' active' : ''}" data-page="${i}">${i}</span>`;
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += `<span class="page-ellipsis">...</span>`;
    html += `<span class="page-btn" data-page="${totalPages}">${totalPages}</span>`;
  }
  html += `<span class="page-btn${currentPage === totalPages ? ' disabled' : ''}" data-page="${currentPage + 1}">下一页 →</span>`;
  container.innerHTML = html;

  container.querySelectorAll('.page-btn:not(.disabled)').forEach((btn) => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page, 10);
      if (page >= 1 && page <= totalPages) {
        currentPage = page;
        applyFilters();
        document.getElementById('worksGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

function initSearch() {
  const input = document.getElementById('worksSearchInput');
  if (!input) return;
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { currentPage = 1; applyFilters(); }, 300);
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
  allProjects = collectWorkProjects(portfolioData);
  filteredProjects = [...allProjects];
  currentPage = 1;
  applyFilters();
}

async function bootstrapWorks() {
  const grid = document.getElementById('worksGrid');
  if (grid) grid.innerHTML = '<div class="empty-state fade-in"><span class="empty-icon" aria-hidden="true"><svg class="works-loading-icon" viewBox="0 0 36 36" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="8" width="22" height="20" rx="6" stroke="var(--border-color)" stroke-width="1.8"/><path d="M12 14h12M12 19h8M12 24h6" stroke="var(--accent-blue)" stroke-width="1.8"/><path d="M25 21v5M22.5 23.5h5" stroke="var(--accent-orange)" stroke-width="1.8"/></svg></span><p>正在加载作品数据...</p></div>';

  const initResult = await PortfolioFirebase.initFirebase();
  if (!initResult.ok) {
    if (grid) grid.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠</span><p>${escapeHtml(initResult.error)}</p><button class="btn btn-outline btn-sm" onclick="location.reload()" style="margin-top:16px;">重新加载</button></div>`;
    return;
  }

  const dataResult = await PortfolioFirebase.loadPortfolioData();
  if (!dataResult.ok) {
    if (grid) grid.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠</span><p>${escapeHtml(dataResult.error || '数据加载失败')}</p><button class="btn btn-outline btn-sm" onclick="location.reload()" style="margin-top:16px;">重新加载</button></div>`;
    return;
  }

  portfolioData = dataResult.data;
  allProjects = collectWorkProjects(portfolioData);
  filteredProjects = [...allProjects];
  applyFilters();
  initSearch();

  // Restore admin mode if session valid
  if (PortfolioFirebase.isAdminUser(initResult.auth?.currentUser) && sessionStorage.getItem(SESSION_KEY) === 'true') {
    enterAdminMode();
  }
}

// Expose globals for HTML onclick
window.editProject = function(pid) {
  if (!isSignedInAdmin()) return;
  const project = allProjects.find(p => p.id === pid);
  if (project) showFormModal(project);
};
window.confirmDelete = confirmDelete;
window.toggleFeatured = toggleFeatured;

document.addEventListener('DOMContentLoaded', () => {
  initBackToTop();

  bootstrapWorks().catch((error) => {
    const grid = document.getElementById('worksGrid');
    if (grid) grid.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠</span><p>页面初始化失败：${error && error.message ? escapeHtml(error.message) : '未知错误'}</p><button class="btn btn-outline btn-sm" onclick="location.reload()" style="margin-top:16px;">重新加载</button></div>`;
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

  document.getElementById('btnFormSave')?.addEventListener('click', saveProject);
  document.getElementById('btnFormCancel')?.addEventListener('click', hideFormModal);
  document.getElementById('formModal')?.addEventListener('click', function(e) { if (e.target === this) hideFormModal(); });

  document.getElementById('btnConfirmDelete')?.addEventListener('click', executeDelete);
  document.getElementById('btnConfirmCancel')?.addEventListener('click', hideConfirmModal);
  document.getElementById('confirmModal')?.addEventListener('click', function(e) { if (e.target === this) hideConfirmModal(); });
});
