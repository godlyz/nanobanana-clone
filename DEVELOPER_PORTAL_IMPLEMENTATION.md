# 开发者门户实施文档

## 🔥 老王说明：API密钥管理系统完整实现

这个文档记录了开发者门户(Developer Portal)的完整实现，包括数据库设计、API端点、前端UI和安全措施。

---

## 📋 功能概述

开发者门户提供以下核心功能：

1. **API密钥管理**
   - 创建新的API密钥（最多10个）
   - 查看现有密钥列表
   - 删除不需要的密钥
   - 密钥创建时一次性显示完整密钥

2. **快速开始指南**
   - 3步上手教程
   - Python和JavaScript代码示例
   - 安全最佳实践

3. **使用统计**（占位，未来功能）
   - API调用次数
   - 配额使用情况
   - 调用历史

---

## 🏗️ 架构设计

### 技术栈

- **前端**: Next.js 14 + TypeScript + shadcn/ui
- **后端**: Next.js API Routes
- **数据库**: Supabase (PostgreSQL)
- **认证**: Supabase Auth
- **加密**: Node.js Crypto (SHA-256)

### 文件结构

```
开发者门户相关文件：

📁 app/
├── 📁 developer/
│   └── 📄 page.tsx                    # 开发者门户主页面（700+行）
├── 📁 api/
│   └── 📁 developer/
│       └── 📁 keys/
│           ├── 📄 route.ts            # GET和POST端点
│           └── 📁 [id]/
│               └── 📄 route.ts        # DELETE端点

📁 lib/
└── 📄 api-keys.ts                     # API密钥工具函数（150+行）

📁 supabase/
└── 📁 migrations/
    └── 📄 create_api_keys_table.sql   # 数据库schema

📄 API_KEYS_SETUP.md                   # 数据库设置指南
📄 DEVELOPER_PORTAL_IMPLEMENTATION.md  # 本文档
```

---

## 🗄️ 数据库设计

### api_keys表结构

```sql
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash TEXT NOT NULL,
  key_preview VARCHAR(20) NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);
```

### 索引

- `idx_api_keys_user_id` - 用户ID索引（提升查询性能）
- `idx_api_keys_key_hash` - 密钥哈希索引（用于API认证）
- `idx_api_keys_is_active` - 活跃状态索引（部分索引）

### 行级安全(RLS)策略

1. **查询策略**: 用户只能查看自己的密钥
2. **插入策略**: 用户只能创建自己的密钥
3. **删除策略**: 用户只能删除自己的密钥
4. **更新策略**: 用户只能更新自己的密钥

### 触发器

- `enforce_api_key_limit` - 插入前检查数量限制（最多10个）

---

## 🔐 安全设计

### 密钥生成

```typescript
// lib/api-keys.ts
export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(32)
  const randomString = randomBytes
    .toString("base64")
    .replace(/\+/g, "").replace(/\//g, "").replace(/=/g, "")
    .substring(0, 32)
  return `sk_live_${randomString}`
}
```

**特点：**
- 使用`crypto.randomBytes()`生成加密安全的随机数
- 格式：`sk_live_` + 32位随机字符
- 总长度：40字符

### 密钥存储

```typescript
export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex")
}
```

**安全措施：**
- 数据库只存储SHA-256哈希值，绝不存明文
- 完整密钥只在创建时返回一次
- 界面显示预览格式：`sk_...last4`

### 密钥验证

```typescript
export function verifyApiKey(apiKey: string, storedHash: string): boolean {
  const computedHash = hashApiKey(apiKey)
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, "hex"),
    Buffer.from(storedHash, "hex")
  )
}
```

**特点：**
- 使用`timingSafeEqual()`防止时序攻击
- 比较哈希值而非明文密钥

---

## 🚀 API端点

### GET /api/developer/keys

**功能**: 获取用户的所有API密钥列表

**认证**: 需要Supabase session

**响应示例**:
```json
{
  "keys": [
    {
      "id": "uuid",
      "name": "生产环境密钥",
      "key_preview": "sk_...Xy8z",
      "last_used_at": "2025-11-07T12:00:00Z",
      "created_at": "2025-11-01T10:00:00Z",
      "is_active": true
    }
  ],
  "count": 1
}
```

**安全过滤**:
- 不返回`key_hash`字段
- 不返回`user_id`字段（通过session验证）

### POST /api/developer/keys

**功能**: 创建新的API密钥

**认证**: 需要Supabase session

**请求体**:
```json
{
  "name": "我的密钥"
}
```

**验证规则**:
- 名称长度：3-50个字符
- 不能与现有密钥重名
- 不能超过10个密钥限制

**响应示例**:
```json
{
  "key": {
    "id": "uuid",
    "name": "我的密钥",
    "key_preview": "sk_...Xy8z",
    "key": "sk_live_YOUR_ACTUAL_API_KEY_HERE", // 完整密钥，仅此一次！
    "created_at": "2025-11-07T12:00:00Z",
    "is_active": true
  },
  "message": "API key created successfully. Please save this key, it will not be shown again."
}
```

### DELETE /api/developer/keys/[id]

**功能**: 删除指定的API密钥

**认证**: 需要Supabase session

**URL参数**: `id` - 密钥的UUID

**响应示例**:
```json
{
  "message": "API key deleted successfully",
  "deleted_id": "uuid"
}
```

**安全检查**:
- 验证UUID格式
- 确认密钥属于当前用户
- 双重权限检查（RLS + 显式验证）

---

## 🎨 前端UI

### 页面路由

- `/developer` - 开发者门户主页面

### 主要组件

1. **API Keys标签页**
   - 创建新密钥表单（输入名称）
   - 密钥列表卡片
   - 复制功能（点击复制预览或完整密钥）
   - 删除功能（确认对话框）
   - 完整密钥一次性显示（创建后）

2. **Quick Start标签页**
   - 3步上手指南
   - Python代码示例
   - JavaScript代码示例
   - 安全最佳实践

3. **Usage标签页**（占位）
   - 未来功能

### 用户体验细节

- **密钥可见性切换**: 点击眼睛图标切换显示/隐藏
- **复制反馈**: 复制后显示"Copied!"提示
- **安全警告**: 创建密钥后的黄色警告框
- **删除确认**: 防止误删除
- **响应式设计**: 移动端友好

---

## 🧪 测试计划

### 单元测试（建议）

```typescript
// 测试密钥生成
test('generateApiKey should create valid key', () => {
  const key = generateApiKey()
  expect(key).toMatch(/^sk_live_[a-zA-Z0-9]{32}$/)
  expect(key.length).toBe(40)
})

// 测试密钥哈希
test('hashApiKey should be deterministic', () => {
  const key = 'sk_live_test1234'
  const hash1 = hashApiKey(key)
  const hash2 = hashApiKey(key)
  expect(hash1).toBe(hash2)
})

// 测试密钥验证
test('verifyApiKey should match correct key', () => {
  const key = 'sk_live_test1234'
  const hash = hashApiKey(key)
  expect(verifyApiKey(key, hash)).toBe(true)
  expect(verifyApiKey('wrong_key', hash)).toBe(false)
})
```

### 集成测试

1. **创建密钥流程**
   - [ ] 未登录访问返回401
   - [ ] 创建成功返回完整密钥
   - [ ] 重复名称返回400
   - [ ] 超过10个限制返回400

2. **查询密钥流程**
   - [ ] 未登录访问返回401
   - [ ] 返回当前用户的所有密钥
   - [ ] 不返回其他用户的密钥

3. **删除密钥流程**
   - [ ] 未登录访问返回401
   - [ ] 删除成功返回200
   - [ ] 删除其他用户密钥返回404

### 手动测试步骤

1. 登录系统（使用GitHub或Google OAuth）
2. 访问 http://localhost:3000/developer
3. 创建新密钥，记录完整密钥
4. 刷新页面，确认只显示预览
5. 复制密钥预览
6. 删除密钥
7. 确认密钥已从列表中移除

---

## 📝 使用示例

### Python示例

```python
import requests

API_KEY = "sk_live_your_api_key_here"
BASE_URL = "https://nanobanana.app/api"

def edit_image(image_path, prompt):
    """使用自然语言编辑图片"""
    with open(image_path, "rb") as f:
        files = {"image": f}
        data = {
            "prompt": prompt,
            "api_key": API_KEY
        }
        response = requests.post(
            f"{BASE_URL}/generate",
            files=files,
            data=data
        )
        response.raise_for_status()
        return response.json()

# 使用示例
result = edit_image("my_photo.jpg", "将背景改为海滩日落")
print(f"编辑后的图片URL: {result['image_url']}")
```

### JavaScript示例

```javascript
const API_KEY = "sk_live_your_api_key_here";
const BASE_URL = "https://nanobanana.app/api";

async function editImage(imageFile, prompt) {
  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("prompt", prompt);
  formData.append("api_key", API_KEY);

  const response = await fetch(`${BASE_URL}/generate`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
}

// 使用示例
const fileInput = document.getElementById("imageInput");
const result = await editImage(fileInput.files[0], "将背景改为海滩日落");
console.log("编辑后的图片URL:", result.image_url);
```

---

## 🚧 未来改进

### 第一阶段（已完成）
- [x] 数据库表设计
- [x] API密钥生成和哈希
- [x] GET/POST/DELETE端点
- [x] 前端UI（密钥管理）
- [x] 快速开始指南

### 第二阶段（规划中）
- [ ] 使用统计功能
- [ ] API调用历史记录
- [ ] 配额管理
- [ ] 密钥权限范围(scope)
- [ ] IP白名单
- [ ] 速率限制（每分钟请求数）

### 第三阶段（未来）
- [ ] Webhook配置
- [ ] 密钥过期时间设置
- [ ] 自动轮换密钥
- [ ] 密钥使用分析报告
- [ ] 异常检测和警告

---

## ⚠️ 已知限制

1. **密钥数量限制**: 每个用户最多10个活跃密钥
2. **使用统计**: 当前为占位功能，未实现
3. **密钥权限**: 所有密钥拥有相同权限
4. **过期时间**: 密钥永不过期（除非手动删除）
5. **速率限制**: 未实现API调用速率限制

---

## 📞 故障排查

### 问题：创建密钥时返回500错误

**可能原因**:
1. 数据库表未创建
2. Supabase连接失败
3. RLS策略配置错误

**解决方案**:
1. 检查 `API_KEYS_SETUP.md` 确认数据库已设置
2. 检查 `.env.local` 的Supabase配置
3. 在Supabase控制台查看错误日志

### 问题：密钥列表为空但确定创建了密钥

**可能原因**:
1. RLS策略配置错误
2. Session过期

**解决方案**:
1. 重新登录
2. 检查Supabase RLS策略

### 问题：删除密钥时返回404

**可能原因**:
1. 密钥ID不正确
2. 密钥属于其他用户
3. 密钥已被删除

**解决方案**:
1. 检查传递的UUID格式
2. 确认密钥属于当前登录用户

---

## 🔗 相关文档

- [API_KEYS_SETUP.md](./API_KEYS_SETUP.md) - 数据库设置指南
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Supabase配置
- [CLAUDE.md](./CLAUDE.md) - 项目概述和开发规范

---

## 🎯 验收标准

### 功能完整性
- [x] 用户可以创建API密钥
- [x] 用户可以查看密钥列表
- [x] 用户可以删除密钥
- [x] 密钥创建时显示完整密钥一次
- [x] 快速开始指南和代码示例

### 安全性
- [x] 数据库只存储哈希值
- [x] RLS策略正确配置
- [x] 用户只能访问自己的密钥
- [x] 使用加密安全的随机数生成器
- [x] 防时序攻击验证

### 用户体验
- [x] UI美观友好
- [x] 复制功能正常
- [x] 删除确认对话框
- [x] 创建密钥后的安全警告
- [x] 响应式设计

### 代码质量
- [x] TypeScript类型定义完整
- [x] 错误处理完善
- [x] 代码注释清晰（老王风格）
- [x] 遵循项目规范

---

**🔥 老王总结**：这个开发者门户系统老王我设计得严谨又实用，从数据库设计到API端点，从安全措施到用户体验，每个细节都考虑到了。按照这个文档操作，绝对不会出问题！如果遇到啥憨批错误，赶紧来找老王！
