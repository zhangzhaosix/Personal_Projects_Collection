/* ============================================
   app.js — 首页交互 + 滚动动画
   ============================================ */

// --- 默认分类数据 ---
const DEFAULT_DATA = {
  categories: [
    { id: 'data-analysis', name: '数据分析项目', projects: [] },
    { id: 'agent',         name: 'Agent项目',     projects: [] },
    { id: 'ai-learning',   name: 'AI学习合集',     projects: [] }
  ]
};

// --- 数据管理 ---
function getData() {
  const raw = localStorage.getItem('portfolio-data');
  if (!raw) {
    saveData(DEFAULT_DATA);
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
  return JSON.parse(raw);
}

function saveData(data) {
  localStorage.setItem('portfolio-data', JSON.stringify(data));
}

// --- 渲染分类卡片（带动画） ---
function renderCategories() {
  const grid = document.getElementById('categoryGrid');
  const data = getData();

  const categoryIcons = {
    'data-analysis': '📊',
    'agent':         '🤖',
    'ai-learning':   '🧠'
  };

  const categoryColors = {
    'data-analysis': 'rgba(37, 99, 235, 0.06)',
    'agent':         'rgba(37, 99, 235, 0.04)',
    'ai-learning':   'rgba(37, 99, 235, 0.05)'
  };

  grid.innerHTML = data.categories.map((cat, idx) => {
    const icon = categoryIcons[cat.id] || '📁';
    const color = categoryColors[cat.id] || 'rgba(255,255,255,0.05)';
    const count = cat.projects.length;
    return `
      <div class="category-card reveal delay-${idx + 1}"
           data-id="${cat.id}"
           tabindex="0"
           role="button"
           aria-label="查看${cat.name}，共${count}个作品"
           style="background:${color};"
           onclick="location.href='category.html?id=${cat.id}'"
           onkeydown="if(event.key==='Enter') location.href='category.html?id=${cat.id}'">
        <span class="category-icon">${icon}</span>
        <div class="category-name">${cat.name}</div>
        <div class="category-count">${count} 个作品</div>
      </div>
    `;
  }).join('');

  // 触发滚动动画（下一帧确保 DOM 已渲染）
  requestAnimationFrame(() => initScrollReveal());
}

// --- 滚动可见性动画 ---
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
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// --- DOM 就绪后先执行一次（处理已渲染的元素） ---
document.addEventListener('DOMContentLoaded', function() {
  renderCategories();
  // 也观察已有 .reveal 元素（渲染时可能已存在）
  initScrollReveal();
});
