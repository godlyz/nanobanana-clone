# ADR-001: 性能优化策略 - WebP/AVIF + 懒加载

**状态**: 已实施 ✅
**日期**: 2025-11-06
**决策者**: 技术团队
**关联Issue**: Performance Optimization Phase 1

---

## 背景 (Context)

Lighthouse 初始测试结果显示：
- **桌面端**: 62/100
- **移动端**: 45/100
- **主要问题**:
  - 图片体积过大（PNG/JPG 未压缩）
  - 首屏加载 12 个组件全部渲染
  - 未启用 DNS preconnect

**目标**:
- 桌面端达到 95+ 分
- 移动端达到 80+ 分（Phase 1 目标 60+）

---

## 决策 (Decision)

采用以下优化策略：

### 1. 图片格式优化
- **WebP** 作为主格式（90% 浏览器支持）
- **AVIF** 作为现代浏览器格式（Chrome/Edge）
- **降级策略**: WebP → AVIF → JPEG

### 2. 懒加载策略
- 启用 Next.js `next/image` 自动懒加载
- 12 个组件添加 `loading="lazy"` 属性
- 首屏外组件使用 React.lazy() + Suspense

### 3. DNS 优化
```html
<link rel="dns-prefetch" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://supabase.co" />
<link rel="preconnect" href="https://generativelanguage.googleapis.com" />
```

### 4. JavaScript Bundle 优化（延后至 Phase 2）
- 代码分割
- Tree-shaking
- 动态导入

---

## 备选方案 (Alternatives Considered)

### 方案 A: 完全使用 AVIF
- **优点**: 体积更小（比 WebP 小 30%）
- **缺点**: 浏览器支持率仅 70%
- **结论**: ❌ 不可行，Safari 支持不完善

### 方案 B: 使用 Cloudflare Image Optimization
- **优点**: 自动格式转换，CDN 加速
- **缺点**: 额外成本 $20/月
- **结论**: ⏸️ 延后，当前使用 Vercel 自带优化

### 方案 C: 手动优化图片 + 懒加载
- **优点**: 零成本，完全可控
- **缺点**: 需要手动处理所有图片
- **结论**: ✅ **当前方案**

---

## 取舍理由 (Rationale)

1. **WebP/AVIF 双格式策略**:
   - 兼顾性能和兼容性
   - Vercel 自动转换，无需手动处理

2. **懒加载优先首屏**:
   - 显著提升 FCP (First Contentful Paint)
   - 减少初始 JS bundle 体积

3. **DNS preconnect**:
   - 提前建立连接，减少 API 请求延迟
   - 对 Supabase 和 Gemini API 尤其有效

---

## 实施结果 (Consequences)

### 正面影响 ✅
- **桌面端 Lighthouse**: 62 → 95 分 (+53%)
- **移动端 Lighthouse**: 45 → 60 分 (+33%)
- **FCP**: 2.5s → 1.2s (-52%)
- **LCP**: 4.8s → 2.3s (-52%)

### 负面影响 ⚠️
- 移动端仍未达到 80 分目标
- 原因：JS bundle 仍有 500KB（需 Phase 2 优化）

### 技术债务
- ⏸️ **P1**: 移动端性能优化（目标 80+）
- ⏸️ **P2**: JS bundle 代码分割
- ⏸️ **P3**: 图片 CDN 迁移评估

---

## 验证方式 (Validation)

### 测试环境
- Chrome DevTools Lighthouse
- 移动端模拟：Moto G4 (4G 网络)
- 桌面端：桌面 (Fast 3G)

### 验证报告
详见：`quality-metrics-report.md`

```bash
# 运行 Lighthouse 测试
pnpm lighthouse:mobile
pnpm lighthouse:desktop
```

---

## 回滚策略 (Rollback Plan)

如果性能优化导致兼容性问题：

```bash
# 1. 回滚图片格式配置
# 编辑 next.config.mjs，禁用 formats: ['webp', 'avif']

# 2. 移除懒加载
git revert <commit-sha>

# 3. 验证回滚效果
pnpm build
pnpm lighthouse:desktop
```

---

## 参考链接 (References)

- [Next.js Image Optimization](https://nextjs.org/docs/pages/building-your-application/optimizing/images)
- [Web.dev: Lazy loading images](https://web.dev/lazy-loading-images/)
- [Can I Use WebP](https://caniuse.com/webp)
- [Performance Report](../../quality-metrics-report.md)

---

**相关 ADR**:
- ADR-002: i18n Cookie 持久化策略
- ADR-003: 积分冻结逻辑

**更新记录**:
- 2025-11-06: 初始创建
- 2025-11-14: 归档到 ADR 系统
