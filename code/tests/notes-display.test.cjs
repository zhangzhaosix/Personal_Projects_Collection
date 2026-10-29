const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function createHomeHarness() {
  const notesSection = { style: {}, innerHTML: '' };
  const featuredSection = { style: {}, innerHTML: '' };
  const document = {
    addEventListener() {},
    getElementById(id) {
      return { notesSection, featuredSection }[id] || null;
    },
    querySelectorAll() {
      return [];
    },
    createElement() {
      let value = '';
      return {
        set textContent(next) {
          value = String(next || '');
        },
        get innerHTML() {
          return value
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;');
        }
      };
    }
  };
  const context = vm.createContext({
    document,
    window: { ProjectPreview: { has: (id) => id === 'selected' } },
    URL,
    localStorage: { getItem() { return null; }, setItem() {} },
    location: { protocol: 'file:' },
    requestAnimationFrame() {},
    setTimeout() {},
    fetch() {},
    IntersectionObserver: class { observe() {} },
    PortfolioFirebase: {}
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'js', 'project-text.js'), 'utf8'), context);
  const source = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
  vm.runInContext(`${source}\n;globalThis.setPortfolioData = (data) => { portfolioData = data; }; globalThis.renderNotes = renderNotesSection;`, context);
  return { context, notesSection, featuredSection };
}

function testFeaturedMetricEscaping() {
  const { context } = createHomeHarness();
  const result = context.formatProjectDescription('<img src=x onerror=alert(1)>198 条、12 位、0.26% 以上、约 50 万元、同比增长 5%');
  assert.ok(result.startsWith('&lt;img'), '简介中的 HTML 应保持为文本');
  assert.doesNotMatch(result, /<img/);
  for (const metric of ['198 条', '12 位', '0.26% 以上', '约 50 万元', '同比增长 5%']) {
    assert.ok(result.includes(`<strong>${metric}</strong>`), `加粗时应保留完整口径：${metric}`);
  }
  assert.equal(context.formatProjectDescription(''), '暂无简介');
}

function testFeaturedProjects() {
  const { context, featuredSection } = createHomeHarness();
  context.setPortfolioData({
    featuredWorks: ['selected'],
    categories: [{ name: '数据分析项目', projects: [
      { id: 'normal', name: '普通项目', url: 'https://example.com/normal' },
      { id: 'selected', name: '精选项目 "A" onclick="alert(1)', description: '节省约 50 万元无效投放。', url: 'https://example.com/selected' }
    ] }]
  });
  context.renderFeaturedProjects();
  assert.ok(featuredSection.innerHTML.includes('精选项目'));
  assert.ok(featuredSection.innerHTML.includes('普通项目'), '首页并列展示全部实际项目');
  assert.match(featuredSection.innerHTML, /<strong>约 50 万元<\/strong>/);
  assert.match(featuredSection.innerHTML, /href="https:\/\/example.com\/selected" target="_blank" rel="noopener"/);
  assert.match(featuredSection.innerHTML, /data-project-preview="selected"/);
  assert.match(featuredSection.innerHTML, /aria-label="预览精选项目 &quot;A&quot; onclick=&quot;alert\(1\)成果"/, '可编辑项目名在属性中安全转义');
  assert.doesNotMatch(featuredSection.innerHTML, / onclick="/);
  context.setPortfolioData({ categories: [{ id: 'ai-learning', projects: [{ name: '笔记中的AI资料' }] }, { id: 'vibe', name: 'Vibe Coding', projects: [{ id: 'vibe-1', name: '日常清单', role: '/', tools: '/', outcome: '/', url: 'javascript:alert(1)', description: '<img src=x>' }] }] });
  context.renderFeaturedProjects();
  assert.doesNotMatch(featuredSection.innerHTML, /笔记中的AI资料|javascript:|<img/);
  assert.match(featuredSection.innerHTML, /日常清单/);
  assert.doesNotMatch(featuredSection.innerHTML, /<dt>/, '不展示占位的职责、方法与产出');

  context.setPortfolioData({ categories: [{ projects: [{ name: '抖音电商直播用户行为分析', url: 'https://example.com/live' }] }] });
  context.renderFeaturedProjects();
  assert.ok(featuredSection.innerHTML.includes('抖音电商直播用户行为分析'), '无精选标记时仍支持规范后的项目名');
  context.setPortfolioData({ categories: [] });
  context.renderFeaturedProjects();
  assert.equal(featuredSection.style.display, 'none');
}

function testAllHomeNotes() {
  const { context, notesSection } = createHomeHarness();
  context.setPortfolioData({
    featuredNotes: ['old-1', 'old-2', 'old-3', 'new-4'],
    notes: [
      { id: 'old-1', title: '最早精选' },
      { id: 'normal', title: '普通笔记' },
      { id: 'old-2', title: '第二条精选' },
      { id: 'old-3', title: '第三条精选' },
      { id: 'new-4', title: '最近精选', date: '2026-06-12' }
    ]
  });
  context.renderNotes();

  const expected = ['最早精选', '普通笔记', '第二条精选', '第三条精选', '最近精选'];
  const positions = expected.map((title) => notesSection.innerHTML.indexOf(title));
  assert.ok(positions.every((position) => position >= 0), '首页展示全部笔记');
  assert.ok(positions.every((position, index) => !index || position > positions[index - 1]), '保持内容原顺序');
  assert.doesNotMatch(notesSection.innerHTML, /note-preview-meta|2026-06-12/, '首页推荐笔记不显示日期');
  assert.doesNotMatch(notesSection.innerHTML, /href="notes.html"/);
}

function testEmptyFeaturedNotes() {
  const { context, notesSection } = createHomeHarness();
  context.setPortfolioData({ featuredNotes: ['missing'], notes: [{ id: 'normal', title: '普通笔记' }] });
  context.renderNotes();
  assert.match(notesSection.innerHTML, /普通笔记/, '不依赖精选标记展示笔记');
  context.setPortfolioData({ notes: [] });
  context.renderNotes();
  assert.equal(notesSection.style.display, 'none', '没有笔记时隐藏模块');
}

function testOriginalNoteIcons() {
  const context = vm.createContext({ window: {}, document: { addEventListener() {} } });
  const source = fs.readFileSync(path.join(root, 'js', 'notes.js'), 'utf8');
  vm.runInContext(source, context);
  const cases = [
    [{ category: 'AI学习' }, true, 'note-featured.svg'],
    [{ category: 'AI学习' }, false, 'note-ai.svg'],
    [{ tags: ['SQL'] }, false, 'note-analytics.svg'],
    [{}, false, 'note-default.svg']
  ];
  for (const [note, featured, file] of cases) {
    assert.equal(context.resolveNoteIcon(note, featured), `assets/notes-icons/${file}`);
    assert.ok(fs.existsSync(path.join(root, 'assets', 'notes-icons', file)));
  }
}

function testPaginationAndFooterMarkup() {
  const notesSource = fs.readFileSync(path.join(root, 'js', 'notes.js'), 'utf8');
  const notesHtml = fs.readFileSync(path.join(root, 'notes.html'), 'utf8');

  assert.match(notesSource, /<button type="button" class="page-btn/);
  assert.match(notesSource, /aria-current="page"/);
  assert.match(notesSource, /\.page-btn:not\(:disabled\)/);
  assert.match(notesHtml, /© 2026 Shine/);
  assert.doesNotMatch(notesHtml, /footer-attribution|Flaticon|flaticon\.com/i);
}

testFeaturedMetricEscaping();
testFeaturedProjects();
testAllHomeNotes();
testEmptyFeaturedNotes();
testOriginalNoteIcons();
testPaginationAndFooterMarkup();
console.log('home and notes display regression tests passed');
