/* ============================================
   app.js - 首页交互 + Firestore 数据渲染
   ============================================ */

let portfolioData = null;

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
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

function initTypewriter() {
  const el = document.getElementById('typewriterText');
  if (!el) return;

  const phrases = [
    '多做少想！',
    '先完成再完美',
    '舒服是留给死人的！',
    '遵循MVP原则',
    '想都是问题，做才有答案',
    '行动治愈焦虑'
  ];

  let phraseIdx = 0;
  let charIdx = 0;
  let isDeleting = false;

  function tick() {
    const current = phrases[phraseIdx];

    if (!isDeleting) {
      charIdx += 1;
      el.textContent = current.slice(0, charIdx);

      if (charIdx === current.length) {
        setTimeout(() => {
          isDeleting = true;
          tick();
        }, 2200);
        return;
      }

      setTimeout(tick, 80 + Math.random() * 60);
      return;
    }

    charIdx -= 1;
    el.textContent = current.slice(0, charIdx);

    if (charIdx === 0) {
      isDeleting = false;
      phraseIdx = (phraseIdx + 1) % phrases.length;
      setTimeout(tick, 400);
      return;
    }

    setTimeout(tick, 30 + Math.random() * 30);
  }

  setTimeout(tick, 600);
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

function renderHomeError(message) {
  const featured = document.getElementById('featuredSection');
  const notes = document.getElementById('notesSection');
  if (!featured) return;

  featured.style.display = '';
  if (notes) notes.style.display = 'none';

  featured.innerHTML = `
    <div class="empty-state home-error reveal visible">
      <span class="empty-icon">⚠</span>
      <p>${escapeHtml(message)}</p>
      <button class="btn btn-outline btn-sm home-retry" type="button" onclick="location.reload()">重新加载</button>
    </div>
  `;
}

const WORK_NAMES_FALLBACK = [
  '【抖音 达人种草 数据分析 自动化报表】',
  '【抖音电商 数据监控 BI看板】',
  '电商 达人种草 洞察分析 报告',
  '抖音 电商直播 用户行为 分析',
  '抖音电商直播用户行为分析',
  '日常清单网页',
  '作品集网页',
  '音乐合集'
];

function renderFeaturedProjects() {
  const el = document.getElementById('featuredSection');
  if (!el || !portfolioData) return;

  const featuredIds = Array.isArray(portfolioData.featuredWorks) ? portfolioData.featuredWorks : [];
  const featured = [];

  if (featuredIds.length && Array.isArray(portfolioData.categories)) {
    portfolioData.categories.forEach((category) => {
      if (!Array.isArray(category.projects)) return;
      category.projects.forEach((project) => {
        if (featuredIds.includes(project.id)) {
          featured.push(project);
        }
      });
    });
  }

  // Fallback: no featured selected yet, show first 2 works
  if (!featured.length && Array.isArray(portfolioData.categories)) {
    for (const category of portfolioData.categories) {
      if (!Array.isArray(category.projects)) continue;
      for (const project of category.projects) {
        if (featured.length >= 2) break;
        if (WORK_NAMES_FALLBACK.includes(project.name)) {
          featured.push(project);
        }
      }
      if (featured.length >= 2) break;
    }
  }

  if (!featured.length) {
    el.style.display = 'none';
    return;
  }

  el.style.display = '';
  el.innerHTML = `
    <div class="featured-inner">
      <div class="featured-header">
        <h2 class="featured-heading">精选作品</h2>
        <a href="works.html" class="featured-all-link">查看全部作品 →</a>
      </div>
      <div class="featured-grid">
        ${featured
          .map(
            (project) => `
              <a class="featured-card" href="${escapeUrl(project.url)}" target="_blank" rel="noopener">
                <h3 class="featured-name">${escapeHtml(project.name)}</h3>
                <p class="featured-desc">${formatProjectDescription(project.description)}</p>
              </a>
            `
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderNotesSection() {
  const el = document.getElementById('notesSection');
  if (!el || !portfolioData) return;

  const featuredIds = Array.isArray(portfolioData.featuredNotes) ? portfolioData.featuredNotes : [];
  const allNotes = Array.isArray(portfolioData.notes) ? portfolioData.notes : [];
  const notesById = new Map(allNotes.map((note) => [note.id, note]));
  const previewNotes = [...featuredIds]
    .reverse()
    .map((id) => notesById.get(id))
    .filter(Boolean)
    .slice(0, 3);

  if (!previewNotes.length) {
    el.style.display = 'none';
    return;
  }

  el.style.display = '';
  el.innerHTML = `
    <div class="section-header notes-header">
      <h2 class="section-title">推荐笔记</h2>
      <a href="notes.html" class="notes-all-link">查看全部笔记 →</a>
    </div>
    <div class="notes-preview-grid">
      ${previewNotes.map(note => {
        const tags = Array.isArray(note.tags) ? note.tags : [];
        const noteHref = note.url ? escapeUrl(note.url) : 'notes.html';
        const noteTarget = note.url ? ' target="_blank" rel="noopener"' : '';
        return `
          <a class="note-preview-card" href="${escapeHtml(noteHref)}"${noteTarget}>
            <span class="note-preview-tag">${escapeHtml(tags.length > 0 ? tags[0] : '笔记')}</span>
            <h3 class="note-preview-title">${escapeHtml(note.title)}</h3>
            <p class="note-preview-excerpt">${escapeHtml(note.excerpt || '')}</p>
          </a>
        `;
      }).join('')}
    </div>
  `;
}

/* function renderCategories() {
  const grid = document.getElementById('categoryGrid');
  if (!grid || !portfolioData || !Array.isArray(portfolioData.categories)) return;

  const categoryIcons = {
    'data-analysis': '📊',
    agent: '🤖',
    'ai-learning': '🧠'
  };

  const categoryColors = {
    'data-analysis': 'rgba(37, 99, 235, 0.06)',
    agent: 'rgba(37, 99, 235, 0.04)',
    'ai-learning': 'rgba(37, 99, 235, 0.05)'
  };

  const ringColors = ['#2563eb', '#6366f1', '#059669'];
  const maxProjects = 10;

  grid.innerHTML = portfolioData.categories
    .map((category, idx) => {
      const count = Array.isArray(category.projects) ? category.projects.length : 0;
      const pct = Math.min(count / maxProjects, 1);
      const radius = 22;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference * (1 - pct);

      return `
        <div class="category-card reveal delay-${idx + 1}"
             data-id="${category.id}"
             tabindex="0"
             role="button"
             aria-label="查看${category.name}，共${count}个作品"
             style="background:${categoryColors[category.id] || 'rgba(255,255,255,0.05)'};"
             onclick="location.href='category.html?id=${category.id}'"
             onkeydown="if(event.key==='Enter') location.href='category.html?id=${category.id}'">
          <span class="category-icon">${categoryIcons[category.id] || '📁'}</span>
          <div class="category-name">${escapeHtml(category.name)}</div>
          <div class="progress-ring-wrapper">
            <svg viewBox="0 0 60 60" class="progress-ring">
              <circle cx="30" cy="30" r="${radius}" fill="none" stroke="rgba(26,42,74,0.08)" stroke-width="3"></circle>
              <circle cx="30" cy="30" r="${radius}" fill="none"
                stroke="${ringColors[idx % ringColors.length]}"
                stroke-width="3"
                stroke-linecap="round"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}"
                transform="rotate(-90 30 30)"
                class="progress-ring-fill"></circle>
            </svg>
            <span class="progress-ring-count">${count}</span>
          </div>
          <div class="category-count-label">个作品</div>
        </div>
      `;
    })
    .join('');

  setTimeout(() => {
    document.querySelectorAll('.progress-ring-fill').forEach((el) => {
      el.style.strokeDashoffset = el.getAttribute('stroke-dashoffset');
    });
  }, 300);
} */

async function bootstrapHome() {
  const dataResult = await PortfolioFirebase.loadPortfolioData();
  if (dataResult.ok) {
    portfolioData = dataResult.data;
    renderFeaturedProjects();
    renderNotesSection();
    requestAnimationFrame(() => initScrollReveal());
    return;
  }

  renderHomeError(dataResult.error || '首页数据加载失败');
}

document.addEventListener('DOMContentLoaded', () => {
  initTypewriter();

  bootstrapHome().catch((error) => {
    renderHomeError(`页面初始化失败：${error && error.message ? error.message : '未知错误'}`);
  });
});
