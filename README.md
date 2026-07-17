# Shine · 作品集

个人作品集站点，展示数据分析项目、Agent 项目、AI 学习合集和笔记内容。

## 在线访问

```text
https://shine-works-xi.vercel.app/
```

## 项目概览

- 首页展示个人信息、精选作品、最近标记的 3 条精选笔记和联系方式
- 作品页支持分页、搜索、管理员增删改和精选标记
- 笔记页支持分页、搜索、管理员增删改和精选标记
- 联系页集中展示邮箱和微信联系方式
- 数据通过 Firebase Auth + Firestore 管理，访客只读，管理员可编辑

## 目录结构

```text
.
├─ AGENTS.md              # 项目级协作规则
├─ README.md              # 项目说明
├─ vercel.json            # Vercel 发布目录配置
├─ code/                  # 可运行的站点代码
│  ├─ index.html          # 首页入口
│  ├─ works.html          # 作品页
│  ├─ notes.html          # 笔记页
│  ├─ category.html       # 作品分类页
│  ├─ contact.html        # 联系方式页
│  ├─ css/                # 全站样式
│  ├─ js/                 # 页面逻辑与 Firebase 封装
│  ├─ assets/             # 图片和图标资源
│  ├─ tests/              # 自动化测试
│  ├─ data.json           # 本地示例数据
│  └─ firestore.rules     # Firestore 规则示例
└─ docs/                  # 历史方案、演示图片和归档资料
```

## 技术栈

- HTML + CSS + JavaScript
- Firebase Auth + Firestore
- Google Fonts：Inter、Noto Sans SC
- 纯静态站点，无依赖安装和打包步骤

## 核心模块职责

- `code/js/app.js`：首页渲染、精选作品、推荐笔记、联系方式和访问量
- `code/js/works.js`：作品数据加载、筛选、分页、管理员 CRUD 和精选管理
- `code/js/notes.js`：笔记数据加载、筛选、分页、管理员 CRUD、精选管理和图标匹配
- `code/js/category.js`：作品分类页展示和管理
- `code/js/firebase-portfolio.js`：Firebase 配置校验、初始化、管理员身份判断和 Firestore 读写

## 本地启动

直接打开 `code/index.html` 可以进行基础预览。推荐在项目根目录运行静态服务器：

```bash
python -m http.server 8000 --directory code
```

随后访问：

```text
http://localhost:8000/
```

项目无需安装依赖，也没有构建步骤。

## 自动化测试

在项目根目录运行：

```bash
node --test code/tests/notes-display.test.cjs
```

## 环境变量 / 配置

- 当前项目没有本地环境变量。
- Firebase 配置位于 `code/js/firebase-portfolio.js` 的 `FIREBASE_CONFIG`。
- 管理员邮箱位于同一文件的 `ADMIN_EMAIL`。
- 修改 Firebase 信息后，需要同步检查 Firebase Auth、Firestore 规则和授权域名配置。

## 常见问题

- 页面提示 `Firebase 配置缺失`：补全 `code/js/firebase-portfolio.js` 中的 `FIREBASE_CONFIG`。
- 管理员登录失败：确认 Firebase 已启用 Email/Password 登录，并且 `ADMIN_EMAIL` 与管理员邮箱一致。
- 页面没有数据：使用管理员账号登录一次，让程序初始化 Firestore 文档。
- 访问量不更新：本地预览会退回浏览器本地缓存，线上部署后才会调用远程计数接口。
- 图片或字体加载失败：检查资源相对路径及外部网络连接。

## 部署注意事项

- Vercel 通过根目录的 `vercel.json` 将 `code/` 设为发布目录。
- Vercel 项目仍以仓库根目录作为 Root Directory，无需改为 `code/`。
- 部署内容必须保留 `code/index.html`、`code/css/`、`code/js/` 和 `code/assets/` 的相对结构。
- 如果以后重新启用 GitHub Pages，需要增加发布 `code/` 的 GitHub Actions 工作流；GitHub Pages 不能直接把任意 `code/` 目录作为分支发布源。
- 更换 Firebase 项目或线上域名后，需要同步更新 Firebase 配置和授权域名。

## 笔记图标维护

- 笔记页图标位于 `code/assets/notes-icons/`，不依赖外链加载。
- 新增笔记时优先使用分类：`AI学习`、`常用文档`、`数据分析`、`用户行为`、`直播`、`其他`。
- 前端按照“精选状态 → 分类精确匹配 → 标签关键词匹配 → 默认图标”选择图标。
- 图标风格参考 Flaticon Animated Icons，署名入口位于 `code/notes.html` 页脚。
