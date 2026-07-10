# Shine · 作品集

个人作品集站点，展示数据分析项目、Agent 项目、AI 学习合集和笔记内容。

## 在线访问

部署后可通过以下地址访问：

```text
https://zhangzhaosix.github.io/Personal_Projects_Collection
```

## 项目概览

- 首页展示个人信息、精选作品、最新笔记和联系方式
- 作品页支持分页、搜索、管理员增删改和精选标记
- 笔记页支持分页、搜索、管理员增删改和精选标记
- 联系页集中展示邮箱和微信联系方式
- 数据通过 Firebase Auth + Firestore 管理，访客只读，管理员可编辑

## 目录结构

- `index.html`：首页入口
- `works.html`：作品页
- `notes.html`：笔记页
- `contact.html`：联系方式页
- `css/style.css`：全站样式
- `js/app.js`：首页逻辑
- `js/works.js`：作品页逻辑
- `js/notes.js`：笔记页逻辑
- `js/firebase-portfolio.js`：Firebase 初始化、数据规范化、管理员登录和读写封装
- `firestore.rules`：Firestore 规则示例
- `data.json`：本地示例数据
- `assets/contact/wechat-qr.jpg`：微信二维码
- `assets/notes-icons/`：笔记页本地图标资源

## 技术栈

- HTML + CSS + JavaScript
- Firebase Auth + Firestore
- Google Fonts：Archivo、Space Grotesk
- 纯静态站点，无打包构建流程

## 核心模块职责

- `js/app.js`：首页渲染、精选作品、最新笔记、联系方式、访问量
- `js/works.js`：作品数据加载、筛选、分页、管理员 CRUD、精选管理
- `js/notes.js`：笔记数据加载、筛选、分页、管理员 CRUD、精选管理、分类/标签图标自动匹配
- `js/firebase-portfolio.js`：Firebase 配置校验、初始化、管理员身份判断、Firestore 读写

## 本地启动

- 直接双击打开 `index.html` 即可预览。
- 如果浏览器对本地文件限制较多，可以用任意静态服务器打开项目根目录，例如 VS Code Live Server 或 `python -m http.server`。
- 本项目无需安装依赖，也没有额外构建步骤。

## 环境变量 / 配置

- 当前项目没有本地环境变量。
- Firebase 配置直接写在 `js/firebase-portfolio.js` 的 `FIREBASE_CONFIG` 中。
- 管理员邮箱写在同文件的 `ADMIN_EMAIL` 中。
- 修改 Firebase 信息后，要同步检查 Firebase Auth、Firestore 规则和授权域名配置。

## 常见问题

- 页面提示 `Firebase 配置缺失`：先补全 `js/firebase-portfolio.js` 里的 `FIREBASE_CONFIG`。
- 管理员登录失败：确认 Firebase 已开启 Email/Password 登录，并且 `ADMIN_EMAIL` 与 Firebase 中的管理员邮箱一致。
- 页面没有数据：先用管理员账号登录一次，让程序初始化 Firestore 文档。
- 访问量数字不更新：本地预览时会退回到浏览器本地缓存，线上部署后才会调用远程计数接口。
- 图片或字体加载失败：检查网络是否能访问外部资源。

## 部署注意事项

- 推荐直接部署仓库根目录到 GitHub Pages 或其他静态托管平台。
- 部署时必须保留相对路径结构，至少包含 `index.html`、`css/`、`js/` 和 `assets/`。
- 如果切换 Firebase 项目，记得同步更新 `js/firebase-portfolio.js` 中的配置。
- 如果更换线上域名，需要在 Firebase 控制台里更新授权域名。

## 笔记图标维护

- 笔记页图标使用本地 `assets/notes-icons/` 资源，不依赖外链加载。
- 新增笔记时优先填写推荐分类：`AI学习`、`常用文档`、`数据分析`、`用户行为`、`直播`、`其他`。
- 前端会按“精选状态 → 分类精确匹配 → 标签关键词匹配 → 默认图标”的顺序自动选择图标。
- 当前页面中的图标风格参考 Flaticon Animated Icons，署名入口保留在 `notes.html` 侧边栏。
