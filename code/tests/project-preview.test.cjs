const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../js/project-preview.js'), 'utf8');

function loadPreview({ reduced = false, hover = true, dpr = 1, pages, fixtures } = {}) {
  const images = [];
  const animations = [];
  const closeEvents = [];
  let dialog;
  let restoredFocus = 0;
  const opener = element();
  opener.dataset.projectPreview = 'p_1780814882051_z593';
  opener.focus = () => { restoredFocus += 1; };
  const timers = new Map();
  const created = [];
  let nextTimer = 0;

  function element() {
    const listeners = new Map();
    const classes = new Set();
    return {
      style: {}, dataset: {}, children: [], attributes: {}, hidden: false,
      clientWidth: 1000, clientHeight: 600, isConnected: true,
      classList: {
        add(name) { classes.add(name); }, remove(name) { classes.delete(name); },
        contains(name) { return classes.has(name); },
        toggle(name, value) { if (value) classes.add(name); else classes.delete(name); }
      },
      addEventListener(type, handler) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(handler);
      },
      emit(type, values = {}) {
        const event = { target: this, defaultPrevented: false,
          preventDefault() { this.defaultPrevented = true; }, ...values };
        for (const handler of listeners.get(type) || []) handler(event);
        return event;
      },
      setAttribute(name, value) { this.attributes[name] = value; },
      getAttribute(name) { return this.attributes[name] || null; },
      removeAttribute(name) { delete this.attributes[name]; if (name === 'src') this.sourceRemoved = true; },
      contains(other) { return this === other || this.children.includes(other); },
      closest(selector) {
        if (selector === 'button') return this.tagName === 'BUTTON' ? this : null;
        if (selector.startsWith('.')) return this.className === selector.slice(1) ? this : null;
        return this.dataset.projectPreview ? this : null;
      },
      matches() { return true; },
      replaceChildren(...children) { this.children = children; children.forEach((child) => { child.parentElement = this; }); },
      append(child) { this.children.push(child); child.parentElement = this; },
      remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter((child) => child !== this); },
      focus() {}, scrollTo() {}, hasPointerCapture() { return false; }, setPointerCapture() {},
      getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
    };
  }

  const document = {
    ...element(),
    activeElement: opener, hidden: false,
    body: { append() {} }, documentElement: element(),
    createElement(tag) {
      const node = element();
      const nodes = new Map();
      node.querySelector = (selector) => {
        if (!nodes.has(selector)) {
          const child = element();
          if (selector.startsWith('.')) child.className = selector.slice(1);
          if (selector.endsWith('-retry')) child.tagName = 'BUTTON';
          const zoom = selector.match(/data-preview-zoom="(\w+)"/);
          if (zoom) child.dataset.previewZoom = zoom[1];
          nodes.set(selector, child);
        }
        return nodes.get(selector);
      };
      created.push(node);
      if (tag !== 'dialog') return node;
      dialog = node;
      node.open = false;
      node.querySelectorAll = () => ['in', 'out', 'native', 'fit'].map((name) => node.querySelector(`[data-preview-zoom="${name}"]`));
      node.showModal = () => { node.open = true; };
      node.close = () => { node.open = false; closeEvents.push(() => node.emit('close')); };
      node.animate = (keyframes, options) => {
        let resolve;
        let reject;
        const finished = new Promise((a, b) => { resolve = a; reject = b; });
        const animation = { keyframes, options, finished, finish: resolve,
          cancel() { reject(new Error('cancelled')); } };
        animations.push(animation);
        return animation;
      };
      return node;
    }
  };
  class Image {
    constructor() { Object.assign(this, element()); this.naturalWidth = 2000; this.naturalHeight = 1200; }
    set src(value) { this.url = value; images.push(this); }
  }
  const window = { devicePixelRatio: dpr, addEventListener() {} };
  const context = vm.createContext({
    window, document, Image, ResizeObserver: class { observe() {} },
    matchMedia(query) { return { matches: query.includes('any-hover') ? hover : query.includes('reduced-motion') && reduced, addEventListener() {} }; },
    innerWidth: 1440, innerHeight: 1000,
    setTimeout(callback) { timers.set(++nextTimer, callback); return nextTimer; },
    clearTimeout(id) { timers.delete(id); },
    getComputedStyle() { return { opacity: '1', transform: 'none' }; },
    previewFixtures: fixtures || (pages ? { report: { title: 'Test report', pages } } : undefined)
  });
  // 只替换测试输入；运行与实际页面相同的加载、分页和关闭逻辑。
  vm.runInContext(source.replace('const previews = {', 'const previews = globalThis.previewFixtures || {'), context);
  return { api: window.ProjectPreview, images, animations, document, opener,
    get peek() { return created.find((node) => node.className === 'project-preview-peek'); },
    flushTimers() { const pending = [...timers.values()]; timers.clear(); pending.forEach((callback) => callback()); },
    get dialog() { return dialog; },
    get restoredFocus() { return restoredFocus; },
    flushCloseEvents() { closeEvents.splice(0).forEach((event) => event()); }
  };
}

test('预览按需加载，旧图片回调不会覆盖新打开的项目', () => {
  const app = loadPreview({ reduced: true, fixtures: {
    first: { title: 'First image', file: 'test-first.png', alt: 'First image' },
    second: { title: 'Second image', file: 'test-second.png', alt: 'Second image' }
  } });
  assert.equal(app.images.length, 0);
  assert.equal(app.api.open('unknown'), false);
  app.api.open('first', app.opener);
  const first = app.images[0];
  app.api.open('second', app.opener);
  const second = app.images[1];
  first.onload();
  assert.equal(app.dialog.querySelector('.project-preview-stage').children.length, 0);
  second.onload();
  assert.equal(app.dialog.querySelector('.project-preview-stage').children[0], second);
  assert.equal(app.dialog.querySelector('.project-preview-pages').hidden, true);
});

test('悬浮只请求轻量局部图，移入小窗保持，点击仍打开完整预览', () => {
  const app = loadPreview({ reduced: true });
  app.document.emit('pointerover', { target: app.opener, pointerType: 'mouse' });
  assert.equal(app.images.length, 0);
  app.flushTimers();
  assert.match(app.images[0].url, /peek\/sheet\.webp$/);
  app.images[0].onload();
  assert.equal(app.peek.querySelector('.project-preview-peek-media').children[0], app.images[0]);
  app.document.emit('pointerout', { target: app.opener });
  app.peek.emit('pointerenter');
  app.flushTimers();
  assert.equal(app.peek.hidden, false);
  app.document.emit('click', { target: app.opener });
  assert.equal(app.peek.hidden, true);
  assert.equal(app.opener.getAttribute('aria-describedby'), null);
  assert.equal(app.dialog.open, true);
  assert.match(app.images[1].url, /sheet-overview\.webp$/);
  app.dialog.querySelector('.project-preview-close').emit('click');
  app.flushCloseEvents();
  app.document.emit('pointerover', { target: app.opener, pointerType: 'mouse' });
  app.flushTimers();
  assert.equal(app.peek.hidden, true);
  app.document.emit('pointerout', { target: { closest() { return null; } } });
  app.document.emit('pointerout', { target: app.opener });
  app.document.emit('pointerover', { target: app.opener, pointerType: 'mouse' });
  app.flushTimers();
  assert.equal(app.peek.hidden, false);
});

test('跨项目和Esc关闭隔离迟到小图，快速键盘移开取消等待', () => {
  const app = loadPreview();
  app.opener.setAttribute('aria-describedby', 'existing');
  app.document.emit('focusin', { target: app.opener });
  app.document.emit('focusout', { target: app.opener });
  app.flushTimers();
  assert.equal(app.images.length, 0);
  app.document.emit('pointerover', { target: app.opener, pointerType: 'mouse' });
  app.flushTimers();
  const stale = app.images[0];
  const other = { ...app.opener, attributes: {}, dataset: { projectPreview: 'p_1780843960501_2nmq' } };
  app.document.emit('pointerover', { target: other, pointerType: 'mouse' });
  app.flushTimers();
  const current = app.images[1];
  current.onload();
  stale.onload();
  assert.match(current.url, /peek\/mindmap\.webp$/);
  assert.equal(app.peek.querySelector('.project-preview-peek-media').children[0], current);
  assert.equal(app.opener.getAttribute('aria-describedby'), 'existing');
  app.document.emit('keydown', { key: 'Escape' });
  assert.equal(app.peek.hidden, true);
});

test('关闭A后从B悬浮移回受抑制的A，不取消B的收起计时', () => {
  const app = loadPreview({ reduced: true });
  app.api.open(app.opener.dataset.projectPreview, app.opener);
  app.dialog.querySelector('.project-preview-close').emit('click');
  app.flushCloseEvents();
  const other = { ...app.opener, attributes: {}, dataset: { projectPreview: 'p_1780841238422_ic9b' } };
  app.document.emit('pointerover', { target: other, pointerType: 'mouse' });
  app.flushTimers();
  assert.equal(app.peek.hidden, false);
  app.document.emit('pointerout', { target: other, relatedTarget: app.opener });
  app.document.emit('pointerover', { target: app.opener, pointerType: 'mouse' });
  app.flushTimers();
  assert.equal(app.peek.hidden, true);
});

test('触摸与无悬浮设备不请求局部图，小图失败仍保留完整预览入口', () => {
  const touch = loadPreview({ hover: false });
  touch.document.emit('pointerover', { target: touch.opener, pointerType: 'mouse' });
  touch.document.emit('pointerover', { target: touch.opener, pointerType: 'touch' });
  touch.document.emit('focusin', { target: touch.opener });
  touch.flushTimers();
  assert.equal(touch.images.length, 0);
  const app = loadPreview({ reduced: true });
  app.document.emit('pointerover', { target: app.opener, pointerType: 'mouse' });
  app.flushTimers();
  app.images[0].onerror();
  assert.match(app.peek.querySelector('.project-preview-peek-media').textContent, /点击按钮查看完整成果/);
  app.document.emit('scroll');
  assert.equal(app.peek.hidden, true);
  app.api.open(app.opener.dataset.projectPreview, app.opener);
  assert.equal(app.dialog.open, true);
});

test('关闭动画被重新打开打断时，旧结束回调与原生close事件保留新预览', async () => {
  const app = loadPreview();
  app.api.open('p_1780814882051_z593', app.opener);
  assert.equal(app.animations[0].options.duration, 320);
  app.dialog.querySelector('.project-preview-close').emit('click');
  const exit = app.animations[1];
  assert.equal(exit.options.duration, 160);
  app.api.open('p_1780841238422_ic9b', app.opener);
  app.images[1].onload();
  exit.finish();
  await Promise.resolve();
  app.dialog.emit('close');
  assert.equal(app.dialog.open, true);
  assert.equal(app.dialog.querySelector('.project-preview-stage').children[0], app.images[1]);
  assert.equal(app.restoredFocus, 0);
  app.dialog.querySelector('.project-preview-close').emit('click');
  app.animations.at(-1).finish();
  await Promise.resolve();
  app.flushCloseEvents();
  assert.equal(app.dialog.open, false);
  assert.equal(app.restoredFocus, 1);
  assert.equal(app.document.documentElement.classList.contains('project-preview-open'), false);
});

test('减少动态效果时Escape立即关闭，晚到close事件不清空紧接着打开的预览', () => {
  const app = loadPreview({ reduced: true });
  app.api.open('p_1780814882051_z593', app.opener);
  const event = app.dialog.emit('cancel');
  assert.equal(event.defaultPrevented, true);
  assert.equal(app.dialog.open, false);
  app.api.open('p_1780843960501_2nmq', app.opener);
  app.flushCloseEvents();
  app.images[1].onload();
  assert.equal(app.animations.length, 0);
  assert.equal(app.dialog.querySelector('.project-preview-stage').children[0], app.images[1]);
});

test('多页报告只请求当前页，快速翻页不受前页迟到加载影响', () => {
  const app = loadPreview({ reduced: true, pages: [
    { file: 'test-page-1.png', title: 'Test page 1' },
    { file: 'test-page-2.png', title: 'Test page 2' }
  ] });
  app.api.open('report', app.opener);
  assert.equal(app.images.length, 1);
  assert.match(app.images[0].url, /test-page-1\.png$/);
  assert.equal(app.dialog.querySelector('.project-preview-pages').hidden, false);
  assert.equal(app.dialog.querySelector('[data-preview-page="previous"]').disabled, true);
  app.dialog.querySelector('[data-preview-page="next"]').emit('click');
  assert.equal(app.images.length, 2);
  assert.match(app.images[1].url, /test-page-2\.png$/);
  app.images[1].onload();
  app.images[0].onload();
  assert.equal(app.dialog.querySelector('.project-preview-stage').children[0], app.images[1]);
  assert.equal(app.dialog.querySelector('.project-preview-page-count').textContent, '2 / 2');
  assert.equal(app.dialog.querySelector('[data-preview-page="next"]').disabled, true);
});

test('实际分析报告的21项页面与补充图均存在，逐页请求且保持报告顺序', () => {
  const app = loadPreview({ reduced: true });
  app.api.open('p_1780841697010_p9ip', app.opener);
  const directory = app.dialog.querySelector('.project-preview-page-select');
  assert.equal(directory.children.length, 21);
  const requested = [];
  for (let index = 0; index < directory.children.length; index += 1) {
    if (index) app.dialog.querySelector('[data-preview-page="next"]').emit('click');
    assert.equal(app.images.length, index + 1);
    const url = app.images.at(-1).url;
    assert.ok(fs.existsSync(path.join(__dirname, '..', url)), `Missing preview: ${url}`);
    requested.push(path.basename(url));
  }
  assert.deepEqual(requested.filter((name) => name.startsWith('page-')),
    Array.from({ length: 17 }, (_, index) => `page-${String(index + 1).padStart(2, '0')}.webp`));
  assert.equal(requested[2], 'summary-table.webp');
  assert.equal(requested[5], 'analysis-chart.webp');
  assert.equal(requested[12], 'chart-cost.webp');
  assert.equal(requested[17], 'chart-potential.webp');
});

test('完整长思维导图初始按宽度展开，适应窗口回全图，100%回原始像素', () => {
  const app = loadPreview({ reduced: true });
  app.api.open('p_1780843960501_2nmq', app.opener);
  const image = app.images[0];
  assert.match(image.url, /mindmap-overview\.webp$/);
  assert.ok(fs.existsSync(path.join(__dirname, '..', image.url)));
  for (let index = 0; index < 9; index += 1) {
    assert.ok(fs.existsSync(path.join(__dirname, `../assets/previews/mindmap-detail/tile-${index}.webp`)));
  }
  image.naturalWidth = 800;
  image.naturalHeight = 5304;
  image.onload();
  const stage = app.dialog.querySelector('.project-preview-stage');
  const viewer = app.dialog.querySelector('.project-preview-viewer');
  const getScale = () => Number(stage.style.transform.match(/scale\(([^)]+)\)/)[1]);
  const initialScale = getScale();
  assert.equal(initialScale, Math.min(1, (viewer.clientWidth - 32) / 2667));
  assert.match(stage.style.transform, /, 16px\)/);
  app.dialog.querySelector('[data-preview-zoom="fit"]').emit('click');
  assert.ok(getScale() < initialScale);
  assert.ok(17682 * getScale() <= viewer.clientHeight - 32);
  app.dialog.querySelector('[data-preview-zoom="native"]').emit('click');
  assert.equal(app.dialog.querySelector('.project-preview-scale').textContent, '100%');
});

test('实际报告每页初始按宽度阅读，完整表格保持原像素且可回全页总览', () => {
  const app = loadPreview({ reduced: true });
  app.api.open('p_1780841697010_p9ip', app.opener);
  const stage = app.dialog.querySelector('.project-preview-stage');
  const viewer = app.dialog.querySelector('.project-preview-viewer');
  const getScale = () => Number(stage.style.transform.match(/scale\(([^)]+)\)/)[1]);
  const readyImage = () => {
    const image = app.images.at(-1);
    const dimensions = image.url.endsWith('summary-table.webp') ? [876, 191] : [1656, 2339];
    [image.naturalWidth, image.naturalHeight] = dimensions;
    image.onload();
    return image;
  };
  const page = readyImage();
  const widthScale = Math.min(1, (viewer.clientWidth - 32) / page.naturalWidth);
  assert.equal(getScale(), widthScale);
  assert.match(stage.style.transform, /, 16px\)/);
  app.dialog.querySelector('[data-preview-zoom="fit"]').emit('click');
  assert.ok(getScale() < widthScale);
  assert.ok(page.naturalHeight * getScale() <= viewer.clientHeight - 32);
  const directory = app.dialog.querySelector('.project-preview-page-select');
  directory.value = '2';
  directory.emit('change');
  const table = readyImage();
  assert.match(table.url, /summary-table\.webp$/);
  assert.equal(getScale(), 1);
  assert.equal(stage.children[0], table);
  assert.equal(app.dialog.querySelector('.project-preview-hint').textContent,
    '拖拽移动 · 滚轮缩放 · 适应窗口查看全图');
});

function loadTiledPreview() {
  const app = loadPreview({ reduced: true, fixtures: { map: {
    title: 'Long map', file: 'map-overview.webp', initialFit: 'width',
    detail: { width: 2000, height: 10000, tileHeight: 2048, folder: 'map-detail' }
  } } });
  app.api.open('map', app.opener);
  const viewer = app.dialog.querySelector('.project-preview-viewer');
  viewer.clientWidth = 400;
  const base = app.images[0];
  base.naturalWidth = 800;
  base.naturalHeight = 4000;
  base.onload();
  return { app, viewer, base, stage: app.dialog.querySelector('.project-preview-stage') };
}

test('长图先只加载轻量全貌，100%保持原坐标并仅加载当前可见分片', () => {
  const { app, base, stage } = loadTiledPreview();
  assert.equal(app.images.length, 1);
  assert.equal(stage.style.width, '2000px');
  assert.equal(stage.style.height, '10000px');
  assert.deepEqual(stage.children, [base]);
  app.dialog.querySelector('[data-preview-zoom="native"]').emit('click');
  assert.equal(app.dialog.querySelector('.project-preview-scale').textContent, '100%');
  assert.equal(app.images.length, 2);
  assert.match(app.images[1].url, /map-detail\/tile-0\.webp$/);
  assert.equal(stage.children.length, 1);
  app.images[1].onload();
  assert.equal(stage.children.length, 2);
  assert.equal(app.images[1].style.height, '2048px');
});

test('平移释放离屏高清分片，迟到回调不回填，缩回全图仅保留底图', () => {
  const { app, viewer, stage, base } = loadTiledPreview();
  app.dialog.querySelector('[data-preview-zoom="native"]').emit('click');
  const first = app.images[1];
  const lateLoad = first.onload;
  viewer.emit('pointerdown', { target: viewer, pointerType: 'mouse', button: 0, pointerId: 1, clientX: 100, clientY: 100 });
  viewer.emit('pointermove', { target: viewer, pointerId: 1, clientX: 100, clientY: -2300 });
  assert.equal(first.sourceRemoved, true);
  assert.match(app.images.at(-1).url, /map-detail\/tile-2\.webp$/);
  lateLoad();
  assert.deepEqual(stage.children, [base]);
  app.images.at(-1).onload();
  assert.equal(stage.children.length, 2);
  viewer.emit('pointermove', { target: viewer, pointerId: 1, clientX: 100, clientY: -20000 });
  assert.match(app.images.at(-1).url, /map-detail\/tile-4\.webp$/);
  assert.equal(app.images.at(-1).style.height, '1808px');
  app.dialog.querySelector('[data-preview-zoom="fit"]').emit('click');
  assert.deepEqual(stage.children, [base]);
  assert.equal(app.dialog.querySelector('.project-preview-detail-feedback').hidden, true);
});

test('高清分片失败保留整体图并可重试，关闭后旧请求不再覆盖新项目', () => {
  const { app, viewer, stage, base } = loadTiledPreview();
  app.dialog.querySelector('[data-preview-zoom="native"]').emit('click');
  app.images[1].onerror();
  assert.deepEqual(stage.children, [base]);
  assert.equal(app.dialog.querySelector('.project-preview-detail-retry').hidden, false);
  const press = viewer.emit('pointerdown', {
    target: app.dialog.querySelector('.project-preview-detail-retry'), pointerType: 'touch'
  });
  assert.equal(press.defaultPrevented, false);
  assert.match(app.dialog.querySelector('.project-preview-detail-message').textContent, /仍可查看整体图/);
  app.dialog.querySelector('.project-preview-detail-retry').emit('click');
  assert.equal(app.images.length, 3);
  const lateLoad = app.images[2].onload;
  app.dialog.querySelector('.project-preview-close').emit('click');
  assert.equal(app.images[2].sourceRemoved, true);
  app.flushCloseEvents();
  lateLoad();
  assert.equal(stage.children.length, 0);
});
