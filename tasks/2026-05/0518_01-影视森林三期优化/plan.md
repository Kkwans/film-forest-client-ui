---
created: 2026-05-18
---

# PLAN -- 影视森林三期优化 技术方案

## 总体策略

采用**渐进式优化**策略，按优先级分批执行，每轮聚焦 1-2 个功能点。不引入重型依赖（如 Redis），优先用轻量方案实现。

## 技术方案

### A1: 首页智能推荐

**后端：**
- 新增 `GET /api/recommend` 接口
- 策略：热门（按 view_count 排序）+ 最新（按 created_at）+ 编辑精选（手动标记）
- 每个分类返回 Top 5，共 25 条推荐数据
- SQL: `SELECT * FROM movie ORDER BY view_count DESC LIMIT 5` 等

**前端：**
- 首页改为：Banner 轮播 + 分类推荐卡片 + 最新更新列表
- 新增 `RecommendSection` 组件
- 使用 SWR 缓存推荐数据

### A2: 搜索增强

**后端：**
- `GET /api/search/suggest?q=xxx` 返回搜索建议（标题前缀匹配，LIMIT 10）
- `GET /api/search/hot` 返回热门搜索词（按搜索频率统计，或写死 Top 10）
- 搜索接口支持 `LIKE %keyword%` 模糊匹配

**前端：**
- 搜索框增加下拉建议（debounce 300ms）
- 搜索历史存 localStorage
- 热门搜索展示

### A3: 详情页增强

**后端：**
- `GET /api/{type}/{id}/related` 返回相关内容（同类型，排除自身，LIMIT 6）
- 评分分布接口（可选，先用 mock 数据）

**前端：**
- 详情页底部新增"相关推荐"卡片
- 新增 `RelatedSection` 组件

### A4: 用户中心

**后端：**
- 收藏夹 CRUD 接口已有（UserMovieListController）
- 观看历史：复用 user_movie_list 的"想看"类型，或新增 history 类型

**前端：**
- Profile 页增加：收藏夹列表、观看历史 Tab
- 支持创建/编辑/删除收藏夹

### B1: 数据统计增强

**后端：**
- `GET /api/stats/overview` 返回：总内容数、今日新增、爬虫成功率
- `GET /api/stats/trend?days=30` 返回近 30 天增长趋势
- `GET /api/stats/search-hot` 返回热门搜索词

**前端：**
- 统计页增加趋势折线图（已有折线图组件）
- 增加卡片式数据概览

### B2: 爬虫管理优化

**后端：**
- 爬虫任务增加状态枚举：pending/running/success/failed
- 失败任务支持手动重试
- 任务日志详情接口

**前端：**
- 爬虫页面增加状态筛选
- 任务队列可视化（进度条/状态卡片）

### C1: 前端性能

- 所有图片加 `loading="lazy"`
- 长列表考虑虚拟滚动（react-window 或手写）
- 分析 Bundle 大小，移除未使用依赖
- 使用 Next.js `Image` 组件优化图片

### D2: 暗色模式

- 使用 `next-themes` 库
- CSS 变量方案：定义 `--bg`, `--text`, `--card` 等变量
- Tailwind `dark:` 前缀适配
- 用户偏好存 localStorage

### D3: 标签系统

**数据库：**
```sql
CREATE TABLE tag (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(20) DEFAULT '#3b82f6'
);
CREATE TABLE content_tag (
  content_id BIGINT NOT NULL,
  content_type VARCHAR(20) NOT NULL,
  tag_id BIGINT NOT NULL,
  PRIMARY KEY (content_id, content_type, tag_id)
);
```

**后端：**
- `GET /api/tags` 返回所有标签
- `GET /api/content/{type}/{id}/tags` 返回内容标签
- `POST /api/content/{type}/{id}/tags` 设置标签

**前端：**
- 内容卡片展示标签 chips
- 按标签筛选功能

## 执行顺序

```
Phase 1 (核心体验): A1 首页推荐 → A2 搜索增强 → A3 详情页增强
Phase 2 (管理增强): B1 数据统计 → B2 爬虫优化
Phase 3 (体验升级): D2 暗色模式 → D3 标签系统
Phase 4 (性能): C1 前端性能 → A4 用户中心
```

## 依赖清单

| 功能 | 新增依赖 | 说明 |
|------|---------|------|
| 暗色模式 | next-themes | Next.js 官方推荐 |
| 图表 | 已有 recharts | 复用 |
| 虚拟滚动 | react-window | 可选，按需引入 |
| 其他 | 无 | 保持轻量 |
