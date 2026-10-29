/* ============================================
   app.js - 首页交互 + Firestore 数据渲染
   ============================================ */

let portfolioData = null;

function initScrollReveal() {
  window.HomeMotion?.initSections();
}

function initTypewriter() {
  const el = document.getElementById('typewriterText');
  if (!el) return;

  const phrases = [
    '多做少想！',
    '先完成再完美',
    '多喝热水 少熬夜',
    '遵循MVP原则',
    '想都是问题，做才有答案',
    '行动治愈焦虑'
  ];

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const wrapper = document.querySelector('.typewriter-wrapper');
  let phraseIdx = 0;
  let charIdx = phrases[0].length;
  let isDeleting = false;
  let timer = 0;
  let inView = true;
  let firstPause = true;

  function schedule(delay) {
    clearTimeout(timer);
    timer = 0;
    if (!motion.matches && !document.hidden && inView) timer = setTimeout(tick, delay);
  }

  function tick() {
    timer = 0;
    if (motion.matches || document.hidden || !inView) return;
    firstPause = false;
    const current = phrases[phraseIdx];
    if (isDeleting) {
      charIdx -= 1;
      el.textContent = current.slice(0, charIdx);
      if (charIdx === 0) {
        isDeleting = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
        schedule(400);
      } else schedule(30 + Math.random() * 30);
    } else if (charIdx < current.length) {
      charIdx += 1;
      el.textContent = current.slice(0, charIdx);
      schedule(charIdx === current.length ? 2200 : 80 + Math.random() * 60);
    } else {
      isDeleting = true;
      schedule(60);
    }
  }

  function sync() {
    if (motion.matches) {
      phraseIdx = 0;
      charIdx = phrases[0].length;
      isDeleting = false;
      el.textContent = phrases[0];
    }
    wrapper?.classList.toggle('is-typewriter-paused', motion.matches || document.hidden || !inView);
    schedule(firstPause ? 3000 : 400);
  }

  motion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window && wrapper) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    }).observe(wrapper);
  }
  el.textContent = phrases[0];
  schedule(3000);
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value || '';
  return div.innerHTML.replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function escapeUrl(value) {
  const candidate = String(value || '').trim();
  if (!candidate) return '';
  const url = /^[a-z][a-z\d+.-]*:/i.test(candidate) ? candidate : `https://${candidate}`;
  try {
    const parsed = new URL(url);
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
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

function renderFeaturedProjects() {
  const el = document.getElementById('featuredSection');
  if (!el || !portfolioData) return;

  // AI 学习资料已在笔记目录展示，作品区保留实际项目。
  const categories = (Array.isArray(portfolioData.categories) ? portfolioData.categories : [])
    .filter((category) => category.id !== 'ai-learning' && Array.isArray(category.projects) && category.projects.length);
  if (!categories.length) {
    el.style.display = 'none';
    return;
  }

  el.style.display = '';
  el.innerHTML = `
    <div class="home-section-heading reveal">
      <h2 id="worksHeading">作品</h2>
      <span>从业务问题到方法与产出</span>
    </div>
    ${categories.map((category) => `
      <div class="home-project-group">
        <h3 class="home-project-category reveal">${escapeHtml(category.name)}</h3>
        <div class="home-project-grid">
          ${category.projects.map((project) => {
            const href = escapeUrl(project.url);
            const fields = [['职责', project.role], ['方法', project.tools], ['产出', project.outcome]]
              .filter(([, value]) => value && value.trim() !== '/');
            const preview = window.ProjectPreview?.has(project.id);
            return `<article class="home-project-card reveal">
              <h4>${escapeHtml(project.name)}</h4>
              ${fields.length ? `<dl>${fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${formatProjectDescription(value)}</dd></div>`).join('')}</dl>` : `<p class="home-project-description">${formatProjectDescription(project.description)}</p>`}
              <div class="home-project-actions">
                ${href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">查看完整项目 <span aria-hidden="true">↗</span></a>` : '<span class="home-project-unavailable">暂无公开链接</span>'}
                ${preview ? `<button type="button" data-project-preview="${escapeHtml(project.id)}" aria-label="预览${escapeHtml(project.name)}成果">预览成果</button>` : ''}
              </div>
              ${href && requiresProjectAccess(href) ? '<p class="project-access-note">完整项目需申请访问权限</p>' : ''}
            </article>`;
          }).join('')}
        </div>
      </div>`).join('')}
  `;
}

function renderNotesSection() {
  const el = document.getElementById('notesSection');
  if (!el || !portfolioData) return;

  const featuredIds = Array.isArray(portfolioData.featuredNotes) ? portfolioData.featuredNotes : [];
  const allNotes = Array.isArray(portfolioData.notes) ? portfolioData.notes : [];
  if (!allNotes.length) {
    el.style.display = 'none';
    return;
  }

  el.style.display = '';
  el.innerHTML = `
    <div class="home-section-intro reveal">
      <h2 id="notesHeading">笔记</h2>
      <p>记录数据分析与 AI 学习，<br>沉淀方法与思考。</p>
    </div>
    <div class="home-notes-list">
      ${allNotes.map(note => {
        const noteHref = escapeUrl(note.url);
        const icon = featuredIds.includes(note.id) ? 'note-featured.svg' :
          /ai|agent|skills|mcp|模型/i.test([note.category, ...(note.tags || [])].join(' ')) ? 'note-ai.svg' : 'note-default.svg';
        return `
          <${noteHref ? 'a' : 'div'} class="home-note-row reveal" ${noteHref ? `href="${escapeHtml(noteHref)}" target="_blank" rel="noopener"` : ''}>
            <span class="home-note-icon"><img src="assets/notes-icons/${icon}" alt="" width="28" height="28" loading="lazy"></span>
            <div class="home-note-copy"><h3>${escapeHtml(note.title)}</h3><p>${escapeHtml(note.excerpt || '')}</p></div>
            ${noteHref ? '<span class="home-note-arrow" aria-hidden="true">↗</span>' : '<span class="home-note-unavailable">暂无公开链接</span>'}
          </${noteHref ? 'a' : 'div'}>
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

function initHomeNavigation() {
  const navbar = document.querySelector('.navbar');
  const links = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
  const sections = links.map((link) => document.querySelector(link.getAttribute('href')));
  let lastY = window.scrollY;
  let queued = false;

  function update() {
    queued = false;
    const y = Math.max(0, window.scrollY);
    const readingLine = y + Math.min(window.innerHeight * 0.3, 240);
    let active = 0;
    sections.forEach((section, index) => {
      if (section && section.offsetHeight && section.getBoundingClientRect().top + y <= readingLine) active = index;
    });
    if (y > 0 && y + window.innerHeight >= document.documentElement.scrollHeight - 4) active = links.length - 1;
    links.forEach((link, index) => {
      link.classList.toggle('active', index === active);
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    if (y < 100) navbar.classList.remove('nav-hidden');
    else if (Math.abs(y - lastY) >= 8) navbar.classList.toggle('nav-hidden', y > lastY && y > 160);
    if (Math.abs(y - lastY) >= 8 || y < 100) lastY = y;
  }
  function schedule() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  document.addEventListener('click', (event) => {
    if (!event.defaultPrevented && event.target.closest?.('a[href^="#"]') && 'scrollRestoration' in history) {
      history.scrollRestoration = 'auto';
    }
  }, { capture: true });
  navbar.addEventListener('focusin', () => navbar.classList.remove('nav-hidden'));
  update();
}

async function bootstrapHome() {
  const dataResult = await PortfolioFirebase.loadPortfolioData();
  if (dataResult.ok) {
    portfolioData = dataResult.data;
    renderFeaturedProjects();
    renderNotesSection();
    requestAnimationFrame(() => {
      if (window.__shineReload) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      initScrollReveal();
      if (!window.__shineReload && !window.__shineBackForward && location.hash) {
        const target = document.getElementById(location.hash.slice(1));
        if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
      window.dispatchEvent(new Event('scroll'));
    });
    return;
  }

  renderHomeError(dataResult.error || '首页数据加载失败');
}

document.addEventListener('DOMContentLoaded', () => {
  window.HomeMotion?.initHero();
  initTypewriter();
  initHomeNavigation();

  bootstrapHome().catch((error) => {
    renderHomeError(`页面初始化失败：${error && error.message ? error.message : '未知错误'}`);
  });
});
