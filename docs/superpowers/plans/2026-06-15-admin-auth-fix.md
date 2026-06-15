# 管理模式认证安全修复 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 category.html 的管理模式添加 sessionStorage 会话标识，阻止未经验证的 Firebase 持久化登录态自动进入管理模式。

**架构:** 在 `js/category.js` 中新增会话标识常量，修改认证入口函数 `isSignedInAdmin()` 增加标识校验，在成功密码登录后设置标识，在退出管理模式时清除标识并退出 Firebase 登录。

**Tech Stack:** 纯前端 JavaScript + Firebase Auth + sessionStorage

**涉及文件:**
- Modify: `js/category.js`

---

### Task 1: 添加会话级认证门禁

**Files:**
- Modify: `js/category.js`（5 处改动）

- [ ] **Step 1: 新增会话标识常量**

在文件顶部，`const DATA_KEY` 附近添加：

```javascript
const SESSION_KEY = 'portfolio_admin_auth';
```

- [ ] **Step 2: 修改 `isSignedInAdmin()` 增加 sessionStorage 校验**

找到函数（约第 281-283 行），修改为：

```javascript
function isSignedInAdmin() {
  return PortfolioFirebase.isAdminUser(currentAuthUser) && 
         sessionStorage.getItem(SESSION_KEY) === 'true';
}
```

- [ ] **Step 3: 修改 `verifyLogin()` 在成功登录后设置标识**

在 `verifyLogin()` 函数中，`hideLoginModal()` 调用之前（成功分支内），添加：

```javascript
sessionStorage.setItem(SESSION_KEY, 'true');
```

- [ ] **Step 4: 修改 `exitAdminMode()` 清除标识并退出登录**

找到 `exitAdminMode()` 函数（约第 296-300 行），修改为：

```javascript
function exitAdminMode() {
  isAdminMode = false;
  sessionStorage.removeItem(SESSION_KEY);
  PortfolioFirebase.signOutAdmin();
  setManageButtonState();
  renderAdminUI();
}
```

- [ ] **Step 5: 修改 `onAuthChange` 回调，增加会话标识判断**

找到 `onAuthChange` 回调中的自动进入逻辑（约第 251-255 行），修改为：

```javascript
if (PortfolioFirebase.isAdminUser(user) && 
    sessionStorage.getItem(SESSION_KEY) === 'true' && !isAdminMode) {
  enterAdminMode();
}
```

### Task 2: 验证修复

- [ ] **Step 1: 代码检查**

确认以下逻辑链条：
1. 未登录 + 无会话标识 → 点击 ⚙ → `isSignedInAdmin()` 返回 false → 弹出密码框 ✅
2. 输入正确密码 → `verifyLogin()` 成功 → 设置 `SESSION_KEY` → 进入管理模式 ✅
3. 刷新页面 → Firebase 恢复登录态 + sessionStorage 保留 → `onAuthChange` 检测到标识 → 自动恢复 ✅
4. 关闭标签页 → sessionStorage 清除 → Firebase 登录态还在 → 点击 ⚙ → 标识不存在 → 弹出密码框 ✅
5. 退出管理模式 → 清除标识 + 退出 Firebase 登录 → 下次必须重新输入密码 ✅

- [ ] **Step 2: 双端验证**

- 打开 `category.html`，点击 ⚙ 按钮 → 确认弹出密码框（不会直接进入）
- 输入错误密码 → 确认登录失败提示
- 输入正确密码 → 确认进入管理模式（编辑/删除按钮可见）
- 刷新页面 → 确认自动恢复管理模式（无需重新输入密码）
- 关闭标签页，重新打开 → 点击 ⚙ → 确认弹出密码框
- 点击退出管理模式 → 再次点击 ⚙ → 确认弹出密码框
