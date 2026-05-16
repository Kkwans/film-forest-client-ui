# MEMORY.md -- 长期记忆

> 所有永久记忆的精炼入口。日常细节在 memory/YYYY-MM-DD.md 里。

## 开发规范: Spec Coding + Harness

- **规范文档**: guides/SPEC_CODING.md
- **核心理念**: Harness = 给 AI 参照物，不凭空创造; SDD = 先定义再实现
- **SDD 文档**: proposal.md + spec.md + tasks.md（中大型需求必须）
- **执行流程**: 调研 → SDD → 按 tasks 逐个执行 → 验证 → 归档
- **心跳规则**: 定时任务 = 自动工作，不是自动汇报。绝不复读“没有进展”。
- **创建**: 2026-05-12，基于得物技术文章 + 自主搜索学习

## 当前任务: 影视森林 (film-forest) - 管理端全面优化 v2

- **状态**: 大部分完成，待后续完善
- **任务路径**: tasks/2026-05/0513_10-管理端全面优化/
- **已完成**:
  - T6: 爬虫 JSON 报错修复（normalizeGenreFilter）
  - T1: 乱码修复 + 仪表盘重构
  - T3: 组件库升级（Select/Toast/Dialog/Modal）
  - T2: 表单弹窗优化
  - T4: 内容管理优化（详情+表单扩展+刷新）
  - T5: 爬虫配置增强（genre checkbox + cron 预设）
  - T7/T8: 数据统计重构（recharts 饼图+柱状图+百分比修复）
  - T9/T10: 资源管理+系统设置保持
  - T11: CrawlerCore 提取更多字段（language/duration/releaseDate/alias/writer/scoreImdb）
  - T12: 登录校验（JWT + AuthProvider）
- **已部署**: 后端 8081 + 前端 3001
- **已推送**: GitHub (admin-ui + admin-server) + 阿里云 ACR
- **待完善**: Cron 编辑器精细化、资源管理丰富、通知告警模块
- **爬虫测试（2026-05-15）**: 全面部署测试完成，修复5个bug（genreFilter/Druid/extractEpisodeCount/resource_online/InterruptedException），所有测试用例通过

## 当前任务: 影视森林 (film-forest) - 管理端 UX 全面优化

- **状态**: 第一轮完成，已推送
- **任务路径**: tasks/2026-05/0513_16-管理端UX优化/
- **已完成**:
  - Modal 组件: 硬编码 zinc 颜色→CSS 变量，去除 overflow-hidden 裁剪
  - Select 组件: z-50→z-[10000] 解决 Modal 内下拉被裁剪，主题色统一
  - Dialog 组件: 全部硬编码颜色→CSS 变量
  - Toast 组件: 关闭按钮颜色修正
  - 爬虫页: 表单响应式+去重保存按钮+日志预加载+移动端卡片
  - 内容管理: 15 处表单 grid 响应式适配
  - 仪表盘/统计/资源: grid 响应式优化
- **commit**: 3d2ce37 (admin-ui)
- **待观察**: 实际手机端效果验证、登录页主题化（低优先级）

## 当前任务: 影视森林 (film-forest) - 全面打磨（心跳执行）

- **状态**: 进行中（每30分钟自动执行）
- **任务路径**: tasks/2026-05/0514_02-影视森林全面打磨/
- **启动时间**: 2026-05-14
- **范围**: 管理端前后端 + 用户端前后端（4个子系统）
- **执行方式**: heartbeat 定时任务，每30分钟排查一个小模块
- **排查维度**: 布局、样式、交互、表单、错误处理、性能、安全、代码质量
- **原则**: 不追求速度，追求完美。发现问题立即修复，修复后立即部署
- **进展**: 见 tasks/2026-05/0514_02-影视森林全面打磨/LOG.md
- **已完成**: 登录页主题化 + Dashboard审查 + Layout组件审查 + AdminHeader修复

## 当前任务: 影视森林 (film-forest)

- **任务路径**: tasks/2026-04/0425_10-影视森林开发/
- **工程路径**: projects/film-forest/
- **定位**: 影视资源聚合网站（类似七味网 pkmp4.xyz，但更好用）
- **两个端**:
  - **用户端**: 面向普通用户的影视资源浏览/搜索/下载网站
  - **管理端**: 管理平台，用于内容管理、爬虫管理、数据维护
- **技术栈**: SpringBoot3 + MySQL8 + 前端（用户端潮流 UI + 管理端待定）
- **数据库**: film_forest 库，15 张表（v3，2026-05-12 迁移）
  - 5 主表: movie / drama / variety / anime / short_drama
  - 3 资源表: resource_online（含剧集信息）/ resource_magnet / resource_cloud
  - 3 用户表: user / user_movie_list / user_movie_list_item
  - 2 系统表: system_setting / resource_source
  - 2 爬虫表: crawler_schedule / crawler_task_log
  - 1 字典表: content_type（仅参考）
  - 1 备份表: episode_backup（原 episode 表数据）
- **关键文档**:
  - 任务规划: tasks/2026-04/0425_10-影视森林开发/PLAN.md
  - 七味网调研: tasks/2026-04/0425_10-影视森林开发/EXPLORE.md
  - 数据库设计: projects/film-forest/doc/database-design.md
  - 建表 SQL: projects/film-forest/database/init.sql（v3）
  - 迁移脚本: projects/film-forest/database/migration-v2.sql
- **当前状态**: 已部署运行
  - 后端: `/volume1/docker/film-forest/backend/film-forest.jar` → 8080
  - 前端: `/volume1/docker/film-forest/frontend/` → 3000（node server.js）
  - MySQL: docker mysql8 运行中（3306）
- **后端**: SpringBoot3 + MyBatis-Plus3，12 张表实体/Mapper/Service/Controller 全部完成
  - 用户系统: 注册登录/JWT认证/片单CRUD/收藏操作（2026-05-08 新增）
- **关键文件**: 
  - pom.xml: projects/film-forest/backend/pom.xml
  - 主类: com.filmforest.FilmForestApplication
  - 配置: src/main/resources/application.yml
  - Docker: backend/Dockerfile + deploy/docker-compose.yml
- **部署架构**:
  - **NAS 部署目录**: `/volume1/docker/film-forest/`（Docker volume 路径，**绝对不能放 /home/Kkwans/ 用户个人目录**）
  - **项目源码**: `/root/.openclaw/workspace/projects/film-forest/`
  - **GitHub**: Kkwans/film-forest-server（后端）、Kkwans/film-forest-client（前端）
- **前端**: next build + standalone 模式，NAS 上 node server.js 直接运行（NAS 有 node 18 无 npm）
- **用户端 UI 重构**: 已完成并部署（2026-05-06 更新）
  - 已完成: 首页/电影列表/电影详情/搜索结果 + 电视剧/综艺/动漫/短剧列表+详情 + 分类页
  - 筛选功能: encodeURIComponent 修复中文参数编码 bug
  - 20个用户端问题全部修复（详见 ISSUES-USER-20260506.md）
  - 修复项: 分页/筛选/详情页/genre解析/地区显示/磁力去重/复制按钮/加载动画/Tab即时反馈等
  - **2026-05-10 全面优化 + 用户端最终完善**: 9项需求全部完成并部署
- **2026-05-10 用户端最终完善**: 9项需求全部完成
  - 排序修复：搜索页+片单列表页排序改为API调用
  - 片单排序项：看过片单独有"我的评分"选项
  - 片单布局：类型筛选移到标题行右上角
  - 片单卡片：备注下挂（豆瓣风格）、评分等级颜色、编辑删除按钮与标题同行
  - 互斥逻辑：想看↔在看↔看过互斥（前后端双重保障）
  - 收藏回显：MovieCard+搜索页+列表页显示状态图标（看过>在看>想看>自定义）
  - WatchedModal：10级星星评分+渐变滑块+评分标签
  - 详情页：新增编剧/又名/语言/上映/更新时间，状态感知按钮
  - Toast组件：全局提示系统
  - 后端：新增score_rt字段、批量状态查询API、排序参数支持
- **管理端**: 全部功能已部署（2026-05-06 更新）
  - 爬虫管理: 启动/停止/编辑/删除/配置弹窗（类型/优先级/定时/批量/间隔/类型筛选）
  - 资源管理: 可编辑来源列表 + 启用禁用开关 + 七味网 URL 已修正
  - 浅色模式: CSS 变量 + hardcoded colors 清理
  - 主题跟随: matchMedia 单一监听器 + 默认深色

## 暂停项目: 开发面试大师 (interview-master)

- **状态**: 暂停，移交给 Hermes Agent（真维斯）
- **任务路径**: tasks/2026-04/0422_14-面试大师开发/PLAN.md
- **注意**: GitHub 仓库 https://github.com/Kkwans/interview-master 是旧的废弃项目，主人计划归档或删除，**不要基于此仓库开发**
- **后续**: 等影视森林完成后，再评估是否由贾维斯接手

## NAS 环境

- **设备**: 绿联 DH4300Plus（ARM64）
- **网络**: 内网 192.168.5.110 / Tailscale 100.106.29.60
- **Docker**: 26.1.0 / Compose 1.29.2 / JDK 17 / Maven 3.8.7
- **MySQL**: mysql8 容器，3306 端口，root/Root2026
  - 所有项目共用此 MySQL 实例，不同项目用不同 database
- **mariadbd**: 已停用
- **Tailscale**: 部署在 NAS 本机
- **部署原则**: 所有 Docker 服务统一用 docker-compose 管理，目录在 `/volume1/Docker/`
- **Docker Compose 项目**:
  - `/volume1/Docker/Tailscale/` → Tailscale（host 网络，always 重启）
  - `/volume1/Docker/MySQL/` → MySQL 8（3306 端口，数据在 ./data）
  - `/volume1/Docker/Film-Forest/` → 影视森林（4 服务统一管理）
- **镜像精简（2026-05-08）**: 从 15 个精简到 6 个，全部在使用中
  - JDK: amazoncorretto:17-alpine（ARM64 优化，替代 openjdk:17-slim）
  - Node: node:20-alpine（LTS，替代 node:18-alpine）
- **Docker 规范**: guides/DOCKER_RULES.md
- **UGOS Docker 面板**: compose 项目需注册到 SQLite 数据库才能在面板显示（见 DOCKER_RULES.md 4.6）

## Agent 分工

- **J.A.R.V.I.S.（贾维斯）**: 主人的私人 AI 助理，当前专注影视森林开发
- **Hermes（真维斯）**: 另一个 Agent（自进化Agent，在另一个独立docker容器部署），负责面试大师项目

## Skills 安装记录 (2026-04-22)

通过 clawhub CLI 安装，详见 skills/ 目录。
注意：docx / pdf / xlsx 已移除（主人不需要办公文档处理类 Skill）。

## 飞书复读机 bug（根因+修复 2026-05-13）
- **根因**: session 配置为空，会话永不重置，上下文无限膨胀导致 mimo 模型退化
- **修复**: 添加 session.reset 配置（direct 会话空闲 6h 自动重置，每天 4 点全局重置）
- **教训**: 重要工作必须写文件，不能依赖会话记忆；遇到复读机立刻 /new

## 重要教训

- APK 编译: ARM64 容器无法运行 x86_64 build-tools，用 GitHub Actions 解决
- Expo 配置曾破坏 bare RN 项目，04-18 成功构建(fce56d1c)才是正确基准
- 收到任务必须立即执行，不能只回"收到"无下文
- 每次对话有新信息必须实时更新记忆，不得以"稍后更新"推迟
- NAS 文件浏览器需要 UTF-8 BOM 才能正确显示中文（仅 .md 文件）
- 不要用自己运行环境（大象）推断用户环境（QQ Bot）
- 用户要求"完美"就是逐字节审查级别
- 不要自作主张加用户不需要的 Skill（如 docx/pdf/xlsx），要了解用户身份再选
- **底线**: 部署目录必须是 `/volume1/docker/<项目名>/`，绝对不能放 `/home/Kkwans/` 用户个人目录。触碰即死。
- **底线**: 每30分钟 heartbeat 汇报只记该窗口内做的事，不把之前的工作算进来。如实汇报，有事说事，无事说无事。
- **底线**: 重要教训和规范必须同时写入 MEMORY.md + 对应规范文件（AGENTS.md / guides/），不能只写当日记忆。当日记忆容易丢失，长期记忆和规范才是永久的。
- **教训**: 不要凭猜测下结论，先调研再回答。主人说"通过可视化界面操作"就是面板UI创建，不要脑补成CLI。
- **教训**: 构建顺序红线——必须先改代码再构建，构建后必须验证新代码在产物中（grep检查关键字符串）。
- **教训**: NAS 容器挂载路径大小写敏感（Film-Forest 大写 D/F），部署时必须确认正确的源路径。
- **教训**: 部署前端必须用 `/volume1/Docker/Film-Forest/frontend`（大写D大写F），不是 `/volume1/docker/film-forest/frontend`（小写）。已犯3次，必须杜绝。
- **部署检查清单**: ①确认目标路径大小写 ②上传后验证BUILD_ID ③重启容器 ④curl验证页面加载新代码
- **教训**: 规范流程（Git提交/推送/文档更新/记忆更新）应自动执行，不应等主人催。每次代码改动完成后立即执行全套流程。
- **教训**: 部署验证不能只看“代码已推送到 GitHub”，必须确认 NAS 上运行的 JAR 是最新版本。爬虫 genreFilter bug 因旧 JAR 未更新而长期未被发现。
- **教训**: 定时任务汇报应该包含实际部署验证结果，不能只汇报单元测试。主人关心的是功能是否真正工作，而不是代码是否写好。
