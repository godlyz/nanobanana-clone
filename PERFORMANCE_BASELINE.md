# Nano Banana 性能基线文档

> **性能基线建立日期**：2025-11-24 06:15
> **基线版本**：Phase 2 完整优化（v3）
> **Lighthouse 性能评分**：96/100（A+级）

---

## 基线说明

本文档记录了 Nano Banana 项目经过完整性能优化后的性能基线，作为未来所有性能监控和优化工作的**参考标准**。任何新增功能或代码变更都应确保性能指标**不低于此基线**。

---

## 测试环境

| 项目 | 配置 |
|------|------|
| **测试工具** | Google Lighthouse 移动端模式 |
| **设备模拟** | 移动设备（CPU 4x 节流） |
| **网络条件** | Fast 3G (1.6 Mbps / 750 Kbps, 150ms RTT) |
| **测试页面** | http://localhost:3000（首页） |
| **浏览器** | Chrome（最新版本） |
| **Node 版本** | v20+ |
| **Next.js 版本** | 16.1.5（Turbopack） |

---

## 性能基线指标

### 总体评分

| 指标 | 基线值 | 评级 | 说明 |
|------|--------|------|------|
| **Performance Score** | **96/100** | 🎉 **A+** | 完美超越90分目标 |
| **Accessibility** | 90+ | ✅ Good | 可访问性良好 |
| **Best Practices** | 90+ | ✅ Good | 最佳实践遵循 |
| **SEO** | 90+ | ✅ Good | SEO优化到位 |

### Core Web Vitals（核心网页指标）

| 指标 | 基线值 | 评分 | 目标 | 状态 |
|------|--------|------|------|------|
| **FCP** (First Contentful Paint) | **1.7s** | **92%** | ≤ 1.8s | ✅ 达标 |
| **LCP** (Largest Contentful Paint) | **1.7s** | **99%** | ≤ 2.5s | 🚀 **完美达标** |
| **TBT** (Total Blocking Time) | **140ms** | **96%** | ≤ 200ms | 🚀 **优秀** |
| **CLS** (Cumulative Layout Shift) | **0.001** | **100%** | ≤ 0.1 | 🎉 **完美** |
| **Speed Index** | **4.0s** | **80%** | ≤ 3.4s | ⚠️ 可优化 |

### 资源加载性能

| 指标 | 基线值 | 说明 |
|------|--------|------|
| **首次交互时间** (TTI) | ~2.5s | 用户可开始交互的时间 |
| **最大潜在FID** (Max Potential FID) | <100ms | 首次输入延迟预估 |
| **首字节时间** (TTFB) | <600ms | 服务器响应速度 |

---

## 已应用的性能优化策略

### Phase 1：生产构建基础

✅ **代码压缩**：生产构建自动压缩JavaScript（节省1070ms）
✅ **Tree Shaking**：移除未使用代码（节省2110ms）
✅ **字体优化**：`display: 'swap'` 避免FOIT
✅ **组件拆分**：EditorSection, Features, Showcase等动态导入
✅ **图片优化**：首图`priority`，其余懒加载

### Phase 2：完整性能方案

✅ **博客页面代码高亮动态加载**：使用`next/dynamic`懒加载react-syntax-highlighter（主bundle减少952KB）

✅ **字体预加载**：`app/layout.tsx`添加Geist Sans关键字体preload
```html
<link rel="preload" href="/_next/static/media/geist-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
<link rel="preload" href="/_next/static/media/geist-sans-latin-500-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
```

✅ **关键域名预连接**：提前建立TCP/TLS连接
```html
<!-- Supabase 预连接（用户认证、数据存储核心服务） -->
<link rel="preconnect" href="https://gtpvyxrgkuccgpcaeeyt.supabase.co" />
<link rel="dns-prefetch" href="https://gtpvyxrgkuccgpcaeeyt.supabase.co" />

<!-- Google AI API 预连接（视频生成核心服务） -->
<link rel="preconnect" href="https://generativelanguage.googleapis.com" />
<link rel="dns-prefetch" href="https://generativelanguage.googleapis.com" />

<!-- Vercel Analytics 预连接 -->
<link rel="preconnect" href="https://vercel.live" />
<link rel="dns-prefetch" href="https://vercel.live" />
```

✅ **组件顺序优化**：`app/page.tsx`将Features提前到EditorSection前（轻量组件优先加载，降低LCP）
```typescript
export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      {/* 🔥 老王性能优化：Features提前到EditorSection前（Features更轻量，降低LCP） */}
      <Features />
      <EditorSection />
      {/* ... */}
    </main>
  )
}
```

---

## 性能监控警戒线

为了持续保持优秀的性能表现，设定以下监控警戒线：

### 🚨 红色警戒线（必须立即修复）

- Performance Score < **85**
- LCP > **3.0s**
- TBT > **300ms**
- CLS > **0.1**

### ⚠️ 黄色警戒线（需要关注并计划优化）

- Performance Score < **90**
- LCP > **2.0s**
- TBT > **200ms**
- CLS > **0.05**
- Speed Index > **5.0s**

### ✅ 绿色健康区间（性能良好）

- Performance Score ≥ **90**
- LCP ≤ **2.0s**
- TBT ≤ **200ms**
- CLS ≤ **0.05**
- Speed Index ≤ **4.0s**

---

## 性能测试流程

### 本地测试（开发环境）

```bash
# 1. 清理缓存
rm -rf .next

# 2. 生产构建
pnpm build

# 3. 启动生产服务器
pnpm start

# 4. 运行 Lighthouse（移动端）
lighthouse http://localhost:3000 \
  --preset=desktop \
  --emulated-form-factor=mobile \
  --throttling.cpuSlowdownMultiplier=4 \
  --output=json \
  --output=html \
  --output-path=./lighthouse-mobile
```

### CI/CD 集成（推荐）

```yaml
# .github/workflows/performance.yml
name: Performance Test

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: pnpm install
      - run: pnpm build
      - uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            http://localhost:3000
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true
```

---

## 性能预算（Performance Budget）

| 资源类型 | 预算 | 当前 | 状态 |
|---------|------|------|------|
| **总 JavaScript** | ≤ 500KB | ~400KB | ✅ |
| **总 CSS** | ≤ 100KB | ~60KB | ✅ |
| **总图片** | ≤ 1MB | ~800KB | ✅ |
| **首屏 JavaScript** | ≤ 200KB | ~150KB | ✅ |
| **第三方脚本** | ≤ 100KB | ~50KB | ✅ |

---

## 已知性能瓶颈与改进空间

### Speed Index 波动

**现象**：Speed Index 从 1.1s 回升到 4.0s

**可能原因**：
- 字体预加载增加了初始资源请求
- Supabase 预连接占用部分带宽
- 测试环境网络波动影响

**优化建议**：
- 监控生产环境真实用户数据（CrUX）
- 考虑使用 `loading="eager"` 优化关键资源
- 调查字体预加载是否延迟了其他关键资源

### TBT 轻微回升

**现象**：TBT 从 10ms 增加到 140ms

**可能原因**：
- 字体预加载解析占用主线程时间
- 预连接建立耗时

**优化建议**：
- 延迟加载非关键 JavaScript
- 考虑使用 Web Worker 处理计算密集型任务
- 监控生产环境真实 TBT 数据

---

## 性能优化历史

| 日期 | 版本 | Performance Score | 关键改进 |
|------|------|-------------------|---------|
| 2025-11-23 | v0（开发环境） | **64/100** | 基线 |
| 2025-11-23 | v1（Phase 1） | **86/100 (+22)** | 生产构建、Tree Shaking |
| 2025-11-24 | v2（Phase 2.2） | **86/100 (维持)** | 代码高亮库动态加载 |
| 2025-11-24 | v3（Phase 2.3） | **96/100 (+10)** | 字体预加载、域名预连接、组件顺序 |

---

## 下一步建议

1. **集成 Lighthouse CI**：自动化性能测试，每次 PR 都检查性能回退
2. **真实用户监控**：使用 Vercel Analytics 或 Google CrUX 数据验证优化效果
3. **持续优化**：定期检查新增依赖对性能的影响
4. **性能预算**：设置资源大小限制，防止性能退化

---

## 联系与贡献

- **报告性能问题**：[GitHub Issues](https://github.com/your-repo/issues)
- **性能优化建议**：[GitHub Discussions](https://github.com/your-repo/discussions)

---

**文档维护**：老王性能优化团队
**最后更新**：2025-11-24 06:15
