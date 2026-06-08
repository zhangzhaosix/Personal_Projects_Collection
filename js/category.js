/* ============================================
   category.js — 分类作品页 CRUD 交互
   管理模式需密码验证，访客只读
   ============================================ */

// ===== 配置区 =====
const ADMIN_PASSWORD = '741021';  // ← 管理员密码，可自行修改

// ===== GitHub 配置 =====
const GITHUB_OWNER = 'zhangzhaosix';
const GITHUB_REPO = 'Personal_Projects_Collection';
const GITHUB_FILE_PATH = 'data.json';
const GITHUB_BRANCH = 'master';

function getGithubToken() {
  return localStorage.getItem('github-token') || '';
}

function saveGithubToken(token) {
  localStorage.setItem('github-token', token);
}

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
      "categories": [
        {
          "id": "data-analysis",
          "name": "数据分析项目",
          "projects": [
            {
              "id": "p_1780814882051_z593",
              "name": "【抖音 达人种草 数据分析 自动化报表】",
              "url": "https://vcnnr111xqu6.feishu.cn/sheets/Tc2psCbP0hnjAOtWFrjc5wzNnTd?from=from_copylink",
              "description": "原有的表格指标混乱、颗粒度不一致，无法直观呈现种草转化效果急需一份结果前置、逻辑清晰的复盘分析报表",
              "createdAt": "2026-06-07"
            },
            {
              "id": "p_1780841238422_ic9b",
              "name": "【抖音电商 数据监控 BI看板】",
              "url": "https://vcnnr111xqu6.feishu.cn/docx/NqNhdQzscoLOYIxxRDYcvrJRnkf?from=from_copylink",
              "description": "多个维度（声量、转化、人群资产）呈现当前种草效果的BI看板",
              "createdAt": "2026-06-07"
            },
            {
              "id": "p_1780841697010_p9ip",
              "name": "电商 达人种草 洞察分析 报告",
              "url": "https://vcnnr111xqu6.feishu.cn/docx/LVhedyuJmoCzU4xZnFZcEDe9nnh",
              "description": "当时骆驼户外品牌 在抖音开展达人种草投放，对标安德玛、凯乐石、伯希和 三大竞品，急需通过数据复盘解决 3 个核心问题：\n1：本次种草投放的真实效果如何，和竞品差距在哪？\n2：哪些达人、哪些内容赛道是高效的，哪些在浪费预算？\n3：如何用数据定位优化点，给业务端提供可落地的投放策略？",
              "createdAt": "2026-06-07"
            },
            {
              "id": "p_1780843960501_2nmq",
              "name": "抖音 电商直播 用户行为 分析",
              "url": "https://vcnnr111xqu6.feishu.cn/mindnotes/ZVrMbJCjxmKnMFnzIqKc5aENnLg",
              "description": "基于用户体验对用户动作进行了详细的拆解，通过优化用户观看体验、提升互动率为核心抓手，驱动直播GMV增长",
              "createdAt": "2026-06-07"
            }
          ]
        },
        {
          "id": "agent",
          "name": "Agent项目",
          "projects": [
            {
              "id": "p_1780815946402_ep9l",
              "name": "日常清单网页",
              "url": "https://zhangzhaosix.github.io/task-list/",
              "description": "记录每日必做、临时事件、长期规划、思维模式",
              "createdAt": "2026-06-07"
            },
            {
              "id": "p_1780815955322_a4sh",
              "name": "音乐合集",
              "url": "http://127.0.0.1:5000/",
              "description": "记录我爱听的歌曲",
              "createdAt": "2026-06-07"
            }
          ]
        },
        {
          "id": "ai-learning",
          "name": "AI学习合集",
          "projects": [
            {
              "id": "p_1780816143260_qtp7",
              "name": "AI笔记整理",
              "url": "https://vcnnr111xqu6.feishu.cn/mindnotes/Z0Emb4noVm23yDnXMsjcBwxBnTe",
              "description": "从YouTube、B站、抖音等渠道学习到的\n纯个人爱好",
              "createdAt": "2026-06-07"
            },
            {
              "id": "p_1780816383108_a1y1",
              "name": "api合集1",
              "url": "https://api.daheiai.com/#official",
              "description": "推荐",
              "createdAt": "2026-06-07"
            },
            {
              "id": "p_1780816434004_isz1",
              "name": "api合集2",
              "url": "http://wang.aihaochi.com/",
              "description": "便宜",
              "createdAt": "2026-06-07"
            },
            {
              "id": "p_1780843810802_b7vx",
              "name": "claude.md",
              "url": "https://vcnnr111xqu6.feishu.cn/docx/KAJLd61qBoCxZyxRKOBcmAIrnxd",
              "description": "经常使用",
              "createdAt": "2026-06-07"
            }
          ]
        }
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

// ===== Toast 通知 =====
function showToast(message, type, duration = 3000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  if (type !== 'loading') {
    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }
}

function hideLoadingToast() {
  const container = document.getElementById('toastContainer');
  const loading = container.querySelector('.toast-loading');
  if (loading) {
    loading.classList.add('toast-out');
    setTimeout(() => loading.remove(), 250);
  }
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

// ===== 从 data.json 初始数据（仅首次访问时） =====
async function seedFromDataJson() {
  if (localStorage.getItem('portfolio-data')) return;
  try {
    const res = await fetch('data.json');
    if (!res.ok) return;
    const data = await res.json();
    saveData(data);
  } catch (e) {
    // data.json 不存在时静默忽略
  }
}

// ===== GitHub 自动同步 =====
async function syncToGithub() {
  const token = getGithubToken();
  if (!token) return;

  const data = getData();
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

  showToast('正在同步到 GitHub...', 'loading');

  try {
    // 1. 获取当前文件信息（含 SHA）
    const getRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' } }
    );

    if (!getRes.ok && getRes.status !== 404) {
      throw new Error(`获取文件信息失败 (${getRes.status})`);
    }

    const sha = getRes.ok ? (await getRes.json()).sha : undefined;

    // 2. 提交更新
    const putBody = {
      message: 'chore: 自动同步作品数据',
      content,
      branch: GITHUB_BRANCH
    };
    if (sha) putBody.sha = sha;

    const putRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(putBody)
      }
    );

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      throw new Error(errData.message || `提交失败 (${putRes.status})`);
    }

    hideLoadingToast();
    showToast('同步到 GitHub 成功 ✓', 'success');
  } catch (err) {
    hideLoadingToast();
    showToast(`同步失败: ${err.message}`, 'error', 5000);
  }
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
  const fabSettings = document.getElementById('fabSettings');
  fab.classList.add('active');
  fab.innerHTML = '✕';
  fabAdd.classList.add('visible');
  fabSettings.classList.add('visible');

  // 首次进入时提示配置 Token
  if (!getGithubToken()) {
    setTimeout(() => {
      showToast('提示: 点击 🔑 配置 GitHub 自动同步', 'loading', 5000);
    }, 1000);
  }

  renderProjects();
}

function exitAdminMode() {
  isAdminMode = false;
  sessionStorage.removeItem('portfolio-admin');
  const fab = document.getElementById('fabManage');
  const fabAdd = document.getElementById('fabAdd');
  const fabSettings = document.getElementById('fabSettings');
  fab.classList.remove('active');
  fab.innerHTML = '⚙';
  fabAdd.classList.remove('visible');
  fabSettings.classList.remove('visible');
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
  syncToGithub();
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
  syncToGithub();
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
document.addEventListener('DOMContentLoaded', async function() {
  await seedFromDataJson();
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

  // GitHub 设置
  document.getElementById('fabSettings').addEventListener('click', function() {
    document.getElementById('inputGithubToken').value = getGithubToken();
    document.getElementById('tokenStatus').style.display = 'none';
    document.getElementById('githubSettingsModal').classList.add('active');
    setTimeout(() => document.getElementById('inputGithubToken').focus(), 100);
  });

  document.getElementById('btnTokenSave').addEventListener('click', function() {
    const token = document.getElementById('inputGithubToken').value.trim();
    const statusEl = document.getElementById('tokenStatus');
    if (!token) {
      statusEl.textContent = '请输入 Token';
      statusEl.style.color = '#dc3c3c';
      statusEl.style.display = 'block';
      return;
    }
    saveGithubToken(token);
    statusEl.textContent = 'Token 已保存 ✓';
    statusEl.style.color = '#059669';
    statusEl.style.display = 'block';
    setTimeout(() => {
      document.getElementById('githubSettingsModal').classList.remove('active');
    }, 1000);
  });

  document.getElementById('btnTokenCancel').addEventListener('click', function() {
    document.getElementById('githubSettingsModal').classList.remove('active');
  });

  document.getElementById('githubSettingsModal').addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('active');
  });

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
    if (e.key === 'Enter') {
      if (e.ctrlKey || e.shiftKey) {
        // Ctrl+Enter / Shift+Enter → 手动插入换行
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.slice(0, start) + '\n' + this.value.slice(end);
        this.selectionStart = this.selectionEnd = start + 1;
      } else {
        // Enter → 保存
        e.preventDefault();
        saveProject();
      }
    }
  });
});
