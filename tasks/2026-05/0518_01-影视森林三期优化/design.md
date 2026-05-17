---
created: 2026-05-18
---

# DESIGN -- 影视森林三期优化 技术设计

## 架构概览

```
film-forest/
├── client-ui/          # 用户端 Next.js 前端
│   └── src/app/
│       ├── page.tsx            # ★ 首页：增加推荐模块
│       ├── search/page.tsx     # ★ 搜索：增加建议和历史
│       ├── movie/[id]/page.tsx # ★ 详情：增加相关推荐
│       └── profile/page.tsx    # ★ 用户中心：Tab 化
├── client-server/      # 用户端 SpringBoot 后端
│   └── src/main/java/com/filmforest/
│       ├── content/controller/
│       │   ├── RecommendController.java  # ★ 新增：推荐接口
│       │   └── SearchController.java     # ★ 增强：搜索建议
│       └── content/service/
│           └── RecommendService.java     # ★ 新增：推荐逻辑
├── admin-ui/           # 管理端 Next.js 前端
│   └── src/app/
│       ├── stats/page.tsx      # ★ 统计：增加趋势图
│       └── crawler/page.tsx    # ★ 爬虫：状态可视化
├── admin-server/       # 管理端 SpringBoot 后端
│   └── src/main/java/com/filmforest/
│       └── crawler/controller/
│           └── CrawlerController.java  # ★ 增强：重试接口
└── database/
    └── migration-v3.sql        # ★ 新增：tag 表
```

## 核心改动设计

### 1. 首页推荐系统

**后端**: 新增 `GET /api/recommend`
- 策略: 热门(view_count DESC) + 最新(created_at DESC) + 编辑精选
- 每个分类 Top 5，共 25 条
- 无复杂算法，纯 SQL 排序

**前端**: 首页改版
- Banner 轮播 + 分类推荐卡片 + 最新更新列表
- 新增 `RecommendSection` 组件

### 2. 搜索增强

**后端**: 
- `GET /api/search/suggest?q=xxx` → 标题前缀匹配 LIMIT 10
- `GET /api/search/hot` → 热门搜索词 Top 10
- `LIKE %keyword%` 模糊匹配

**前端**:
- 搜索框下拉建议 (debounce 300ms)
- 搜索历史 (localStorage)
- 热门搜索展示

### 3. 详情页增强

**后端**: `GET /api/{type}/{id}/related` → 同类型排除自身 LIMIT 6
**前端**: 底部"相关推荐"卡片

### 4. 暗色模式

- 使用 `next-themes` 库
- CSS 变量方案: `--bg`, `--text`, `--card`
- Tailwind `dark:` 前缀适配

### 5. 标签系统

**数据库**:
```sql
CREATE TABLE tag (id, name, color);
CREATE TABLE content_tag (content_id, content_type, tag_id);
```

**后端**: 标签 CRUD + 内容关联
**前端**: 标签 chips 展示 + 按标签筛选

## 数据流

```
用户访问首页
  → 前端请求 GET /api/recommend
  → 后端查询各分类 Top 5
  → 返回推荐数据
  → 前端渲染推荐卡片

用户搜索
  → 输入 debounce 300ms
  → 请求 GET /api/search/suggest?q=xxx
  → 返回标题匹配结果
  → 显示下拉建议
```

## 与现有系统兼容性

- 不修改现有数据库表结构（仅新增 tag 表）
- 不修改现有 API（仅新增）
- 前端渐进式优化（不破坏现有页面）
