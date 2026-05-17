# LOG -- 影视森林全面打磨二期 执行日志

## 2026-05-17 02:05

### 本次目标
- 创建 SDD 任务结构(spec.md + plan.md + tasks.md)
- 设置 30 分钟 cron 定时任务

### 完成内容
- spec.md: 需求规格(13 个功能需求,9 个验收标准)
- plan.md: 技术方案(5 个阶段)
- tasks.md: 任务清单(5 阶段 20+ 项)

### 问题来源
主人亲自测试发现的问题 + 截图确认

### 待执行
- 设置 cron 定时任务
- 开始阶段 1:P0 问题修复

---

## 2026-05-17 10:21 - 第 1 轮

### 本次目标
- F6: 爬虫配置创建后回显(API 响应解析错误)

### 排查过程
1. 读取 tasks.md + log.md 了解整体进度
2. 逐一审查 F1~F5 用户端 P0 问题,发现均已实现:
   - F1: OnlineResourceGrid 已按 sourceName 分组展示 ✅
   - F2: NoteEditModal + WatchedModal 已有 isReadOnly 只读模式 ✅
   - F3: NoteEditModal useEffect 已正确同步 initialNote/initialRating ✅
3. 转向管理端 P0 问题,审查 F6 爬虫配置页面
4. **发现关键 Bug**: `fetchSchedules` 中 API 响应解析路径错误
   - 后端返回: `{ code: 200, data: { schedules: [...], total, running, idle } }`
   - 代码访问: `res.data?.schedules` (❌ 未 unwrap Result)
   - 正确路径: `res.data?.data?.schedules` (✅)
   - 对比 `fetchLogs` 正确使用了 `res.data?.data`

### 修复内容
- 文件: `admin-ui/src/app/crawler/page.tsx`
- 将 `CrawlerStatusResponse` 重命名为 `CrawlerStatusData`
- 类型修正为 `AxiosResponse<{ code: number; data: CrawlerStatusData }>`
- 通过 `res.data?.data` 正确 unwrap Result 包装
- stats 优先使用后端返回的 total/running/idle 计数

### Git
- Commit: `6ad2ff8` fix(crawler): 修复爬虫配置列表 API 响应解析错误(F6)
- Push: main -> origin/main ✅

### 影响范围
- 修复后爬虫配置列表可正确加载
- 新建/编辑配置后列表可正确回显
- 统计数字(配置总数/运行中/空闲)正确显示

### 下一步建议
- F7a: 类型筛选选项清理(需检查数据库中是否混入语言类选项)
- F7b: 定时规则跳转修复(CronBuilder 模式切换逻辑)
- F7c: 定时间隔自定义配置
- F11: 资源管理界面优化

---

## 2026-05-17 10:51 - 第 2 轮

### 本次目标
- F7: 爬虫配置表单优化(F7a + F7b + F7c 三个子项一次性修复)

### 排查过程
1. 审查 F7a 类型筛选问题:
   - 后端 `getGenres` API 直接从数据库 genre JSON 字段提取所有值
   - 爬虫提取时 URL 匹配正则 `.*\/ms\/\d+---[^-].*` 理论上可排除语言链接
   - 但数据库中仍可能混入语言类数据(如 "国语"、"粤语" 等)
   - 决定在后端 API 层增加语言关键词黑名单过滤
2. 审查 F7b 定时规则跳转 bug:
   - CronBuilder `update` 函数使用 `const m = newMode || mode`
   - 但 `buildCron(m, ...)` 中 `m` 仅用于 switch,其他参数仍用旧状态
   - 模式切换按钮 `onClick={() => { setMode(opt.key); update(opt.key); }}` 中,setMode 是异步的,update 用的还是旧 mode
   - 核心问题:模式切换时未同步提取当前 cron 中的时分值
3. 审查 F7c 自定义间隔:
   - 定时间隔模式只有固定按钮,无法输入自定义分钟数
   - 需要增加自定义输入框

### 修复内容

**F7a: 类型筛选过滤语言选项**
- 文件: `admin-server/.../ContentController.java`
- 新增 `LANGUAGE_KEYWORDS` 集合(22 个语言关键词)
- `getGenres` 方法增加过滤逻辑:遍历 genre 值时跳过语言关键词
- 关键词覆盖:国语/粤语/英语/日语/韩语/法语/德语/西班牙语/意大利语/俄语/泰语/印度语/普通话/原声/配音/中字/英字/日字/双语/多语言/外语/国语配音/日语配音

**F7b: 定时规则模式切换修复**
- 文件: `admin-ui/src/app/crawler/page.tsx`
- 重写 `update` 函数:直接使用 `newMode` 参数,不再依赖 stale `mode` 状态
- 新增 `handleModeChange` 函数:模式切换时从当前 cron 表达式提取时分值并同步状态
- 按钮 onClick 改为调用 `handleModeChange(opt.key)`

**F7c: 自定义间隔配置**
- 文件: `admin-ui/src/app/crawler/page.tsx`
- 定时间隔模式下新增自定义分钟输入框
- 支持 1-1440 分钟范围,自动转换为 cron 表达式
- ≥60 且整除 60 的值自动转为 "每N小时" 格式

### Git
- Commit admin-ui: `b4b225e` fix(crawler): F7a+F7b+F7c 三项修复
- Commit admin-server: `254a4d0` fix(content): F7a getGenres API 过滤语言类关键词
- Push: main/master -> origin ✅

### 影响范围
- 爬虫配置表单类型筛选不再显示语言类选项
- 定时规则模式切换不再跳转到错误模式
- 用户可自定义爬虫执行间隔(1-1440分钟)

### 下一步建议
- F11a: 资源管理列表完善(展示全部字段)
- F11b: 资源管理增加筛选/编辑/分页
- F11c: 按钮文字颜色修复
- F4: 详情页布局优化(海报与信息区等高)

---

## 2026-05-17 11:21 - 第 3 轮

### 本次目标
- F11c: 按钮文字颜色修复

### 排查过程
1. 审查 `resources/page.tsx` 中所有按钮样式
2. 发现"新增来源"按钮使用 `bg-primary text-foreground` 组合
3. 分析 CSS 变量:
   - 亮色模式:primary=oklch(0.205)(深色),foreground=oklch(0.145)(深色)→ 深色文字在深色背景上不可见
   - 暗色模式:primary=oklch(0.922)(浅色),foreground=oklch(0.985)(浅色)→ 浅色文字在浅色背景上不可见
4. 全局搜索 `bg-primary.*text-foreground` 确认仅此一处

### 修复内容
- 文件: `admin-ui/src/app/resources/page.tsx`
- 将"新增来源"按钮 `text-foreground` 改为 `text-primary-foreground`
- `primary-foreground` 与 `primary` 形成对比色,确保各主题下文字均清晰可读

### Git
- Commit: `b733bd0` fix(resources): 修复"新增来源"按钮文字颜色不可见(F11c)
- Push: main -> origin/main ✅

### 影响范围
- 资源管理页面"新增来源"按钮文字现在各主题下均清晰可读

### 下一步建议
- F11a: 资源管理列表完善(展示全部字段)
- F11b: 资源管理增加筛选/编辑/分页
- F4: 详情页布局优化(海报与信息区等高)
- F8: 内容管理筛选项下拉被遮挡修复

---

## 2026-05-17 11:51 - 第 4 轮

### 本次目标
- F11a: 资源管理列表完善(展示全部字段)

### 排查过程
1. 对比前端接口定义与后端实体字段:
   - `ResourceMagnet` 实体字段: id, contentType, contentId, title, magnetUrl, resolution, hasSubtitle, isSpecialSub, sort, createdAt, updatedAt
   - `ResourceCloud` 实体字段: id, contentType, contentId, diskType, title, url, password, sort, createdAt, updatedAt
2. 发现前端接口有已废弃的 `episodeId` 字段(后端实体已无此字段)
3. 磁力资源列表缺少: ID、contentId、isSpecialSub 特效字幕标记、sort 排序
4. 网盘资源列表缺少: ID、contentId、sort 排序

### 修复内容
- 文件: `admin-ui/src/app/resources/page.tsx`
- **移除废弃字段**: 删除 CloudResource 和 MagnetResource 中的 `episodeId`
- **MagnetResource 接口补全**: 增加 `updatedAt` 字段
- **CloudResource 接口补全**: 增加 `updatedAt` 字段
- **磁力资源表格**: 从 12 列扩展为 16 列,新增 ID、内容ID(可点击跳转 `/content?id=xxx`)、排序、特效字幕标记
- **网盘资源表格**: 从 12 列扩展为 16 列,新增 ID、内容ID(可点击跳转)、排序
- **移动端卡片**: 同步补充内容ID、排序等信息
- 内容ID 使用 `<a href="/content?id=xxx">` 链接,方便管理员快速定位关联内容

### Git
- Commit: `1176cb8` fix(resources): 完善资源管理列表展示全部字段(F11a)
- Push: main -> origin/main ✅

### 影响范围
- 资源管理页面磁力/网盘列表现在展示全部实体字段
- 管理员可通过内容ID快速跳转到内容管理页面
- 废弃的 episodeId 字段已清理

### 下一步建议
- F11b: 资源管理增加筛选/编辑/分页
- F4: 详情页布局优化(海报与信息区等高)
- F8: 内容管理筛选项下拉被遮挡修复
- F5: 爬虫数据质量修复(简介清理"[展开全部]")

---

## 2026-05-17 12:21 - 第 5 轮

### 本次目标
- F11b: 资源管理增加筛选/编辑/分页

### 排查过程
1. 审查现有资源管理页面,发现三个核心缺陷:
   - **无筛选**: 后端 API 已支持 contentType/contentId 参数,但前端无筛选 UI
   - **无编辑**: 磁力资源无 saveMagnet API 方法,磁力/网盘均无编辑弹窗
   - **无分页**: 前端 `.slice(0, 50)` 硬截断,后端返回全量数据
2. 对照内容管理页面的分页实现模式(IPage + Page + LambdaQueryWrapper)
3. 确认 MyBatis-Plus 已集成分页插件(ContentController 已使用 IPage)

### 修复内容

**后端 - ResourceController.java**
- `listMagnet` 和 `listCloud` 改为分页接口,返回 `IPage<ResourceMagnet/Cloud>`
- 新增参数: `page`(默认1)、`size`(默认20)、`keyword`(标题模糊搜索)
- 保留原有 contentType/contentId 筛选参数

**后端 - ResourceService.java + ResourceServiceImpl.java**
- 新增 `pageMagnet(pageNum, pageSize, contentType, contentId, keyword)` 方法
- 新增 `pageCloud(pageNum, pageSize, contentType, contentId, keyword)` 方法
- 使用 `Page<T>` + `LambdaQueryWrapper` + `.like(title, keyword)` 实现

**前端 - api.ts**
- 新增 `SaveMagnetData` 接口定义(id/contentType/contentId/title/magnetUrl/resolution/hasSubtitle/isSpecialSub/sort)
- 修正 `SaveCloudData` 接口(原 storageName → diskType,增加 title/password/sort)
- 新增 `saveMagnet` 和 `deleteMagnet` API 方法
- `listMagnet` 和 `listCloud` 改为接收分页参数对象

**前端 - resources/page.tsx(重写)**
- **筛选栏**: 磁力/网盘列表各增加 FilterBar 组件(类型下拉 + 关键词搜索 + 筛选/重置按钮)
- **编辑弹窗**: 新增 MagnetEditModal 和 CloudEditModal,支持新增/编辑全字段
- **操作按钮**: 桌面端和移动端列表每行增加编辑(✏️)/删除(🗑️)按钮
- **分页组件**: 自定义 Pagination 组件(页码 + 总数 + 前后翻页)
- **状态管理**: 分离 magnetPage/magnetTotal/magnetFilter 和 cloudPage/cloudTotal/cloudFilter

### Git
- Commit admin-server: `9e4e851` fix(resource): 磁力/网盘资源列表增加分页+筛选+关键词搜索(F11b)
- Commit admin-ui: `5518db6` fix(resources): F11b 资源管理增加筛选/编辑/分页
- Push: master/main -> origin ✅

### 影响范围
- 资源管理页面支持按类型筛选、关键词搜索磁力/网盘资源
- 管理员可直接在页面上新增、编辑、删除磁力和网盘资源
- 大数据量下不再全量加载,分页每页 20 条

### 下一步建议
- F4: 详情页布局优化（海报与信息区等高）
- F8: 内容管理筛选项下拉被遮挡修复
- F5: 爬虫数据质量修复（简介清理“[展开全部]”）
- F10a: 数据统计柱状图样式修复

---

## 2026-05-17 12:51 - 第 6 轮

### 本次目标
- F5: 爬虫数据质量修复 — 简介清理“[展开全部]”统一化

### 排查过程
1. 审查 `StorylineCleaner.java`（client-server）发现是完整的清理工具
2. 审查 `CrawlerCore.extractStoryline()`（admin-server）发现内联清理逻辑是 StorylineCleaner 的不完整子集
3. 核心问题：admin-server 的 CrawlerCore 没有引用 StorylineCleaner，而是用 inline regex 做了部分清理
   - StorylineCleaner: 9 种方括号模式 + 8 种纯文本模式 + 省略号清理
   - CrawlerCore inline: 仅 7 种方括号 + 6 种纯文本，缺少 [展开][收起][更多] 等变体

### 修复内容
- **新增**: `admin-server/.../common/util/StorylineCleaner.java` — 与 client-server 版本一致
- **修改**: `admin-server/.../crawler/core/CrawlerCore.java`
  - import StorylineCleaner
  - `extractStoryline()` 方法：移除 20+ 行 inline regex 清理，替换为 `StorylineCleaner.clean(text)` 一行调用
  - 覆盖全部 17 种 UI 残留文本模式 + 省略号/空白清理

### 补充说明
- tasks.md 中 F1/F2/F3 已在第 1 轮确认实现但未勾选，本轮补勾
- F5 现在勾选完成

### Git
- Commit: `0c837a4` fix(crawler): 统一使用 StorylineCleaner 清理简介 UI 残留文本(F5)
- Push: master -> origin ✅

### 影响范围
- 所有类型（电影/剧集/综艺/动漫/短剧）的简介字段现在统一使用 StorylineCleaner 清理
- 爬取的数据不再包含 [展开全部][收起][查看更多] 等 UI 残留文本

### 下一步建议
- F4: 详情页布局优化（海报与信息区等高）
- F8: 内容管理筛选项下拉被遮挡修复
- F9: 内容表单增加海报配置
- F10a: 数据统计柱状图样式修复

---

## 2026-05-17 13:23 - 第 7 轮

### 本次目标
- F4: 详情页布局优化（海报与信息区等高）

### 排查过程
1. 审查 `DetailPageLayout.tsx` 布局结构：`flex flex-col sm:flex-row gap-6` 容器内包含 `DetailCover` 和信息区
2. 发现容器缺少 `items-stretch`，导致封面和信息区各自按内容高度渲染，不对齐
3. 审查 `DetailCover` 组件：桌面端 `w-48 md:w-64` + 图片 `aspect-[2/3]` 固定宽高比
4. 问题：当信息区内容多于封面高度时，封面不拉伸；反之信息区不拉伸

### 修复内容

**DetailPageLayout.tsx**
- 容器 div 添加 `items-stretch`，使封面和信息区在桌面端等高

**DetailComponents.tsx - DetailCover**
- 图片添加 `sm:aspect-auto sm:h-full`：桌面端移除固定宽高比，改为填满容器高度
- 移动端保持原有 `aspect-[2/3]` 不变（上下堆叠模式无需等高）
- `object-cover` 确保图片裁剪不变形

**补充提交：F2/F3/F5 客户端改动**
- 发现之前轮次的 F2/F3/F5 客户端实现未提交，一并推送
- F2: NoteEditModal/WatchedModal 增加 isReadOnly 只读模式
- F3: 评价编辑保存后保留数据，切换回只读模式而非关闭
- F5: cleanStoryline 扩展清理全部 UI 残留文本模式

### Git
- Commit: `33c4740` fix(detail): 详情页海报与信息区等高布局(F4)
- Commit: `b3677ff` fix(detail): F2+F3+F5 评价只读/编辑保留/简介清理
- Push: main -> origin/main ✅

### 影响范围
- 所有详情页（电影/剧集/综艺/动漫/短剧）海报与信息区在桌面端等高展示
- 封面图片自动裁剪填充，不变形
- 移动端布局不受影响

### 下一步建议
- F8: 内容管理筛选项下拉被遮挡修复
- F9: 内容表单增加海报配置
- F10a: 数据统计柱状图样式修复
- F10b: Tooltip 即时显示（不从左上角飞出）

---

## 2026-05-17 13:53 - 第 8 轮

### 本次目标
- F8: 内容管理筛选项下拉被遮挡修复

### 排查过程
1. 审查 `content/page.tsx` 筛选区域结构：Select 组件放在 `Card > CardContent > div.flex` 内
2. 审查 `Select` 组件：下拉菜单使用 `absolute` 定位 + `z-[10000]`
3. **发现根因**：`Card` 组件默认 className 包含 `overflow-hidden`，这会裁剪所有超出 Card 边界的子元素
4. Select 下拉菜单是 `absolute` 定位，从 Card 内部弹出时被 `overflow-hidden` 裁剪，导致不可见

### 修复内容
- 文件：`admin-ui/src/app/content/page.tsx`
- 筛选栏 Card 添加 `overflow-visible` 覆盖默认的 `overflow-hidden`
- 仅影响筛选区域的 Card，不影响其他 Card 组件

### Git
- Commit：`5bfc52f` fix(content): 修复筛选项下拉菜单被 Card overflow-hidden 裁剪(F8)
- Push：main -> origin/main ✅

### 影响范围
- 内容管理页面类型筛选和状态下拉菜单现在可正常弹出显示
- 不影响其他页面的 Card 组件行为

### 下一步建议
- F10a: 数据统计柱状图样式修复
- F10b: Tooltip 即时显示（不从左上角飞出）
- F10c: 扩展图表类型（折线图等）

---

## 2026-05-17 14:23 - 第 9 轮

### 本次目标
- F9: 内容表单增加海报配置

### 排查过程
1. 审查 `ContentFormFields.tsx` 表单定义：`EditForm` 接口缺少 `posterUrl` 字段
2. 审查后端实体：`Movie`/`Drama`/`Anime`/`ShortDrama`/`Variety` 均有 `posterUrl` 字段
3. 审查后端 API：`@RequestBody Movie movie` 自动反序列化，已支持 posterUrl
4. 审查前端显示：`content/page.tsx` 列表和详情弹窗已使用 `item.posterUrl` 展示海报
5. 核心问题：表单没有海报 URL 输入框，管理员无法手动配置海报图片

### 修复内容

**ContentFormFields.tsx**
- `EditForm` 接口新增 `posterUrl: string` 字段
- `EMPTY_FORM` 新增 `posterUrl: ''` 默认值
- `buildSubmitData` 新增 `posterUrl: form.posterUrl || undefined`（匹配 `ContentSubmitData` 类型）
- 表单 UI：标题下方新增「海报 URL」输入框，placeholder 引导输入图片链接

**content/page.tsx**
- `handleEditClick` 编辑初始化：新增 `posterUrl: item.posterUrl || ''` 填充已有值

### Git
- Commit: `9904705` fix(content): 内容表单增加海报 URL 配置字段(F9)
- Push: ⚠️ 本地 commit 完成，GitHub 网络超时未推送

### 影响范围
- 新增/编辑内容时可手动配置海报图片 URL
- 编辑已有内容时海报 URL 自动回显
- 后端已支持 posterUrl 字段持久化，无需后端改动

### 下一步建议
- F10a: 数据统计柱状图样式修复
- F10b: Tooltip 即时显示（不从左上角飞出）
- F10c: 扩展图表类型（折线图等）
- 等网络恢复后执行 `git push` 同步远程

---

## 2026-05-17 14:53 - 第 10 轮

### 本次目标
- F10a: 数据统计柱状图样式修复
- F10b: Tooltip 即时显示（不从左上角飞出）

### 排查过程
1. 审查 `stats/page.tsx` 图表实现，使用 recharts 库
2. **F10b Tooltip 飞出问题**：BarChart 的 `<Tooltip>` 未设置 `isAnimationActive={false}`，recharts 默认会从图表原点(0,0)动画飞入到目标位置，视觉效果差
3. **F10a 柱状图样式问题**：
   - CartesianGrid 同时有水平和垂直网格线，视觉 clutter
   - XAxis/YAxis 有 tickLine 但无 axisLine，风格不统一
   - barGap=8 导致柱子偏细
   - Tooltip 无阴影，层次感不足
4. PieChart 的 Tooltip 也存在同样的动画问题（虽使用 CustomTooltip，但未禁用动画）

### 修复内容

**F10b: Tooltip 即时显示**
- BarChart `<Tooltip>` 添加 `isAnimationActive={false}` — 禁用飞入动画，鼠标悬停即时显示
- PieChart `<Tooltip>` 同步添加 `isAnimationActive={false}` — 保持一致性

**F10a: 柱状图样式优化**
- `CartesianGrid` 添加 `vertical={false}` — 仅保留水平网格线，更简洁
- `XAxis` 添加 `axisLine={{ stroke: 'var(--border)' }}` + `tickLine={false}` — 显示轴线但隐藏刻度线
- `YAxis` 添加 `axisLine={false}` + `tickLine={false}` — 隐藏轴线和刻度线，更干净
- `barGap` 从 8 调整为 4，`barCategoryGap` 设为 "20%" — 柱子更饱满
- `Tooltip` 添加 `cursor={{ fill: 'var(--muted)', opacity: 0.3 }}` — hover 时高亮整组柱子
- `Tooltip` 添加 `boxShadow: '0 4px 12px rgba(0,0,0,0.15)'` — 提升弹出层次感

### Git
- Commit admin-ui: `24e52df` fix(stats): 柱状图样式优化+Tooltip即时显示(F10a+F10b)
- Push: main -> origin/main ✅

### 影响范围
- 数据统计页面柱状图和饼图的 Tooltip 现在即时显示，不再从左上角飞出
- 柱状图视觉更简洁清爽，交互反馈更明确

### 下一步建议
- F10c: 扩展图表类型（折线图等）— 需要时间序列数据支撑，可考虑增加爬虫运行趋势图
- F13: 梳理代码自主发现问题
- F12: 仪表盘"下线"按钮含义明确化
