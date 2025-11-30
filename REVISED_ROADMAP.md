# Nano Banana 修订路线图 (Revised Roadmap)

**版本**: 2.0
**修订日期**: 2025-11-14
**基于**: 实际完成度19% + Phase 2可行性评估
**状态**: ⚠️ 替代原PROJECTROADMAP.md中Week 8-15计划

---

## 📋 修订背景

**原计划问题**:
- Phase 1 Legal Compliance完全未做（GDPR、隐私政策、ToS）
- Phase 2 AI Features完全未开始（Inpainting、Video Generation）
- 实际方向偏离：投入在订阅系统基础设施建设

**实际已完成**（未在原计划中）:
- ✅ 支付系统（Creem集成）
- ✅ 订阅系统（积分冻结逻辑 + 20个迁移）
- ✅ 认证系统（GitHub/Google OAuth）
- ✅ 国际化（Cookie持久化 + 100+翻译键）
- ✅ 性能优化（桌面95/100）
- ✅ PROJECTWIKI.md + 3个ADR文档

**修订原则**:
1. 承认现状：订阅系统基础设施已完成
2. 补齐缺口：优先Legal Compliance（合规风险高）
3. 聚焦核心：Inpainting优先于Video Generation
4. 务实时间：基于实际工时预估，不盲目追求Week进度

---

## 🎯 修订后的Phase 1-2混合路线

### 阶段1: Legal Compliance补齐 (2周)

**目标**: 补齐GDPR合规缺口，降低法律风险

**Week 1-2 任务清单**:
```
[ ] 隐私政策页面（/privacy）
    - 数据收集说明
    - 使用目的声明
    - 第三方服务披露（Supabase、Creem、Google AI）
    - 用户权利说明（访问、删除、导出）

[ ] 服务条款页面（/terms）
    - 使用限制
    - 订阅条款
    - 退款政策
    - 知识产权声明

[ ] Cookie同意横幅
    - 必需Cookie vs 分析Cookie
    - 用户偏好存储
    - GDPR合规检查

[ ] GDPR数据导出功能
    - API: GET /api/user/export
    - 导出格式: JSON + CSV
    - 响应时间: <5分钟

[ ] GDPR数据删除功能
    - API: DELETE /api/user/delete-account
    - 软删除机制（30天后永久删除）
    - 关联数据清理（images, subscriptions, credits）

[ ] 法律文档审查
    - 提交法律顾问审查
    - 修订并发布

[ ] 国际化支持
    - 隐私政策/ToS 中英双语
    - Cookie横幅翻译
```

**验收标准**:
- ✅ 隐私政策/ToS通过法律审查
- ✅ GDPR功能测试通过（导出<5分钟，删除30天完成）
- ✅ Cookie横幅在EU/US地区正确展示
- ✅ Legal页面SEO得分≥90
- ✅ 中英双语翻译准确率100%

**预估工时**: 10天
**依赖**: 法律顾问审查（外部）
**风险**: 法律审查可能延期1周

---

### 阶段2: Core AI功能 - Inpainting/Outpainting (2周)

**目标**: 实现核心AI图像编辑功能

**Week 3-4 任务清单**:
```
[ ] Inpainting核心功能
    - Google Gemini API集成（图像编辑模式）
    - 遮罩绘制工具（Canvas + React）
    - 前端UI: /tools/inpainting
    - 积分扣除逻辑对接（10积分/次）
    - 实时预览（3秒内）

[ ] Outpainting功能
    - 方向控制（上下左右4个方向）
    - 智能边缘融合
    - 前端UI: /tools/outpainting
    - 批量处理支持（队列机制）

[ ] 遮罩工具增强
    - 5种笔刷大小
    - 撤销/重做（Undo/Redo）
    - 精度控制（缩放）
    - 对象自动检测（可选 - 使用Gemini识别）

[ ] 测试与优化
    - E2E测试（Playwright）
    - 性能优化（图像压缩）
    - 错误处理（API失败重试）
    - 用户体验优化（loading状态）
```

**技术栈**:
- **AI**: Google Gemini 1.5 Pro
- **前端**: React + Canvas API
- **状态管理**: React Query（图像缓存）
- **图像处理**: Sharp.js（服务端压缩）

**验收标准**:
- ✅ Inpainting准确率≥90%（用户满意度调查）
- ✅ Outpainting边缘融合无明显接缝
- ✅ 处理时间<10秒（1920×1080图像）
- ✅ 遮罩工具支持5种笔刷 + Undo/Redo
- ✅ 批量处理≥10张图像排队
- ✅ API文档更新（包含示例代码）

**预估工时**: 10天
**依赖**: Google Gemini API额度充足
**风险**: Gemini API响应慢可能影响用户体验

---

### 阶段3: Onboarding + API文档完善 (2周)

**目标**: 提升新用户体验和开发者体验

**Week 5-6 任务清单**:
```
[ ] 交互式引导流程
    - 首次登录引导（Joyride或自定义）
    - 功能介绍（Inpainting、背景移除、风格迁移）
    - 完成奖励（5积分）

[ ] API文档完善
    - Swagger/OpenAPI规范
    - 代码示例（JavaScript、Python、cURL）
    - API Playground（可直接测试）
    - 速率限制说明（100/分钟免费，1000/分钟付费）

[ ] 工具页面（SEO优化）
    - /tools/background-remover（背景移除）
    - /tools/inpainting（图像修复）
    - /tools/outpainting（智能扩展）
    - /tools/style-transfer（风格迁移）
    - /tools/character-consistency（角色一致性）
    - /tools/scene-preservation（场景保留）
    - /tools/text-to-image-with-text（文字图像生成）

[ ] SEO优化
    - 每个工具页面独立meta title/description
    - 结构化数据（Schema.org）
    - 内部链接优化（相关工具推荐）
```

**验收标准**:
- ✅ 引导流程完成率≥80%
- ✅ API文档覆盖率100%（所有公开端点）
- ✅ 代码示例可直接运行
- ✅ 7个工具页面LCP<2秒
- ✅ 工具页面SEO得分≥90
- ✅ Google Search Console收录≥7个页面

**预估工时**: 10天
**依赖**: 无
**风险**: SEO效果需要1-2个月才能验证

---

### 阶段4 (可选): Video Generation (3周)

**目标**: 实现文本生成视频功能（可选）

**条件**: 仅在以下条件满足时执行
- ✅ Legal Compliance完成
- ✅ Inpainting/Outpainting完成并验证
- ✅ 预算允许（$50/月基础设施成本）
- ✅ Google Veo 3.1 API访问权限获批

**Week 7-9 任务清单** (如执行):
```
[ ] Google Veo 3.1 API集成
    - 申请API访问权限
    - API测试（生成测试视频）
    - 错误处理（失败重试）

[ ] 异步任务队列
    - Bull/BullMQ配置
    - Redis托管（Upstash或Redis Cloud）
    - 任务状态管理（pending/processing/completed/failed）

[ ] 前端UI
    - /tools/video-generation
    - 实时进度显示（状态轮询）
    - 视频预览播放器（HTML5 Video）
    - 下载功能

[ ] 视频存储方案
    - Supabase Storage（免费1GB）或
    - Cloudflare R2（$0.015/GB/月）或
    - AWS S3（$0.023/GB/月）

[ ] 积分系统对接
    - 10积分/秒扣费
    - 时长选择（4s/6s/8s）
    - 分辨率选择（720p/1080p）

[ ] 测试与优化
    - E2E测试（完整视频生成流程）
    - 性能优化（并发任务限制）
    - 成本监控（防止滥用）
```

**预估工时**: 15天
**预估成本**: $30-50/月（Redis + 视频存储）
**风险**: Google Veo API定价未知，可能超预算

**建议**: ⏸️ **暂缓执行**，优先完成Inpainting/Outpainting后再评估

---

## 📅 修订后时间线

| 周数 | 阶段 | 核心任务 | 预估工时 | 状态 |
|------|------|---------|---------|------|
| Week 1-2 | Legal Compliance | 隐私政策/ToS/GDPR/Cookie横幅 | 10天 | ⏳ 待开始 |
| Week 3-4 | Inpainting/Outpainting | AI图像编辑核心功能 | 10天 | ⏳ 待开始 |
| Week 5-6 | Onboarding/API文档 | 用户引导+开发者体验 | 10天 | ⏳ 待开始 |
| Week 7-9 | Video Generation (可选) | 文本生成视频 | 15天 | ⏸️ 可选 |

**总预估时间**:
- 核心路线（Legal + Inpainting + Onboarding）: **6周**
- 完整路线（含Video Generation）: **9周**

---

## 🎯 里程碑定义

### Milestone 1: Legal Compliance完成 (2周后)
**验收标准**:
- ✅ 隐私政策/ToS通过法律审查
- ✅ GDPR功能测试通过
- ✅ Cookie横幅上线
- ✅ 可对外公开接受EU用户注册

**输出物**:
- `/privacy` 页面
- `/terms` 页面
- GDPR数据导出API
- GDPR数据删除API

---

### Milestone 2: Core AI功能上线 (4周后)
**验收标准**:
- ✅ Inpainting准确率≥90%
- ✅ Outpainting边缘融合质量合格
- ✅ 用户可正常使用并扣除积分
- ✅ API文档更新

**输出物**:
- `/tools/inpainting` 页面
- `/tools/outpainting` 页面
- 遮罩绘制工具
- E2E测试套件

---

### Milestone 3: 用户体验提升 (6周后)
**验收标准**:
- ✅ 引导流程完成率≥80%
- ✅ API文档完整（100%覆盖）
- ✅ 7个工具页面SEO优化完成
- ✅ Google Search Console收录

**输出物**:
- 交互式引导流程
- API Playground
- 7个工具页面

---

### Milestone 4 (可选): Video Generation上线 (9周后)
**验收标准**:
- ✅ 视频生成成功率≥95%
- ✅ 平均处理时间<3分钟（8秒视频）
- ✅ 成本在预算内（<$50/月）

**输出物**:
- `/tools/video-generation` 页面
- 异步任务队列系统
- 视频预览/下载功能

---

## ⚠️ 风险管理

### 高风险项
1. **Legal Compliance审查延期**
   - 缓解：提前1周提交法律顾问审查
   - 备选：使用模板隐私政策（需明确标注"待审查"）

2. **Google Veo API访问权限**
   - 缓解：立即申请，同时推进Inpainting开发
   - 备选：如未获批，Video Generation延后至Phase 3

3. **预算超支**
   - 缓解：Video Generation作为可选项
   - 备选：使用更便宜的AI服务（Runway ML、Pika Labs）

### 中风险项
1. **Inpainting性能不达标**
   - 缓解：提前进行Gemini API性能测试
   - 备选：使用更快的模型（Gemini 1.5 Flash）

2. **SEO效果不佳**
   - 缓解：提前配置Google Search Console
   - 备选：投入SEM广告（Google Ads）

---

## 📊 资源需求

### 人力资源
- **全栈开发**: 1人（Full-time）
- **法律顾问**: 外包（隐私政策审查）
- **UI/UX设计**: 可选（遮罩工具UI优化）

### 技术资源
- **Google Gemini API**: 现有
- **Supabase**: 现有（免费额度充足）
- **Vercel**: 现有（部署平台）
- **Redis** (Video Generation): $15/月（Upstash）
- **视频存储** (Video Generation): $10-20/月（Cloudflare R2或S3）

### 预算预估
- 核心路线（Legal + Inpainting + Onboarding）: **$0** （使用现有资源）
- 完整路线（含Video Generation）: **$30-50/月**（Redis + 视频存储）

---

## 🔄 与原PROJECTROADMAP的差异

| 项目 | 原PROJECTROADMAP | 修订路线图 | 变更原因 |
|------|-----------------|-----------|---------|
| Week 6-7 | Onboarding + API文档 | Legal Compliance | 补齐合规缺口 |
| Week 8-10 | Inpainting | Inpainting/Outpainting | 保持不变 |
| Week 11-13 | Video Generation | Onboarding + API文档 | 调整优先级 |
| Week 14-15 | Upscaling/Variations | Video Generation (可选) | 降低优先级 |

**时间线对比**:
- **原计划**: Week 6-15 (10周)
- **修订后**: 6周（核心）或9周（完整）
- **差异**: 核心路线快4周，完整路线快1周

---

## 📝 下一步行动

### 立即执行（本周）
1. ✅ 创建Legal Compliance任务清单
2. ✅ 申请Google Veo API访问权限（预备）
3. ✅ 联系法律顾问审查隐私政策模板

### 下周执行
1. [ ] 启动Legal Compliance开发（隐私政策/ToS页面）
2. [ ] 规划Inpainting技术方案（API选型、UI设计）
3. [ ] 评估Redis托管方案（如决定做Video Generation）

### 2周后评估
1. [ ] Legal Compliance进度检查
2. [ ] Google Veo API访问权限状态
3. [ ] 决定是否执行Video Generation

---

**修订总结**:
修订路线图基于实际19%完成度和Phase 2可行性评估，优先补齐Legal Compliance缺口（2周），然后聚焦核心AI功能Inpainting/Outpainting（2周），最后提升用户体验（2周）。Video Generation作为可选项，仅在预算和资源允许时执行。

**预期成果**:
- 6周后：Legal合规 + Core AI功能上线 + 用户体验提升
- 9周后（可选）：Video Generation上线

---

**最后更新**: 2025-11-14
**下次评估**: Legal Compliance完成后（2周后）
**负责人**: Technical Lead
