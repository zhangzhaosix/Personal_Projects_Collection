# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

个人作品集（Portfolio）页面，用于展示个人项目、技能和经验。位于 monorepo `对话窗口合集/聊天框10(作品集页面)/` 下。

## 技能分工

### 网页开发 → superpowers 系列 skill

承担 **产品经理 + 测试开发 + 调试** 职责：

- 先调用 `superpowers:brainstorming` 确认需求和设计方案
- 开发过程遵循 `superpowers:test-driven-development` 或 `superpowers:executing-plans` / `superpowers:writing-plans`
- 完成后调用 `superpowers:requesting-code-review` 做代码审查
- 修复问题使用 `superpowers:systematic-debugging`

### 网页美化 → ui-ux-pro-max skill

承担 **UI 设计 + 页面美化 + 前端设计** 职责：

- 布局、配色、字体、动效等视觉相关全部交由 `ui-ux-pro-max` 处理
- 涉及风格选择（毛玻璃、极简、Bento Grid 等）时优先调用此 skill
- 支持 responsive 适配、暗色模式、无障碍等前端设计决策

## 设计风格：毛玻璃（Glassmorphism）

### 核心 CSS 技术

| 属性 | 说明 | 示例 |
|------|------|------|
| `backdrop-filter: blur()` | 磨砂质感关键，对元素背后内容做模糊 | `backdrop-filter: blur(10px);` |
| `background: rgba()` | 半透明背景色，alpha 0.1~0.25 | `background: rgba(255, 255, 255, 0.1);` |
| `-webkit-backdrop-filter` | Safari 等旧版浏览器兼容前缀 | `-webkit-backdrop-filter: blur(10px);` |
| `border` | 1px 半透明白色边框增强玻璃立体感 | `border: 1px solid rgba(255, 255, 255, 0.2);` |
| `box-shadow` | 轻微投影让卡片浮在背景上 | `box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);` |

### 视觉层级结构

1. **底层（背景层）**：全屏高质量背景图（推荐深色/低饱和度/霓虹风景图）或渐变色背景（蓝紫渐变、粉蓝渐变）
2. **中层（容器层）**：毛玻璃卡片本身，必须用 `border-radius` 设置圆角（16px~20px），留有足够留白
3. **上层（内容层）**：卡片内的文字/图标/表单，文字用纯白或极浅灰色保证可读性

### 交互组件样式

- **输入框**：背景色略深于容器（`rgba(255,255,255,0.15)`），`backdrop-filter: blur(5px)`，胶囊型圆角（`border-radius: 25px`），文字白色，placeholder 半透明白色
- **实心玻璃按钮**：纯白或半透明白背景 + 深色文字
- **透明描边按钮**：无背景填充 + 白色边框 + 白色文字

### 色彩与排版

- **深色模式**：背景图以深蓝/紫色为主，容器白色半透明，文字白色
- **浅色/彩色模式**：背景为粉色/彩色渐变，容器白色半透明，文字白色
- **排版**：标题用无衬线粗体（Sans-serif Bold），大字重；辅助文案用小字号并降低透明度

### 兼容性与性能

- **降级方案**：用 `@supports (backdrop-filter: blur())` 检测，不支持时回退为纯色半透明背景
- **性能优化**：`blur()` 值控制在 10px~15px 以内，避免在毛玻璃容器内放置复杂动画或大量 DOM 节点

## GitHub 同步流程

- **仓库可见性**：私人（Private）仓库，仅自己可访问代码
- **仓库名**：`Personal_Projects_Collection`
- **部署方式**：GitHub Pages（推送即自动部署）
- **访问地址**：`https://zhangzhaosix.github.io/Personal_Projects_Collection/`

**用户确认满意后**（用户说"可以了"/"没问题"/"满意"等确认信号），执行：

```bash
# 提交代码
git add .
git commit -m "修改内容描述"

# 推送到 GitHub（GitHub Pages 会自动重新部署）
git push || git push || git push
```

> **推送规则**：远程地址已固定为 GitHub，无需再切换。如果推送失败，就一直重试直到成功为止。
