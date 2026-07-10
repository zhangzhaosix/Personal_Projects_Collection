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
    '干就完了！',
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

function initVisitorCounter() {
  const el = document.getElementById('visitorCount');
  if (!el) return;

  const isNewVisitor = !localStorage.getItem('portfolio-visited');
  const apiKey = 'portfolio-unique-visitors';
  const useRemoteCounter = location.protocol !== 'file:';

  function displayCount(count) {
    el.textContent = `👥 访问用户数: ${count.toLocaleString()}`;
  }

  if (!useRemoteCounter) {
    const localCount = parseInt(localStorage.getItem(apiKey) || '1', 10);
    displayCount(localCount);
    return;
  }

  if (isNewVisitor) {
    localStorage.setItem('portfolio-visited', '1');
    fetch(`https://api.countapi.xyz/hit/zhangzhaosix/${apiKey}`)
      .then((res) => res.json())
      .then((data) => displayCount(data.value))
      .catch(() => {
        const fallbackCount = parseInt(localStorage.getItem(apiKey) || '0', 10) + 1;
        localStorage.setItem(apiKey, String(fallbackCount));
        displayCount(fallbackCount);
      });
    return;
  }

  fetch(`https://api.countapi.xyz/get/zhangzhaosix/${apiKey}`)
    .then((res) => res.json())
    .then((data) => displayCount(data.value))
    .catch(() => {
      const fallbackCount = parseInt(localStorage.getItem(apiKey) || '1', 10);
      displayCount(fallbackCount);
    });
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
  const worksLink = document.getElementById('worksLinkSection');
  const notes = document.getElementById('notesSection');
  const notesLink = document.getElementById('notesLinkSection');
  const contact = document.getElementById('contactSection');
  if (!featured) return;

  featured.style.display = '';
  if (worksLink) worksLink.style.display = 'none';
  if (notes) notes.style.display = 'none';
  if (notesLink) notesLink.style.display = 'none';
  if (contact) contact.style.display = 'none';

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
          featured.push({ ...project, categoryName: category.name });
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
          featured.push({ ...project, categoryName: category.name });
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
      <h3 class="featured-heading">精选作品</h3>
      <div class="featured-grid">
        ${featured
          .map(
            (project, idx) => `
              <a class="featured-card" href="${escapeUrl(project.url)}" target="_blank" rel="noopener" style="animation-delay:${idx * 0.1}s;">
                <div class="featured-category">${escapeHtml(project.categoryName || '')}</div>
                <div class="featured-name">${escapeHtml(project.name)}</div>
                <div class="featured-desc">${escapeHtml(project.description || '暂无简介')}</div>
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
  let notes = featuredIds.length
    ? allNotes.filter((n) => featuredIds.includes(n.id))
    : allNotes.slice(0, 3);

  // Fallback: no notes yet, show projects not in work list
  if (!notes.length && Array.isArray(portfolioData.categories)) {
    const fallbackNotes = [];
    for (const category of portfolioData.categories) {
      if (!Array.isArray(category.projects)) continue;
      for (const project of category.projects) {
        if (fallbackNotes.length >= 3) break;
        if (!WORK_NAMES_FALLBACK.includes(project.name)) {
          const tags = Array.isArray(project.tags) ? project.tags : [];
          fallbackNotes.push({
            title: project.name,
            excerpt: project.description || '',
            tags,
            date: project.createdAt || ''
          });
        }
      }
      if (fallbackNotes.length >= 3) break;
    }
    notes = fallbackNotes;
  }

  if (!notes.length) {
    el.style.display = 'none';
    return;
  }

  const previewNotes = notes.slice(0, 3);
  el.style.display = '';
  el.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">最新笔记</h2>
    </div>
    <div class="notes-preview-grid">
      ${previewNotes.map(note => {
        const tags = Array.isArray(note.tags) ? note.tags : [];
        return `
          <div class="note-preview-card">
            <span class="note-preview-tag">${escapeHtml(tags.length > 0 ? tags[0] : '笔记')}</span>
            <h3 class="note-preview-title">${escapeHtml(note.title)}</h3>
            <p class="note-preview-excerpt">${escapeHtml(note.excerpt || '')}</p>
            <span class="note-preview-meta">${escapeHtml(note.date || '')}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderContact() {
  const el = document.getElementById('contactSection');
  if (!el) return;

  el.innerHTML = `
    <div class="contact-inner">
      <a href="mailto:1801327763@qq.com" class="contact-link" title="发送邮件">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
        <span>1801327763@qq.com</span>
      </a>
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
  const initResult = await PortfolioFirebase.initFirebase();
  if (!initResult.ok) {
    renderHomeError(initResult.error);
    return;
  }

  const dataResult = await PortfolioFirebase.loadPortfolioData();
  if (dataResult.ok) {
    portfolioData = dataResult.data;
    renderFeaturedProjects();
    renderNotesSection();
    renderContact();
    requestAnimationFrame(() => initScrollReveal());
    return;
  }

  if (dataResult.empty && PortfolioFirebase.isAdminUser(initResult.auth?.currentUser)) {
    const seedResult = await PortfolioFirebase.ensureAdminSeed();
    if (seedResult.ok) {
      const retryResult = await PortfolioFirebase.loadPortfolioData();
      if (retryResult.ok) {
        portfolioData = retryResult.data;
        renderFeaturedProjects();
        renderNotesSection();
        renderContact();
        requestAnimationFrame(() => initScrollReveal());
        return;
      }
    }
  }

  renderHomeError(dataResult.error || '首页数据加载失败');
}

document.addEventListener('DOMContentLoaded', () => {
  initTypewriter();
  initVisitorCounter();

  bootstrapHome().catch((error) => {
    renderHomeError(`页面初始化失败：${error && error.message ? error.message : '未知错误'}`);
  });
});
