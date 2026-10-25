const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { encode, decode, publicData, contentHash } = require('../../lib/publication.cjs');
const handler = require('../../api/publish.js');
const deployed = require('../published.json');
const source = { categories: [{ id: 'analysis', name: '分析', groups: [], projects: [{ id: 'p1', name: '项目', url: 'https://example.com' }] }], notes: [] };

function json(body, status = 200) { return { ok: status >= 200 && status < 300, status, async json() { return body; } }; }
function document(data = source, updateTime = '2026-10-25T00:00:00Z') { return { fields: encode(data).mapValue.fields, updateTime }; }
async function call(method, authorization = 'Bearer test-token', headers = {}) {
  const result = { statusCode: 200, headers: {} };
  const response = { setHeader(key, value) { result.headers[key] = value; }, status(code) { result.statusCode = code; return this; }, json(body) { result.body = body; return result; } };
  await handler({ method, headers: { authorization, host: 'shine.is-a.dev', ...headers } }, response);
  return result;
}

test('公开内容只保留作品和笔记字段，移除云端发布信息及额外字段', () => {
  const data = publicData({ ...source, credentials: 'private', _publication: { secret: true } });
  assert.equal(data.credentials, undefined);
  assert.equal(data._publication, undefined);
  assert.deepEqual(decode(encode(data)), data);
  assert.throws(() => publicData({ ...source, notes: [{ id: 'p1', title: '重复' }] }), /重复/);
  assert.throws(() => publicData({ categories: [] }), /不完整/);
});

test('普通访客读取本站快照，不初始化 Firebase', async () => {
  const context = vm.createContext({ fetch: async (url) => { assert.equal(url, 'published.json'); return json(deployed); } });
  vm.runInContext(readFileSync(path.join(__dirname, '../js/firebase-portfolio.js'), 'utf8'), context);
  const result = await context.PortfolioFirebase.loadPortfolioData();
  assert.equal(result.ok, true);
  assert.ok(result.data.categories.length > 0);
  assert.equal(context.PortfolioFirebase.getAuthReady(), null);
});

test('发布接口拒绝缺失登录凭据、跨域请求与无权限账号', async () => {
  const original = global.fetch;
  let called = false;
  global.fetch = async () => { called = true; return json({ users: [{ email: 'other@example.com', localId: 'u' }] }); };
  try {
    assert.equal((await call('POST', '')).statusCode, 401);
    assert.equal(called, false);
    assert.equal((await call('POST', undefined, { origin: 'https://other.example' })).statusCode, 403);
    assert.equal(called, false);
    assert.equal((await call('POST')).statusCode, 401);
  } finally { global.fetch = original; }
});

test('发布服务未配置时不改动云端内容', async () => {
  const original = global.fetch;
  const previousHook = process.env.PORTFOLIO_DEPLOY_HOOK;
  delete process.env.PORTFOLIO_DEPLOY_HOOK;
  global.fetch = async (url, options = {}) => {
    assert.notEqual(options.method, 'PATCH');
    return String(url).includes('accounts:lookup') ? json({ users: [{ email: '1801327763@qq.com', localId: 'admin' }] }) : json(document());
  };
  try { assert.equal((await call('POST')).statusCode, 503); }
  finally { global.fetch = original; if (previousHook !== undefined) process.env.PORTFOLIO_DEPLOY_HOOK = previousHook; }
});

test('Firestore 返回字段顺序变化时不会误报未发布修改', async () => {
  const original = global.fetch;
  const reorder = value => Array.isArray(value) ? value.map(reorder) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reorder(item)])) : value;
  const frozen = { version: deployed.version, publishedAt: deployed.publishedAt, data: reorder(publicData(source)) };
  const draft = structuredClone(source);
  global.fetch = async url => String(url).includes('accounts:lookup')
    ? json({ users: [{ email: '1801327763@qq.com', localId: 'admin' }] })
    : json(document({ ...draft, _publication: frozen }));
  try {
    const current = await call('GET');
    assert.equal(current.statusCode, 200);
    assert.equal(current.body.changed, false);
    assert.equal(current.body.pending, false);
    draft.categories[0].projects[0].name = '新的修改';
    assert.equal((await call('GET')).body.changed, true);
  } finally { global.fetch = original; }
});

test('点击发布冻结已保存内容，并返回等待上线而不是上线成功', async () => {
  const original = global.fetch;
  const previousHook = process.env.PORTFOLIO_DEPLOY_HOOK;
  process.env.PORTFOLIO_DEPLOY_HOOK = 'https://api.vercel.com/v1/integrations/deploy/test/test';
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('accounts:lookup')) return json({ users: [{ email: '1801327763@qq.com', localId: 'admin' }] });
    if (options.method === 'PATCH') return json({ updateTime: '2026-10-25T00:00:01Z' });
    if (String(url).includes('api.vercel.com')) return json({ job: { state: 'PENDING' } });
    return json(document());
  };
  try {
    const result = await call('POST');
    assert.equal(result.statusCode, 202);
    assert.ok(result.body.version);
    const patch = calls.find(x => x.options.method === 'PATCH');
    assert.match(patch.url, /currentDocument.updateTime=/);
    const frozen = decode(JSON.parse(patch.options.body).fields._publication);
    assert.equal(contentHash(frozen.data), contentHash(publicData(source)));
    assert.equal(frozen.version, result.body.version);
    assert.equal(result.body.success, undefined);
  } finally { global.fetch = original; if (previousHook === undefined) delete process.env.PORTFOLIO_DEPLOY_HOOK; else process.env.PORTFOLIO_DEPLOY_HOOK = previousHook; }
});

test('部署构建只导出冻结版本，不泄露之后保存的草稿', async () => {
  const fs = require('node:fs');
  const { build } = require('../../scripts/build.cjs');
  const originalFetch = global.fetch, originalWrite = fs.writeFileSync;
  const frozen = { version: 'frozen', publishedAt: '2026-10-25T00:00:00Z', data: publicData(source) };
  const draft = structuredClone(source); draft.categories[0].projects[0].name = '尚未发布的修改';
  global.fetch = async () => json(document({ ...draft, _publication: frozen }));
  let written;
  fs.writeFileSync = (_file, text) => { written = JSON.parse(text); };
  try {
    await build();
    assert.equal(written.version, 'frozen');
    assert.equal(written.data.categories[0].projects[0].name, '项目');
  } finally { global.fetch = originalFetch; fs.writeFileSync = originalWrite; }
});

test('并发保存时拒绝覆盖冻结内容，也不触发部署', async () => {
  const original = global.fetch, previousHook = process.env.PORTFOLIO_DEPLOY_HOOK;
  process.env.PORTFOLIO_DEPLOY_HOOK = 'https://api.vercel.com/v1/integrations/deploy/test/test';
  let triggered = false;
  global.fetch = async (url, options = {}) => {
    if (String(url).includes('accounts:lookup')) return json({ users: [{ email: '1801327763@qq.com', localId: 'admin' }] });
    if (options.method === 'PATCH') return json({}, 412);
    if (String(url).includes('api.vercel.com')) { triggered = true; return json({}); }
    return json(document());
  };
  try { assert.equal((await call('POST')).statusCode, 409); assert.equal(triggered, false); }
  finally { global.fetch = original; if (previousHook === undefined) delete process.env.PORTFOLIO_DEPLOY_HOOK; else process.env.PORTFOLIO_DEPLOY_HOOK = previousHook; }
});

test('触发部署失败时撤回本次冻结版本', async () => {
  const original = global.fetch, previousHook = process.env.PORTFOLIO_DEPLOY_HOOK;
  process.env.PORTFOLIO_DEPLOY_HOOK = 'https://api.vercel.com/v1/integrations/deploy/test/test';
  const writes = [];
  global.fetch = async (url, options = {}) => {
    if (String(url).includes('accounts:lookup')) return json({ users: [{ email: '1801327763@qq.com', localId: 'admin' }] });
    if (options.method === 'PATCH') { writes.push(JSON.parse(options.body)); return json({ updateTime: '2026-10-25T00:00:01Z' }); }
    if (String(url).includes('api.vercel.com')) return json({}, 400);
    return json(document());
  };
  try { assert.equal((await call('POST')).statusCode, 502); assert.equal(writes.length, 2); assert.deepEqual(writes[1], { fields: {} }); }
  finally { global.fetch = original; if (previousHook === undefined) delete process.env.PORTFOLIO_DEPLOY_HOOK; else process.env.PORTFOLIO_DEPLOY_HOOK = previousHook; }
});

test('云端无法访问时构建失败，禁止悄悄发布旧内容', async () => {
  const { build } = require('../../scripts/build.cjs');
  const original = global.fetch;
  global.fetch = async () => json({}, 503);
  try { await assert.rejects(build(), /读取云端内容失败/); }
  finally { global.fetch = original; }
});
