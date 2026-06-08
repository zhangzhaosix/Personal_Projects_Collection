/* ============================================
   app.js — 首页交互 + 滚动动画 + 打字机 + 计数
   ============================================ */

// --- 默认分类数据（嵌入 data.json 内容，确保首次访问有数据） ---
const DATA_VERSION = 'v2'; // 数据版本号，修改默认数据时递增以覆盖旧缓存
const DEFAULT_DATA = {
  _version: DATA_VERSION,
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

  const data = JSON.parse(raw);

  // 版本检查：版本不匹配时用默认数据覆盖（确保旧缓存数据能更新）
  if (data._version !== DATA_VERSION) {
    saveData(DEFAULT_DATA);
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  return data;
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
