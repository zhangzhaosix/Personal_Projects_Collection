# Shine · 作品集

个人作品集页面，展示数据分析、Agent 项目、AI 学习合集等作品。

## 访问地址

部署后通过以下地址访问：

```
https://zhangzhaosix.github.io/Personal_Projects_Collection
```

## 功能

- 首页展示个人信息（头像、昵称、简介）和三大分类入口
- 首页补充精选作品区与联系入口，分类数量与作品数从 Firestore 实时读取
- 每个分类下有独立的作品展示页
- 后台管理模式（Firebase Auth 邮箱 + 密码登录），可添加/编辑/删除作品
- 访客只读，仅管理员可编辑
- 作品数据统一存储在 Firestore 单文档中，作品补充 `标签` 和 `状态`
- 分类页支持标签 / 状态展示、返回顶部，以及管理员拖拽排序

## 技术栈

- HTML + CSS + JavaScript（纯静态）
- 毛玻璃（Glassmorphism）设计风格
- Google Fonts：Archivo + Space Grotesk
- Firebase Auth + Firestore（浏览器模块）

## 本地使用

直接在浏览器打开 `index.html` 即可预览。

## Firebase 配置

- 先在 `js/firebase-portfolio.js` 中补全 `FIREBASE_CONFIG`
- Firebase Auth 需要开启 Email/Password 登录
- Firestore 规则示例见 `firestore.rules`，采用“公开读、管理员写”
- 当前站点预设的管理员邮箱是 `1801327763@qq.com`
