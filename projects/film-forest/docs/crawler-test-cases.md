# 影视森林爬虫模块测试用例

> 创建: 2026-05-14
> 目标: 验证爬虫能爬取全面且准确的数据，各种自定义配置全部有效

## 一、配置功能测试

### 1.1 基础配置
| 用例 | 操作 | 预期结果 |
|------|------|----------|
| TC-001 | 创建爬虫配置，类型=电影，批次大小=10 | 配置保存成功，状态=idle |
| TC-002 | 创建爬虫配置，类型=剧集，cron=0 2 * * * | 配置保存成功，下次运行时间=明天02:00 |
| TC-003 | 编辑已有配置，修改批次大小=50 | 配置更新成功 |
| TC-004 | 删除已有配置 | 配置删除成功，关联日志保留 |

### 1.2 genreFilter 类型筛选（round 24 修复）
| 用例 | 操作 | 预期结果 |
|------|------|----------|
| TC-010 | 设置 genreFilter=["科幻","动作"]，爬取电影 | 只入库 genre 包含"科幻"或"动作"的电影 |
| TC-011 | 设置 genreFilter=["爱情"]，爬取剧集 | 只入库 genre 包含"爱情"的剧集 |
| TC-012 | 设置 genreFilter 为空 | 入库所有类型的电影 |
| TC-013 | 设置 genreFilter=["不存在的类型"] | 无内容入库，日志显示全部跳过 |

### 1.3 rateLimitMs 速率限制（round 24 修复）
| 用例 | 操作 | 预期结果 |
|------|------|----------|
| TC-020 | 设置 rateLimitMs=1000，爬取10个详情页 | 每次请求间隔≥1秒，总耗时≥10秒 |
| TC-021 | 设置 rateLimitMs=0，爬取10个详情页 | 无延迟，全速请求 |
| TC-022 | 设置 rateLimitMs=500 | 每次请求间隔≥500ms |

### 1.4 batchSize 批次大小
| 用例 | 操作 | 预期结果 |
|------|------|----------|
| TC-030 | 设置 batchSize=5，启动爬虫 | 每页最多爬取5个详情，爬取5个后停止 |
| TC-031 | 设置 batchSize=100 | 爬取100个详情后停止（或数据不足时提前停止） |

### 1.5 enabled 启用/禁用
| 用例 | 操作 | 预期结果 |
|------|------|----------|
| TC-040 | 禁用配置 | CronScheduler 不触发该配置 |
| TC-041 | 启用配置 | CronScheduler 正常触发 |

### 1.6 startCrawler / stopCrawler
| 用例 | 操作 | 预期结果 |
|------|------|----------|
| TC-050 | 启动已 idle 的爬虫 | 状态变为 running，任务日志创建 |
| TC-051 | 启动已 running 的爬虫 | 返回 false，不重复启动 |
| TC-052 | 停止正在运行的爬虫 | 状态变回 idle，下次循环停止 |

## 二、数据准确性测试

### 2.1 电影爬取
| 用例 | 验证点 | 预期结果 |
|------|--------|----------|
| TC-100 | 爬取电影详情页 | title 非空，posterUrl 有效 |
| TC-101 | 年份提取 | year 在 1900-2099 范围内 |
| TC-102 | 豆瓣评分提取 | scoreDouban 在 0.0-10.0 范围 |
| TC-103 | IMDB 评分提取 | scoreImdb 在 0.0-10.0 范围 |
| TC-104 | 类型提取 | genre 为 JSON 数组，元素为中文标签 |
| TC-105 | 地区提取 | region 为 JSON 数组 |
| TC-106 | 导演/主演/编剧提取 | 为 JSON 数组字符串 |
| TC-107 | 磁力链接提取 | magnetUrl 以 magnet: 开头 |
| TC-108 | 网盘链接提取 | diskType 为 baidu/quark/ali/uc/123/lanzou/xunlei 之一 |
| TC-109 | 重复爬取同一电影 | 更新而非新增（isNew=false） |

### 2.2 剧集爬取
| 用例 | 验证点 | 预期结果 |
|------|--------|----------|
| TC-110 | 爬取剧集详情页 | title 非空，totalEpisode 合理 |
| TC-111 | 剧集链接提取 | resource_online 有记录，episodeNumber 连续 |
| TC-112 | 集数标题格式 | episodeTitle 如"第01集" |
| TC-113 | 重复爬取 | 旧 online 记录删除后重新插入 |

### 2.3 综艺/动漫/短剧爬取
| 用例 | 验证点 | 预期结果 |
|------|--------|----------|
| TC-120 | 爬取综艺 | 与剧集结构一致，有剧集链接 |
| TC-121 | 爬取动漫 | 与剧集结构一致，有剧集链接 |
| TC-122 | 爬取短剧 | 与剧集结构一致，有剧集链接 |

## 三、断点续爬测试

| 用例 | 操作 | 预期结果 |
|------|------|----------|
| TC-200 | 爬取过程中停止 | lastCrawledPage 保存到数据库 |
| TC-201 | 重新启动爬虫 | 从 lastCrawledPage 继续，不从第1页开始 |
| TC-202 | 爬取完成 | lastCrawledPage 重置为 0 |

## 四、错误处理测试

| 用例 | 操作 | 预期结果 |
|------|------|----------|
| TC-300 | 目标站点不可达 | fetchWithRetry 重试2次后返回 null，不崩溃 |
| TC-301 | 详情页解析异常 | 捕获异常，记录日志，继续下一个 |
| TC-302 | 空标题页面 | 跳过该条目，不入库 |
| TC-303 | 无效的 cron 表达式 | shouldRunNow 返回 false，不触发 |
| TC-304 | 代理不可用 | 自动降级为直连 |

## 五、资源提取测试

| 用例 | 验证点 | 预期结果 |
|------|--------|----------|
| TC-400 | 电影详情页有磁力链接 | resource_magnet 有记录 |
| TC-401 | 电影详情页有网盘链接 | resource_cloud 有记录 |
| TC-402 | 电影详情页有在线播放 | resource_online 有记录 |
| TC-403 | 剧集详情页有在线播放 | resource_online 有记录（由 extractEpisodes 提取） |
| TC-404 | 剧集详情页无重复 online | extractMovieResources 不重复插入 |
| TC-405 | 分辨率识别 | 4K/1080P/720P/480P 正确识别 |
| TC-406 | 网盘类型识别 | baidu/quark/ali/uc/123/lanzou/xunlei 正确识别 |

## 六、CronScheduler 测试

| 用例 | 验证点 | 预期结果 |
|------|--------|----------|
| TC-500 | 5段 cron "0 2 * * *" | 正常触发（normalizeCron 补秒字段） |
| TC-501 | 6段 cron "0 0 2 * * *" | 正常触发 |
| TC-502 | 并发触发3个爬虫 | 线程池限制并发，不超过4个 |
| TC-503 | 线程池队列满 | CallerRunsPolicy 由调度线程执行 |

## 七、API 接口测试

| 用例 | 操作 | 预期结果 |
|------|------|----------|
| TC-600 | GET /api/crawler/schedules | 返回所有配置列表 |
| TC-601 | GET /api/crawler/schedule/{id} | 返回单个配置详情 |
| TC-602 | POST /api/crawler/schedule | 创建/更新配置成功 |
| TC-603 | DELETE /api/crawler/schedule/{id} | 删除配置成功 |
| TC-604 | POST /api/crawler/start/{id} | 启动爬虫成功 |
| TC-605 | POST /api/crawler/stop/{id} | 停止爬虫成功 |
| TC-606 | POST /api/crawler/toggle/{id}?enabled=true | 切换启用状态成功 |
| TC-607 | GET /api/crawler/logs | 返回最近50条日志 |
| TC-608 | GET /api/crawler/status | 返回 running/idle/total 统计 |

## 执行方式

### 手动测试
1. 通过管理端 UI 创建爬虫配置
2. 设置不同的 genreFilter / rateLimitMs / batchSize
3. 启动爬虫，观察日志和数据库
4. 验证数据准确性和完整性

### 自动化测试（后续）
- 使用 JUnit 5 + Mockito 编写单元测试
- Mock Jsoup 连接，使用本地 HTML 测试文件
- 验证各提取方法的准确性
