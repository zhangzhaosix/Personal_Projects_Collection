(function () {
  const ADMIN_EMAIL = '1801327763@qq.com';
  const FIREBASE_VERSION = '12.14.0';
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyCMRJFLLqJ7Udx5mTPukh9bcOZwxeaLSE8',
    authDomain: 'personal-projects-collection.firebaseapp.com',
    projectId: 'personal-projects-collection',
    appId: '1:197034256689:web:cc3e42f11bc4e4c45aa810'
  };

  const PROJECT_STATUSES = ['已完成', '进行中', '迭代中', '待补充'];
  const PORTFOLIO_DOC_PATH = ['portfolio', 'site'];

  const DEFAULT_DATA = {
    categories: [
      {
        id: 'data-analysis',
        name: '数据分析项目',
        projects: [
          {
            id: 'p_1780814882051_z593',
            name: '【抖音 达人种草 数据分析 自动化报表】',
            url: 'https://vcnnr111xqu6.feishu.cn/sheets/Tc2psCbP0hnjAOtWFrjc5wzNnTd?from=from_copylink',
            description: '原有的表格指标混乱、颗粒度不一致，无法直观呈现种草转化效果急需一份结果前置、逻辑清晰的复盘分析报表',
            createdAt: '2026-06-07',
            tags: ['数据分析', '自动化报表'],
            status: '已完成'
          },
          {
            id: 'p_1780841238422_ic9b',
            name: '【抖音电商 数据监控 BI看板】',
            url: 'https://vcnnr111xqu6.feishu.cn/docx/NqNhdQzscoLOYIxxRDYcvrJRnkf?from=from_copylink',
            description: '多个维度（声量、转化、人群资产）呈现当前种草效果的BI看板',
            createdAt: '2026-06-07',
            tags: ['BI', '数据监控'],
            status: '已完成'
          },
          {
            id: 'p_1780841697010_p9ip',
            name: '电商 达人种草 洞察分析 报告',
            url: 'https://vcnnr111xqu6.feishu.cn/docx/LVhedyuJmoCzU4xZnFZcEDe9nnh',
            description: '当时骆驼户外品牌 在抖音开展达人种草投放，对标安德玛、凯乐石、伯希和 三大竞品，急需通过数据复盘解决 3 个核心问题：\n1：本次种草投放的真实效果如何，和竞品差距在哪？\n2：哪些达人、哪些内容赛道是高效的，哪些在浪费预算？\n3：如何用数据定位优化点，给业务端提供可落地的投放策略？',
            createdAt: '2026-06-07',
            tags: ['复盘分析', '竞品对比'],
            status: '已完成'
          },
          {
            id: 'p_1780843960501_2nmq',
            name: '抖音 电商直播 用户行为 分析',
            url: 'https://vcnnr111xqu6.feishu.cn/mindnotes/ZVrMbJCjxmKnMFnzIqKc5aENnLg?from=space_personal_filelist&pre_pathname=%2Fdrive%2Ffolder%2FLVtAfvzIRlltYtduWWvcDkWNnNf&previous_navigation_time=1780843871378&disposable_login_token=eyJ1c2VyX2lkIjoiNzQ5NjEyNzc2MTcyODUwMzgzNiIsImRldmljZV9sb2dpbl9pZCI6Ijc1MzIzOTc3NTgxNjgxNTQxMTMiLCJ0aW1lc3RhbXAiOjE3ODA4NDM4NzEsInVuaXQiOiJldV9uYyIsInB3ZF9sZXNzX2xvZ2luX2F1dGgiOiIxIiwidmVyc2lvbiI6InYzIiwidGVuYW50X2JyYW5kIjoiZmVpc2h1IiwicGtnX2JyYW5kIjoi6aOe5LmmIiwiY2xpZW50X3NjaGV',
            description: '基于用户体验对用户动作进行了详细的拆解，通过优化用户观看体验、提升互动率为核心抓手，驱动直播GMV增长',
            createdAt: '2026-06-07',
            tags: ['用户行为', '直播'],
            status: '迭代中'
          }
        ]
      },
      {
        id: 'agent',
        name: 'Agent项目',
        projects: [
          {
            id: 'p_1780815946402_ep9l',
            name: '日常清单网页',
            url: 'https://zhangzhaosix.github.io/task-list/',
            description: '记录每日必做、临时事件、长期规划、思维模式',
            createdAt: '2026-06-07',
            tags: ['清单', 'Agent'],
            status: '已完成'
          },
          {
            id: 'p_1780815955322_a4sh',
            name: '音乐合集',
            url: 'http://127.0.0.1:5000/',
            description: '记录我爱听的歌曲',
            createdAt: '2026-06-07',
            tags: ['音乐', '收藏'],
            status: '待补充'
          }
        ]
      },
      {
        id: 'ai-learning',
        name: 'AI学习合集',
        projects: [
          {
            id: 'p_1780816143260_qtp7',
            name: 'AI笔记整理',
            url: 'https://vcnnr111xqu6.feishu.cn/mindnotes/Z0Emb4noVm23yDnXMsjcBwxBnTe',
            description: '从YouTube、B站、抖音等渠道学习到的\n纯个人爱好',
            createdAt: '2026-06-07',
            tags: ['AI学习', '笔记'],
            status: '已完成'
          },
          {
            id: 'p_1780843810802_b7vx',
            name: 'claude.md',
            url: 'https://vcnnr111xqu6.feishu.cn/docx/KAJLd61qBoCxZyxRKOBcmAIrnxd',
            description: '经常使用',
            createdAt: '2026-06-07',
            tags: ['常用', '文档'],
            status: '已完成'
          }
        ]
      }
    ]
  };

  let cachedModulesPromise = null;
  let modulesCache = null;
  let firebaseApp = null;
  let auth = null;
  let db = null;
  let initResult = null;
  let authListenersBound = false;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeTags(tags) {
    if (Array.isArray(tags)) {
      return tags.map((tag) => String(tag).trim()).filter(Boolean);
    }
    if (typeof tags === 'string') {
      return tags
        .split(/[,，、\n]+/)
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
    return [];
  }

  function normalizeProject(project) {
    const source = project && typeof project === 'object' ? project : {};
    const status = PROJECT_STATUSES.includes(source.status) ? source.status : '待补充';

    return {
      id: source.id || generateId(),
      name: String(source.name || '').trim(),
      url: String(source.url || '').trim(),
      description: String(source.description || '').trim(),
      createdAt: source.createdAt || '',
      tags: normalizeTags(source.tags),
      status,
      groupId: source.groupId || null
    };
  }

  function normalizePortfolioData(data) {
    const source = data && typeof data === 'object' ? data : {};
    const categories = DEFAULT_DATA.categories.map((defaultCategory) => {
      const sourceCategory = Array.isArray(source.categories)
        ? source.categories.find((category) => category && category.id === defaultCategory.id)
        : null;

      const groups = Array.isArray(sourceCategory?.groups)
        ? sourceCategory.groups.map(g => ({
            id: String(g.id || generateId('g')),
            name: String(g.name || '未命名分组').trim()
          }))
        : [];

      const projects = Array.isArray(sourceCategory?.projects)
        ? sourceCategory.projects.map(normalizeProject)
        : [];

      return {
        id: defaultCategory.id,
        name: sourceCategory?.name || defaultCategory.name,
        groups,
        projects
      };
    });

    return { categories };
  }

  function isFirebaseConfigured() {
    return Boolean(
      FIREBASE_CONFIG.apiKey &&
      FIREBASE_CONFIG.authDomain &&
      FIREBASE_CONFIG.projectId &&
      FIREBASE_CONFIG.appId
    );
  }

  async function loadModules() {
    if (!cachedModulesPromise) {
      cachedModulesPromise = Promise.all([
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
      ]).then(([appModule, authModule, firestoreModule]) => {
        modulesCache = {
          initializeApp: appModule.initializeApp,
          getAuth: authModule.getAuth,
          onAuthStateChanged: authModule.onAuthStateChanged,
          setPersistence: authModule.setPersistence,
          browserLocalPersistence: authModule.browserLocalPersistence,
          signInWithEmailAndPassword: authModule.signInWithEmailAndPassword,
          signOut: authModule.signOut,
          getFirestore: firestoreModule.getFirestore,
          doc: firestoreModule.doc,
          getDoc: firestoreModule.getDoc,
          setDoc: firestoreModule.setDoc
        };

        return modulesCache;
      });
    }

    return cachedModulesPromise;
  }

  async function initFirebase() {
    if (initResult) {
      return initResult;
    }

    if (!isFirebaseConfigured()) {
      initResult = {
        ok: false,
        error: 'Firebase 配置缺失，请先补全 js/firebase-portfolio.js 中的 FIREBASE_CONFIG。'
      };
      return initResult;
    }

    try {
      const modules = await loadModules();
      firebaseApp = modules.initializeApp(FIREBASE_CONFIG);
      auth = modules.getAuth(firebaseApp);
      db = modules.getFirestore(firebaseApp);

      if (modules.setPersistence && modules.browserLocalPersistence) {
        modules.setPersistence(auth, modules.browserLocalPersistence).catch(() => {});
      }

      initResult = {
        ok: true,
        auth,
        db,
        modules
      };
      return initResult;
    } catch (error) {
      initResult = {
        ok: false,
        error: `Firebase 初始化失败：${error && error.message ? error.message : '未知错误'}`
      };
      return initResult;
    }
  }

  function getAuthReady() {
    return auth;
  }

  function getDbReady() {
    return db;
  }

  function getPortfolioDocRef() {
    if (!db || !modulesCache) return null;
    return modulesCache.doc(db, PORTFOLIO_DOC_PATH[0], PORTFOLIO_DOC_PATH[1]);
  }

  async function ensureAdminSeed() {
    const context = await initFirebase();
    if (!context.ok || !auth || !db) {
      return context;
    }

    const user = auth.currentUser;
    if (!user || user.email !== ADMIN_EMAIL) {
      return { ok: false, error: '当前未以管理员身份登录，无法初始化云端数据。' };
    }

    const ref = getPortfolioDocRef();
    const snapshot = await context.modules.getDoc(ref);
    if (snapshot.exists()) {
      return { ok: true, seeded: false };
    }

    await context.modules.setDoc(ref, normalizePortfolioData(DEFAULT_DATA));
    return { ok: true, seeded: true };
  }

  async function loadPortfolioData() {
    const context = await initFirebase();
    if (!context.ok || !db) {
      return context;
    }

    try {
      const ref = getPortfolioDocRef();
      const snapshot = await context.modules.getDoc(ref);
      if (!snapshot.exists()) {
        return {
          ok: false,
          empty: true,
          error: 'Firestore 作品集文档不存在，请先让管理员登录一次完成初始化。'
        };
      }

      return {
        ok: true,
        data: normalizePortfolioData(snapshot.data())
      };
    } catch (error) {
      return {
        ok: false,
        error: `读取 Firestore 失败：${error && error.message ? error.message : '未知错误'}`
      };
    }
  }

  async function savePortfolioData(data) {
    const context = await initFirebase();
    if (!context.ok || !db) {
      return context;
    }

    const user = auth && auth.currentUser;
    if (!user || user.email !== ADMIN_EMAIL) {
      return {
        ok: false,
        error: '只有管理员登录后才能写入 Firestore。'
      };
    }

    try {
      await context.modules.setDoc(getPortfolioDocRef(), normalizePortfolioData(data));
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: `保存 Firestore 失败：${error && error.message ? error.message : '未知错误'}`
      };
    }
  }

  async function signInAdmin(password) {
    const context = await initFirebase();
    if (!context.ok || !auth) {
      return context;
    }

    try {
      const result = await context.modules.signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
      return {
        ok: true,
        user: result.user
      };
    } catch (error) {
      return {
        ok: false,
        error: error && error.message ? error.message : '登录失败'
      };
    }
  }

  async function signOutAdmin() {
    const context = await initFirebase();
    if (!context.ok || !auth) {
      return context;
    }

    try {
      await context.modules.signOut(auth);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error && error.message ? error.message : '退出失败'
      };
    }
  }

  function onAuthChange(callback) {
    if (authListenersBound) {
      return;
    }

    initFirebase().then((context) => {
      if (!context.ok || !auth) return;
      authListenersBound = true;
      context.modules.onAuthStateChanged(auth, callback);
    });
  }

  function isAdminUser(user) {
    return Boolean(user && user.email === ADMIN_EMAIL);
  }

  function generateId(prefix = 'p') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  }

  globalThis.PortfolioFirebase = {
    ADMIN_EMAIL,
    DEFAULT_DATA,
    PROJECT_STATUSES,
    initFirebase,
    ensureAdminSeed,
    loadPortfolioData,
    savePortfolioData,
    signInAdmin,
    signOutAdmin,
    onAuthChange,
    isAdminUser,
    normalizePortfolioData,
    normalizeProject,
    normalizeTags,
    getAuthReady,
    getDbReady
  };
})();
