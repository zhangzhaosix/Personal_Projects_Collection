const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'ascii-avatar.js'), 'utf8');

async function createPortrait({ reduced = false, desktop = true, width = 1280, fail = false } = {}) {
  const frames = new Map();
  const events = {};
  const classes = new Set();
  const media = [];
  const draws = [];
  let nextFrame = 0;
  let time = 0;
  let intersection;
  const image = {
    naturalWidth: 19, naturalHeight: 25,
    async decode() { if (fail) throw new Error('decode failed'); }
  };
  const pixels = new Uint8ClampedArray(19 * 25 * 4);
  for (const [x, y] of [[0, 0], [9, 0], [18, 24]]) {
    const index = (y * 19 + x) * 4;
    pixels.set([240, 200, 140, 255], index);
  }
  const portrait = {
    classList: { add: (value) => classes.add(value), remove: (value) => classes.delete(value) },
    querySelector: () => image
  };
  const canvas = {
    width: 600, height: 750, parentElement: portrait,
    getContext: () => ({
      clearRect() { draws.length = 0; },
      drawImage: (asset, ...args) => draws.push([asset === image ? 'original' : 'sprite', ...args]),
      getImageData: () => ({ data: pixels })
    }),
    addEventListener: (name, callback) => { events[name] = callback; },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 19, height: 25 })
  };
  const document = {
    hidden: false,
    getElementById: () => canvas,
    createElement: () => ({ getContext: () => ({ putImageData() {} }) }),
    addEventListener: (name, callback) => { events[name] = callback; }
  };
  const context = vm.createContext({
    document,
    window: { addEventListener: (name, callback) => { events[name] = callback; } },
    matchMedia: (query) => {
      const minWidth = query.match(/min-width:\s*(\d+)px/);
      const result = { matches: query.includes('reduced-motion') ? reduced : desktop && (!minWidth || width >= Number(minWidth[1])),
        addEventListener: (_, callback) => { result.change = callback; } };
      media.push(result);
      return result;
    },
    requestAnimationFrame: (callback) => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: (id) => frames.delete(id),
    IntersectionObserver: class {
      constructor(callback) { intersection = callback; }
      observe() {}
    }
  });
  await vm.runInContext(source, context);
  function settle() {
    let count = 0;
    while (frames.size && count++ < 200) {
      const pending = Array.from(frames.values());
      frames.clear();
      time += 16;
      pending.forEach((callback) => callback(time));
    }
    assert.equal(frames.size, 0, '头像归位后必须停止绘制');
  }
  return { frames, events, classes, media, draws, document, settle,
    setVisible: (value) => intersection([{ isIntersecting: value }]) };
}

(async () => {
  const desktop = await createPortrait();
  const firstFrame = Array.from(desktop.frames.values())[0];
  desktop.frames.clear();
  firstFrame(1);
  assert.ok(desktop.draws.every((draw) => draw[0] === 'sprite'), '入场时应使用原图的细小片段');
  assert.ok(desktop.draws.some((draw) => draw[3] === 1 && draw[4] === 1), '应保留原图边缘不足整格的片段');
  desktop.settle();
  assert.ok(desktop.classes.has('is-ready'));
  const resting = JSON.stringify(desktop.draws);
  assert.equal(resting, JSON.stringify([['original', 0, 0]]), '静止时完整绘制原图，保留全部细节');
  desktop.events.pointermove({ pointerType: 'mouse', clientX: 6, clientY: 75 });
  const frame = Array.from(desktop.frames.values())[0];
  desktop.frames.clear();
  frame(3200);
  assert.notEqual(JSON.stringify(desktop.draws), resting, '鼠标应扰动附近字符');
  desktop.events.pointerleave();
  desktop.settle();
  assert.equal(JSON.stringify(desktop.draws), resting, '鼠标移开后应准确归位');
  desktop.events.pointermove({ pointerType: 'mouse', clientX: 6, clientY: 75 });
  desktop.setVisible(false);
  assert.equal(desktop.frames.size, 0, '离开视口时停止动画');
  desktop.setVisible(true);
  desktop.settle();
  desktop.document.hidden = true;
  desktop.events.visibilitychange();
  assert.equal(desktop.frames.size, 0, '后台页面停止绘制');
  desktop.document.hidden = false;
  desktop.events.visibilitychange();
  desktop.settle();

  const mobile = await createPortrait({ desktop: false });
  mobile.settle();
  mobile.events.pointermove({ pointerType: 'touch', clientX: 6, clientY: 75 });
  assert.equal(mobile.frames.size, 0, '触摸操作不触发鼠标扰动');
  assert.equal(mobile.events.touchmove, undefined, '不拦截触摸滚动');

  for (const portrait of [await createPortrait({ width: 390 }), mobile]) {
    portrait.settle();
    portrait.events.pointermove({ pointerType: 'mouse', clientX: 6, clientY: 15 });
    assert.equal(portrait.frames.size, 1, '窄窗口和触摸设备接入鼠标后均应触发扰动');
    const frame = Array.from(portrait.frames.values())[0];
    portrait.frames.clear();
    frame(3200);
    assert.notEqual(JSON.stringify(portrait.draws), resting);
    portrait.events.pointerleave();
    portrait.settle();
    assert.equal(JSON.stringify(portrait.draws), resting, '窄窗口鼠标移开后应归位');
  }

  const reduced = await createPortrait({ reduced: true });
  reduced.settle();
  assert.equal(JSON.stringify(reduced.draws), resting);
  reduced.events.pointermove({ pointerType: 'mouse', clientX: 6, clientY: 75 });
  assert.equal(reduced.frames.size, 0, '减少动态效果时保持静态头像');
  desktop.media[0].matches = true;
  desktop.media[0].change();
  desktop.settle();
  assert.equal(JSON.stringify(desktop.draws), resting);

  const offline = await createPortrait({ fail: true });
  assert.equal(offline.classes.has('is-ready'), false, '加载失败时保留静态图片');
  assert.equal(offline.frames.size, 0);
  console.log('ASCII avatar: gather, interaction, restore, pause, mobile, reduced motion, fallback passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
