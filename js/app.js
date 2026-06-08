/* ============================================
   app.js — 首页交互 + 滚动动画 + 打字机 + 计数
   ============================================ */

// --- 默认分类数据 ---
const DEFAULT_DATA = {
  categories: [
    { id: 'data-analysis', name: '数据分析项目', projects: [] },
    { id: 'agent',         name: 'Agent项目',     projects: [] },
    { id: 'ai-learning',   name: 'AI学习合集',     projects: [] }
  ]
};

// --- 从 data.json 初始数据（仅首次访问时） ---
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

// --- 渲染分类卡片（进度环） ---
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

  const maxProjects = 10;
  const ringColors = ['#2563eb', '#6366f1', '#059669'];

  grid.innerHTML = data.categories.map((cat, idx) => {
    const icon = categoryIcons[cat.id] || '📁';
    const color = categoryColors[cat.id] || 'rgba(255,255,255,0.05)';
    const count = cat.projects.length;
    const pct = Math.min(count / maxProjects, 1);
    const r = 22;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - pct);

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
        <div class="progress-ring-wrapper">
          <svg viewBox="0 0 60 60" class="progress-ring">
            <circle cx="30" cy="30" r="${r}" fill="none" stroke="rgba(26,42,74,0.08)" stroke-width="3"/>
            <circle cx="30" cy="30" r="${r}" fill="none"
              stroke="${ringColors[idx % ringColors.length]}"
              stroke-width="3"
              stroke-linecap="round"
              stroke-dasharray="${circ}"
              stroke-dashoffset="${offset}"
              transform="rotate(-90 30 30)"
              class="progress-ring-fill"/>
          </svg>
          <span class="progress-ring-count">${count}</span>
        </div>
        <div class="category-count-label">个作品</div>
      </div>
    `;
  }).join('');

  // 延迟触发进度环动画
  setTimeout(() => {
    document.querySelectorAll('.progress-ring-fill').forEach(el => {
      el.style.strokeDashoffset = el.getAttribute('stroke-dashoffset');
    });
  }, 300);

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

// --- 打字机效果 ---
const typewriterPhrases = [
  '多做少想！',
  '先完成再完美',
  '舒服是留给死人的！',
  '干就完了！',
  '想都是问题，做才有答案',
  '行动治愈焦虑'
];

function initTypewriter() {
  const el = document.getElementById('typewriterText');
  if (!el) return;

  let phraseIdx = 0;
  let charIdx = 0;
  let isDeleting = false;

  function tick() {
    const current = typewriterPhrases[phraseIdx];

    if (!isDeleting) {
      charIdx++;
      el.textContent = current.slice(0, charIdx);
      if (charIdx === current.length) {
        setTimeout(() => { isDeleting = true; tick(); }, 2200);
        return;
      }
      setTimeout(tick, 80 + Math.random() * 60);
    } else {
      charIdx--;
      el.textContent = current.slice(0, charIdx);
      if (charIdx === 0) {
        isDeleting = false;
        phraseIdx = (phraseIdx + 1) % typewriterPhrases.length;
        setTimeout(tick, 400);
        return;
      }
      setTimeout(tick, 30 + Math.random() * 30);
    }
  }

  setTimeout(tick, 600);
}

// --- 页面访问计数器（独立访客数） ---
function initVisitorCounter() {
  const el = document.getElementById('visitorCount');
  if (!el) return;

  const isNewVisitor = !localStorage.getItem('portfolio-visited');
  const apiKey = 'portfolio-unique-visitors';

  function displayCount(count) {
    el.textContent = `👥 访问用户数: ${count.toLocaleString()}`;
  }

  if (isNewVisitor) {
    localStorage.setItem('portfolio-visited', '1');
    fetch(`https://api.countapi.xyz/hit/zhangzhaosix/${apiKey}`)
      .then(res => res.json())
      .then(data => displayCount(data.value))
      .catch(() => {
        let count = parseInt(localStorage.getItem(apiKey) || '0') + 1;
        localStorage.setItem(apiKey, count);
        displayCount(count);
      });
  } else {
    fetch(`https://api.countapi.xyz/get/zhangzhaosix/${apiKey}`)
      .then(res => res.json())
      .then(data => displayCount(data.value))
      .catch(() => {
        const count = parseInt(localStorage.getItem(apiKey) || '1');
        displayCount(count);
      });
  }
}

// --- DOM 就绪 ---
document.addEventListener('DOMContentLoaded', async function() {
  await seedFromDataJson();
  renderCategories();
  initScrollReveal();
  initTypewriter();
  initVisitorCounter();
});
