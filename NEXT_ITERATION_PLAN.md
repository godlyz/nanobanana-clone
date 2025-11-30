# 下一迭代执行计划 (Next Iteration Plan)

**迭代周期**: 2周（2025-11-18 至 2025-11-29）
**核心目标**: Legal Compliance补齐（GDPR、隐私政策、ToS、Cookie横幅）
**基于**: REVISED_ROADMAP.md 阶段1
**优先级**: P0（最高 - 合规风险）

---

## 📋 迭代概览

**为什么优先Legal Compliance？**
1. **法律风险**: 无GDPR合规可能面临高额罚款（GDPR最高€20M或4%全球营收）
2. **商业化前提**: 已有支付系统，但无法对外公开接受EU用户（合规缺失）
3. **用户信任**: 隐私政策/ToS是用户信任的基础
4. **技术债务**: Phase 1核心功能，延期越久修复成本越高

**预期成果**:
- ✅ 隐私政策/ToS页面上线（中英双语）
- ✅ GDPR数据导出/删除功能完成
- ✅ Cookie同意横幅上线
- ✅ 可对外公开接受EU用户注册

---

## 🎯 Sprint 目标拆解

### Week 1 (2025-11-18 至 2025-11-22)
**目标**: 隐私政策/ToS页面 + GDPR数据导出

**Day 1 (Mon, 2025-11-18)**
```
上午:
[ ] 研究GDPR合规要求（参考文档：GDPR.eu官网）
[ ] 研究同类产品隐私政策（Midjourney、DALL·E、Runway）
[ ] 起草隐私政策内容框架（数据收集、使用、第三方服务）

下午:
[ ] 起草服务条款内容框架（使用限制、订阅条款、退款政策）
[ ] 准备法律审查材料（发送给法律顾问）

输出:
- privacy-policy-draft.md（隐私政策草稿）
- terms-of-service-draft.md（服务条款草稿）
```

**Day 2 (Tue, 2025-11-19)**
```
上午:
[ ] 创建隐私政策页面 app/privacy/page.tsx
[ ] 创建服务条款页面 app/terms/page.tsx
[ ] 添加页面路由和导航链接（Footer组件）

下午:
[ ] 国际化隐私政策内容（lib/language-context.tsx）
[ ] 国际化服务条款内容
[ ] 测试页面响应式布局（移动端/桌面端）

输出:
- app/privacy/page.tsx（隐私政策页面）
- app/terms/page.tsx（服务条款页面）
- 100+条i18n翻译键
```

**Day 3 (Wed, 2025-11-20)**
```
上午:
[ ] 设计GDPR数据导出API（GET /api/user/export）
[ ] 实现数据导出逻辑（查询所有用户数据）
  - users表（email, created_at, metadata）
  - subscriptions表
  - credits表
  - history表（图像编辑历史）

下午:
[ ] 实现JSON + CSV导出格式
[ ] 添加性能优化（分页查询，避免大数据超时）
[ ] 测试数据导出（模拟用户数据）

输出:
- app/api/user/export/route.ts（数据导出API）
- E2E测试（Playwright）
```

**Day 4 (Thu, 2025-11-21)**
```
上午:
[ ] 创建GDPR数据导出前端UI（/profile/data-export）
[ ] 添加"导出数据"按钮到Profile页面
[ ] 实现下载文件功能（JSON/CSV）

下午:
[ ] 测试完整导出流程（用户点击 → API调用 → 文件下载）
[ ] 性能测试（1000条记录导出时间<5分钟）
[ ] 错误处理（API失败、超时重试）

输出:
- app/profile/data-export/page.tsx（导出页面）
- 完整E2E测试套件
```

**Day 5 (Fri, 2025-11-22)**
```
上午:
[ ] Code Review（隐私政策/ToS页面 + GDPR导出API）
[ ] 修复Review反馈的问题
[ ] 更新CHANGELOG.md（记录本周变更）

下午:
[ ] 准备Week 1 Demo（录屏演示）
[ ] 更新PROJECTWIKI.md（Legal Compliance章节）
[ ] Sprint回顾：Week 1完成度检查

输出:
- Week 1 Demo视频
- CHANGELOG.md更新
- PROJECTWIKI.md更新
```

---

### Week 2 (2025-11-25 至 2025-11-29)
**目标**: GDPR数据删除 + Cookie同意横幅

**Day 6 (Mon, 2025-11-25)**
```
上午:
[ ] 设计GDPR数据删除API（DELETE /api/user/delete-account）
[ ] 实现软删除机制（deleted_at字段 + 30天后永久删除）
[ ] 设计Cron Job（每日检查并永久删除过期数据）

下午:
[ ] 实现关联数据清理逻辑
  - 标记subscriptions为已删除
  - 清空credits
  - 删除history记录
  - 删除Supabase Storage中的图像

输出:
- app/api/user/delete-account/route.ts（删除API）
- Supabase Edge Function（定时任务）
```

**Day 7 (Tue, 2025-11-26)**
```
上午:
[ ] 创建GDPR数据删除前端UI（/profile/delete-account）
[ ] 添加二次确认对话框（防止误删）
[ ] 实现账户删除流程（用户点击 → 确认 → API调用 → 登出）

下午:
[ ] 测试完整删除流程
[ ] 测试定时任务（30天后永久删除）
[ ] 安全测试（防止未授权删除）

输出:
- app/profile/delete-account/page.tsx（删除页面）
- E2E测试套件
```

**Day 8 (Wed, 2025-11-27)**
```
上午:
[ ] 研究Cookie同意横幅最佳实践（参考：Cookiebot、OneTrust）
[ ] 设计Cookie分类（必需Cookie vs 分析Cookie）
[ ] 创建Cookie横幅组件（components/cookie-banner.tsx）

下午:
[ ] 实现Cookie偏好存储（localStorage或Cookie）
[ ] 集成Google Analytics（可选 - 基于用户同意）
[ ] 测试Cookie横幅在不同地区的展示逻辑（EU vs US）

输出:
- components/cookie-banner.tsx（Cookie横幅组件）
- Cookie偏好管理页面（/settings/cookies）
```

**Day 9 (Thu, 2025-11-28)**
```
上午:
[ ] 法律文档最终审查（隐私政策/ToS）
[ ] 根据法律顾问反馈修订文档
[ ] 发布正式版隐私政策/ToS

下午:
[ ] 全量测试Legal Compliance功能
  - 隐私政策/ToS页面加载
  - GDPR数据导出（<5分钟）
  - GDPR数据删除（30天后永久删除）
  - Cookie横幅正确展示

输出:
- 正式版隐私政策/ToS（通过法律审查）
- 完整测试报告
```

**Day 10 (Fri, 2025-11-29)**
```
上午:
[ ] 部署Legal Compliance功能到生产环境
[ ] 验证生产环境功能正常
[ ] 更新CHANGELOG.md（v0.0.15 - Legal Compliance完成）

下午:
[ ] Sprint回顾：2周迭代总结
[ ] 更新PROJECTWIKI.md（标记Legal Compliance完成）
[ ] 准备下一迭代计划（Inpainting/Outpainting）

输出:
- Legal Compliance生产部署
- CHANGELOG.md v0.0.15
- Sprint回顾文档
```

---

## 📊 每日工作时间分配

| 时间段 | 活动 | 时长 |
|--------|------|-----|
| 09:00-12:00 | 核心开发（编码/设计） | 3h |
| 12:00-13:00 | 午休 | 1h |
| 13:00-15:00 | 核心开发（测试/优化） | 2h |
| 15:00-15:30 | Code Review / 技术文档 | 0.5h |
| 15:30-17:00 | 沟通协作（法律审查、用户反馈） | 1.5h |

**每日有效工作时间**: 7小时
**2周总工时**: 70小时

---

## 🎯 关键验收标准 (DoD - Definition of Done)

### 功能完成标准
- ✅ 隐私政策/ToS页面可访问（/privacy, /terms）
- ✅ GDPR数据导出<5分钟（测试1000条记录）
- ✅ GDPR数据删除30天后永久删除（Cron Job测试）
- ✅ Cookie横幅在EU地区正确展示
- ✅ 中英双语翻译准确率100%

### 代码质量标准
- ✅ 测试覆盖率≥85%（新增代码）
- ✅ TypeScript无编译错误
- ✅ ESLint无警告
- ✅ E2E测试通过（Playwright）

### 文档标准
- ✅ CHANGELOG.md更新（v0.0.15）
- ✅ PROJECTWIKI.md更新（Legal Compliance章节）
- ✅ API文档更新（/api/user/export, /api/user/delete-account）

### 法律合规标准
- ✅ 隐私政策通过法律顾问审查
- ✅ 服务条款通过法律顾问审查
- ✅ GDPR功能符合GDPR第15条（数据访问权）和第17条（删除权）

---

## ⚠️ 风险与应对

### 风险1: 法律审查延期
**概率**: 高
**影响**: 中（可能延期3-5天）
**应对**:
- Day 1提前发送审查材料
- 准备备选方案：使用模板隐私政策（标注"待审查"）
- 与法律顾问明确审查时间线（最晚Day 8完成）

### 风险2: GDPR数据导出性能问题
**概率**: 中
**影响**: 中（可能超过5分钟）
**应对**:
- Day 3实施分页查询
- 限制单次导出最大记录数（如1万条）
- 超大数据集使用异步导出（邮件发送下载链接）

### 风险3: Cookie横幅复杂度超预期
**概率**: 低
**影响**: 低（可能延期1-2天）
**应对**:
- 使用第三方库（react-cookie-consent）
- 简化功能（仅必需Cookie vs 全部Cookie，无细粒度控制）

---

## 📝 每日站会检查清单

每日早上9:00回答3个问题：

1. **昨天完成了什么？**
   - 列出已完成的任务（参考Day计划）
2. **今天计划做什么？**
   - 列出今日任务优先级（P0 > P1 > P2）
3. **有什么阻碍吗？**
   - 技术问题、依赖阻塞、外部等待（如法律审查）

---

## 🔄 迭代结束后的下一步

**下一迭代（Week 3-4）**: Inpainting/Outpainting核心AI功能

**预期任务**:
- Google Gemini API集成（图像编辑模式）
- 遮罩绘制工具（Canvas + React）
- Inpainting前端UI（/tools/inpainting）
- Outpainting前端UI（/tools/outpainting）
- E2E测试套件

**预计开始时间**: 2025-12-02（Legal Compliance完成后）

---

## 📊 进度追踪

### Week 1进度（2025-11-18 至 2025-11-22）
- [ ] Day 1: 隐私政策/ToS草稿
- [ ] Day 2: 隐私政策/ToS页面
- [ ] Day 3: GDPR数据导出API
- [ ] Day 4: GDPR数据导出UI
- [ ] Day 5: Code Review + Week 1回顾

### Week 2进度（2025-11-25 至 2025-11-29）
- [ ] Day 6: GDPR数据删除API
- [ ] Day 7: GDPR数据删除UI
- [ ] Day 8: Cookie同意横幅
- [ ] Day 9: 法律审查 + 全量测试
- [ ] Day 10: 生产部署 + Sprint回顾

---

**创建日期**: 2025-11-14
**负责人**: Technical Lead
**状态**: ⏳ 待开始（计划于2025-11-18启动）
**下次检查**: 2025-11-22（Week 1结束）

---

**重要提醒**:
- ✅ 每日更新进度（标记已完成任务）
- ✅ 每日站会（9:00 AM）记录阻碍
- ✅ Week 1/2结束时更新CHANGELOG.md
- ✅ 遇到阻碍立即调整计划，不要死守原计划
