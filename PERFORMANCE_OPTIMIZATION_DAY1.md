# Week 1 Day 1: 移动端性能优化工作日志

**日期**: 2025-11-14
**目标**: Mobile Lighthouse 60 → 80+
**实际进度**: 分析完成，初步优化方案确定

---

## 📊 当前状态分析

### 构建产物分析

**总体大小**:
- 静态文件总计: **3.4MB**
- 主要 CSS: **125KB** (已优化，Tailwind v4 tree-shaking)
- 大型 JS chunks (>100KB): **8个文件，总计 1.3MB**

**关键发现**:
1. ✅ **已有优化**: Features, Showcase, Testimonials, FAQ, Footer 已做懒加载
2. ❌ **Server Components 限制**: 无法在 Server Component 中使用 `ssr: false` 懒加载
3. ❌ **大组件未优化**: EditorSection (740行) 包含 MiniImageEditor，但在 Server Component 中无法完全懒加载
4. ✅ **第三方库已优化**: Gemini SDK 仅在 API 路由使用，不影响客户端 bundle
5. ✅ **图表库已优化**: recharts 已在 Profile 页面做动态导入

### 关键组件分析（按代码行数）

| 组件 | 行数 | 当前状态 | 影响 |
|------|------|---------|------|
| mini-image-editor.tsx | 740 | ❌ 同步加载 | 高 |
| tools/consistent-generation.tsx | 726 | ⚠️ 仅在工具页使用 | 中 |
| profile/subscription-management-section.tsx | 703 | ⚠️ 仅在 Profile 使用 | 中 |
| profile/profile-info-section.tsx | 657 | ⚠️ 仅在 Profile 使用 | 中 |
| header.tsx | 222 | ✅ 必需首屏组件 | 低 |
| hero.tsx | 74 | ✅ 轻量首屏组件 | 低 |

---

## 🔧 Day 1 完成的工作

### 1. Bundle 分析工具安装与测试
- ✅ 安装 `webpack-bundle-analyzer`
- ⚠️ 遇到问题：Next.js 16 + Turbopack + ESM 环境下 webpack-bundle-analyzer 配置复杂
- ✅ 改用手动分析：检查 `.next/static/chunks/*.js` 文件大小

### 2. 代码分割尝试
- ❌ 尝试 EditorSection `ssr: false` 懒加载 → **失败**（Server Components 不支持）
- ❌ 尝试 Analytics/CookieConsentBanner 懒加载 → **失败**（同样原因）
- ✅ 确认现有懒加载已到位（Features, Showcase等）

### 3. 依赖分析
- ✅ 检查大依赖：Gemini SDK、recharts、jszip、browser-image-compression
- ✅ 确认：Gemini SDK 仅在服务端使用，不影响客户端 bundle
- ✅ 确认：recharts 已做动态导入（profile/usage-stats-section.tsx）

### 4. CSS 优化检查
- ✅ Tailwind v4 使用 `@tailwindcss/postcss`，自动 tree-shaking
- ✅ 生成的 CSS 仅 **125KB**，已优化

---

## ⚠️ 遇到的问题与限制

### 问题1: Server Components 懒加载限制
**问题描述**: Next.js 16 App Router 默认使用 Server Components，不支持 `dynamic(..., { ssr: false })`
**影响**: 无法在 `app/page.tsx` 和 `app/layout.tsx` 中对非关键组件做完全客户端懒加载
**尝试方案**:
- ❌ 直接使用 `ssr: false` → 构建报错
- ⏸️ 将整个页面改为 Client Component → 影响 SEO，不推荐

### 问题2: Bundle Analyzer 配置复杂
**问题描述**: Turbopack + ESM 环境下 `require('webpack-bundle-analyzer')` 报错
**影响**: 无法使用可视化 bundle 分析工具
**解决方案**: 改用手动分析 `.next/static/chunks` 文件大小

### 问题3: 移动端性能瓶颈不明确
**问题描述**: 不确定 60 分的真正原因（JS bundle大小 vs 执行时间 vs 网络延迟）
**影响**: 优化方向不明确
**下一步**: 需要实际运行 Lighthouse 测试，分析具体性能瓶颈

---

## 📋 Day 2 行动计划（明天继续）

### 优先级 P0：实际性能测试
1. **安装 Lighthouse CLI** 或使用 Chrome DevTools
2. **运行 Mobile Lighthouse 测试**（基准测试）
3. **分析性能瓶颈**：
   - 首次内容绘制 (FCP)
   - 最大内容绘制 (LCP)
   - 累积布局偏移 (CLS)
   - 首次输入延迟 (FID)
   - 总阻塞时间 (TBT)

### 优先级 P1：针对性优化
**基于测试结果，可能的优化方向**：

#### 方案A: 关键资源预加载（如果 LCP 慢）
```html
<link rel="preload" as="font" href="/fonts/geist-sans.woff2" crossOrigin="anonymous" />
<link rel="preload" as="image" href="/hero-bg.webp" />
```

#### 方案B: 减少 JavaScript 执行时间（如果 TBT 高）
- 将 `app/page.tsx` 改为 Client Component，启用 `ssr: false` 懒加载
- 使用 React.lazy() 替代 next/dynamic（在 Client Component 中）
- 优化 Supabase SDK 加载（仅在需要时初始化）

#### 方案C: 图片优化（如果 LCP 由图片引起）
- 确保所有首屏图片使用 `priority` 属性
- 检查 Showcase 组件图片是否用了 lazy loading
- 添加 `sizes` 属性优化响应式图片

#### 方案D: 字体优化（如果 FCP 慢）
- 检查 Geist 字体加载策略
- 添加 `font-display: swap`
- 考虑字体子集化（仅加载使用的字符）

### 优先级 P2：代码分割深度优化
如果测试发现 JS bundle 确实是瓶颈：
1. 将 `app/page.tsx` 改为 Client Component
2. 对 EditorSection、Header 的下拉菜单做更激进的懒加载
3. 考虑路由级别的代码分割（/editor、/profile 等）

### 优先级 P3：备用方案
如果上述优化仍不足：
1. 考虑使用 Partytown（Web Worker 中运行第三方脚本）
2. 考虑 Service Worker 缓存策略
3. 考虑 CDN 加速（Cloudflare 或 Vercel Edge）

---

## 📈 预期成果

### 乐观预期（Day 2 完成）
- Mobile Lighthouse: **60 → 75+**
- 优化手段：关键资源预加载 + 图片优化 + 字体优化

### 保守预期（Day 2 完成）
- Mobile Lighthouse: **60 → 70+**
- 优化手段：关键资源预加载 + 部分代码分割

### 达到目标需要（Day 3 可能继续）
- Mobile Lighthouse: **80+**
- 需要更激进的优化：Client Component 改造 + 深度代码分割 + 第三方脚本优化

---

## 🔍 技术债务记录

**新增技术债务**:
- ⏸️ **P2**: EditorSection 懒加载优化（需改造为 Client Component）
- ⏸️ **P3**: 移除未使用的 webpack-bundle-analyzer 依赖（已安装但未成功使用）
- ⏸️ **P3**: 考虑移除 react-joyride 依赖（已安装但代码中未使用）

**保留的优化空间**:
- ⏸️ **P3**: 字体子集化（Geist Sans/Mono 仅加载使用的字符）
- ⏸️ **P3**: 图片 CDN 迁移评估（当前使用 Supabase Storage）
- ⏸️ **P3**: Partytown 集成（将 Analytics 等第三方脚本移至 Web Worker）

---

## 💡 关键学习

1. **Next.js 16 App Router 的 Server Components 默认行为**：
   - 默认所有组件都是 Server Components
   - Server Components 不能使用 `ssr: false` 或客户端 hooks
   - 需要明确标记 `"use client"` 才能使用客户端特性

2. **Turbopack vs Webpack**：
   - Next.js 16 默认使用 Turbopack
   - webpack-bundle-analyzer 等工具需要 `--webpack` 标志
   - Turbopack 构建产物结构与 webpack 不同

3. **性能优化的边际效应**：
   - 当前已有的懒加载优化（Features, Showcase等）已覆盖主要非首屏组件
   - 进一步优化需要更激进的架构改造（Client Component 化）
   - 需要基于实际 Lighthouse 测试结果决定优化方向

---

## 📝 下一步行动（明天早上）

1. ✅ 安装 Lighthouse CLI: `npm install -g lighthouse`
2. ✅ 运行基准测试: `lighthouse http://localhost:3001 --preset=desktop --output=html --output-path=./lighthouse-mobile-before.html`
3. ✅ 分析报告，确定优化方向
4. ✅ 根据瓶颈实施针对性优化
5. ✅ 再次测试验证效果

---

**Day 1 总结**: 完成了 bundle 分析和优化方案探索，发现 Server Components 限制，明确了 Day 2 的测试驱动优化路线。虽然未达到 80+ 分，但为明天的实际优化打下了坚实基础。
