# 管理模式认证安全修复

## 问题描述

作品集 `category.html` 的"管理模式"存在严重安全漏洞：
1. 点击管理模式按钮（⚙）无需输入密码即可直接进入
2. 偶尔弹出登录页面但等待 1-2 秒后自动登录成功

## 根因分析

Firebase Auth 默认将登录状态持久化到浏览器 localStorage/IndexedDB。用户之前登录过 Firebase，之后每次打开页面，SDK 初始化后会自动恢复登录态，`onAuthStateChanged` 监听器检测到管理员已登录，直接调用 `enterAdminMode()` 自动进入管理模式。

偶尔弹出密码框的原因：Firebase SDK 尚未异步初始化完成时点击了管理按钮，此时 `currentAuthUser` 为 null，触发了密码框；一两秒后 SDK 初始化完成，`onAuthStateChanged` 恢复登录态，又自动进入管理模式。

## 修复方案

引入 `sessionStorage` 会话级别标识作为第二道认证门禁：

| 措施 | 说明 |
|------|------|
| 新增会话标识 | `sessionStorage` 键值标记"已主动验证" |
| 双重校验 | Firebase Auth（服务端）+ 会话标识（客户端）同时满足才进入 |
| 标识生命周期 | 密码验证成功后设置，退出管理模式时清除，关闭标签页自动清除 |

## 涉及文件

仅 `js/category.js`（约 5 处修改）。

## 修改细节

### 1. 新增常量
```js
const SESSION_KEY = 'portfolio_admin_auth';
```

### 2. `isSignedInAdmin()` 增加会话标识检查
```js
function isSignedInAdmin() {
  return PortfolioFirebase.isAdminUser(currentAuthUser) && 
         sessionStorage.getItem(SESSION_KEY) === 'true';
}
```

### 3. `verifyLogin()` 密码验证成功后设置标识
```js
sessionStorage.setItem(SESSION_KEY, 'true');
```

### 4. `exitAdminMode()` 退出时清除标识 + 退出 Firebase
```js
function exitAdminMode() {
  isAdminMode = false;
  sessionStorage.removeItem(SESSION_KEY);
  PortfolioFirebase.signOutAdmin();
  setManageButtonState();
  renderAdminUI();
}
```

### 5. `onAuthChange` 回调增加会话标识判断
```js
if (PortfolioFirebase.isAdminUser(user) && 
    sessionStorage.getItem(SESSION_KEY) === 'true' && !isAdminMode) {
  enterAdminMode();
}
```

## 安全分析

- **sessionStorage 标签页隔离**：关闭标签页自动清除，无法跨标签页共享
- **双重验证**：Firebase Auth 验证密码 + 会话标识强制门禁
- **Firestore 规则不变**：后端始终强制执行管理员邮箱校验
- **XSS 攻击**：即使读取到标识值，没有对应 Firebase 登录态也无效

## 用户流程

| 场景 | 行为 |
|------|------|
| 首次点击 ⚙ | 弹出密码框，需输入密码 |
| 输入正确密码后 | 进入管理模式 |
| 同标签页内导航/刷新 | 自动恢复管理模式（会话标识存在） |
| 关闭标签页重新打开 | 弹出密码框，需重新输入 |
| 退出管理模式 | 清除标识 + 退出 Firebase 登录 |
| 别人访问 | 需要密码，无法进入 |
