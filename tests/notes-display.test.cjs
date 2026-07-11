const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function createHomeHarness() {
  const notesSection = { style: {}, innerHTML: '' };
  const document = {
    addEventListener() {},
    getElementById(id) {
      return id === 'notesSection' ? notesSection : null;
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
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;');
        }
      };
    }
  };
  const context = vm.createContext({
    document,
    localStorage: { getItem() { return null; }, setItem() {} },
    location: { protocol: 'file:' },
    requestAnimationFrame() {},
    setTimeout() {},
    fetch() {},
    IntersectionObserver: class { observe() {} },
    PortfolioFirebase: {}
  });
  const source = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
  vm.runInContext(`${source}\n;globalThis.setPortfolioData = (data) => { portfolioData = data; }; globalThis.renderNotes = renderNotesSection;`, context);
  return { context, notesSection };
}

function testRecentFeaturedNotes() {
  const { context, notesSection } = createHomeHarness();
  context.setPortfolioData({
    featuredNotes: ['old-1', 'old-2', 'old-3', 'new-4'],
    notes: [
      { id: 'old-1', title: '最早精选' },
      { id: 'normal', title: '普通笔记' },
      { id: 'old-2', title: '第二条精选' },
      { id: 'old-3', title: '第三条精选' },
      { id: 'new-4', title: '最近精选' }
    ]
  });
  context.renderNotes();

  const expected = ['最近精选', '第三条精选', '第二条精选'];
  const positions = expected.map((title) => notesSection.innerHTML.indexOf(title));
  assert.ok(positions.every((position) => position >= 0), '应展示最近标记的三条精选笔记');
  assert.ok(positions[0] < positions[1] && positions[1] < positions[2], '精选笔记应按最近标记优先排序');
  assert.equal(notesSection.innerHTML.includes('最早精选'), false, '不应保留最早的第四条精选笔记');
  assert.equal(notesSection.innerHTML.includes('普通笔记'), false, '不应混入普通笔记');
}

function testEmptyFeaturedNotes() {
  const { context, notesSection } = createHomeHarness();
  context.setPortfolioData({ featuredNotes: ['missing'], notes: [{ id: 'normal', title: '普通笔记' }] });
  context.renderNotes();
  assert.equal(notesSection.style.display, 'none', '没有有效精选笔记时应隐藏模块');
}

function cssBlock(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `缺少 ${selector} 样式`);
  return match[1];
}

function testStableNoteCardLayout() {
  const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');
  const previewFocus = cssBlock(css, '.note-preview-card:focus-visible');
  const grid = cssBlock(css, '.notes-grid');
  const card = cssBlock(css, '.note-card');
  const title = cssBlock(css, '.note-card-title');
  const excerpt = cssBlock(css, '.note-card-excerpt');
  const tags = cssBlock(css, '.note-card-tags');
  const footer = cssBlock(css, '.note-card-footer');

  assert.match(previewFocus, /outline:\s*2px solid var\(--accent-blue\)/);
  assert.match(grid, /repeat\(auto-fill,\s*minmax\(280px,\s*1fr\)\)/);
  assert.match(card, /display:\s*flex/);
  assert.match(card, /flex-direction:\s*column/);
  assert.match(card, /min-height:\s*292px/);
  assert.match(title, /-webkit-line-clamp:\s*2/);
  assert.match(excerpt, /-webkit-line-clamp:\s*2/);
  assert.match(tags, /max-height:\s*56px/);
  assert.match(tags, /overflow:\s*hidden/);
  assert.match(footer, /margin-top:\s*auto/);
}

function testPaginationAndAttributionMarkup() {
  const notesSource = fs.readFileSync(path.join(root, 'js', 'notes.js'), 'utf8');
  const notesHtml = fs.readFileSync(path.join(root, 'notes.html'), 'utf8');

  assert.match(notesSource, /<button type="button" class="page-btn/);
  assert.match(notesSource, /aria-current="page"/);
  assert.match(notesSource, /\.page-btn:not\(:disabled\)/);
  assert.match(notesHtml, /flaticon\.com\/animated-icons-most-downloaded/);
}

testRecentFeaturedNotes();
testEmptyFeaturedNotes();
testStableNoteCardLayout();
testPaginationAndAttributionMarkup();
console.log('notes display regression tests passed');
