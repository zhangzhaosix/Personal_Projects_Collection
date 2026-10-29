# Shine · 作品集

个人作品集站点，展示数据分析项目、Agent 项目、AI 学习合集和笔记内容。

## 在线访问

```text
https://shine.is-a.dev/
```

备用地址：`https://shine-works-xi.vercel.app/`，继续保留，不设置跳转。

大陆直连验收记录（2026-10-25 12:56，北京时间）：用户确认，在自己的大陆 Wi-Fi 关闭 VPN，通过无痕窗口访问首页、作品、笔记、联系页，内容加载、页面切换与刷新均正常。本次验收范围为用户的这条 Wi-Fi。

## 项目概览

- 首页连续展示个人介绍、全部实际项目、全部笔记和联系方式；AI 学习资料在笔记区呈现，不在作品区重复列出。
- 首页作品按原分类并列呈现，桌面两列、手机单列；数据分析项目展示职责、方法和产出，未填写的占位字段不显示。保留完整项目链接，四个分析项目提供按需加载的高清成果预览。
- 首页笔记采用保留原图标的连续目录，展示标题与摘要，不显示日期、重复标签或搜索框；桌面介绍与目录并排，手机上下排列。
- 四个主页面统一使用“邮箱＋版权”页脚，窄屏上下排列；使用静态 HTML，内容加载失败时仍可联系。
- 首页首屏沿用全站暖米色和原系统字体；桌面头像居左、介绍居右，手机先介绍、后紧凑头像。保留黑底暖金色 ASCII 头像的聚拢、鼠标扰动与归位效果，触摸不拦截页面滚动。短句持续轮播；开启“减少动态效果”时使用静态头像与短句。
- 首页介绍分层入场，区块内容首次进入视口时播放一次进场动画，桌面同排作品略微错峰；鼠标悬停时作品轻抬、阅读箭头移动。页面隐藏时暂停活动动画，轮播在后台或离开视口时停止计时；开启“减少动态效果”时取消进场与悬停位移动效。
- 首页导航平滑滚动到对应区块，下滚收起、上滚出现，并标识当前区块。独立作品、笔记及联系页继续保留，方便访问与管理。
- 手动刷新首页会清除残留区块锚点并回到首屏；正常打开带区块锚点的网址仍定位到对应内容，历史返回保留浏览器的位置恢复行为。
- 导航链接与首页标志提供至少 44px 的点击高度、键盘焦点提示和当前页标识。
- 作品页支持分页、管理员增删改、项目类型选择/自定义、精选标记，以及职责、工具/方法和产出字段维护；已取消搜索框。
- 作品页桌面端采用两列卡片，窄屏改为单列；保留简介、职责和方法，关键数据加粗，提供完整项目链接及对应的高清预览，管理编辑字段保持可用。
- 首页、作品页和分类页的飞书 / Lark 项目入口显示“完整项目需申请访问权限”提示；站内成果预览按需加载本地素材。
- 笔记页支持分页、管理员增删改和精选标记，已取消搜索框。
- 笔记页以带原图标的连续目录展示标题、摘要和阅读入口，不显示日期、徽标或标签；手机端阅读入口移到摘要下方，管理编辑字段保持可用。
- 首页联系区和独立联系页展示 QQ 邮箱、Gmail 和微信号，支持复制及失败时手动复制。
- 访客直接读取本站脚本内的已发布内容，省去额外的 JSON 请求，不连接 Firebase 或 Google 字体服务；`published.json` 保留用于管理端确认发布版本
- 首页优先加载约 518 KB 的 WebP 头像，比原 PNG 减少约 81%；保留 PNG 作为不支持 WebP 的浏览器回退，尺寸及交互不变
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

- `code/js/app.js`：首页数据加载、作品与笔记渲染、区块导航、短句轮播和刷新后的区块定位
- `code/js/home-motion.js`、`code/css/home-motion.css`：首页首屏、一次性滚动进场和悬停动效；处理后台暂停、减少动态效果与无动画 API 时的可读回退
- `code/js/project-text.js`：项目简介文本转义、关键数据加粗，以及首页、作品页和分类页共用的飞书 / Lark 入口权限提示判断
- `code/js/ascii-avatar.js`：以浏览器选中的 WebP / PNG 头像的细小片段实现入场和鼠标交互，归位后完整绘制图片；静止、离开视口或页面隐藏时停止绘制，脚本不可用时保留静态图片，无第三方依赖
- `code/js/works.js`：作品数据加载、分页、管理员 CRUD 和精选管理
- `code/js/notes.js`：笔记数据加载、分页、管理员 CRUD、精选管理和图标匹配
- `code/js/contact.js`：首页与联系页复制按钮及成功、失败提示
- `code/js/project-preview.js`、`code/css/project-preview.css`：成果按钮悬浮局部预览及原生对话框完整预览，支持多页报告、自由缩放、100% 和适应窗口；鼠标拖拽平移、滚轮围绕指针缩放，手机支持单指拖动和双指缩放。弹层入场和关闭带过渡，减少动态效果时直接切换，关闭后恢复焦点。
- `code/js/category.js`：作品分类页展示和管理
- `code/js/firebase-portfolio.js`：内置构建时同步的公开快照、按需初始化 Firebase、管理员身份判断和云端草稿读写
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

本地修改 `code/published.json` 后，执行以下命令同步脚本内的公开快照，再刷新预览：

```bash
node -e "require('./scripts/build.cjs').writePublicFiles(require('./code/published.json'))"
```

正式发布前需将确认过的文案同步到管理端并发布，避免构建时被云端旧快照覆盖。生产构建会从同一个冻结版本生成 JSON 和脚本内的公开快照，未发布草稿不会进入访客页面。

## 自动化测试

在项目根目录运行：

```bash
node code/tests/notes-display.test.cjs
node code/tests/publication.test.cjs
node code/tests/works-category.test.cjs
node code/tests/ascii-avatar.test.cjs
node code/tests/contact-copy.test.cjs
node code/tests/home-motion.test.cjs
node code/tests/project-preview.test.cjs
node code/tests/project-access.test.cjs
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
- 普通页面没有数据：检查本站 `js/firebase-portfolio.js` 是否加载成功；本地改过 JSON 时先执行上述同步命令。公开浏览不需要 Firebase 连接。
- 修改头像交互后预览仍是旧效果：头像脚本引用带版本号，修改 `code/js/ascii-avatar.js` 时同步更新 `code/index.html` 中的版本参数，再刷新页面，避免内置浏览器继续执行旧缓存。
- 大陆直连时快时慢：本站目前托管于 Vercel，跨境线路、运营商和 DNS 的变化可能影响访问；减小资源和减少请求可缓解慢网，但连接托管站点失败时仍需排查线路。备用地址也在同一托管平台；需要长期稳定直连时，应单独评估适合目标访问地区的托管或静态镜像。
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

## 成果预览维护

- 高清预览素材位于 `code/assets/previews/`，来自项目飞书链接中的实际报表、看板、分析图表和思维导图；保留原始截图内容。
- 达人洞察报告素材由 17 页原 PDF 渲染、3 张原生图表和 1 张完整总览宽表组成，共 21 项；补充图表和宽表按原文对应位置登记。直播用户行为分析采用 `mindmap-complete.png` 原生全图，保留展开分支与结尾，不用浏览器视口截图代替。
- `code/js/project-preview.js` 按现有项目 ID 关联素材。远端成果更新后需同步替换本地截图；新增素材时在此登记对应项目，未登记的项目只显示完整项目链接。
- 多页报告在项目配置的 `pages` 数组中按阅读顺序登记每页的 `file`、`title` 和 `alt`，通过页面选择器或上一页 / 下一页切换，仅请求当前页。单张成果继续使用项目上的 `file` 和 `alt`。
- 报告可从有权限的原文导出 PDF 后逐页渲染，原生图表另作预览页接入；接入前核对宽表右列、图表与末页策略总结，补充导出中缺失的内容后再声明完整。
- 鼠标停留或键盘聚焦“预览成果”后，按需加载 `assets/previews/peek/` 中对应的轻量局部 WebP；素材直接截取自完整原图，更新原图时须同步局部图。小窗可移入保持，移开、Esc、滚动或窗口失焦时收起。触屏直接点开完整预览。
- 完整图片在点击“预览成果”后才加载，报表与看板默认完整显示整体概览；长篇报告和思维导图默认按宽度从顶部阅读。可按住鼠标拖动到具体位置，滚轮或工具栏缩放；“100%”回到原始像素，“适应窗口”恢复全图。缩放只改变显示比例，不重绘截图数据。

## 管理与发布

1. 点击作品、笔记或分类页的 ⚙，按提示开启 VPN 后登录管理员。
2. 编辑内容并保存到云端，可连续修改多项；普通访客仍看到上次已发布版本。
3. 保存并关闭编辑框后，点击管理区“发布”。接口核验管理员身份，从云端读取并冻结整套公开内容，触发 Vercel 部署。
4. 页面显示“发布中”；实际部署文件的版本号匹配后，显示“已上线”和版本时间。部署期间继续保存的修改需要再次发布。
5. 退出管理后恢复公开版本，日常浏览无需开启 VPN。

发布失败不影响线上旧版。没有管理员会话不能触发发布；服务端凭据不发送到浏览器。
