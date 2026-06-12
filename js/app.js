/* ============================================
   app.js — 首页交互 + 滚动动画 + 打字机 + 计数
   Firestore 数据由 js/firebase-portfolio.js 提供
   ============================================ */

let portfolioData = null;

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

function initTypewriter() {
  const el = document.getElementById('typewriterText');
  if (!el) return;

  const typewriterPhrases = [
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
    const count = parseInt(localStorage.getItem(apiKey) || '1', 10);
    displayCount(count);
    return;
  }

  if (isNewVisitor) {
    localStorage.setItem('portfolio-visited', '1');
    fetch(`https://api.countapi.xyz/hit/zhangzhaosix/${apiKey}`)
      .then(res => res.json())
      .then(data => displayCount(data.value))
      .catch(() => {
        let count = parseInt(localStorage.getItem(apiKey) || '0', 10) + 1;
        localStorage.setItem(apiKey, String(count));
        displayCount(count);
      });
  } else {
    fetch(`https://api.countapi.xyz/get/zhangzhaosix/${apiKey}`)
      .then(res => res.json())
      .then(data => displayCount(data.value))
      .catch(() => {
        const count = parseInt(localStorage.getItem(apiKey) || '1', 10);
        displayCount(count);
      });
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function renderHomeError(message) {
  const grid = document.getElementById('categoryGrid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="empty-state home-error reveal visible">
      <span class="empty-icon">⚠</span>
      <p>${escapeHtml(message)}</p>
      <button class="btn btn-outline btn-sm home-retry" type="button" onclick="location.reload()">重新加载</button>
    </div>
  `;
}

function renderCategories() {
  const grid = document.getElementById('categoryGrid');
  if (!grid || !portfolioData) return;

  const categoryIcons = {
    'data-analysis': '📊',
    'agent': '🤖',
    'ai-learning': '🧠'
  };

  const categoryColors = {
    'data-analysis': 'rgba(37, 99, 235, 0.06)',
    'agent': 'rgba(37, 99, 235, 0.04)',
    'ai-learning': 'rgba(37, 99, 235, 0.05)'
  };

  const maxProjects = 10;
  const ringColors = ['#2563eb', '#6366f1', '#059669'];

  grid.innerHTML = portfolioData.categories.map((cat, idx) => {
    const icon = categoryIcons[cat.id] || '📁';
    const color = categoryColors[cat.id] || 'rgba(255,255,255,0.05)';
    const count = Array.isArray(cat.projects) ? cat.projects.length : 0;
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

  setTimeout(() => {
    document.querySelectorAll('.progress-ring-fill').forEach(el => {
      el.style.strokeDashoffset = el.getAttribute('stroke-dashoffset');
    });
  }, 300);

  requestAnimationFrame(() => initScrollReveal());
}

async function bootstrapHome() {
  const initResult = await PortfolioFirebase.initFirebase();
  if (!initResult.ok) {
    renderHomeError(initResult.error);
    return;
  }

  const dataResult = await PortfolioFirebase.loadPortfolioData();
  if (dataResult.ok) {
    portfolioData = dataResult.data;
    renderCategories();
    return;
  }

  if (dataResult.empty && PortfolioFirebase.isAdminUser(initResult.auth?.currentUser)) {
    const seedResult = await PortfolioFirebase.ensureAdminSeed();
    if (seedResult.ok) {
      const retryResult = await PortfolioFirebase.loadPortfolioData();
      if (retryResult.ok) {
        portfolioData = retryResult.data;
        renderCategories();
        return;
      }
    }
  }

  renderHomeError(dataResult.error);
}

document.addEventListener('DOMContentLoaded', function () {
  initTypewriter();
  initVisitorCounter();
  bootstrapHome().catch((error) => {
    renderHomeError(`页面初始化失败：${error && error.message ? error.message : '未知错误'}`);
  });
});
