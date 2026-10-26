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

test('普通访客直接读取随脚本发布的快照，无网络也能切换页面和重复读取', async () => {
  const context = vm.createContext({ fetch: () => { throw new Error('访客不应发起内容请求'); } });
  vm.runInContext(readFileSync(path.join(__dirname, '../js/firebase-portfolio.js'), 'utf8'), context);
  const result = await context.PortfolioFirebase.loadPortfolioData();
  assert.equal(result.ok, true);
  assert.ok(result.data.categories.length > 0);
  assert.equal(context.portfolioPublication.version, deployed.version);
  const firstName = result.data.categories[0].projects[0].name;
  const featuredCount = result.data.featuredWorks.length;
  result.data.categories[0].projects[0].name = '本地改动';
  result.data.featuredWorks.push('本地精选');
  const reloaded = await context.PortfolioFirebase.loadPortfolioData();
  assert.equal(reloaded.data.categories[0].projects[0].name, firstName);
  assert.equal(reloaded.data.featuredWorks.length, featuredCount);
  assert.equal(context.PortfolioFirebase.getAuthReady(), null);
});

test('内置快照损坏时显示加载失败，不连接云端或展示示例数据', async () => {
  const context = vm.createContext({ fetch: () => { throw new Error('不应连接网络'); } });
  const script = readFileSync(path.join(__dirname, '../js/firebase-portfolio.js'), 'utf8')
    .replace(/\/\* published:start \*\/[^\r\n]*\/\* published:end \*\//, 'null');
  vm.runInContext(script, context);
  const result = await context.PortfolioFirebase.loadPortfolioData();
  assert.equal(result.ok, false);
  assert.match(result.error, /已发布内容加载失败/);
});

test('当前页面确认新版本上线后，重新读取使用新快照', async () => {
  const context = vm.createContext({ fetch: () => { throw new Error('不应额外请求内容'); } });
  vm.runInContext(readFileSync(path.join(__dirname, '../js/firebase-portfolio.js'), 'utf8'), context);
  await context.PortfolioFirebase.loadPortfolioData();
  const online = structuredClone(deployed);
  online.version = 'newly-published';
  online.data.categories[0].projects[0].name = '刚刚上线的项目';
  context.portfolioPublication = online;
  const result = await context.PortfolioFirebase.loadPortfolioData();
  assert.equal(result.data.categories[0].projects[0].name, '刚刚上线的项目');
  assert.equal(context.portfolioPublication.version, 'newly-published');
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
  const written = new Map();
  fs.writeFileSync = (file, text) => { written.set(path.basename(file), text); };
  try {
    await build();
    const snapshot = JSON.parse(written.get('published.json'));
    assert.equal(snapshot.version, 'frozen');
    assert.equal(snapshot.data.categories[0].projects[0].name, '项目');
    const context = vm.createContext({});
    vm.runInContext(written.get('firebase-portfolio.js'), context);
    const result = await context.PortfolioFirebase.loadPortfolioData();
    assert.equal(context.portfolioPublication.version, snapshot.version);
    assert.equal(result.data.categories[0].projects[0].name, '项目');
    assert.doesNotMatch(written.get('firebase-portfolio.js'), /尚未发布的修改/);
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

test('快照信息或脚本构建标记缺失时不写入任何公开文件', () => {
  const fs = require('node:fs');
  const { writePublicFiles } = require('../../scripts/build.cjs');
  const originalRead = fs.readFileSync, originalWrite = fs.writeFileSync;
  let writes = 0;
  fs.writeFileSync = () => { writes++; };
  try {
    assert.throws(() => writePublicFiles({ ...deployed, publishedAt: 'invalid' }), /发布版本信息不完整/);
    fs.readFileSync = () => 'missing build markers';
    assert.throws(() => writePublicFiles(deployed), /缺少构建标记/);
    assert.equal(writes, 0);
  } finally { fs.readFileSync = originalRead; fs.writeFileSync = originalWrite; }
});
