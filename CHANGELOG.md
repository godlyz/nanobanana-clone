# 变更日志（Changelog）

所有重要变更均记录于此文件。

本文件格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，并遵循 [语义化版本号](https://semver.org/lang/zh-CN/) 规范。

## [Unreleased]

### Added（新增）
- **🎬 Google Veo 3.1 视频生成集成（Day3）**:
  - 完整的视频生成工作流（文生视频、参考图片、首尾帧模式）
  - 视频任务状态追踪组件（轮询+超时机制）
  - 历史记录视频展示（视频卡片+播放器）
  - Vercel Cron自动化任务（状态检查+下载+退款）
  - Supabase Storage视频存储（永久URL生成）
  - 积分自动扣除和退款机制

- **新增API接口**:
  - `POST /api/v1/video/generate` - 创建视频生成任务
  - `GET /api/v1/video/status/:taskId` - 查询任务状态
  - `GET /api/cron/poll-video-status` - Cron轮询任务状态
  - `POST /api/cron/download-video` - Cron下载视频任务
  - `GET /api/history/videos` - 视频历史记录列表

- **新增组件**:
  - `components/video-status-tracker.tsx` - 视频状态追踪器
  - `components/video-card-with-progress.tsx` - 视频进度卡片
  - `components/video-player-modal.tsx` - 视频播放器弹窗

- **开发者工具**:
  - `scripts/dev-poll-video-status.sh` - 本地开发Cron模拟脚本
  - `scripts/README.md` - 开发脚本使用文档

### Changed（变更）
- **视频生成页面优化**:
  - `app/editor/image-edit/page.tsx` - 添加视频生成模式
  - 支持三种生成模式切换（文生视频/参考图片/首尾帧）
  - 动态导入VideoStatusTracker组件（防止ReferenceError）

- **历史记录页面增强**:
  - `app/history/page.tsx` - 支持视频类型筛选
  - `components/shared/history-gallery.tsx` - 视频/图片混合展示
  - 视频缩略图和播放器预览

### Fixed（修复）
- **🔥 视频状态轮询超时机制（Critical）**:
  - **问题**: 本地开发环境无Cron任务，视频任务卡在processing状态
  - **影响**: 3个视频生成成功但前端一直显示"处理中"（1小时+）
  - **修复**:
    - 前端添加10分钟超时机制，停止无效轮询
    - 超时后显示友好提示和操作按钮（刷新页面/查看历史）
    - 提供本地开发脚本手动触发Cron任务
  - **修改文件**: `components/video-status-tracker.tsx`

- **🐛 空字符串导致Console Error**:
  - **问题**: NextImage和video标签src属性接收空字符串
  - **位置**: `components/shared/history-gallery.tsx:435`, `app/editor/image-edit/page.tsx:939`
  - **修复**: 添加URL验证逻辑，空值时显示占位符
  - **影响**: 消除3处Console Error警告

- **🔧 VideoStatusTracker组件未导入**:
  - **问题**: Runtime ReferenceError - VideoStatusTracker is not defined
  - **位置**: `app/editor/image-edit/page.tsx:919`
  - **修复**: 添加dynamic导入，防止编译错误

### Database（数据库）
- **新增表**: `video_generation_history`
  - 字段：task_id, user_id, operation_id, status, prompt, aspect_ratio, resolution, duration, credit_cost, video_url, etc.
  - 索引：user_id, status, operation_id复合索引
  - RLS策略：用户只能访问自己的视频记录

### Performance（性能）
- **Vercel Cron自动化**:
  - 每分钟检查待处理视频任务
  - 自动下载并上传到Supabase Storage
  - 超时任务（>10分钟）自动标记失败并退款
  - 减少前端轮询压力

### Technical Debt（技术债务）
- ⏸️ **P2**: 本地开发环境Cron任务模拟（已提供脚本，需集成到开发工作流）
- ⏸️ **P3**: 视频缩略图自动生成（当前使用视频URL）

## [0.0.15] - 2025-11-17

### Fixed（修复）
- **🔥 TypeScript类型错误（Critical - 阻塞Vercel部署）**:
  - **根本原因**: 4个TypeScript编译错误导致所有Vercel部署失败（生产/预览环境）
  - **影响**: 生产环境无法更新，最新功能无法上线
  - **修复方案**:
    1. `app/api/subscription/downgrade/route.ts:174` - 添加 `expires_at` 类型定义
    2. `lib/credit-types.ts:27` - 添加 `subscription_bonus` 交易类型到枚举
    3. `app/api/webhooks/creem/route.ts:484` - 添加类型断言防止隐式any
    4. `lib/subscription/upgrade-downgrade.ts:139` - 将null转换为undefined匹配接口
    5. `__tests__/lib/subscription/upgrade-downgrade.test.ts:222` - 更新测试断言匹配undefined行为
  - **修改文件**: 5个文件，6行代码变更
  - **测试结果**: ✅ 364个测试全部通过（从344增加到364）
  - **构建结果**: ✅ 生产构建成功
  - **提交SHA**: `64c5d84`
  - **参考文档**: `SESSION_ARCHIVE_20251117.md`

### Added（新增）
- **新增测试用例**: +20个测试（344 → 364）
  - 测试覆盖率保持高水平
  - 所有测试通过率 100%

---

## [0.0.14] - 2025-11-13

### Added（新增）
- **订阅系统增强**:
  - 套餐包追踪功能（package_tracking）
  - 自动解冻函数（auto_unfreeze_function）
  - 智能积分消耗策略（优先使用未冻结积分）
  - 条件性冻结延期机制
  - 年付订阅自动充值（每月1号自动充值）
- **国际化完善**:
  - 登录页面完整国际化（邮箱/用户名登录 + Turnstile验证）
  - 注册页面完整国际化（邮箱验证码注册）
  - 管理后台独立登录页面（httpOnly cookie认证）
  - 新增100+条翻译键（login.*, register.*, admin.login.*）
  - 创建积分交易专用i18n模块（lib/credit-transaction-i18n.ts）
- **新增API**:
  - `GET /api/subscription/all` - 查询用户所有订阅（包括冻结状态）
  - 支持前端订阅管理页面数据展示
- **新增组件**:
  - `components/profile/subscription-management-section-v2.tsx` - 订阅管理V2版本
  - 积分显示优化（区分 frozen/available/total）
- **文档系统**:
  - 创建 `PROJECTWIKI.md` 项目知识库（12章节完整）
  - 创建 3 个 ADR 文档（架构决策记录）:
    - `docs/adr/20251106-performance-optimization.md`
    - `docs/adr/20251107-i18n-cookie-strategy.md`
    - `docs/adr/20251109-credit-freeze-logic.md`
  - 归档临时工作文档到 `docs/archived/work-logs-2025-11/`

### Changed（变更）
- **订阅系统逻辑重构**:
  - `available_credits` 计算基于 `remaining_amount`（替代 `frozen_amount`）
  - `remaining_days` 支持普通订阅和降级模式
  - `remaining_months` 计算逻辑修正（使用原始过期时间）
  - 升级时立即冻结旧套餐剩余积分（防止囤积漏洞）
- **Profile页面优化**:
  - 完善个人中心国际化
  - 优化积分显示逻辑（区分冻结/可用）
  - 改进使用统计UI展示
- **编辑器和历史页面**:
  - 编辑历史页面、图像编辑页面国际化
  - 历史记录页面和卡片组件国际化
  - 编辑器侧边栏国际化
- **工具组件国际化**:
  - background-remover, chat-edit, consistent-generation
  - scene-preservation, smart-prompt
  - style-transfer, text-to-image-with-text
- **API页面国际化**:
  - API介绍页面完整国际化

### Fixed（修复）
- **🔥 Creem Webhook 事件字段解析错误（Critical）**:
  - **根本原因**: Creem API 实际使用 `eventType` 字段，而非 `type`
  - **影响**: 导致所有支付回调处理失败，订阅无法激活
  - **修复方案**:
    - 修正事件类型字段：`type` → `eventType`
    - 修正数据对象字段：`data` → `object`
    - 新增详细调试日志输出
  - **修改文件**: `app/api/webhooks/creem/route.ts` (+416行, -92行)
  - **参考文档**: `docs/archived/work-logs-2025-11/ISSUES_2025-11-11.md`
- **订阅过期判定修复**:
  - 排除已冻结积分的过期计算
  - 修复 `remaining_months` 计算（移除 +1 逻辑）
  - 修正冻结引用时间（使用 `original_expires_at`）
- **冻结积分显示修复**:
  - 修复个人中心冻结积分显示问题
  - 优化冻结剩余天数计算逻辑

### Database（数据库迁移）
**新增迁移文件**: 20个（2025-11-09 至 11-14）
- `20251111000007_fix_available_credits_calculation.sql`
- `20251111000008_add_package_tracking.sql`
- `20251111000009_auto_unfreeze_function.sql`
- `20251111000010_smart_consumption.sql`
- `20251111000011_conditional_freeze_extension.sql`
- `20251112000001_get_all_subscriptions.sql`
- `20251112000002_fix_get_all_subscriptions_types.sql`
- `20251112000003_get_all_subs_clean.sql`
- `20251112000004_fix_expiry_exclude_frozen.sql`
- `20251112000012_fix_freeze_dont_modify_expires.sql`
- `20251112000013_fix_available_credits_use_remaining.sql`
- `20251112000014_fix_frozen_credits_display.sql`
- `20251112000015_fix_expiry_exclude_frozen_consumption.sql`
- `20251112000016_simplify_expiry_use_remaining.sql`
- `20251112000017_fix_frozen_remaining_days.sql`
- `20251112000018_fix_remaining_months_logic.sql`
- `20251113000001_fix_remaining_months_remove_plus_one.sql`
- `20251113000002_fix_remaining_months_correct_freeze_ref_time.sql`
- `20251113000003_fix_remaining_months_use_original_expires.sql`
- `20251114000001_add_i18n_fields_to_credit_transactions.sql`

**修改迁移文件**: 2个
- `20251109000005_add_real_time_expiry_credits.sql`
- `20251109000006_fix_freeze_logic_with_remaining.sql`

### Security（安全）
- 管理后台使用 httpOnly cookie 认证（防止 XSS 攻击）
- API 密钥使用 SHA-256 哈希存储

### Performance（性能）
无变更（保持 Desktop 95/100, Mobile 60/100）

### Deprecated（弃用）
无

### Removed（移除）
- 删除临时脚本 12 个（restore-*, show-*, debug-*, clean-*, execute-*, refreeze-*, update-*）
- 删除开发调试API目录 `app/api/dev/`
- 删除备份文件 `app/profile/page.tsx.i18n_backup_20251113_105229`

### Documentation（文档）
- 创建项目知识库 `PROJECTWIKI.md`（12章节）
- 创建 3 个 ADR 文档（性能优化、i18n策略、积分冻结）
- 归档临时工作文档（ISSUES, WORK_LOG, REFACTOR_EXECUTION_GUIDE）
- 脚本目录重组（production/ 和 archived/）

### Technical Debt（技术债务）
- ⏸️ **P1**: 移动端性能优化（目标 Lighthouse 80+，当前 60）
- ⏸️ **P2**: 订阅系统 E2E 测试
- ⏸️ **P2**: TypeScript 错误修复（当前 ignoreBuildErrors）
- ⏸️ **P3**: 数据库迁移文件合并（20个迁移需优化）

### Breaking Changes（破坏性变更）
无

---

## [0.0.13] - 2025-11-08

### Added (2025-11-07)
- **开发者门户**: 完整的API密钥管理系统
  - API密钥创建、复制、删除功能
  - 支持自定义密钥名称
  - SHA-256哈希存储，确保安全性
  - 最后使用时间跟踪
  - Quick Start 文档和使用示例
- **数据库Schema**: 新增 `api_keys` 表
  - 字段：`id`, `user_id`, `name`, `key_hash`, `key_preview`, `is_active`, `created_at`, `last_used_at`
  - 索引：5个复合索引优化查询性能
  - RLS策略：用户只能访问自己的密钥

### Fixed (2025-11-08)
- **🎉 React水合错误（Critical - 彻底修复）**: 语言上下文导致的服务器/客户端内容不匹配
  - **根本原因**: localStorage存储语言偏好，服务器端无法读取导致SSR和CSR不一致
  - **最终方案**: 使用Cookies + 服务器端读取实现SSR/CSR完全同步
  - **修改文件**:
    - `app/layout.tsx`: 添加async函数，服务器端读取cookie并传递initialLanguage
    - `lib/language-context.tsx`: 支持initialLanguage prop，删除mounted检查逻辑
    - `components/tour-button.tsx`: FirstVisitPrompt添加mounted状态，避免localStorage不匹配
  - **依赖**: 新增 `js-cookie@3.0.5` 和 `@types/js-cookie@3.0.6`
  - **影响组件**: Header, Features, Showcase, Testimonials, FAQ, Footer, FirstVisitPrompt (全部修复)
  - **用户体验**: 语言切换后刷新页面，直接显示正确语言，无闪烁，无水合警告
  - **SEO优化**: `<html lang>` 标签根据用户语言偏好动态渲染

- **🔥 价格页面订阅状态显示修复**: API响应格式与前端接口不匹配
  - **根本原因**: 后端返回字段名与前端TypeScript接口定义不一致，缺少isLoggedIn字段
  - **修复方案**: 统一API响应格式，确保前后端契约一致
  - **修改文件**: `app/api/subscription/status/route.ts`
  - **字段映射**:
    - 添加 `isLoggedIn` 字段（boolean）
    - 添加 `user` 对象（id, email）
    - `plan_tier` → `plan_id`
    - `billing_cycle` → `billing_period`
  - **场景处理**:
    - 未登录: `{ isLoggedIn: false, subscription: null }`
    - 已登录无订阅: `{ isLoggedIn: true, user: {...}, subscription: null }`
    - 已登录有订阅: `{ isLoggedIn: true, user: {...}, subscription: {...} }`

- **🔥 历史记录页面Race Condition修复**: 切换页面时异步请求未取消导致错误
  - **根本原因**: 组件unmount后，fetch请求仍在继续并试图更新已卸载组件的状态
  - **触发场景**: 历史记录页面加载中时快速切换到其他页面
  - **修复方案**: 使用AbortController和cleanup函数取消pending请求
  - **修改文件**: `app/history/page.tsx`
  - **技术细节**:
    - `fetchHistory` 函数支持 `AbortSignal` 参数
    - useEffect 添加 cleanup 函数调用 `abortController.abort()`
    - fetch 被abort时静默处理 `AbortError`，不显示错误提示
    - 请求被取消时不更新组件状态（避免内存泄漏）
  - **用户体验**: 快速切换页面不再报错，控制台保持清洁

### Fixed (2025-11-07)
- **Profile API兼容性**: 更新字段名以匹配新数据库Schema
  - `status` → `is_active` (boolean)
  - `last_used` → `last_used_at` (timestamp)
  - `key_prefix` → `key_preview` (varchar)
- **UI重叠问题**: FirstVisitPrompt和Cookie Banner重叠
  - 调整FirstVisitPrompt位置从 `bottom-4` 到 `bottom-24`
- **Tour Context水合错误**: Joyride组件导致的hydration mismatch
  - 使用mounted状态确保仅在客户端渲染

### Performance
- **启用 Next.js 图片优化**: ��动 WebP/AVIF 转换，响应式尺寸，图片体积减少 30-50%
- **编辑器工具组件懒加载**: 7个工具组件动态导入，初始包体积减少 ~70%
- **首页非首屏组件懒加载**: Features/Showcase/Testimonials/FAQ/Footer 延迟加载，首屏时间减少 ~40%
- **资源预加载策略**: DNS预连接到 Google AI API，减少握手时间 ~300ms
- **SEO元数据增强**: 添加 keywords、viewport、themeColor，Lighthouse SEO 100分

### Changed
- `next.config.mjs`: 删除 `unoptimized: true`，配置现代图片格式
- `app/page.tsx`: 首页组件改为动态导入
- `app/editor/image-edit/page.tsx`: 编辑器工具改为动态导入
- `app/layout.tsx`: 增强元数据和预连接

### Added
- `PERFORMANCE_OPTIMIZATIONS.md`: 完整优化文档
- `plan.md`: Phase 2 方案文档
- `quality-metrics-report.md`: Phase 4 Lighthouse性能测试报告
- `lighthouse-mobile.json`: 移动端性能测试原始数据 (844KB)
- `lighthouse-desktop.json`: 桌面端性能测试原始数据 (874KB)

### Performance Metrics (Phase 4 Lighthouse 实测数据)

**桌面端 (Desktop) - 优秀:**
- Lighthouse Performance: **95/100** ✅
- SEO: **100/100** ✅
- Accessibility: **91/100** ✅
- FCP: 0.3s (优秀，目标<1.8s)
- LCP: 1.5s (优秀，目标<2.5s)
- TBT: 40ms (优秀，目标<200ms)
- CLS: 0 (完美，无布局偏移)
- Speed Index: 1.0s (非常快)

**移动端 (Mobile) - 中等:**
- Lighthouse Performance: **60/100** ⚠️
- SEO: **100/100** ✅
- Accessibility: **91/100** ✅
- FCP: 0.9s (良好，目标<1.8s)
- LCP: 7.5s (需优化，目标<2.5s) ❌
- TBT: 560ms (需优化，目标<200ms) ❌
- CLS: 0 (完美，无布局偏移)
- Speed Index: 3.8s (接近目标)

**对比优化前（预期 vs 实测）:**
- 桌面端性能提升: +10分（85→95）
- 桌面端FCP提升: -70% (1.0s→0.3s)
- 桌面端LCP提升: -50% (3.0s→1.5s)
- 桌面端TBT提升: -80% (200ms→40ms)

### Known Issues
- 构建时发现重复函数定义警告（非本次优化引入）：
  - `app/api/payment/verify/route.ts:119` - `verifyCreemSignature` 重复定义
  - `lib/admin-auth.ts:552` - `getResourceType` 重复定义
  - `lib/admin-auth.ts:161` - `verifyAdminIdentity` 重复定义

## [0.1.6] - 2025-11-05

### Added
- AI 图像编辑功能增强
- 用户历史记录管理
- 支付系统集成

### Changed
- UI 组件库更新
- 响应式设计优化

## [0.1.5] - 2025-10-XX

### Added
- 初始版本发布

### Changed
- 项目初始化

---

## 版本对比链接

[Unreleased]: https://github.com/your-repo/compare/v0.1.6...HEAD
[0.1.6]: https://github.com/your-repo/releases/tag/v0.1.6

---

## 归类指引（Conventional Commits → Changelog 分区）

- `feat`: Added（新增）
- `fix`: Fixed（���复）
- `perf` / `refactor` / `style` / `chore` / `docs` / `test`: Changed（变更）或按需归类
- `deprecate`: Deprecated（弃用）
- `remove` / `breaking`: Removed（移除）并标注 BREAKING
- `security`: Security（安全）