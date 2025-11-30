# 性能优化指南 (Performance Optimization Guide)

**日期**: 2025-11-06
**项目**: Nano Banana - AI 驱动的图像编辑应用
**优化目标**: Lighthouse 性能得分 ≥90
**当前状态**: 📉 移动端 54/100, 桌面端 43/100 (严重不达标)

---

## 📊 当前性能问题分析

### 🚨 关键性能指标

| 指标 | 当前值 | 目标值 | 状态 | 影响程度 |
|------|--------|--------|------|----------|
| **LCP (移动端)** | 7.7s | <2.5s | ❌ 严重超标 | 🚨 极高 |
| **LCP (桌面端)** | 7.4s | <2.5s | ❌ 严重超标 | 🚨 极高 |
| **TBT (移动端)** | 580ms | <300ms | ❌ 超标 | 🔴 高 |
| **TBT (桌面端)** | 544ms | <300ms | ❌ 超标 | 🔴 高 |
| **CLS** | 0 | <0.1 | ✅ 优秀 | 🟢 无 |
| **无障碍得分** | 91/100 | ≥90 | ✅ 达标 | 🟢 无 |

### 🔍 根本原因分析

1. **图片资源未优化** (`next.config.mjs` 中设置了 `unoptimized: true`)
2. **JavaScript 包体积过大** (未进行代码分割和懒加载)
3. **缺少资源预加载策略** (无 preload/prefetch)
4. **服务器响应时间慢** (可能存在数据库查询优化空间)
5. **字体加载阻塞渲染** (未使用 font-display: swap)

---

## 🎯 优化策略与实施方案

### 阶段一：立即优化 (Critical Optimizations)

#### 1. 启用 Next.js 图片优化

**问题**: 当前配置 `unoptimized: true` 导致图片未优化
**影响**: LCP 严重超标，页面加载缓慢
**优先级**: 🔥 **最高**

```typescript
// 修改 next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ❌ 删除这行
  // images: {
  //   unoptimized: true
  // },

  // ✅ 启用图片优化
  images: {
    domains: ['your-domain.com', 'storage.googleapis.com'], // 添加图片域名
    formats: ['image/webp', 'image/avif'], // 启用现代图片格式
    minimumCacheTTL: 60 * 60 * 24 * 7, // 缓存7天
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // 启用实验性功能
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
}
```

**预期改进**: LCP 减少 3-5 秒

#### 2. 实现代码分割和懒加载

**问题**: 所有 JavaScript 在首屏加载
**影响**: TBT 超标，主线程阻塞
**优先级**: 🔥 **最高**

```typescript
// 动态导入大型组件
const AdminDashboard = dynamic(() => import('@/app/admin/page'), {
  loading: () => <div>加载管理后台...</div>,
  ssr: false // 仅在客户端加载
})

const ImageEditor = dynamic(() => import('@/components/editor/image-editor'), {
  loading: () => <div>加载编辑器...</div>
})

// 路由级别代码分割
export const runtime = 'edge' // 在 Edge Runtime 中运行
```

**预期改进**: TBT 减少 200-300ms

#### 3. 优化关键资源加载

**问题**: 缺少资源预加载策略
**影响**: 资源加载串行化，延长加载时间
**优先级**: 🔴 **高**

```typescript
// 在 layout.tsx 中添加资源预加载
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <head>
        {/* 预加载关键资源 */}
        <link rel="preload" href="/fonts/geist-sans.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/api/user/profile" as="fetch" crossOrigin="" />

        {/* DNS 预解析 */}
        <link rel="dns-prefetch" href="//api.supabase.co" />
        <link rel="dns-prefetch" href="//storage.googleapis.com" />

        {/* 预连接到关键域名 */}
        <link rel="preconnect" href="https://api.supabase.co" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
```

**预期改进**: 页面加载时间减少 1-2 秒

### 阶段二：中级优化 (Secondary Optimizations)

#### 4. 字体加载优化

```css
/* 在 globals.css 中优化字体 */
@import url('https://fonts.googleapis.com/css2?family=Geist+Sans:wght@300;400;500;600;700&display=swap');

:root {
  --font-sans: 'Geist Sans', ui-sans-serif, system-ui, sans-serif;
}

/* 使用 font-display: swap 避免阻塞渲染 */
* {
  font-family: var(--font-sans);
  font-display: swap;
}
```

#### 5. 数据库查询优化

```typescript
// 实现查询缓存和优化
export async function getUserHistory(userId: string, limit = 10) {
  const supabase = createClient()

  // 使用索引优化查询
  const { data, error } = await supabase
    .from('generation_history')
    .select(`
      id,
      created_at,
      tool_type,
      status,
      image_url,
      prompt
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
    // ✅ 添加索引提示
    .range(0, limit - 1)

  return { data, error }
}
```

#### 6. 缓存策略实现

```typescript
// 实现多层缓存
export async function getCachedData<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  // 1. 内存缓存
  const memoryCache = getMemoryCache(key)
  if (memoryCache) return memoryCache

  // 2. Redis 缓存 (如果有的话)
  const redisCache = await getRedisCache(key)
  if (redisCache) return redisCache

  // 3. 数据库查询
  const data = await fetcher()

  // 设置缓存
  setMemoryCache(key, data, 5 * 60 * 1000) // 5分钟
  setRedisCache(key, data, 60 * 60) // 1小时

  return data
}
```

### 阶段三：高级优化 (Advanced Optimizations)

#### 7. Service Worker 实现

```typescript
// 添加 Service Worker 进行资源缓存
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration)
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError)
      })
  })
}
```

#### 8. Edge Runtime 优化

```typescript
// 将无状态的 API 路由迁移到 Edge Runtime
export const runtime = 'edge'

export async function GET(request: Request) {
  // Edge Runtime 优势：
  // - 更低的冷启动时间
  // - 全球分布部署
  // - 更好的性能
}
```

#### 9. Bundle 分析和优化

```bash
# 分析包大小
pnpm build
pnpm next analyze

# 使用 webpack-bundle-analyzer
pnpm add --save-dev @next/bundle-analyzer
```

---

## 📈 性能监控与测量

### 1. 开发环境监控

```typescript
// 添加性能监控中间件
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const start = Date.now()

  const response = NextResponse.next()

  response.headers.set('Server-Timing', `total;dur=${Date.now() - start}`)

  return response
}
```

### 2. Core Web Vitals 监控

```typescript
// 添加 vitals 监控
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

function sendToAnalytics(metric: any) {
  // 发送到分析服务
  console.log('Performance metric:', metric)
}

getCLS(sendToAnalytics)
getFID(sendToAnalytics)
getFCP(sendToAnalytics)
getLCP(sendToAnalytics)
getTTFB(sendToAnalytics)
```

### 3. 持续性能测试

```yaml
# .github/workflows/performance.yml
name: Performance Test

on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run start &
      - uses: treosh/lighthouse-ci-action@v9
        with:
          configPath: './lighthouserc.json'
          uploadArtifacts: true
```

---

## 🎯 优化时间线

### Week 1: 关键优化 (立即执行)
- [x] 启用 Next.js 图片优化
- [x] 实现代码分割和懒加载
- [x] 添加资源预加载
- [x] 优化字体加载

**预期结果**: 性能得分提升至 70-80 分

### Week 2: 中级优化
- [ ] 数据库查询优化
- [ ] 实现缓存策略
- [ ] Bundle 分析和优化
- [ ] CSS 和 JavaScript 压缩

**预期结果**: 性能得分提升至 85-90 分

### Week 3: 高级优化
- [ ] Service Worker 实现
- [ ] Edge Runtime 迁移
- [ ] CDN 配置优化
- [ ] 图片 WebP/AVIF 格式转换

**预期结果**: 性能得分达到 95+ 分

---

## 📚 性能最佳实践清单

### ✅ 代码层面
- [ ] 使用动态导入减少初始包大小
- [ ] 避免不必要的重新渲染
- [ ] 使用 useMemo 和 useCallback 优化组件
- [ ] 实现虚拟滚动处理长列表

### ✅ 资源层面
- [ ] 压缩和优化图片资源
- [ ] 使用现代图片格式 (WebP, AVIF)
- [ ] 启用 HTTP/2 或 HTTP/3
- [ ] 实现资源缓存策略

### ✅ 用户体验层面
- [ ] 添加骨架屏或加载状态
- [ ] 实现渐进式加载
- [ ] 优化关键渲染路径
- [ ] 预加载关键资源

---

## 🚨 常见性能陷阱

### ❌ 避免的反模式
1. **过度使用 useEffect** - 导致不必要的重新渲染
2. **大型第三方库** - 不加选择地引入
3. **同步数据获取** - 阻塞页面渲染
4. **缺少代码分割** - 加载不需要的代码
5. **忽略图片优化** - 大尺寸图片拖慢加载

### ✅ 推荐的最佳实践
1. **按需加载** - 只加载当前需要的资源
2. **优先级设置** - 优先加载关键资源
3. **缓存策略** - 合理设置缓存时间
4. **性能监控** - 持续监控性能指标
5. **渐进增强** - 确保基础功能始终可用

---

## 📊 成功指标

### 阶段性目标
- **Week 1**: 性能得分 ≥70
- **Week 2**: 性能得分 ≥85
- **Week 3**: 性能得分 ≥95

### 最终目标
| 指标 | 目标值 | 测量工具 |
|------|--------|----------|
| Lighthouse Performance | ≥95 | Lighthouse |
| LCP | <1.8s | Lighthouse/Real User Monitoring |
| TBT | <200ms | Lighthouse/Real User Monitoring |
| CLS | <0.1 | Lighthouse/Real User Monitoring |
| FCP | <1.0s | Lighthouse/Real User Monitoring |

---

**最后更新**: 2025-11-06
**维护人**: 老王 🔥
**下次审查**: 2025-11-13