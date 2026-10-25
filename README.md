# Shine · 作品集

个人作品集站点，展示数据分析项目、Agent 项目、AI 学习合集和笔记内容。

## 在线访问

```text
https://shine.is-a.dev/
```

备用地址：`https://shine-works-xi.vercel.app/`，继续保留，不设置跳转。

大陆直连验收记录（2026-10-25 12:56，北京时间）：用户确认，在自己的大陆 Wi-Fi 关闭 VPN，通过无痕窗口访问首页、作品、笔记、联系页，内容加载、页面切换与刷新均正常。本次验收范围为用户的这条 Wi-Fi。

## 项目概览

- 首页展示个人信息、精选作品、最近标记的 3 条精选笔记和联系方式
- 首页精选作品采用两列轻分隔布局，窄屏改为单列；展示完整简介并加粗关键数据，“查看全部作品”位于区域标题右侧。
- 首页推荐笔记以三张卡片展示分类、标题与摘要，不显示日期；“查看全部笔记”位于标题右侧，窄屏改为单列。
- 四个主页面统一使用“邮箱＋版权”页脚，窄屏上下排列；使用静态 HTML，内容加载失败时仍可联系。
- 首页首屏沿用全站暖米色 UI，仅头像区域保留黑底暖金色，以圆角收边，保留附件原图的细密字符和明暗层次。桌面端头像居左、介绍居右，介绍包含专业方向、个人标语与项目概述，轮播短句使用暖金色；首屏不单独添加作品或笔记按钮。头像入场聚拢，鼠标划过产生扰动并在移开后归位；手机端头像在前，仅播放入场动画，不影响滑动浏览。开启系统“减少动态效果”时直接展示完整头像。
- 全站导航栏处于正常文档流，随页面滚动离开视口，不固定悬浮。
- 导航链接与首页标志提供至少 44px 的点击高度、键盘焦点提示和当前页标识。
- 作品页支持分页、搜索、管理员增删改、项目类型选择/自定义、精选标记，以及职责、工具/方法和产出字段维护
- 作品页桌面端采用两列卡片，窄屏改为单列，搜索框在宽屏与标题同排；访客卡片保留简介、职责和方法，关键数据加粗，不重复展示产出、标签或精选徽标，管理编辑字段保持可用。
- 笔记页支持分页、搜索、管理员增删改和精选标记
- 笔记页以带原图标的连续目录展示标题、摘要和阅读入口，不显示日期、徽标或标签；手机端阅读入口移到摘要下方，管理编辑字段保持可用。
- 联系页集中展示 QQ 邮箱、Gmail 和微信，支持复制联系方式及查看原微信二维码；复制失败时提示手动复制。
- 访客从本站 `published.json` 加载最新已发布内容，不连接 Firebase 或 Google 字体服务
- 管理员开启 VPN 后通过 Firebase Auth + Firestore 编辑云端草稿，点击“发布”才更新公开页面
- 访客统计功能已移除；不再记录浏览器标识，也不读取或显示访问用户数

## 目录结构

```text
.
├─ AGENTS.md              # 项目级协作规则
├─ PRODUCT.md             # 作品集定位与设计审查上下文
├─ README.md              # 项目说明
├─ vercel.json            # 发布目录、构建命令和缓存配置
├─ api/publish.js         # 管理员发布接口
├─ lib/publication.cjs    # 内容校验及 Firestore REST 访问
├─ scripts/build.cjs      # 将冻结版本生成公开内容文件
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
│  ├─ data.json           # 历史示例数据，不参与线上读取
│  ├─ published.json      # 当前公开内容快照
│  └─ firestore.rules     # Firestore 规则示例
└─ docs/                  # 历史方案、演示图片和归档资料
```

## 技术栈

- HTML + CSS + JavaScript
- Firebase Auth + Firestore
- 系统字体，无外部字体请求
- 静态页面 + 一个原生 Node.js Vercel Function，无第三方服务端依赖

## 核心模块职责

- `code/js/app.js`：首页数据加载、精选作品与推荐笔记渲染
- `code/js/project-text.js`：首页与作品页共用的项目简介文本转义和关键数据加粗
- `code/js/ascii-avatar.js`：以 `code/assets/images/ascii-avatar.png` 原图的细小片段实现入场和鼠标交互，归位后完整绘制原图；静止、离开视口或页面隐藏时停止绘制，脚本不可用时保留原图，无第三方依赖
- `code/js/works.js`：作品数据加载、筛选、分页、管理员 CRUD 和精选管理
- `code/js/notes.js`：笔记数据加载、筛选、分页、管理员 CRUD、精选管理和图标匹配
- `code/js/contact.js`：联系页复制按钮及成功、失败提示
- `code/js/category.js`：作品分类页展示和管理
- `code/js/firebase-portfolio.js`：公开快照读取、按需初始化 Firebase、管理员身份判断和云端草稿读写
- `code/js/publish.js`：管理区发布按钮、草稿提示及实际上线版本确认

## 本地启动

直接打开 `code/index.html` 可以进行基础预览。推荐在项目根目录运行静态服务器：

```bash
python -m http.server 8000 --directory code
```

随后访问：

```text
http://localhost:8000/
```

本地静态预览无需安装依赖。发布接口须在 Vercel 预览或生产部署中验证。Vercel 构建执行 `node scripts/build.cjs`，只导出云端已冻结的发布版本；未点击发布的新草稿不会随代码部署公开。

直接修改 `code/published.json` 只用于本地内容预览；正式发布前需将确认过的文案同步到管理端并发布，避免构建时被云端旧快照覆盖。

## 自动化测试

在项目根目录运行：

```bash
node code/tests/notes-display.test.cjs
node code/tests/publication.test.cjs
node code/tests/works-category.test.cjs
node code/tests/ascii-avatar.test.cjs
node code/tests/contact-copy.test.cjs
```

## 环境变量 / 配置

- Vercel 生产环境变量 `PORTFOLIO_DEPLOY_HOOK`：现有项目、`main` 分支的 Deploy Hook URL，使用敏感类型保存，禁止放入前端或 Git。该变量缺失时发布接口拒绝发布，云端草稿和公开页面仍保留。
- Firebase 配置位于 `code/js/firebase-portfolio.js` 的 `FIREBASE_CONFIG`。
- 管理员邮箱位于同一文件的 `ADMIN_EMAIL`。
- 内容草稿位于 Firestore 的 `portfolio/site` 文档，`_publication` 字段保存点击发布时冻结的公开版本。管理员保存草稿采用合并写入，保留此字段。
- 旧访客统计云端记录保留，不再使用；代码中的 Firestore 规则已移除相应访问规则。
- 修改 Firebase 信息后，需要同步检查 Firebase Auth、Firestore 规则和授权域名配置。

## 常见问题

- 页面提示 `Firebase 配置缺失`：补全 `code/js/firebase-portfolio.js` 中的 `FIREBASE_CONFIG`。
- 管理员登录失败：确认 Firebase 已启用 Email/Password 登录，并且 `ADMIN_EMAIL` 与管理员邮箱一致。
- 普通页面没有数据：检查本站 `published.json` 是否返回成功，公开浏览不需要 Firebase 连接。
- 发布长时间未完成：页面会保留待确认版本，重新登录可核对；只有静态文件中的版本号匹配后才显示“已上线”。发布失败可以重试，云端草稿保留。

## 部署注意事项

- Vercel 通过根目录的 `vercel.json` 将 `code/` 设为发布目录。
- Vercel 项目仍以仓库根目录作为 Root Directory，无需改为 `code/`。
- 部署内容必须保留 `code/index.html`、`code/css/`、`code/js/` 和 `code/assets/` 的相对结构。
- 现有 `portfolio/site` 管理员写入规则兼容 `_publication` 字段。可按需同步收紧后的 `code/firestore.rules`；本次不删除历史云端记录。
- Deploy Hook 必须绑定此项目的 `main` 分支，并将 URL 配置到生产环境；生成后须先部署新配置。
- 构建无法读取或校验冻结版本时直接失败，保留线上旧部署，不降级为示例内容。
- 如果以后重新启用 GitHub Pages，需要增加发布 `code/` 的 GitHub Actions 工作流；GitHub Pages 不能直接把任意 `code/` 目录作为分支发布源。
- 更换 Firebase 项目或线上域名后，需要同步更新 Firebase 配置和授权域名。

## 笔记图标维护

- 笔记页图标位于 `code/assets/notes-icons/`，不依赖外链加载。
- 新增笔记时优先使用分类：`AI学习`、`常用文档`、`数据分析`、`用户行为`、`直播`、`其他`。
- 前端按照“精选状态 → 分类精确匹配 → 标签关键词匹配 → 默认图标”选择图标。

## 管理与发布

1. 点击作品、笔记或分类页的 ⚙，按提示开启 VPN 后登录管理员。
2. 编辑内容并保存到云端，可连续修改多项；普通访客仍看到上次已发布版本。
3. 保存并关闭编辑框后，点击管理区“发布”。接口核验管理员身份，从云端读取并冻结整套公开内容，触发 Vercel 部署。
4. 页面显示“发布中”；实际部署文件的版本号匹配后，显示“已上线”和版本时间。部署期间继续保存的修改需要再次发布。
5. 退出管理后恢复公开版本，日常浏览无需开启 VPN。

发布失败不影响线上旧版。没有管理员会话不能触发发布；服务端凭据不发送到浏览器。
