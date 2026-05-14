# 影视森林全面打磨计划

> 创建: 2026-05-14
> 状态: 进行中（每30分钟心跳执行）
> 范围: 管理端前后端 + 用户端前后端

## 一、目标

全面排查和完善影视森林四个子系统，达到生产级质量：
- 管理端前端 (admin-ui) — 端口 3001
- 管理端后端 (admin-server) — 端口 8081
- 用户端前端 (client-ui) — 端口 3000
- 用户端后端 (client-server) — 端口 8080

## 二、排查维度

### 2.1 前端排查项
- [x] 页面布局和响应式适配 (admin-ui + client-ui)
- [x] 组件样式一致性（主题色、间距、字体）(admin-ui + client-ui)
- [x] 表单校验和错误处理
- [x] 加载状态和空状态展示
- [x] 交互反馈（Toast/Dialog/Loading）(admin-ui + client-ui)
- [x] 性能优化（无用代码、重复逻辑）（2026-05-14，未使用import清理+列表页DRY）
- [x] 深色/浅色模式兼容 (admin-ui + client-ui)
- [x] 移动端适配 (admin-ui + client-ui)

### 2.2 后端排查项
- [x] API 接口完整性 (admin-server + client-server)
- [x] 错误处理和异常返回 (admin-server + client-server)
- [x] 日志记录规范 (admin-server + client-server)
- [x] 数据校验 (admin-server + client-server)
- [x] 性能优化（N+1查询、索引）（client-server round15 + admin-server round18 已优化）
- [x] 安全性（SQL注入、权限校验）(admin-server + client-server)

### 2.3 通用排查项
- [x] 代码风格一致性 (admin-ui + client-ui 硬编码颜色全面清理)
- [x] 注释完整性（2026-05-14，56个Java文件全面补全）
- [x] 无用代码清理
- [x] 配置合理性（2026-05-14，admin-server端口修复+日志级别优化）

## 三、执行方式

- 每30分钟心跳触发
- 每次选一个小模块/页面深入排查
- 发现问题立即修复
- 修复后 commit + push + 部署
- 记录到 LOG.md
- 完美无缺后扩展新功能

## 四、已完成模块

- [x] admin-ui: 登录页主题化 + 已登录跳转（2026-05-14）
- [x] admin-ui: Dashboard + Layout 组件审查（2026-05-14）
- [x] admin-ui: AdminHeader 硬编码颜色修复（2026-05-14）
- [x] admin-ui: 内容管理页硬编码颜色修复（2026-05-14）
- [x] admin-ui: Modal/Select/Dialog/Toast 组件主题化（2026-05-13）
- [x] admin-ui: 爬虫页响应式 + 日志预加载（2026-05-13）
- [x] admin-ui: 内容管理表单响应式（2026-05-13）
- [x] admin-ui: 仪表盘/统计/资源页响应式（2026-05-13）
- [x] admin-ui: 数据统计页硬编码颜色修复（2026-05-14）
- [x] admin-ui: 系统设置页硬编码颜色修复（2026-05-14）
- [x] admin-ui: 资源管理页硬编码颜色修复（2026-05-14）
- [x] admin-ui: 爬虫管理页硬编码颜色修复（2026-05-14）
- [x] admin-ui: 公共组件(dialog/select/toast)硬编码颜色修复（2026-05-14）
- [x] admin-ui: auth-provider + dashboard + login + content 遗漏清理（2026-05-14）
- [x] client-ui: 全页面+组件硬编码颜色全面清理（2026-05-14，17个文件73处）
- [x] client-ui: CSS 变量扩展（状态色/评分色/徽章色/危险色/深色模式）（2026-05-14）
- [x] client-ui: 响应式适配审查（2026-05-14，已完善）
- [x] admin-server: 后端代码审查（2026-05-14，质量良好）
- [x] client-server: 后端代码审查（2026-05-14，质量良好）
- [x] client-ui: 表单校验和错误处理（2026-05-14，6个文件33处修复）
- [x] client-ui: 表单校验和错误处理（2026-05-14，6个文件33处修复）

## 五、代码复用与组件化优化

- [x] Toast 组件优化（硬编码渐变色→CSS 变量）
- [x] Loading 骨架屏组件（6个）
- [x] 空状态组件（3个）
- [x] 共享样式工具
- [x] 详情页通用组件提取（movie/drama/variety/anime）（2026-05-14，13个通用组件）
- [x] 列表页通用组件提取（2026-05-14，fetchContentList + FilterChip）
- [x] 筛选器组件提取（2026-05-14，FilterChip 统一组件）
- [x] 资源展示组件提取（2026-05-14，ContentShared + contentConstants）

## 六、待完善模块

- [x] client-ui: 加载状态和空状态展示（2026-05-14，14个文件全面升级）
- [x] admin-ui: 加载状态/空状态/错误处理全面升级（2026-05-14，6个文件）
- [x] client-server: 后端性能优化（2026-05-14，N+1修复+堆排序+25个索引）
- [x] admin-server: 后端性能优化（2026-05-14，资源统计GROUP BY+爬虫重复删除清理）
- [x] admin-server + client-server: 后端代码规范统一（2026-05-14，ContentController/SearchController重构+GlobalExceptionHandler 5层异常处理+BusinessException）
- [x] 后端代码规范统一（2026-05-14，第19轮：ContentController重构+SearchController重构+GlobalExceptionHandler升级+BusinessException）
- [x] 后端性能优化（N+1查询、索引）
- [x] client-ui: inline style 全面清理（2026-05-14，265处CSS变量inline style→Tailwind class，@theme注册17个颜色变量）
