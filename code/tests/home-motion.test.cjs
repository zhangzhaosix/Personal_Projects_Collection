const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const motionSource = fs.readFileSync(path.join(root, 'js/home-motion.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');

function element(names, top = 1000) {
  const classes = new Set(names.split(' '));
  return {
    classList: {
      contains: (name) => classes.has(name),
      add: (...values) => values.forEach((value) => classes.add(value)),
      remove: (...values) => values.forEach((value) => classes.delete(value)),
      toggle: (name, value) => { if (value) classes.add(name); else classes.delete(name); }
    },
    getBoundingClientRect: () => ({ top, bottom: top + 100 }),
    textContent: '',
    classes
  };
}

function motionHarness({ reduced = false, mobile = false } = {}) {
  const events = {};
  const observers = [];
  const animations = [];
  const media = { matches: reduced, addEventListener: (_, callback) => { media.change = callback; } };
  const hero = ['hero-name', 'hero-focus', 'hero-tagline', 'hero-description', 'typewriter-wrapper'].map((name) => element(name, 80));
  const cards = [element('home-project-card reveal'), element('home-project-card reveal')];
  cards.forEach((card) => { card.parentElement = { children: cards }; });
  const heading = element('home-section-heading reveal');
  const nodes = [heading, ...cards, element('home-note-row reveal')];
  [...hero, ...nodes].forEach((node) => {
    node.animate = (frames, options) => {
      const handlers = {};
      const animation = {
        frames, options, paused: false, cancelled: false,
        addEventListener: (name, callback) => { handlers[name] = callback; },
        pause() { this.paused = true; },
        play() { this.paused = false; },
        cancel() { this.cancelled = true; handlers.cancel?.(); },
        finish() { handlers.finish?.(); }
      };
      animations.push(animation);
      return animation;
    };
  });
  class Observer {
    constructor(callback) { this.callback = callback; this.observed = new Set(); observers.push(this); }
    observe(node) { this.observed.add(node); }
    unobserve(node) { this.observed.delete(node); }
    disconnect() { this.observed.clear(); }
    enter(node) { this.callback([{ target: node, isIntersecting: true }]); }
  }
  const document = {
    hidden: false,
    querySelectorAll: (selector) => selector.includes('hero-intro') ? hero : nodes,
    addEventListener: (name, callback) => { events[name] = callback; }
  };
  const window = { innerHeight: 800, IntersectionObserver: Observer,
    matchMedia: (query) => query.includes('reduced-motion') ? media : { matches: mobile } };
  vm.runInNewContext(motionSource, { window, document, IntersectionObserver: Observer });
  return { api: window.HomeMotion, media, document, events, observers, animations, nodes, hero, cards, heading };
}

test('作品同排错峰、进入一次后不重复；默认内容不靠隐藏类等待脚本', () => {
  const h = motionHarness();
  h.api.initSections();
  assert.equal(h.animations.length, 0);
  assert.ok(h.nodes.every((node) => node.classes.has('visible') && !node.classes.has('is-reveal-pending')));
  h.observers[0].enter(h.cards[1]);
  assert.equal(h.animations[0].options.delay, 80);
  h.observers[0].enter(h.cards[1]);
  h.api.initSections();
  assert.equal(h.animations.length, 1);
  h.animations[0].finish();
  const compact = motionHarness({ mobile: true });
  compact.api.initSections();
  compact.observers[0].enter(compact.cards[1]);
  assert.equal(compact.animations[0].options.delay, 0);
  assert.match(compact.animations[0].frames[0].transform, /24px/);
});

test('首屏名字遮罩与分层节奏约一秒收束；页面隐藏暂停当前动画', () => {
  const h = motionHarness();
  h.api.initHero();
  assert.equal(h.animations.length, 5);
  assert.match(h.animations[0].frames[0].clipPath, /100%/);
  assert.ok(h.animations.every(({ options }) => options.delay + options.duration <= 1000));
  h.document.hidden = true;
  h.events.visibilitychange();
  assert.ok(h.animations.every((animation) => animation.paused));
  h.document.hidden = false;
  h.events.visibilitychange();
  assert.ok(h.animations.every((animation) => !animation.paused));
});

test('动态开启减少动态效果会取消进场，未进入区块也保持完整可见', () => {
  const h = motionHarness();
  h.api.initHero();
  h.api.initSections();
  h.observers[0].enter(h.heading);
  h.media.matches = true;
  h.media.change();
  assert.ok(h.animations.every((animation) => animation.cancelled));
  assert.equal(h.observers[0].observed.size, 0);
  assert.ok(h.nodes.every((node) => !node.classes.has('is-motion-entering')));
  const staticPage = motionHarness({ reduced: true });
  staticPage.api.initHero();
  staticPage.api.initSections();
  assert.equal(staticPage.animations.length, 0);
});

test('轮播持续切换，后台、离开视口和减少动态效果时没有待运行计时器', () => {
  const events = {};
  const timers = new Map();
  let nextTimer = 0;
  let intersection;
  const wrapper = element('typewriter-wrapper');
  const text = element('typewriter-text');
  const media = { matches: false, addEventListener: (_, callback) => { media.change = callback; } };
  const document = {
    hidden: false,
    querySelector: () => wrapper,
    getElementById: () => text,
    addEventListener: (name, callback) => { events[name] = callback; }
  };
  class Observer { constructor(callback) { intersection = callback; } observe() {} }
  const window = { matchMedia: () => media, IntersectionObserver: Observer };
  const context = vm.createContext({ window, document, IntersectionObserver: Observer,
    setTimeout: (callback) => { timers.set(++nextTimer, callback); return nextTimer; },
    clearTimeout: (id) => timers.delete(id) });
  vm.runInContext(appSource, context);
  context.initTypewriter();
  const seen = new Set();
  for (let index = 0; index < 100; index++) {
    const [id, callback] = timers.entries().next().value;
    timers.delete(id);
    callback();
    seen.add(text.textContent);
  }
  assert.ok(seen.has('先完成再完美'));
  document.hidden = true;
  events.visibilitychange();
  assert.equal(timers.size, 0);
  document.hidden = false;
  events.visibilitychange();
  assert.equal(timers.size, 1);
  intersection([{ isIntersecting: false }]);
  assert.equal(timers.size, 0);
  intersection([{ isIntersecting: true }]);
  assert.equal(timers.size, 1);
  media.matches = true;
  media.change();
  assert.equal(timers.size, 0);
  assert.equal(text.textContent, '多做少想！');
  media.matches = false;
  media.change();
  assert.equal(timers.size, 1);
});

test('刷新清除残留锚点并提前回顶，正常直达与返回不改锚点', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const headScript = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const type of ['reload', 'navigate', 'back_forward']) {
    const actions = [];
    const events = {};
    const history = { state: { retained: true }, scrollRestoration: 'auto',
      replaceState: (...args) => actions.push(['replace', ...args]) };
    const window = { scrollTo: (options) => actions.push(['scroll', options]),
      addEventListener: (name, callback) => { events[name] = callback; } };
    const document = { documentElement: { style: {} } };
    vm.runInNewContext(headScript, { window, history, document,
      performance: { getEntriesByType: () => [{ type }] },
      location: { hash: '#contactSection', pathname: '/index.html', search: '?preview=1' } });
    assert.equal(window.__shineReload, type === 'reload');
    assert.equal(window.__shineBackForward, type === 'back_forward');
    if (type === 'reload') {
      assert.equal(history.scrollRestoration, 'manual');
      assert.equal(document.documentElement.style.overflowAnchor, 'none', '刷新入场不触发滚动锚定');
      assert.equal(actions[0][3], '/index.html?preview=1');
      assert.equal(actions[1][1].top, 0);
      events.pagehide();
      assert.equal(history.scrollRestoration, 'auto');
    } else {
      assert.equal(actions.length, 0);
      assert.equal(document.documentElement.style.overflowAnchor, undefined);
    }
  }
});

test('数据渲染后只为正常直达锚点定位，刷新回顶、历史返回保留恢复位置', async () => {
  for (const type of ['reload', 'navigate', 'back_forward']) {
    let scrolled = 0;
    let calibrated = 0;
    const sections = {
      featuredSection: { style: {} }, notesSection: { style: {} },
      contactSection: { scrollIntoView() { scrolled++; } }
    };
    const document = { addEventListener() {}, getElementById: (id) => sections[id] };
    const window = { __shineReload: type === 'reload', __shineBackForward: type === 'back_forward',
      HomeMotion: { initSections() {} }, dispatchEvent() {},
      scrollTo(options) { assert.equal(options.top, 0); calibrated++; } };
    const context = vm.createContext({ window, document, location: { hash: '#contactSection' },
      PortfolioFirebase: { async loadPortfolioData() { return { ok: true, data: { categories: [], notes: [] } }; } },
      requestAnimationFrame: (callback) => callback(), Event: class {} });
    vm.runInContext(appSource, context);
    await context.bootstrapHome();
    assert.equal(scrolled, type === 'navigate' ? 1 : 0);
    assert.equal(calibrated, type === 'reload' ? 1 : 0, '只在刷新数据落地时立即校准，不影响直达与返回');
  }
});

test('刷新后首次首页锚点点击前恢复自动历史位置，覆盖导航、跳到作品和键盘生成的click', () => {
  const events = {};
  const navbar = { classList: element('navbar').classList, addEventListener() {} };
  const history = { scrollRestoration: 'manual' };
  const document = {
    documentElement: { scrollHeight: 3000 },
    querySelector: () => navbar,
    querySelectorAll: () => [],
    addEventListener: (name, callback, options) => { events[name] = { callback, options }; }
  };
  const window = { scrollY: 0, innerHeight: 800, addEventListener() {} };
  const context = vm.createContext({ window, document, history });
  vm.runInContext(appSource, context);
  context.initHomeNavigation();
  assert.equal(history.scrollRestoration, 'manual', '初始化不提前解除刷新保护');
  assert.equal(events.click.options.capture, true, '在锚点默认导航之前恢复');
  events.click.callback({ defaultPrevented: false, target: { closest: () => null } });
  assert.equal(history.scrollRestoration, 'manual', '非锚点交互不改变刷新保护');
  for (const [href, detail] of [['#featuredSection', 1], ['#contactSection', 1], ['#featuredSection', 0]]) {
    history.scrollRestoration = 'manual';
    events.click.callback({ defaultPrevented: false, detail,
      target: { closest: (selector) => selector === 'a[href^="#"]' ? { href } : null } });
    assert.equal(history.scrollRestoration, 'auto', '不依赖pagehide，后续同文档返回可由浏览器恢复');
  }
});
