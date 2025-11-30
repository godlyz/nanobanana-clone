# ⚡ 快速修复指南

老王已经帮你创建了工具库,现在教你怎么快速用上它们!

---

## 🔧 1. 替换不安全的随机数生成 (30分钟)

### 查找所有需要替换的位置
```bash
grep -r "Math.random().toString(36)" app/ lib/ --exclude-dir=node_modules
```

### 替换步骤

**步骤 1**: 在文件顶部添加导入
```typescript
import { generateShortId } from '@/lib/id-generator'
```

**步骤 2**: 替换生成ID的代码
```typescript
// 旧代码 ❌
const randomId = Math.random().toString(36).substring(7)

// 新代码 ✅
const randomId = generateShortId()
```

### 批量替换命令 (可选)

如果你会用 sed,可以批量替换:
```bash
# 备份文件
find app/ lib/ -name "*.ts" -exec cp {} {}.bak \;

# 批量替换 (谨慎使用!)
# 需要手动确认每个文件
```

### 需要修改的文件列表

1. `app/api/generate/route.ts:138`
2. `app/api/scenes/route.ts`
3. `app/api/subjects/route.ts`
4. `app/api/history/route.ts`
5. `app/api/generate/chat/route.ts`
6. `app/api/credits/purchase/route.ts`
7. `lib/feedback-manager.ts`
8. `app/profile/page.tsx`

---

## 🔐 2. 为 API 添加认证 (1小时)

### 示例: 保护图像生成 API

**文件**: `app/api/generate/route.ts`

**原代码结构**:
```typescript
export async function POST(req: NextRequest) {
  try {
    // ... 处理逻辑
  } catch (error) {
    // ... 错误处理
  }
}
```

**新代码结构**:
```typescript
import { withAuth } from '@/lib/api-auth'
import { createSuccessResponse, handleApiError } from '@/lib/api-handler'

export const POST = withAuth(async (request, user) => {
  try {
    // user 对象已经通过认证,可以直接使用
    // user.id, user.email 等

    // ... 原有的处理逻辑 ...

    return createSuccessResponse(result)
  } catch (error) {
    return handleApiError(error, 'POST /api/generate')
  }
})
```

### 需要添加认证的 API 列表

- [ ] `/api/generate` - 图像生成
- [ ] `/api/batch-generate` - 批量生成
- [ ] `/api/smart-prompt/optimize` - 提示优化
- [ ] `/api/credits/purchase` - 购买额度

---

## 👤 3. 获取真实用户信息 (30分钟)

### 文件: `app/api/checkout/route.ts`

**原代码** (第 50-51 行):
```typescript
// TODO: 从 session 或 Supabase 获取用户信息
const userId = "anonymous"  // 临时使用匿名用户
```

**修复方案**:

**步骤 1**: 添加导入
```typescript
import { withAuth } from '@/lib/api-auth'
import { createSuccessResponse, handleApiError } from '@/lib/api-handler'
```

**步骤 2**: 使用认证包装器
```typescript
export const POST = withAuth(async (request, user) => {
  try {
    const body = await request.json()
    const { planId, billingCycle } = body

    // ✅ 使用真实用户 ID
    const userId = user.id

    // ... 其余逻辑不变 ...

    return createSuccessResponse(checkoutSession)
  } catch (error) {
    return handleApiError(error, 'POST /api/checkout')
  }
})
```

---

## 🔄 4. 统一 API 响应格式 (1小时)

### 逐个重构 API 的步骤

**示例 API**: `app/api/scenes/route.ts`

**步骤 1**: 添加导入
```typescript
import { withAuth } from '@/lib/api-auth'
import {
  createSuccessResponse,
  handleApiError,
  validateRequiredFields,
  createValidationError
} from '@/lib/api-handler'
```

**步骤 2**: 重构 POST 方法
```typescript
// 旧代码
export async function POST(request: Request) {
  try {
    const { name, description } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // ... 逻辑 ...

    return NextResponse.json({ success: true, scene })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create scene" }, { status: 500 })
  }
}

// 新代码 ✅
export const POST = withAuth(async (request, user) => {
  try {
    const body = await request.json()

    // 验证必填字段
    const validation = validateRequiredFields(body, ['name'])
    if (!validation.valid) {
      return createValidationError(validation.missing!)
    }

    const { name, description } = body

    // ... 逻辑 ...

    return createSuccessResponse(scene)
  } catch (error) {
    return handleApiError(error, 'POST /api/scenes')
  }
})
```

---

## 🛠️ 5. 创建工具页面通用组件 (2小时)

### 步骤 1: 创建通用组件

**文件**: `components/ToolRedirect.tsx`

```typescript
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/language-context"

interface ToolRedirectProps {
  toolName: string
  displayName: string
}

export function ToolRedirect({ toolName, displayName }: ToolRedirectProps) {
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    router.replace(`/editor/image-edit?tool=${toolName}`)
  }, [router, toolName])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F59E0B] mx-auto mb-4"></div>
        <p className="text-sm text-gray-600">
          {t("common.redirecting")} {displayName}...
        </p>
      </div>
    </div>
  )
}
```

### 步骤 2: 简化所有工具页面

**示例**: `app/tools/one-shot/page.tsx`

**原代码** (~30 行):
```typescript
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function OneShotPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/editor/image-edit?tool=style-transfer")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F59E0B] mx-auto mb-4"></div>
        <p className="text-sm text-gray-600">正在跳转到图片编辑器...</p>
      </div>
    </div>
  )
}
```

**新代码** (5 行):
```typescript
import { ToolRedirect } from "@/components/ToolRedirect"

export default function OneShotPage() {
  return <ToolRedirect toolName="one-shot" displayName="一键编辑" />
}
```

### 需要简化的工具页面

- [ ] `app/tools/one-shot/page.tsx`
- [ ] `app/tools/background-remover/page.tsx`
- [ ] `app/tools/character-consistency/page.tsx`
- [ ] `app/tools/scene-preservation/page.tsx`
- [ ] `app/tools/text-to-image-with-text/page.tsx`
- [ ] `app/tools/chat-edit/page.tsx`
- [ ] `app/tools/smart-prompt/page.tsx`

---

## ✅ 验证修复

### 1. 检查编译错误
```bash
pnpm build
```

### 2. 运行开发服务器
```bash
pnpm dev
```

### 3. 测试认证的 API
```bash
# 未登录时应该返回 401
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test"}'

# 响应应该是:
# {
#   "success": false,
#   "error": "未授权",
#   "details": "请先登录",
#   "timestamp": "2025-10-22T..."
# }
```

---

## 📊 进度追踪

复制这个清单到你的笔记中,完成一项就打勾:

### 今天完成 (3.5 小时)
- [ ] 替换 8 个文件中的不安全随机数生成 (2小时)
- [ ] 为 4 个 API 添加认证 (1小时)
- [ ] 修复 checkout 的用户信息获取 (30分钟)

### 本周完成 (10 小时)
- [ ] 创建工具页面通用组件 (2小时)
- [ ] 简化 7 个工具页面 (1小时)
- [ ] 重构 10 个 API 使用新的响应格式 (4小时)
- [ ] 实现 Webhook 处理逻辑 (3小时)

---

## 🆘 遇到问题?

### 常见问题

**Q1: 导入路径找不到?**
```
Error: Cannot find module '@/lib/id-generator'
```

**A**: 检查 `tsconfig.json` 中的路径配置:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**Q2: 类型错误?**
```
Type 'User' is not assignable to type 'never'
```

**A**: 确保导入了正确的类型:
```typescript
import type { User } from '@supabase/supabase-js'
```

**Q3: 编译时还是有错误?**

**A**: 暂时不用担心,`next.config.mjs` 中配置了开发环境忽略错误。等功能都实现完后再统一修复类型问题。

---

**最后更新**: 2025-10-22
**作者**: 老王
**下一步**: 开始动手修复吧,崽芽子!💪
