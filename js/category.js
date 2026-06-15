/* ============================================
   category.js - 分类页作品管理
   Firebase Auth + Firestore 单文档数据源
   ============================================ */

let portfolioData = null;
let currentCategory = null;
let currentAuthUser = null;
let isAdminMode = false;
let editingProjectId = null;
let deleteTargetId = null;
let dragSourceId = null;
let editingGroupId = null;
let deleteGroupTargetId = null;

const SESSION_KEY = 'portfolio_admin_auth';

const statusClassMap = {
  已完成: 'completed',
  进行中: 'progressing',
  迭代中: 'iterating',
  待补充: 'pending'
};

const categoryAccentMap = {
  'data-analysis': '#2563eb',
  agent: '#6366f1',
  'ai-learning': '#059669'
};

function getCategoryIdFromUrl() {
  return new URLSearchParams(window.location.search).get('id') || '';
}

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

function generateGroupId() {
  return `g_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
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

function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.05, rootMargin: '0px 0px -30px 0px' }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

function initBackToTop() {
  const button = document.getElementById('backToTop');
  if (!button || button.dataset.bound === 'true') return;

  button.dataset.bound = 'true';
  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('scroll', () => {
    button.classList.toggle('visible', window.scrollY > 300);
  });
}

function setManageButtonState() {
  const fab = document.getElementById('fabManage');
  const fabAdd = document.getElementById('fabAdd');
  const fabFolder = document.getElementById('fabFolder');
  if (!fab || !fabAdd || !fabFolder) return;

  if (isAdminMode) {
    fab.classList.add('active');
    fab.innerHTML = '✕';
    fabAdd.classList.add('visible');
    fabFolder.classList.add('visible');
    return;
  }

  fab.classList.remove('active');
  fab.innerHTML = '⚙';
  fabAdd.classList.remove('visible');
  fabFolder.classList.remove('visible');
}

function setLoginError(message) {
  const el = document.getElementById('loginError');
  if (!el) return;
  el.textContent = message;
  el.style.display = message ? 'block' : 'none';
}

function setFormError(message) {
  const el = document.getElementById('formError');
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

function renderCategoryError(message) {
  document.getElementById('categoryTitle').textContent = '加载失败';
  document.getElementById('projectGrid').innerHTML = `
    <div class="empty-state">
      <span class="empty-icon">⚠</span>
      <p>${escapeHtml(message)}</p>
      <button class="btn btn-outline btn-sm home-retry" type="button" onclick="location.reload()">重新加载</button>
    </div>
  `;
}

function renderProjectCard(project, localIndex, accent) {
  const status = project.status || '待补充';
  const tags = Array.isArray(project.tags) ? project.tags : [];
  const dragAttrs = isAdminMode ? `draggable="true" data-project-id="${project.id}"` : '';
  const clickAttrs = !isAdminMode && project.url
    ? `onclick="window.open('${escapeUrl(project.url)}','_blank')" style="cursor:pointer;"`
    : '';

  // Find group badge in admin mode
  let groupBadge = '';
  if (isAdminMode && project.groupId && currentCategory?.groups) {
    const group = currentCategory.groups.find((g) => g.id === project.groupId);
    if (group) {
      groupBadge = `<div class="project-group-badge">📁 ${escapeHtml(group.name)}</div>`;
    }
  }

  return `
    <div class="project-card reveal delay-${Math.min(localIndex + 1, 6)}${isAdminMode ? ' admin-mode' : ''}" ${dragAttrs} ${clickAttrs}>
      <div class="card-accent" style="background:linear-gradient(90deg, ${accent}, ${accent}66);"></div>
      <div class="card-body">
        ${groupBadge}
        <div class="card-index" style="border:1.5px solid ${accent}33;color:${accent};">${String(localIndex + 1).padStart(2, '0')}</div>
        <div class="project-name">${escapeHtml(project.name)}</div>
        <div class="project-desc">${escapeHtml(project.description || '暂无简介')}</div>
        <div class="project-meta">
          <span class="project-status ${statusClassMap[status] || 'pending'}">${escapeHtml(status)}</span>
          <div class="tag-list">
            ${tags.length
              ? tags.map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join('')
              : '<span class="tag-pill tag-empty">暂无标签</span>'}
          </div>
        </div>
      </div>
      ${project.url ? `
        <div class="card-footer">
          <a href="${escapeUrl(project.url)}" target="_blank" rel="noopener" class="project-link-btn" draggable="false" onclick="event.stopPropagation();">访问</a>
        </div>
      ` : ''}
      ${isAdminMode ? `
        <div class="project-actions">
          <button class="btn btn-outline btn-sm" draggable="false" onclick="editProject('${project.id}')">✏ 编辑</button>
          <button class="btn btn-danger btn-sm" draggable="false" onclick="confirmDelete('${project.id}')">🗑 删除</button>
        </div>
      ` : ''}
    </div>
  `;
}

function renderAdminProjects() {
  const grid = document.getElementById('projectGrid');
  if (!grid) return;

  const groups = currentCategory?.groups || [];
  const projects = currentCategory?.projects || [];
  const accent = categoryAccentMap[currentCategory?.id] || '#2563eb';

  // Create or get sidebar element
  let sidebar = document.getElementById('adminSidebar');
  if (!sidebar) {
    sidebar = document.createElement('div');
    sidebar.id = 'adminSidebar';
    sidebar.className = 'admin-sidebar';
    document.querySelector('.category-page').appendChild(sidebar);
  }
  sidebar.classList.add('visible');

  // Populate sidebar
  let sidebarHtml = '<div class="sidebar-title">分组</div>';
  const assignedIds = new Set();

  groups.forEach((group) => {
    const count = projects.filter((p) => p.groupId === group.id).length;
    sidebarHtml += `
      <div class="sidebar-group" data-group-id="${group.id}">
        <span>📁</span>
        <span>${escapeHtml(group.name)}</span>
        <span class="sidebar-group-count">${count}</span>
      </div>
    `;
  });

  const ungroupedCount = projects.filter((p) => !p.groupId || !groups.some((g) => g.id === p.groupId)).length;
  sidebarHtml += `
    <div class="sidebar-group" data-group-id="">
      <span>📂</span>
      <span>${groups.length ? '未分组' : '全部项目'}</span>
      <span class="sidebar-group-count">${ungroupedCount}</span>
    </div>
  `;

  sidebar.innerHTML = sidebarHtml;

  // Render project grid as flat list with sidebar offset
  grid.classList.add('has-sidebar');

  if (!projects.length) {
    grid.innerHTML = `
      <div class="empty-state fade-in">
        <span class="empty-icon">📦</span>
        <p>暂无作品</p>
      </div>
    `;
    requestAnimationFrame(() => initScrollReveal());
    return;
  }

  grid.innerHTML = projects
    .map((project, idx) => renderProjectCard(project, idx, accent))
    .join('');

  requestAnimationFrame(() => initScrollReveal());
  bindSidebarDragEvents();
}

function renderViewProjects() {
  const grid = document.getElementById('projectGrid');
  if (!grid) return;

  const projects = currentCategory && Array.isArray(currentCategory.projects) ? currentCategory.projects : [];
  const accent = categoryAccentMap[currentCategory?.id] || '#2563eb';

  if (!projects.length) {
    grid.innerHTML = `
      <div class="empty-state fade-in">
        <span class="empty-icon">📦</span>
        <p>暂无作品</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = projects
    .map((project, idx) => renderProjectCard(project, idx, accent))
    .join('');

  requestAnimationFrame(() => initScrollReveal());
}

function renderProjects() {
  if (isAdminMode) {
    renderAdminProjects();
  } else {
    renderViewProjects();
  }
}

async function loadCategory() {
  const categoryId = getCategoryIdFromUrl();
  const dataResult = await PortfolioFirebase.loadPortfolioData();

  if (!dataResult.ok) {
    renderCategoryError(dataResult.error || 'Firestore 数据加载失败');
    return;
  }

  portfolioData = dataResult.data;
  currentCategory = portfolioData.categories.find((category) => category.id === categoryId) || null;

  if (!currentCategory) {
    document.getElementById('categoryTitle').textContent = '分类未找到';
    document.getElementById('projectGrid').innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <p>分类不存在，请返回首页重新选择</p>
      </div>
    `;
    return;
  }

  document.getElementById('categoryTitle').textContent = `${currentCategory.name} · 共 ${currentCategory.projects.length} 个项目`;
  renderProjects();
}

async function bootstrapCategory() {
  const initResult = await PortfolioFirebase.initFirebase();
  if (!initResult.ok) {
    renderCategoryError(initResult.error);
    return;
  }

  currentAuthUser = initResult.auth ? initResult.auth.currentUser : null;

  PortfolioFirebase.onAuthChange(async (user) => {
    currentAuthUser = user;

    if (PortfolioFirebase.isAdminUser(user)) {
      const seedResult = await PortfolioFirebase.ensureAdminSeed();
      if (seedResult.ok && seedResult.seeded) {
        await loadCategory();
      }

      if (!isAdminMode && sessionStorage.getItem(SESSION_KEY) === 'true') {
        enterAdminMode();
      } else if (isAdminMode) {
        setManageButtonState();
        renderProjects();
      }
      return;
    }

    if (isAdminMode) {
      exitAdminMode();
      showToast('已退出管理模式', 'success');
    } else {
      setManageButtonState();
      renderProjects();
    }
  });

  await loadCategory();

  if (PortfolioFirebase.isAdminUser(currentAuthUser) && sessionStorage.getItem(SESSION_KEY) === 'true') {
    enterAdminMode();
  }
}

function isSignedInAdmin() {
  return PortfolioFirebase.isAdminUser(currentAuthUser) &&
         sessionStorage.getItem(SESSION_KEY) === 'true';
}

function enterAdminMode() {
  if (!isSignedInAdmin()) {
    showLoginModal();
    return;
  }

  isAdminMode = true;
  setManageButtonState();
  renderProjects();
}

function exitAdminMode() {
  isAdminMode = false;
  sessionStorage.removeItem(SESSION_KEY);
  PortfolioFirebase.signOutAdmin();
  document.getElementById('adminSidebar')?.classList.remove('visible');
  document.getElementById('projectGrid')?.classList.remove('has-sidebar');
  setManageButtonState();
  renderProjects();
}

function toggleAdminMode() {
  if (isAdminMode) {
    exitAdminMode();
    return;
  }

  if (isSignedInAdmin()) {
    enterAdminMode();
    return;
  }

  showLoginModal();
}

async function verifyLogin() {
  const password = document.getElementById('inputLoginPassword').value.trim();
  if (!password) {
    setLoginError('请输入登录密码。');
    return;
  }

  setLoginError('');
  const result = await PortfolioFirebase.signInAdmin(password);
  if (!result.ok) {
    setLoginError(result.error || '登录失败，请重试。');
    return;
  }

  hideLoginModal();
  currentAuthUser = result.user;
  sessionStorage.setItem(SESSION_KEY, 'true');

  const seedResult = await PortfolioFirebase.ensureAdminSeed();
  if (seedResult.ok && seedResult.seeded) {
    await loadCategory();
  }

  enterAdminMode();
  showToast('管理员登录成功', 'success');
}

function readTagsInput() {
  const raw = document.getElementById('inputTags').value.trim();
  if (!raw) return [];

  return raw
    .split(/[,，\n]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function showFormModal(project) {
  editingProjectId = project ? project.id : null;
  setFormError('');
  document.getElementById('formModalTitle').textContent = project ? '编辑作品' : '添加作品';
  document.getElementById('inputName').value = project ? project.name : '';
  document.getElementById('inputUrl').value = project ? (project.url || '') : '';
  document.getElementById('inputDesc').value = project ? (project.description || '') : '';
  document.getElementById('inputTags').value = project && Array.isArray(project.tags) ? project.tags.join(', ') : '';
  document.getElementById('selectStatus').value = project && project.status ? project.status : '待补充';
  document.getElementById('formModal').classList.add('active');
  setTimeout(() => document.getElementById('inputName').focus(), 100);
}

function hideFormModal() {
  document.getElementById('formModal').classList.remove('active');
  editingProjectId = null;
  setFormError('');
}

/* --- 分组 CRUD --- */

function setGroupFormError(message) {
  const el = document.getElementById('groupFormError');
  if (!el) return;
  el.textContent = message;
  el.style.display = message ? 'block' : 'none';
}

function showGroupFormModal(group) {
  editingGroupId = group ? group.id : null;
  setGroupFormError('');
  document.getElementById('groupFormModalTitle').textContent = group ? '编辑分组' : '新建分组';
  document.getElementById('inputGroupName').value = group ? group.name : '';
  document.getElementById('groupFormModal').classList.add('active');
  setTimeout(() => document.getElementById('inputGroupName').focus(), 100);
}

function hideGroupFormModal() {
  document.getElementById('groupFormModal').classList.remove('active');
  editingGroupId = null;
  setGroupFormError('');
}

async function saveGroup() {
  if (!isSignedInAdmin()) {
    setGroupFormError('请先使用管理员账号登录后再保存。');
    return;
  }

  const name = document.getElementById('inputGroupName').value.trim();
  if (!name) {
    setGroupFormError('分组名称不能为空。');
    document.getElementById('inputGroupName').focus();
    return;
  }

  const previousData = cloneData(portfolioData);
  const category = portfolioData.categories.find((item) => item.id === currentCategory.id);
  if (!category) {
    setGroupFormError('当前分类不存在，请刷新后重试。');
    return;
  }

  if (editingGroupId) {
    const group = category.groups.find((g) => g.id === editingGroupId);
    if (group) group.name = name;
  } else {
    category.groups.push({ id: generateGroupId(), name });
  }

  const saveResult = await PortfolioFirebase.savePortfolioData(portfolioData);
  if (!saveResult.ok) {
    portfolioData = previousData;
    currentCategory = portfolioData.categories.find((item) => item.id === currentCategory.id) || currentCategory;
    setGroupFormError(saveResult.error || '保存失败，请重试。');
    renderProjects();
    showToast('保存失败', 'error');
    return;
  }

  hideGroupFormModal();
  await loadCategory();
  if (isAdminMode) renderProjects();
  showToast(editingGroupId ? '分组已更新' : '分组已创建', 'success');
}

function confirmDeleteGroup(groupId) {
  if (!isSignedInAdmin()) return;

  const group = currentCategory.groups.find((g) => g.id === groupId);
  if (!group) return;

  deleteGroupTargetId = groupId;
  document.getElementById('confirmProjectName').textContent = `「${group.name}」`;
  document.getElementById('confirmModal').classList.add('active');
}

async function executeDeleteGroup() {
  if (!deleteGroupTargetId || !isSignedInAdmin()) return;

  const previousData = cloneData(portfolioData);
  const category = portfolioData.categories.find((item) => item.id === currentCategory.id);
  if (!category) return;

  category.groups = category.groups.filter((g) => g.id !== deleteGroupTargetId);
  category.projects.forEach((p) => {
    if (p.groupId === deleteGroupTargetId) p.groupId = null;
  });

  const saveResult = await PortfolioFirebase.savePortfolioData(portfolioData);
  if (!saveResult.ok) {
    portfolioData = previousData;
    currentCategory = portfolioData.categories.find((item) => item.id === currentCategory.id) || currentCategory;
    deleteGroupTargetId = null;
    document.getElementById('confirmModal').classList.remove('active');
    renderProjects();
    showToast(saveResult.error || '删除分组失败，请重试。', 'error');
    return;
  }

  deleteGroupTargetId = null;
  document.getElementById('confirmModal').classList.remove('active');
  await loadCategory();
  if (isAdminMode) renderProjects();
  showToast('分组已删除', 'success');
}

async function saveProject() {
  if (!isSignedInAdmin()) {
    setFormError('请先使用管理员账号登录后再保存。');
    return;
  }

  const name = document.getElementById('inputName').value.trim();
  const url = document.getElementById('inputUrl').value.trim();
  const description = document.getElementById('inputDesc').value.trim();
  const tags = readTagsInput();
  const status = document.getElementById('selectStatus').value;

  if (!name) {
    setFormError('作品名称不能为空。');
    document.getElementById('inputName').focus();
    return;
  }

  const previousData = cloneData(portfolioData);
  const category = portfolioData.categories.find((item) => item.id === currentCategory.id);
  if (!category) {
    setFormError('当前分类不存在，请刷新后重试。');
    return;
  }

  if (editingProjectId) {
    const targetIndex = category.projects.findIndex((project) => project.id === editingProjectId);
    if (targetIndex !== -1) {
      category.projects[targetIndex] = {
        ...category.projects[targetIndex],
        name,
        url,
        description,
        tags,
        status
      };
    }
  } else {
    category.projects.push({
      id: generateId(),
      name,
      url,
      description,
      tags,
      status,
      createdAt: new Date().toISOString().slice(0, 10)
    });
  }

  const saveResult = await PortfolioFirebase.savePortfolioData(portfolioData);
  if (!saveResult.ok) {
    portfolioData = previousData;
    currentCategory = portfolioData.categories.find((item) => item.id === currentCategory.id) || currentCategory;
    setFormError(saveResult.error || '保存失败，请重试。');
    renderProjects();
    showToast('保存失败', 'error');
    return;
  }

  hideFormModal();
  await loadCategory();
  if (isAdminMode) renderProjects();
  showToast(editingProjectId ? '作品已更新' : '作品已添加', 'success');
}

function confirmDelete(projectId) {
  if (!isSignedInAdmin()) return;

  const project = currentCategory.projects.find((item) => item.id === projectId);
  if (!project) return;

  deleteTargetId = projectId;
  document.getElementById('confirmProjectName').textContent = `「${project.name}」`;
  document.getElementById('confirmModal').classList.add('active');
}

async function executeDelete() {
  // If a group delete is pending, handle it
  if (deleteGroupTargetId) {
    await executeDeleteGroup();
    return;
  }

  if (!deleteTargetId || !isSignedInAdmin()) return;

  const previousData = cloneData(portfolioData);
  const category = portfolioData.categories.find((item) => item.id === currentCategory.id);
  if (!category) return;

  category.projects = category.projects.filter((project) => project.id !== deleteTargetId);

  const saveResult = await PortfolioFirebase.savePortfolioData(portfolioData);
  if (!saveResult.ok) {
    portfolioData = previousData;
    currentCategory = portfolioData.categories.find((item) => item.id === currentCategory.id) || currentCategory;
    document.getElementById('confirmModal').classList.remove('active');
    deleteTargetId = null;
    renderProjects();
    showToast(saveResult.error || '删除失败，请重试。', 'error');
    return;
  }

  deleteTargetId = null;
  document.getElementById('confirmModal').classList.remove('active');
  await loadCategory();
  if (isAdminMode) renderProjects();
  showToast('作品已删除', 'success');
}

function hideConfirmModal() {
  document.getElementById('confirmModal').classList.remove('active');
  deleteTargetId = null;
  deleteGroupTargetId = null;
}

function bindDragSorting() {
  const grid = document.getElementById('projectGrid');
  if (!grid || grid.dataset.dragBound === 'true') return;

  grid.dataset.dragBound = 'true';

  grid.addEventListener('dragstart', (event) => {
    const card = event.target.closest('.project-card');
    if (!card || !isAdminMode) return;

    dragSourceId = card.dataset.projectId;
    card.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', dragSourceId);
  });

  grid.addEventListener('dragend', (event) => {
    const card = event.target.closest('.project-card');
    if (card) card.classList.remove('dragging');
    grid.querySelectorAll('.project-card.drag-over').forEach((el) => el.classList.remove('drag-over'));
    dragSourceId = null;
  });

  grid.addEventListener('dragover', (event) => {
    if (!isAdminMode || !dragSourceId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  });

  grid.addEventListener('dragenter', (event) => {
    if (!isAdminMode || !dragSourceId) return;
    const card = event.target.closest('.project-card');
    if (card && card.dataset.projectId !== dragSourceId) {
      card.classList.add('drag-over');
    }
  });

  grid.addEventListener('dragleave', (event) => {
    const card = event.target.closest('.project-card');
    if (card) {
      card.classList.remove('drag-over');
    }
  });

  grid.addEventListener('drop', async (event) => {
    event.preventDefault();
    if (!isAdminMode || !dragSourceId) return;

    // Sort logic for dropping on project cards
    const targetCard = event.target.closest('.project-card');
    if (!targetCard) return;

    const targetId = targetCard.dataset.projectId;
    if (!targetId || targetId === dragSourceId) return;

    const previousData = cloneData(portfolioData);
    const category = portfolioData.categories.find((item) => item.id === currentCategory.id);
    if (!category) return;

    const fromIndex = category.projects.findIndex((project) => project.id === dragSourceId);
    const toIndex = category.projects.findIndex((project) => project.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const [movedProject] = category.projects.splice(fromIndex, 1);
    category.projects.splice(toIndex, 0, movedProject);
    currentCategory = category;
    renderProjects();

    const saveResult = await PortfolioFirebase.savePortfolioData(portfolioData);
    if (!saveResult.ok) {
      portfolioData = previousData;
      currentCategory = portfolioData.categories.find((item) => item.id === currentCategory.id) || currentCategory;
      renderProjects();
      showToast(saveResult.error || '排序保存失败', 'error');
      return;
    }

    showToast('排序已更新', 'success');
  });
}

function bindSidebarDragEvents() {
  const sidebar = document.getElementById('adminSidebar');
  if (!sidebar || sidebar.dataset.sidebarBound === 'true') return;

  sidebar.dataset.sidebarBound = 'true';

  sidebar.addEventListener('dragover', (event) => {
    if (!isAdminMode || !dragSourceId) return;
    event.preventDefault();
  });

  sidebar.addEventListener('dragenter', (event) => {
    if (!isAdminMode || !dragSourceId) return;
    const group = event.target.closest('.sidebar-group');
    if (group) group.classList.add('sidebar-drop-hover');
  });

  sidebar.addEventListener('dragleave', (event) => {
    const group = event.target.closest('.sidebar-group');
    if (group) group.classList.remove('sidebar-drop-hover');
  });

  sidebar.addEventListener('drop', async (event) => {
    event.preventDefault();
    if (!isAdminMode || !dragSourceId) return;

    const group = event.target.closest('.sidebar-group');
    if (!group) return;

    const targetGroupId = group.dataset.groupId || null;
    await assignProjectToGroup(dragSourceId, targetGroupId);
  });
}

async function assignProjectToGroup(projectId, groupId) {
  const previousData = cloneData(portfolioData);
  const category = portfolioData.categories.find((item) => item.id === currentCategory.id);
  if (!category) return;

  const project = category.projects.find((p) => p.id === projectId);
  if (!project) return;

  // Don't save if group hasn't changed
  if ((project.groupId || null) === groupId) return;

  project.groupId = groupId;

  const saveResult = await PortfolioFirebase.savePortfolioData(portfolioData);
  if (!saveResult.ok) {
    portfolioData = previousData;
    currentCategory = portfolioData.categories.find((item) => item.id === currentCategory.id) || currentCategory;
    renderProjects();
    showToast(saveResult.error || '归类保存失败', 'error');
    return;
  }

  currentCategory = category;
  renderProjects();
  showToast('作品已归类', 'success');
}

window.editProject = function editProject(projectId) {
  if (!isSignedInAdmin()) return;
  const project = currentCategory.projects.find((item) => item.id === projectId);
  if (project) showFormModal(project);
};

window.editGroup = function editGroup(groupId) {
  if (!isSignedInAdmin()) return;
  const group = currentCategory.groups.find((g) => g.id === groupId);
  if (group) showGroupFormModal(group);
};

window.confirmDelete = confirmDelete;
window.confirmDeleteGroup = confirmDeleteGroup;

document.addEventListener('DOMContentLoaded', () => {
  const title = document.getElementById('categoryTitle');
  if (title) title.textContent = '加载中...';

  initBackToTop();
  bindDragSorting();

  bootstrapCategory().catch((error) => {
    renderCategoryError(`页面初始化失败：${error && error.message ? error.message : '未知错误'}`);
  });

  document.getElementById('fabManage').addEventListener('click', toggleAdminMode);

  document.getElementById('btnPwdConfirm').addEventListener('click', verifyLogin);
  document.getElementById('btnPwdCancel').addEventListener('click', hideLoginModal);
  document.getElementById('inputLoginPassword').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') verifyLogin();
  });
  document.getElementById('passwordModal').addEventListener('click', function onOverlayClick(event) {
    if (event.target === this) hideLoginModal();
  });

  document.getElementById('fabAdd').addEventListener('click', () => {
    if (!isSignedInAdmin()) {
      showLoginModal();
      return;
    }
    showFormModal(null);
  });

  document.getElementById('btnFormSave').addEventListener('click', saveProject);
  document.getElementById('btnFormCancel').addEventListener('click', hideFormModal);
  document.getElementById('formModal').addEventListener('click', function onOverlayClick(event) {
    if (event.target === this) hideFormModal();
  });

  document.getElementById('fabFolder').addEventListener('click', () => {
    if (!isSignedInAdmin()) {
      showLoginModal();
      return;
    }
    showGroupFormModal(null);
  });

  document.getElementById('btnGroupSave').addEventListener('click', saveGroup);
  document.getElementById('btnGroupCancel').addEventListener('click', hideGroupFormModal);
  document.getElementById('groupFormModal').addEventListener('click', function onOverlayClick(event) {
    if (event.target === this) hideGroupFormModal();
  });

  document.getElementById('inputGroupName').addEventListener('keydown', function onGroupNameKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveGroup();
    }
  });

  document.getElementById('btnConfirmDelete').addEventListener('click', executeDelete);
  document.getElementById('btnConfirmCancel').addEventListener('click', hideConfirmModal);
  document.getElementById('confirmModal').addEventListener('click', function onOverlayClick(event) {
    if (event.target === this) hideConfirmModal();
  });

  document.getElementById('inputName').addEventListener('keydown', function onNameKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      document.getElementById('inputUrl').focus();
    }
  });

  document.getElementById('inputUrl').addEventListener('keydown', function onUrlKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      document.getElementById('inputDesc').focus();
    }
  });

  document.getElementById('inputDesc').addEventListener('keydown', function onDescKeydown(event) {
    if (event.key !== 'Enter') return;

    if (event.ctrlKey || event.shiftKey) {
      event.preventDefault();
      const start = this.selectionStart;
      const end = this.selectionEnd;
      this.value = `${this.value.slice(0, start)}\n${this.value.slice(end)}`;
      this.selectionStart = this.selectionEnd = start + 1;
      return;
    }

    event.preventDefault();
    document.getElementById('inputTags').focus();
  });

  document.getElementById('inputTags').addEventListener('keydown', function onTagsKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      document.getElementById('selectStatus').focus();
    }
  });

  document.getElementById('selectStatus').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveProject();
    }
  });
});
