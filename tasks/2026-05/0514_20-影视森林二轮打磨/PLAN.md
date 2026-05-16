# 影视森林二轮打磨计划

> 创建: 2026-05-14 20:32
> 状态: 进行中（每30分钟定时任务执行）
> 范围: admin-ui / client-ui / admin-server / client-server + 爬虫测试用例执行
> 前置: 第一轮打磨已完成（PLAN.md 所有排查项已打勾）

## 一、目标

1. **四个子系统第二轮全面查漏补缺** — 找出第一轮遗漏的问题
2. **爬虫模块测试用例执行** — 验证爬虫功能和配置有效性
3. **代码复用与组件化持续优化** — 进一步提取通用组件

## 二、执行策略

每次定时任务执行时：
- 从下面待办清单中选择 **1个小任务**（不要贪多）
- 深入审查 → 发现问题 → 修复 → commit + push
- 更新 LOG.md + 向主人汇报
- 遇到需要 NAS 部署的，记录到部署清单，不阻塞后续任务

## 三、第二轮查漏补缺清单

### 3.1 前端遗漏排查
- [x] admin-ui: 所有页面标题/面包屑一致性检查
- [x] admin-ui: 表格组件移动端适配检查
- [x] admin-ui: 分页组件一致性检查
- [x] client-ui: 首页各区块数据加载错误处理（2026-05-15）
- [x] client-ui: 列表页筛选器重置逻辑检查
- [x] client-ui: 详情页资源区域空状态处理（2026-05-15）
- [x] client-ui: 片单页面批量操作检查（2026-05-15）
- [x] 两个前端: 404 页面自定义（2026-05-15）
- [x] 两个前端: 页面 meta 标签（SEO）（2026-05-15）
- [x] 两个前端: 图片 lazy loading 检查（2026-05-15）

### 3.2 后端遗漏排查
- [x] admin-server: 接口入参 @Valid 校验补全（2026-05-15）
- [x] admin-server: Controller 层日志规范检查（2026-05-15）
- [x] client-server: 接口入参 @Valid 校验补全（2026-05-15）
- [x] client-server: 片单接口并发安全检查（2026-05-15）
- [x] 两个后端: 接口返回值统一检查（是否有遗漏 Result 包装的）（2026-05-15）
- [x] 两个后端: Mapper XML 中是否有原生 SQL 注入风险（2026-05-15）
- [x] 两个后端: 数据库连接池配置优化（2026-05-15）

### 3.3 代码复用优化
- [x] admin-ui: 内容管理页 ContentFormFields 组件进一步优化（2026-05-15）
- [x] client-ui: 列表页 fetchContentList 进一步抽象（2026-05-15 前轮已完成）
- [x] 两个前端: 统一的错误边界组件（ErrorBoundary）（2026-05-15）
- [x] 两个前端: 统一的页面元数据管理（title/description）（2026-05-15）

## 四、爬虫测试用例执行清单

测试用例文档: `projects/film-forest/docs/crawler-test-cases.md`

### 4.1 配置功能验证（每轮验证1-2个）
- [x] TC-001~004: 基础配置 CRUD（单元测试 2026-05-15 CrawlerScheduleServiceTest + CrawlerControllerTest）
- [x] TC-010~013: genreFilter 类型筛选（部署验证 2026-05-15，修复5个bug）
- [x] TC-020~022: rateLimitMs 速率限制（部署验证 2026-05-15）
- [x] TC-030~031: batchSize 批次大小（部署验证 2026-05-15）
- [x] TC-040~041: enabled 启用/禁用（单元测试 2026-05-15 CrawlerScheduleServiceTest）
- [x] TC-050~052: startCrawler/stopCrawler（单元测试 2026-05-15 CrawlerScheduleServiceTest）

### 4.2 数据准确性验证（每轮验证1个类型）
- [x] TC-100~109: 电影爬取准确性（单元测试 2026-05-15）
- [x] TC-110~113: 剧集爬取准确性（单元测试 2026-05-15）
- [x] TC-120~122: 综艺/动漫/短剧爬取准确性（单元测试 2026-05-15）

### 4.3 断点续爬验证
- [x] TC-200~202: 断点保存/恢复/重置（单元测试 2026-05-15）

### 4.4 错误处理验证
- [x] TC-300~304: 异常场景处理（单元测试 2026-05-15）

### 4.5 资源提取验证
- [x] TC-400~406: 磁力/网盘/在线资源提取（单元测试 2026-05-15）

### 4.6 CronScheduler 验证
- [x] TC-500~503: 调度器功能和线程池（单元测试 2026-05-15）

### 4.7 API 接口验证
- [x] TC-600~608: REST API 功能（单元测试 2026-05-15）

## 五、进度跟踪

### 已完成
- 2026-05-15 00:08 admin-ui 页面标题/面包屑排查
- 2026-05-15 00:38 admin-ui 表格移动端适配
- 2026-05-15 01:08 admin-ui 分页组件一致性
- 2026-05-15 02:05 client-ui 首页错误处理
- 2026-05-15 02:08 client-ui 筛选器重置逻辑
- 2026-05-15 02:38 client-ui 详情页资源区域
- 2026-05-15 03:08 两个前端 404页面
- 2026-05-15 03:38 client-ui 片单批量操作
- 2026-05-15 04:08 两个前端 页面meta标签(SEO)
- 2026-05-15 04:38 两个前端 图片lazy loading
- 2026-05-15 05:08 admin-server @Valid校验
- 2026-05-15 05:38 admin-server Controller日志
- 2026-05-15 06:08 client-server @Valid校验
- 2026-05-15 06:38 两个后端 接口返回值统一
- 2026-05-15 07:08 两个后端 SQL注入审查
- 2026-05-15 09:38 admin-server 爬虫模块单元测试（TC-100~TC-608，3个测试类958行）
- 2026-05-15 09:58 代码审查+修复（BigDecimal废弃API + fetchContentList确认完成）
- 2026-05-15 10:08 CrawlerCore 代码质量优化（InterruptedException + region序列化去重）
- 2026-05-15 07:38 两个后端 连接池优化
- 2026-05-15 08:08 client-server 片单并发安全
- 2026-05-15 08:38 两个前端 ErrorBoundary
- 2026-05-15 09:08 admin-ui ContentFormFields组件提取
- 2026-05-15 09:38 两个前端 统一页面元数据管理（metadata.ts 配置中心）
- 2026-05-15 10:38 TC-120~122 综艺/动漫/短剧爬取准确性单元测试（16个测试方法）
- 2026-05-15 11:08 client-ui TypeScript any 类型清理（hooks/components 14处→0处）
- 2026-05-15 11:38 爬虫配置 CRUD + 启停控制详细单元测试（TC-001~004/TC-040~041/TC-050~052，CrawlerScheduleServiceTest 19个方法 + CrawlerControllerTest +10个方法）

### 阻塞清单
（记录需要 NAS 部署或其他前置条件的任务）

### 部署清单
（记录需要部署到 NAS 的代码变更）
- 2026-05-15 11:18 爬虫模块全面部署测试 + 5个Bug修复（genreFilter/Druid/extractEpisodeCount/resource_online/InterruptedException）
