/* ============================================
   category.js — 分类作品页 CRUD 交互
   管理模式需密码验证，访客只读
   ============================================ */

// ===== 配置区 =====
const ADMIN_PASSWORD = '741021';  // ← 管理员密码，可自行修改

// ===== 状态 =====
let currentCategory = null;
let isAdminMode = false;
let editingProjectId = null;
let deleteTargetId = null;

// ===== 数据管理 =====
function getData() {
  const raw = localStorage.getItem('portfolio-data');
  if (!raw) {
    const defaultData = {
      categories: [
        { id: 'data-analysis', name: '数据分析项目', projects: [] },
        { id: 'agent',         name: 'Agent项目',     projects: [] },
        { id: 'ai-learning',   name: 'AI学习合集',     projects: [] }
      ]
    };
    saveData(defaultData);
    return JSON.parse(JSON.stringify(defaultData));
  }
  return JSON.parse(raw);
}

function saveData(data) {
  localStorage.setItem('portfolio-data', JSON.stringify(data));
}

// ===== 工具 =====
function generateId() {
  return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

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

// ===== 滚动可见性动画 =====
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

// ===== 页面初始化 =====
function loadCategory() {
  const catId = getCategoryIdFromUrl();
  const data = getData();
  currentCategory = data.categories.find(c => c.id === catId);

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

  // 检查是否已有管理员会话
  if (sessionStorage.getItem('portfolio-admin') === 'true') {
    enterAdminMode();
  }

  renderProjects();
}

// ===== 渲染作品卡片（带装饰元素 + 动画） =====
function renderProjects() {
  const grid = document.getElementById('projectGrid');
  const projects = currentCategory.projects;

  const accentColors = [
    '#2563eb', '#6366f1', '#059669', '#d97706', '#dc2626',
    '#0d9488', '#0284c7', '#7c3aed', '#ea580c', '#1e293b'
  ];

  if (!projects || projects.length === 0) {
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
    return `
      <div class="project-card reveal delay-${delay}${isAdminMode ? ' admin-mode' : ''}">
        <div class="card-accent" style="background:linear-gradient(90deg, ${color}, ${color}66);"></div>
        <div class="card-body">
          <div class="card-index" style="border:1.5px solid ${color}33;color:${color};">${String(idx + 1).padStart(2, '0')}</div>
          <div class="project-name">${escapeHtml(proj.name)}</div>
          <div class="project-desc">${escapeHtml(proj.description || '暂无简介')}</div>
        </div>
        ${proj.url ? `
        <div class="card-footer">
          <a href="${escapeUrl(proj.url)}" target="_blank" rel="noopener" class="project-link-btn">🔗 访问</a>
        </div>` : ''}
        <div class="project-actions">
          <button class="btn btn-outline btn-sm" onclick="editProject('${proj.id}')">✏ 编辑</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDelete('${proj.id}')">🗑 删除</button>
        </div>
      </div>
    `;
  }).join('');

  // 触发滚动动画
  requestAnimationFrame(() => initScrollReveal());
}

// ===== 密码验证弹窗 =====
function showPasswordModal() {
  document.getElementById('inputPassword').value = '';
  document.getElementById('passwordError').style.display = 'none';
  document.getElementById('passwordModal').classList.add('active');
  setTimeout(() => document.getElementById('inputPassword').focus(), 100);
}

function hidePasswordModal() {
  document.getElementById('passwordModal').classList.remove('active');
}

function verifyPassword() {
  const pwd = document.getElementById('inputPassword').value;
  if (pwd === ADMIN_PASSWORD) {
    hidePasswordModal();
    sessionStorage.setItem('portfolio-admin', 'true');
    enterAdminMode();
  } else {
    document.getElementById('passwordError').style.display = 'block';
    document.getElementById('inputPassword').value = '';
    document.getElementById('inputPassword').focus();
  }
}

// ===== 管理模式 =====
function enterAdminMode() {
  isAdminMode = true;
  const fab = document.getElementById('fabManage');
  const fabAdd = document.getElementById('fabAdd');
  fab.classList.add('active');
  fab.innerHTML = '✕';
  fabAdd.classList.add('visible');
  renderProjects();
}

function exitAdminMode() {
  isAdminMode = false;
  sessionStorage.removeItem('portfolio-admin');
  const fab = document.getElementById('fabManage');
  const fabAdd = document.getElementById('fabAdd');
  fab.classList.remove('active');
  fab.innerHTML = '⚙';
  fabAdd.classList.remove('visible');
  renderProjects();
}

function toggleAdminMode() {
  if (isAdminMode) {
    exitAdminMode();
  } else {
    showPasswordModal();
  }
}

// ===== 添加 / 编辑 =====
function showFormModal(project) {
  editingProjectId = project ? project.id : null;
  document.getElementById('formModalTitle').textContent = project ? '编辑作品' : '添加作品';
  document.getElementById('inputName').value = project ? project.name : '';
  document.getElementById('inputUrl').value = project ? (project.url || '') : '';
  document.getElementById('inputDesc').value = project ? (project.description || '') : '';
  document.getElementById('formModal').classList.add('active');
  setTimeout(() => document.getElementById('inputName').focus(), 100);
}

function hideFormModal() {
  document.getElementById('formModal').classList.remove('active');
  editingProjectId = null;
}

function saveProject() {
  const name = document.getElementById('inputName').value.trim();
  const url = document.getElementById('inputUrl').value.trim();
  const description = document.getElementById('inputDesc').value.trim();

  if (!name) {
    document.getElementById('inputName').focus();
    document.getElementById('inputName').style.borderColor = 'rgba(255,80,80,0.6)';
    setTimeout(() => document.getElementById('inputName').style.borderColor = '', 1500);
    return;
  }

  const data = getData();
  const cat = data.categories.find(c => c.id === currentCategory.id);
  if (!cat) return;

  if (editingProjectId) {
    const idx = cat.projects.findIndex(p => p.id === editingProjectId);
    if (idx !== -1) {
      cat.projects[idx].name = name;
      cat.projects[idx].url = url;
      cat.projects[idx].description = description;
    }
  } else {
    cat.projects.push({
      id: generateId(), name, url, description,
      createdAt: new Date().toISOString().slice(0, 10)
    });
  }

  saveData(data);
  currentCategory = cat;
  hideFormModal();
  renderProjects();
}

// ===== 删除 =====
function confirmDelete(projectId) {
  const project = currentCategory.projects.find(p => p.id === projectId);
  if (!project) return;
  deleteTargetId = projectId;
  document.getElementById('confirmProjectName').textContent = `「${project.name}」`;
  document.getElementById('confirmModal').classList.add('active');
}

function executeDelete() {
  if (!deleteTargetId) return;
  const data = getData();
  const cat = data.categories.find(c => c.id === currentCategory.id);
  if (!cat) return;
  cat.projects = cat.projects.filter(p => p.id !== deleteTargetId);
  saveData(data);
  currentCategory = cat;
  deleteTargetId = null;
  document.getElementById('confirmModal').classList.remove('active');
  renderProjects();
}

function hideConfirmModal() {
  document.getElementById('confirmModal').classList.remove('active');
  deleteTargetId = null;
}

// ===== 全局暴露 =====
window.editProject = function(id) {
  const p = currentCategory.projects.find(p => p.id === id);
  if (p) showFormModal(p);
};
window.confirmDelete = confirmDelete;

// ===== 事件绑定 =====
document.addEventListener('DOMContentLoaded', function() {
  loadCategory();

  // 管理模式
  document.getElementById('fabManage').addEventListener('click', toggleAdminMode);

  // 密码验证
  document.getElementById('btnPwdConfirm').addEventListener('click', verifyPassword);
  document.getElementById('btnPwdCancel').addEventListener('click', hidePasswordModal);
  document.getElementById('inputPassword').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') verifyPassword();
  });
  document.getElementById('passwordModal').addEventListener('click', function(e) {
    if (e.target === this) hidePasswordModal();
  });

  // 添加
  document.getElementById('fabAdd').addEventListener('click', () => showFormModal(null));

  // 表单
  document.getElementById('btnFormSave').addEventListener('click', saveProject);
  document.getElementById('btnFormCancel').addEventListener('click', hideFormModal);
  document.getElementById('formModal').addEventListener('click', function(e) {
    if (e.target === this) hideFormModal();
  });

  // 删除确认
  document.getElementById('btnConfirmDelete').addEventListener('click', executeDelete);
  document.getElementById('btnConfirmCancel').addEventListener('click', hideConfirmModal);
  document.getElementById('confirmModal').addEventListener('click', function(e) {
    if (e.target === this) hideConfirmModal();
  });

  // Enter 键跳转
  document.getElementById('inputName').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('inputUrl').focus(); }
  });
  document.getElementById('inputUrl').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('inputDesc').focus(); }
  });
  document.getElementById('inputDesc').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveProject(); }
  });
});
