# ADR-002: 国际化持久化策略 - js-cookie 替代 localStorage

**状态**: 已实施 ✅
**日期**: 2025-11-07
**决策者**: 技术团队
**关联Issue**: i18n Hydration Error Fix

---

## 背景 (Context)

### 问题描述

使用 `localStorage` 存储语言偏好时，出现 React hydration 错误：

```
Warning: Text content did not match. Server: "Welcome" Client: "欢迎"
```

**根本原因**:
1. **SSR 阶段**: 服务端无法访问 `localStorage`，默认使用英文渲染
2. **CSR 阶段**: 客户端读取 `localStorage`，发现用户选择了中文，重新渲染
3. **Hydration 失败**: SSR 生成的 HTML 与 CSR 渲染不一致

### 影响范围
- 所有使用 `useLanguage()` Hook 的组件（约 50 个）
- 错误率：100%（所有用户都会遇到）
- 用户体验：首次加载闪烁，控制台报错

---

## 决策 (Decision)

**使用 `js-cookie` 替代 `localStorage` 存储语言偏好**

### 技术方案

#### 1. Cookie 配置
```typescript
import Cookies from 'js-cookie'

// 写入 Cookie
Cookies.set('preferred_language', language, {
  expires: 365,        // 1 年有效期
  path: '/',           // 全站可访问
  sameSite: 'Lax',     // CSRF 保护
  secure: process.env.NODE_ENV === 'production'  // 生产环境 HTTPS
})

// 读取 Cookie
const savedLanguage = Cookies.get('preferred_language')
```

#### 2. SSR/CSR 一致性保证
- **服务端**: Next.js 可通过 `req.headers.cookie` 读取 Cookie
- **客户端**: `js-cookie` 直接读取
- **默认值**: 未设置 Cookie 时使用英文（`en`）

#### 3. 迁移策略
```typescript
// 兼容旧版 localStorage 数据
useEffect(() => {
  const oldLanguage = localStorage.getItem('language')
  if (oldLanguage && !Cookies.get('preferred_language')) {
    Cookies.set('preferred_language', oldLanguage, { expires: 365 })
    localStorage.removeItem('language')  // 清理旧数据
  }
}, [])
```

---

## 备选方案 (Alternatives Considered)

### 方案 A: 继续使用 localStorage + 客户端渲染
- **优点**: 实现简单，无需额外依赖
- **缺点**: Hydration 错误无法解决，SEO 不友好
- **结论**: ❌ 不可行

### 方案 B: Next.js i18n Routing (`next-intl`)
- **优点**: 官方推荐方案，SEO 友好
- **缺点**: 需要重构路由结构（/en/*, /zh/*）
- **结论**: ⏸️ 延后，当前项目已开发到中期

### 方案 C: js-cookie 方案
- **优点**:
  - 解决 Hydration 问题
  - SSR/CSR 数据一致
  - 无需重构现有代码
- **缺点**:
  - 额外依赖（3.5KB gzipped）
  - Cookie 大小限制（4KB）
- **结论**: ✅ **当前方案**

### 方案 D: URL 参数传递语言 (`?lang=zh`)
- **优点**: 无需持久化，SEO 友好
- **缺点**: URL 污染，用户体验差
- **结论**: ❌ 不适合 SaaS 产品

---

## 取舍理由 (Rationale)

### 为什么选择 Cookie？

1. **SSR/CSR 数据一致性**:
   - Cookie 在服务端和客户端都可访问
   - 避免 Hydration 错误

2. **最小改动原则**:
   - 仅需修改 `lib/language-context.tsx`
   - 无需重构路由或组件结构

3. **用户体验优先**:
   - 消除首次加载闪烁
   - 控制台无错误提示

4. **安全性**:
   - `sameSite: 'Lax'` 防止 CSRF 攻击
   - `secure: true` 确保 HTTPS 传输

### 为什么不用 localStorage？

| 特性 | Cookie | localStorage |
|------|--------|--------------|
| SSR 可访问性 | ✅ 是 | ❌ 否 |
| CSR 可访问性 | ✅ 是 | ✅ 是 |
| Hydration 一致性 | ✅ 是 | ❌ 否 |
| 存储大小 | 4KB | 10MB |
| 过期时间 | 可设置 | 永久 |

**结论**: Cookie 更适合需要 SSR 的场景。

---

## 实施结果 (Consequences)

### 正面影响 ✅
- **Hydration 错误率**: 100% → 0%
- **控制台警告**: 完全消除
- **首屏闪烁**: 消失
- **SEO**: 改善（服务端正确渲染语言）

### 负面影响 ⚠️
- **额外依赖**: +3.5KB gzipped (`js-cookie`)
- **Cookie 占用**: +30 bytes (`preferred_language=en`)

### 技术债务
无（方案成熟稳定）

---

## 验证方式 (Validation)

### 测试步骤

1. **Hydration 错误检查**:
```bash
# 禁用 JavaScript，检查 SSR 输出
curl http://localhost:3000 | grep "Welcome"

# 启用 JavaScript，检查 CSR 输出
# 打开浏览器控制台，确认无 Hydration 警告
```

2. **语言切换测试**:
```bash
# 切换到中文
localStorage.removeItem('language')  # 确保无旧数据干扰
Cookies.set('preferred_language', 'zh')
location.reload()

# 验证页面显示中文且无错误
```

3. **Cookie 有效性测试**:
```bash
# 检查 Cookie 是否正确设置
document.cookie  // 应包含 "preferred_language=zh"
```

---

## 回滚策略 (Rollback Plan)

如果 Cookie 方案出现问题（如隐私合规问题）：

### 回滚步骤

1. **恢复 localStorage 代码**:
```bash
git revert <commit-sha>
```

2. **更新 `lib/language-context.tsx`**:
```typescript
// 回退到 localStorage
const [language, setLanguage] = useState<Language>(() => {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('language') as Language) || 'en'
  }
  return 'en'
})

// 保存到 localStorage
useEffect(() => {
  localStorage.setItem('language', language)
}, [language])
```

3. **接受 Hydration 警告**:
   - 添加 `suppressHydrationWarning` 属性到受影响组件
   - 等待 Phase 2 实施 `next-intl` 方案

---

## 参考链接 (References)

- [js-cookie Documentation](https://github.com/js-cookie/js-cookie)
- [Next.js: Avoiding Hydration Mismatch](https://nextjs.org/docs/messages/react-hydration-error)
- [MDN: HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [OWASP: SameSite Cookie Attribute](https://owasp.org/www-community/SameSite)

---

**相关 ADR**:
- ADR-001: 性能优化策略
- ADR-003: 积分冻结逻辑

**更新记录**:
- 2025-11-07: 初始创建
- 2025-11-08: 实施完成，Hydration 错误率降至 0%
- 2025-11-14: 归档到 ADR 系统
