/* ============================================
   category.js — 分类作品页 CRUD 交互
   Firebase Auth + Firestore 单文档数据源
   ============================================ */

let portfolioData = null;
let currentCategory = null;
let isAdminMode = false;
let editingProjectId = null;
let deleteTargetId = null;
let currentAuthUser = null;

const statusClassMap = {
  '已完成': 'completed',
  '进行中': 'progressing',
  '迭代中': 'iterating',
  '待补充': 'pending'
};

function getCategoryIdFromUrl() {
  return new URLSearchParams(window.location.search).get('id') || '';
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeUrl(str) {
  if (!str) return '#';
  if (str.startsWith('http://') || str.startsWith('https://')) return str;
  return 'https://' + str;
}

function generateId() {
  return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.05, rootMargin: '0px 0px -30px 0px' }
  );

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
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

function renderProjects() {
  const grid = document.getElementById('projectGrid');
  const projects = currentCategory && Array.isArray(currentCategory.projects) ? currentCategory.projects : [];

  const accentColors = [
    '#2563eb', '#6366f1', '#059669', '#d97706', '#dc2626',
    '#0d9488', '#0284c7', '#7c3aed', '#ea580c', '#1e293b'
  ];

  if (!projects.length) {
    grid.innerHTML = `
      <div class="empty-state fade-in">
        <span class="empty-icon">📦</span>
        <p>暂无作品</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = projects.map((proj, idx) => {
    const color = accentColors[idx % accentColors.length];
    const delay = Math.min(idx + 1, 6);
    const tags = Array.isArray(proj.tags) ? proj.tags : [];
    const status = proj.status || '待补充';

    return `
      <div class="project-card reveal delay-${delay}${isAdminMode ? ' admin-mode' : ''}">
        <div class="card-accent" style="background:linear-gradient(90deg, ${color}, ${color}66);"></div>
        <div class="card-body">
          <div class="card-index" style="border:1.5px solid ${color}33;color:${color};">${String(idx + 1).padStart(2, '0')}</div>
          <div class="project-name">${escapeHtml(proj.name)}</div>
          <div class="project-desc">${escapeHtml(proj.description || '暂无简介')}</div>
          <div class="project-meta">
            <span class="project-status ${statusClassMap[status] || 'pending'}">${escapeHtml(status)}</span>
            <div class="tag-list">
              ${tags.length ? tags.map(tag => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join('') : '<span class="tag-pill tag-empty">暂无标签</span>'}
            </div>
          </div>
        </div>
        ${proj.url ? `
        <div class="card-footer">
          <a href="${escapeUrl(proj.url)}" target="_blank" rel="noopener" class="project-link-btn">🔗 访问</a>
        </div>` : ''}
        ${isAdminMode ? `
        <div class="project-actions">
          <button class="btn btn-outline btn-sm" onclick="editProject('${proj.id}')">✏ 编辑</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDelete('${proj.id}')">🗑 删除</button>
        </div>` : ''}
      </div>
    `;
  }).join('');

  requestAnimationFrame(() => initScrollReveal());
}

async function loadCategory() {
  const catId = getCategoryIdFromUrl();
  const dataResult = await PortfolioFirebase.loadPortfolioData();

  if (!dataResult.ok) {
    if (dataResult.empty) {
      renderCategoryError(dataResult.error);
    } else {
      renderCategoryError(dataResult.error || 'Firestore 数据加载失败');
    }
    return;
  }

  portfolioData = dataResult.data;
  currentCategory = portfolioData.categories.find(c => c.id === catId) || null;

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

  document.getElementById('categoryTitle').textContent = currentCategory.name;
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
      if (!isAdminMode) {
        enterAdminMode();
      } else {
        setManageButtonState();
        renderProjects();
      }
      return;
    }

    if (isAdminMode) {
      exitAdminMode();
    } else {
      setManageButtonState();
      renderProjects();
    }
  });

  await loadCategory();

  if (PortfolioFirebase.isAdminUser(currentAuthUser)) {
    enterAdminMode();
  }
}

function isSignedInAdmin() {
  return PortfolioFirebase.isAdminUser(currentAuthUser);
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

  const seedResult = await PortfolioFirebase.ensureAdminSeed();
  if (seedResult.ok && seedResult.seeded) {
    await loadCategory();
  }

  enterAdminMode();
}

function readTagsInput() {
  const raw = document.getElementById('inputTags').value.trim();
  if (!raw) return [];
  return raw
    .split(/[,，、\n]+/)
    .map(tag => tag.trim())
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
  const category = portfolioData.categories.find(c => c.id === currentCategory.id);
  if (!category) {
    setFormError('当前分类不存在，请刷新后重试。');
    return;
  }

  if (editingProjectId) {
    const idx = category.projects.findIndex(p => p.id === editingProjectId);
    if (idx !== -1) {
      category.projects[idx] = {
        ...category.projects[idx],
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
    currentCategory = portfolioData.categories.find(c => c.id === currentCategory.id) || currentCategory;
    setFormError(saveResult.error || '保存失败，请重试。');
    renderProjects();
    return;
  }

  hideFormModal();
  await loadCategory();
  if (isAdminMode) {
    enterAdminMode();
  }
}

function confirmDelete(projectId) {
  if (!isSignedInAdmin()) return;

  const project = currentCategory.projects.find(p => p.id === projectId);
  if (!project) return;
  deleteTargetId = projectId;
  document.getElementById('confirmProjectName').textContent = `「${project.name}」`;
  document.getElementById('confirmModal').classList.add('active');
}

async function executeDelete() {
  if (!deleteTargetId) return;
  if (!isSignedInAdmin()) {
    return;
  }

  const previousData = cloneData(portfolioData);
  const category = portfolioData.categories.find(c => c.id === currentCategory.id);
  if (!category) return;

  category.projects = category.projects.filter(p => p.id !== deleteTargetId);
  const saveResult = await PortfolioFirebase.savePortfolioData(portfolioData);
  if (!saveResult.ok) {
    portfolioData = previousData;
    currentCategory = portfolioData.categories.find(c => c.id === currentCategory.id) || currentCategory;
    document.getElementById('confirmModal').classList.remove('active');
    deleteTargetId = null;
    renderProjects();
    alert(saveResult.error || '删除失败，请重试。');
    return;
  }

  currentCategory = category;
  deleteTargetId = null;
  document.getElementById('confirmModal').classList.remove('active');
  await loadCategory();
  if (isAdminMode) {
    enterAdminMode();
  }
}

function hideConfirmModal() {
  document.getElementById('confirmModal').classList.remove('active');
  deleteTargetId = null;
}

window.editProject = function (id) {
  if (!isSignedInAdmin()) return;
  const p = currentCategory.projects.find(p => p.id === id);
  if (p) showFormModal(p);
};

window.confirmDelete = confirmDelete;

document.addEventListener('DOMContentLoaded', function () {
  const title = document.getElementById('categoryTitle');
  if (title) title.textContent = '加载中...';

  bootstrapCategory().catch((error) => {
    renderCategoryError(`页面初始化失败：${error && error.message ? error.message : '未知错误'}`);
  });

  document.getElementById('fabManage').addEventListener('click', toggleAdminMode);

  document.getElementById('btnPwdConfirm').addEventListener('click', verifyLogin);
  document.getElementById('btnPwdCancel').addEventListener('click', hideLoginModal);
  document.getElementById('inputLoginPassword').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') verifyLogin();
  });
  document.getElementById('passwordModal').addEventListener('click', function (e) {
    if (e.target === this) hideLoginModal();
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
  document.getElementById('formModal').addEventListener('click', function (e) {
    if (e.target === this) hideFormModal();
  });

  document.getElementById('btnConfirmDelete').addEventListener('click', executeDelete);
  document.getElementById('btnConfirmCancel').addEventListener('click', hideConfirmModal);
  document.getElementById('confirmModal').addEventListener('click', function (e) {
    if (e.target === this) hideConfirmModal();
  });

  document.getElementById('inputName').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('inputUrl').focus();
    }
  });
  document.getElementById('inputUrl').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('inputDesc').focus();
    }
  });
  document.getElementById('inputDesc').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      if (e.ctrlKey || e.shiftKey) {
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.slice(0, start) + '\n' + this.value.slice(end);
        this.selectionStart = this.selectionEnd = start + 1;
        return;
      }

      e.preventDefault();
      document.getElementById('inputTags').focus();
    }
  });
  document.getElementById('inputTags').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('selectStatus').focus();
    }
  });
  document.getElementById('selectStatus').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveProject();
    }
  });
});
