const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function loadFirebaseApi() {
  const context = vm.createContext({});
  const source = fs.readFileSync(path.join(root, 'js', 'firebase-portfolio.js'), 'utf8');
  vm.runInContext(source, context);
  return context.PortfolioFirebase;
}

function createElement(initialValue = '') {
  return {
    value: initialValue,
    textContent: '',
    innerHTML: '',
    style: {},
    disabled: false,
    hidden: false,
    className: '',
    children: [],
    classList: { add() {}, remove() {} },
    appendChild(child) { this.children.push(child); },
    focus() { this.focused = true; }
  };
}

function loadWorksHarness(saveResult = { ok: true }) {
  const elements = {
    inputName: createElement('更新后的作品'),
    inputUrl: createElement('https://example.com'),
    inputDesc: createElement('更新后的简介'),
    inputRole: createElement('数据分析与看板搭建'),
    inputTools: createElement('SQL, Power BI'),
    inputOutcome: createElement('完成监控看板并支持复盘'),
    inputTags: createElement('Agent, 测试'),
    selectProjectType: createElement('agent'),
    inputCustomProjectType: createElement(''),
    formError: createElement(),
    toastContainer: createElement(),
    formModal: createElement()
  };

  const document = {
    addEventListener() {},
    getElementById(id) { return elements[id] || null; },
    querySelectorAll() { return []; },
    createElement() { return createElement(); }
  };
  const PortfolioFirebase = {
    getAuthReady() { return { currentUser: { email: 'admin@example.com' } }; },
    isAdminUser() { return true; },
    async savePortfolioData() { return saveResult; },
    async loadPortfolioData() { return { ok: false, error: '测试中不应重新加载' }; }
  };
  const context = vm.createContext({
    document,
    window: {},
    PortfolioFirebase,
    sessionStorage: { getItem() { return 'true'; }, removeItem() {}, setItem() {} },
    requestAnimationFrame() {},
    setTimeout() {},
    clearTimeout() {},
    console
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'js', 'project-text.js'), 'utf8'), context);
  const source = fs.readFileSync(path.join(root, 'js', 'works.js'), 'utf8');
  vm.runInContext(`${source}\n;globalThis.WorksTest = {
    collectWorkProjects,
    renderProjectTypeOptions,
    resolveTargetCategory,
    upsertProjectInCategory,
    customValue: CUSTOM_CATEGORY_VALUE,
    setPortfolioData(value) { portfolioData = value; },
    getPortfolioData() { return portfolioData; },
    setEditingProjectId(value) { editingProjectId = value; },
    saveProject
  };`, context);
  return { helpers: context.WorksTest, elements };
}

test('normalizePortfolioData 保留自定义分类并补齐默认分类', () => {
  const api = loadFirebaseApi();
  const normalized = api.normalizePortfolioData({
    categories: [{
      id: 'c_tools',
      name: '工具项目',
      groups: [{ id: 'g_1', name: '效率工具' }],
      projects: [{ id: 'p_1', name: '日程管理', groupId: 'g_1' }]
    }]
  });

  const customCategory = normalized.categories.find((category) => category.id === 'c_tools');
  assert.ok(customCategory, '自定义分类不应在标准化时被丢弃');
  assert.equal(customCategory.projects[0].groupId, 'g_1');
  assert.deepEqual(
    Array.from(normalized.categories, (category) => category.id),
    ['c_tools', 'data-analysis', 'agent', 'ai-learning']
  );
});

test('作品列表携带分类 ID 和分类名称', () => {
  const { helpers } = loadWorksHarness();
  const projects = helpers.collectWorkProjects({
    categories: [{ id: 'agent', name: 'Agent项目', projects: [{ id: 'p_1', name: '日程管理' }] }],
    notes: []
  });

  assert.equal(projects[0].categoryId, 'agent');
  assert.equal(projects[0].categoryName, 'Agent项目');
});

test('项目类型选项排除 AI 学习并保留自定义分类', () => {
  const { helpers, elements } = loadWorksHarness();
  helpers.setPortfolioData({
    categories: [
      { id: 'data-analysis', name: '数据分析项目', projects: [] },
      { id: 'agent', name: 'Agent项目', projects: [] },
      { id: 'ai-learning', name: 'AI学习合集', projects: [] },
      { id: 'c_tools', name: '工具项目', projects: [] }
    ]
  });

  helpers.renderProjectTypeOptions('agent');

  assert.deepEqual(
    Array.from(elements.selectProjectType.children, (option) => option.value),
    ['', 'data-analysis', 'agent', 'c_tools', helpers.customValue]
  );
  assert.equal(elements.selectProjectType.value, 'agent');
});

test('自定义类型可创建并按名称复用', () => {
  const { helpers } = loadWorksHarness();
  const data = { categories: [{ id: 'agent', name: 'Agent项目', groups: [], projects: [] }] };

  const created = helpers.resolveTargetCategory(data, helpers.customValue, '工具项目');
  const reused = helpers.resolveTargetCategory(data, helpers.customValue, '  工具项目  ');

  assert.equal(created.ok, true);
  assert.match(created.category.id, /^c_/);
  assert.equal(reused.category.id, created.category.id);
  assert.equal(data.categories.length, 2, '相同名称不应创建重复分类');
  assert.equal(helpers.resolveTargetCategory(data, '', '').ok, false);
  assert.equal(helpers.resolveTargetCategory(data, helpers.customValue, '   ').ok, false);
});

test('跨分类编辑只移动一次并清除旧分组', () => {
  const { helpers } = loadWorksHarness();
  const data = {
    categories: [
      { id: 'data-analysis', name: '数据分析项目', groups: [{ id: 'g_1', name: '报表' }], projects: [{ id: 'p_1', name: '旧名称', groupId: 'g_1' }] },
      { id: 'agent', name: 'Agent项目', groups: [], projects: [] }
    ],
    featuredWorks: ['p_1']
  };

  const result = helpers.upsertProjectInCategory(data, 'p_1', data.categories[1], { name: '日程管理' });
  const matches = data.categories.flatMap((category) => category.projects).filter((project) => project.id === 'p_1');

  assert.equal(result.ok, true);
  assert.equal(data.categories[0].projects.length, 0);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].groupId, null);
  assert.deepEqual(Array.from(data.featuredWorks), ['p_1']);
});

test('同分类编辑保留原分组', () => {
  const { helpers } = loadWorksHarness();
  const category = {
    id: 'agent',
    name: 'Agent项目',
    groups: [{ id: 'g_1', name: '效率工具' }],
    projects: [{ id: 'p_1', name: '旧名称', groupId: 'g_1' }]
  };
  const data = { categories: [category] };

  const result = helpers.upsertProjectInCategory(data, 'p_1', category, { name: '新名称' });

  assert.equal(result.ok, true);
  assert.equal(category.projects[0].name, '新名称');
  assert.equal(category.projects[0].groupId, 'g_1');
});

test('Firestore 保存失败时恢复移动前数据', async () => {
  const { helpers, elements } = loadWorksHarness({ ok: false, error: '模拟保存失败' });
  const data = {
    categories: [
      { id: 'data-analysis', name: '数据分析项目', groups: [], projects: [{ id: 'p_1', name: '原作品', groupId: 'g_1', tags: [] }] },
      { id: 'agent', name: 'Agent项目', groups: [], projects: [] }
    ],
    featuredWorks: ['p_1']
  };
  helpers.setPortfolioData(data);
  helpers.setEditingProjectId('p_1');

  await helpers.saveProject();

  const restored = helpers.getPortfolioData();
  assert.equal(restored.categories[0].projects[0].name, '原作品');
  assert.equal(restored.categories[0].projects[0].groupId, 'g_1');
  assert.equal(restored.categories[1].projects.length, 0);
  assert.equal(elements.formError.textContent, '模拟保存失败');
});

test('管理员保存作品时保留职责、工具和产出字段', async () => {
  const { helpers } = loadWorksHarness();
  const data = {
    categories: [
      { id: 'agent', name: 'Agent项目', groups: [], projects: [{ id: 'p_1', name: '原作品' }] }
    ],
    featuredWorks: []
  };
  helpers.setPortfolioData(data);
  helpers.setEditingProjectId('p_1');

  await helpers.saveProject();

  const saved = helpers.getPortfolioData().categories[0].projects[0];
  assert.equal(saved.role, '数据分析与看板搭建');
  assert.equal(saved.tools, 'SQL, Power BI');
  assert.equal(saved.outcome, '完成监控看板并支持复盘');
});
