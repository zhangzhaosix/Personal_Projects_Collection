const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    }
  };
}

function createHarness({ protocol = 'http:', recordResult = { ok: true }, countResult = { ok: true, count: 2 } } = {}) {
  const visitorCount = {
    hidden: false,
    textContent: '加载中...',
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
  const storage = createStorage();
  const recordCalls = [];
  const countCalls = [];
  let authCallback = null;

  const document = {
    addEventListener() {},
    getElementById(id) {
      return id === 'visitorCount' ? visitorCount : null;
    }
  };

  const PortfolioFirebase = {
    recordVisitor(visitorId, createdAt) {
      recordCalls.push({ visitorId, createdAt });
      return Promise.resolve(recordResult);
    },
    getVisitorCount(user) {
      countCalls.push(user);
      return Promise.resolve(countResult);
    },
    onAuthChange(callback) {
      authCallback = callback;
    },
    isAdminUser(user) {
      return Boolean(user && user.email === 'admin@example.com');
    }
  };

  const context = vm.createContext({
    document,
    localStorage: storage,
    location: { protocol },
    PortfolioFirebase
  });
  const source = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
  vm.runInContext(`${source}\n;globalThis.initVisitorCounterTest = initVisitorCounter;`, context);

  return {
    context,
    visitorCount,
    recordCalls,
    countCalls,
    runAuth(user) {
      assert.ok(authCallback, '应注册 Firebase 登录状态监听');
      authCallback(user);
    }
  };
}

async function flushPromises() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

async function testPublicVisitorCannotSeeCount() {
  const harness = createHarness();
  harness.context.initVisitorCounterTest();
  harness.runAuth({ email: 'guest@example.com' });
  await flushPromises();

  assert.equal(harness.visitorCount.hidden, true);
  assert.equal(harness.visitorCount.textContent, '');
  assert.equal(harness.countCalls.length, 0, '普通访客不应查询统计总数');
  assert.equal(harness.recordCalls.length, 1, '普通访客仍应记录首次访问');
}

async function testAdminCanSeeCount() {
  const harness = createHarness();
  const admin = { email: 'admin@example.com' };
  harness.context.initVisitorCounterTest();
  harness.runAuth(admin);
  await flushPromises();

  assert.equal(harness.visitorCount.hidden, false);
  assert.equal(harness.visitorCount.textContent, '👥 访问用户数: 2');
  assert.equal(harness.countCalls.length, 1);
  assert.equal(harness.countCalls[0], admin);
}

async function testLogoutHidesCount() {
  const harness = createHarness();
  harness.context.initVisitorCounterTest();
  harness.runAuth({ email: 'admin@example.com' });
  await flushPromises();
  harness.runAuth(null);
  await flushPromises();

  assert.equal(harness.visitorCount.hidden, true);
  assert.equal(harness.visitorCount.textContent, '');
}

async function testSameDeviceDoesNotRecordTwice() {
  const harness = createHarness();
  harness.context.initVisitorCounterTest();
  await flushPromises();
  harness.context.initVisitorCounterTest();
  await flushPromises();

  assert.equal(harness.recordCalls.length, 1, '同一设备只应记录一次');
}

async function testFilePreviewDoesNotTrack() {
  const harness = createHarness({ protocol: 'file:' });
  harness.context.initVisitorCounterTest();

  assert.equal(harness.visitorCount.hidden, true);
  assert.equal(harness.recordCalls.length, 0, 'file: 预览不应发起远程访客记录');
}

async function testFailedCounterDoesNotShowOne() {
  const harness = createHarness({
    recordResult: { ok: false },
    countResult: { ok: false }
  });
  harness.context.initVisitorCounterTest();
  harness.runAuth({ email: 'admin@example.com' });
  await flushPromises();

  assert.equal(harness.visitorCount.textContent, '👥 访问用户数: 暂不可用');
  assert.equal(harness.visitorCount.textContent.includes('1'), false);
}

Promise.resolve()
  .then(testPublicVisitorCannotSeeCount)
  .then(testAdminCanSeeCount)
  .then(testLogoutHidesCount)
  .then(testSameDeviceDoesNotRecordTwice)
  .then(testFilePreviewDoesNotTrack)
  .then(testFailedCounterDoesNotShowOne)
  .then(() => console.log('visitor counter regression tests passed'));
