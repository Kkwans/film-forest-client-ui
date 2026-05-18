---
created: 2026-05-18
---

# TASKS -- NAS 文件浏览器二次开发 任务清单

> 从 spec.md + design.md 拆解。完成后勾选 [x]。

## Phase 0: 仓库搭建与构建验证

- [x] 创建 GitHub 仓库 `nas-file-browser`
- [x] 推送前端源码到 GitHub（Go 后端由 Dockerfile 构建时自动拉取）
- [x] 编写 Dockerfile.custom（两阶段构建）
- [x] NAS 上构建自定义镜像并验证（第 19 轮：修复二进制路径 /filebrowser → /usr/local/bin/filebrowser，docker compose 重建容器）
- [x] 替换现有 FileBrowser 容器（第 19 轮：docker compose down + up -d，容器 healthy）

## Phase 1: Markdown 核心改造 (P0)

### F1: Markdown 渲染美化
- [x] 改写 `frontend/src/css/mdPreview.css`（200+ 行专业样式）
- [x] 测试各类 Markdown 元素渲染效果（第 17 轮：发现并修复 6 个问题）
- [x] 验证暗色模式适配（第 17 轮：完整覆盖 h5/h6/dl/details/sup 暗色样式）

### F2: Vditor 编辑器集成
- [x] 改写 `frontend/src/views/files/Editor.vue`（集成 Vditor）
- [x] 修复模式切换逻辑（switchMode 销毁+重建）
- [x] 实现阅读模式（initVditorPreview + md2html）
- [x] 测试 IR（实时渲染）模式（代码审查 + 3 个 bug 修复）
- [x] 测试分屏模式（代码审查，逻辑与 IR 一致）
- [x] 测试阅读模式（代码审查，initVditorPreview 逻辑正确）
- [x] 验证保存功能（代码审查，save() 逻辑正确）
- [x] 验证暗色主题切换（第 3 轮已修复）

## Phase 2: UI 样式优化 (P1)

### F3: 全局样式优化
- [x] 文件列表页样式优化
- [x] 侧边栏样式优化
- [x] 顶部导航栏优化
- [x] 登录页美化
- [x] 设置页样式优化
- [x] 移动端响应式优化

### F4: 中文本地化
- [x] 审查现有中文翻译（发现 20+ 个未翻译项）
- [x] 补充缺失的翻译项（resumeTransfer/overrideAll/replaceOrSkip 等）
- [x] 测试全中文界面（第 18 轮：285/285 keys 对齐 + 14 个硬编码 i18n 化）

## Phase 3: 功能增强 (P2)

### F5: 文件预览增强
- [x] 代码语法高亮优化
- [x] PDF 预览优化
- [x] 图片预览优化

### F6: 批量操作优化
- [x] 批量选择体验优化
- [x] 批量操作 UI 优化

## 执行策略

- 每轮 cron 执行 1 个子任务
- 完成后 git commit + push
- 更新 log.md 记录进展
- 部署到 NAS 验证
