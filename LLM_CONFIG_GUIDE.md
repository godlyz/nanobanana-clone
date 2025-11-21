# 🤖 LLM 配置管理指南

> 老王提醒：这个SB系统支持多种 LLM 服务商，配置很灵活，看完你就会用了！

---

## 📋 目录

- [系统概述](#系统概述)
- [访问配置页面](#访问配置页面)
- [查看现有配置](#查看现有配置)
- [新增 LLM 配置](#新增-llm-配置)
- [编辑配置](#编辑配置)
- [配置字段说明](#配置字段说明)
- [配置示例](#配置示例)
- [常见问题](#常见问题)

---

## 系统概述

Nano Banana 的 LLM 配置系统支持两大类服务：

1. **图像生成服务** (`image_generation`)
   - 用于 AI 图像编辑和生成
   - 当前支持：Google Gemini, OpenAI DALL-E, 自定义服务

2. **提示词优化服务** (`prompt_optimization`)
   - 用于智能提示词优化和增强
   - 当前支持：智谱AI GLM, OpenAI GPT, Anthropic Claude, Ollama 本地模型

### 支持的 LLM 提供商

| Provider | 服务类型 | 说明 |
|----------|---------|------|
| **Google** | 图像生成 | Google Gemini 系列模型 |
| **Ollama** | 提示词优化 | 本地部署模型（无需 API Key） |
| **OpenAI** | 图像生成 + 提示词优化 | GPT 和 DALL-E 系列 |
| **Anthropic** | 提示词优化 | Claude 系列模型 |
| **GLM** | 提示词优化 | 智谱AI 大模型 |
| **自定义** | 所有 | 支持任何符合 OpenAI 格式的服务 |

---

## 访问配置页面

### 方法 1：通过导航菜单

1. 登录管理后台：`http://localhost:3000/admin`
2. 点击顶部导航栏的 **"系统配置"** 按钮
3. 页面会显示所有系统配置列表

![导航菜单](https://via.placeholder.com/800x60?text=顶部导航：仪表板 | 系统配置 | 活动规则 | 用户管理 | 审计日志)

### 方法 2：直接访问

直接访问 URL：`http://localhost:3000/admin/config`

---

## 查看现有配置

### 步骤 1：筛选 LLM 配置

在配置页面顶部，找到"**配置类型**"下拉框，选择"**LLM配置**"：

```
[配置类型 ▼]  →  选择 "LLM配置"
```

### 步骤 2：查看配置列表

筛选后会显示所有 LLM 配置，每个配置卡片包含：

- **配置键**（config_key）：唯一标识符
- **Provider**：提供商名称
- **服务类型**：图像生成/提示词优化
- **激活状态**：✅ 激活 / ❌ 未激活
- **描述信息**
- **操作按钮**：编辑、删除、查看详情

示例：

```
┌─────────────────────────────────────────┐
│ 🔵 LLM配置                              │
│ llm.image_generation.google             │
│ Provider: Google                        │
│ 服务类型: 图像生成                        │
│ 状态: ✅ 激活                            │
│ 描述: Google Gemini图像生成配置          │
│ [编辑] [删除] [详情]                     │
└─────────────────────────────────────────┘
```

---

## 新增 LLM 配置

### 步骤 1：点击新增按钮

在配置页面右上角，点击 **"+ 新增配置"** 按钮。

### 步骤 2：选择配置类型

在弹出的表单中，选择"**配置类型**" = `LLM配置`。

### 步骤 3：填写基础信息

| 字段 | 是否必填 | 说明 |
|------|---------|------|
| **配置键** | ✅ 必填 | 唯一标识符，格式：`llm.<服务类型>.<provider>` |
| **描述** | ❌ 可选 | 配置说明文字 |
| **是否激活** | ✅ 必填 | 默认勾选 |

**配置键示例**：

```
llm.image_generation.google      # Google 图像生成
llm.prompt_optimization.glm      # 智谱AI 提示词优化
llm.prompt_optimization.openai   # OpenAI 提示词优化
```

### 步骤 4：填写 LLM 专用字段

#### 通用字段（所有 LLM 配置必填）

| 字段 | 说明 | 示例 |
|------|------|------|
| **Provider** | 提供商 | Google / Ollama / OpenAI / Anthropic / GLM / 自定义 |
| **服务类型** | 服务类型 | 图像生成 / 提示词优化 |
| **API URL** | API 端点地址 | `https://generativelanguage.googleapis.com` |
| **API Key** | API 密钥 | `AIzaSyC...`（明文输入，保存时自动加密） |
| **超时时间** | 请求超时（毫秒） | `60000`（默认 60 秒） |

#### 图像生成专用字段

| 字段 | 说明 | 示例 |
|------|------|------|
| **模型名称** | 模型标识符 | `gemini-2.5-flash-image` |

#### 提示词优化专用字段

| 字段 | 说明 | 示例 |
|------|------|------|
| **快速模型** | 轻量级模型 | `glm-4.5-air`（快速响应） |
| **详细模型** | 完整版模型 | `glm-4.6`（深度分析） |

### 步骤 5：预览和保存

表单右侧会实时显示 JSON 预览：

```json
{
  "provider": "GLM",
  "service_type": "prompt_optimization",
  "api_url": "https://open.bigmodel.cn/api/coding/paas/v4",
  "api_key": "1d58622e...",
  "quick_model": "glm-4.5-air",
  "detailed_model": "glm-4.6",
  "timeout": 60000,
  "description": "智谱AI提示词优化服务"
}
```

确认无误后，点击 **"保存配置"** 按钮。

---

## 编辑配置

### 步骤 1：找到目标配置

在配置列表中找到需要修改的 LLM 配置。

### 步骤 2：点击编辑按钮

点击配置卡片右侧的 **"编辑"** 按钮。

### 步骤 3：修改字段

表单会自动填充现有数据，修改需要的字段即可。

**⚠️ 重要提醒**：
- 修改 API Key 时，输入框会显示加密后的值（以 `加密:` 开头）
- 如需更换 API Key，直接输入新的明文 Key 即可
- 不修改 API Key 时，请保持输入框内容不变

### 步骤 4：保存修改

点击 **"保存配置"** 按钮，系统会自动更新配置。

---

## 配置字段说明

### Provider（提供商）

| 值 | 说明 | 官网 |
|----|------|------|
| `google` | Google Gemini AI | https://ai.google.dev |
| `ollama` | Ollama 本地模型 | https://ollama.ai |
| `openai` | OpenAI GPT/DALL-E | https://openai.com |
| `anthropic` | Anthropic Claude | https://anthropic.com |
| `GLM` | 智谱AI 大模型 | https://open.bigmodel.cn |
| `custom` | 自定义服务 | - |

### 服务类型（Service Type）

| 值 | 说明 | 用途 |
|----|------|------|
| `image_generation` | 图像生成 | AI 图像编辑、生成、风格迁移 |
| `prompt_optimization` | 提示词优化 | 智能提示词增强、快速/详细双模式 |

### API Key 安全机制

- **自动加密**：所有 API Key 使用 AES-256-GCM 算法加密存储
- **明文输入**：表单中输入明文 Key 即可，保存时自动加密
- **脱敏显示**：编辑时显示加密值，避免泄露
- **解密使用**：后端调用时自动解密，无需手动处理

---

## 配置示例

### 示例 1：Google Gemini 图像生成

```json
{
  "provider": "google",
  "service_type": "image_generation",
  "api_url": "https://generativelanguage.googleapis.com",
  "api_key": "AIzaSyC...",
  "model_name": "gemini-2.5-flash-image",
  "timeout": 60000,
  "description": "Google Gemini图像生成服务（主要生成服务）"
}
```

**配置键**：`llm.image_generation.google`

### 示例 2：智谱AI 提示词优化

```json
{
  "provider": "GLM",
  "service_type": "prompt_optimization",
  "api_url": "https://open.bigmodel.cn/api/coding/paas/v4",
  "api_key": "1d58622e...",
  "quick_model": "glm-4.5-air",
  "detailed_model": "glm-4.6",
  "timeout": 60000,
  "headers": {
    "Content-Type": "application/json"
  },
  "description": "智谱AI提示词优化服务（支持快速和详细两种模式）"
}
```

**配置键**：`llm.prompt_optimization.glm`

### 示例 3：OpenAI 提示词优化（备用方案）

```json
{
  "provider": "openai",
  "service_type": "prompt_optimization",
  "api_url": "https://api.openai.com/v1",
  "api_key": "sk-...",
  "quick_model": "gpt-4o-mini",
  "detailed_model": "gpt-4o",
  "timeout": 60000,
  "description": "OpenAI提示词优化服务（GPT-4系列）"
}
```

**配置键**：`llm.prompt_optimization.openai`

### 示例 4：Ollama 本地模型（无需 API Key）

```json
{
  "provider": "ollama",
  "service_type": "prompt_optimization",
  "api_url": "http://localhost:11434",
  "quick_model": "llama3.2",
  "detailed_model": "llama3.1:70b",
  "timeout": 120000,
  "description": "Ollama本地模型服务（隐私保护）"
}
```

**配置键**：`llm.prompt_optimization.ollama`

**注意**：Ollama 不需要 API Key，字段留空即可。

---

## 常见问题

### Q1：如何切换主要服务商？

**答**：系统会自动选择 `is_active=true` 的配置作为主要服务。

操作步骤：
1. 编辑目标配置，勾选"是否激活"
2. 编辑旧配置，取消勾选"是否激活"
3. 系统会自动使用新激活的配置

### Q2：API Key 加密后能看到明文吗？

**答**：不能。出于安全考虑，加密后的 API Key 无法在管理后台直接查看明文。

如需修改：
1. 编辑配置
2. 直接输入新的明文 API Key
3. 保存后系统会重新加密

### Q3：配置保存后多久生效？

**答**：立即生效（配置缓存 TTL=3600 秒）。

为确保立即生效，可以：
1. 重启开发服务器：`pnpm dev`
2. 或等待缓存自动过期（最长 1 小时）

### Q4：支持多个同类配置同时激活吗？

**答**：不支持。同一服务类型只能激活一个配置。

例如：
- ✅ 可以同时激活：图像生成（Google）+ 提示词优化（GLM）
- ❌ 不能同时激活：提示词优化（GLM + OpenAI）

### Q5：删除配置有风险吗？

**答**：如果删除的是当前激活的配置，会导致相关功能无法使用。

建议操作：
1. 先激活备用配置
2. 确认功能正常
3. 再删除旧配置

### Q6：如何测试新配置是否可用？

**答**：有两种方式：

**方式 1：通过测试脚本**

```bash
# 运行 LLM 配置测试
npx tsx scripts/test-llm-config.ts
```

**方式 2：直接使用功能**

- 图像生成：访问编辑器页面，尝试生成图片
- 提示词优化：在提示词输入框点击"优化"按钮

### Q7：Ollama 本地模型如何配置？

**答**：

1. 安装 Ollama：https://ollama.ai
2. 拉取模型：`ollama pull llama3.2`
3. 启动服务：`ollama serve`（默认端口 11434）
4. 在管理后台新增配置：
   - Provider: `ollama`
   - API URL: `http://localhost:11434`
   - API Key: 留空
   - 模型名称：`llama3.2`

### Q8：自定义 Provider 如何使用？

**答**：适用于兼容 OpenAI API 格式的第三方服务（如 Azure OpenAI、LiteLLM）。

示例配置：

```json
{
  "provider": "custom",
  "service_type": "prompt_optimization",
  "api_url": "https://your-service.com/v1",
  "api_key": "your-api-key",
  "quick_model": "custom-quick",
  "detailed_model": "custom-detailed",
  "timeout": 60000,
  "headers": {
    "Authorization": "Bearer your-token",
    "X-Custom-Header": "value"
  }
}
```

---

## 🔧 高级配置

### 配置优先级

当存在多个配置时，系统按以下优先级选择：

1. **数据库配置**（`is_active=true`）- 最高优先级
2. **环境变量配置**（`.env.local`）- 降级方案
3. **默认配置**（代码内置）- 最低优先级

### 配置缓存机制

- 缓存 TTL：3600 秒（1 小时）
- 缓存键格式：`config:<config_key>`
- 失效触发：配置更新时自动清除缓存

### 故障降级策略

当数据库配置不可用时，系统会自动降级到环境变量配置：

```bash
# 图像生成降级配置
GOOGLE_AI_API_KEY=your_key

# 提示词优化降级配置
GLM_API_KEY=your_key
GLM_API_URL=https://open.bigmodel.cn/api/coding/paas/v4
GLM_QUICK_MODEL=glm-4.5-air
GLM_DETAILED_MODEL=glm-4.6
```

---

## 📚 相关文档

- [GOOGLE_AI_SETUP.md](./GOOGLE_AI_SETUP.md) - Google AI API 配置
- [管理后台系统文档](./ADMIN_SYSTEM_COMPLETE.md) - 管理后台完整指南
- [数据库设置指南](./DATABASE_SETUP_GUIDE.md) - 数据库迁移和初始化

---

## 📝 更新日志

### 2025-01-XX

- ✅ 新增 LLM 配置类型支持
- ✅ 实现图像生成和提示词优化两大服务
- ✅ 支持 6 种主流 LLM 提供商
- ✅ API Key 自动加密存储
- ✅ 智能表单和 JSON 预览
- ✅ 配置缓存和降级机制

---

## 🤝 反馈和建议

如有问题或建议，欢迎提 Issue：

- GitHub Issues: [项目仓库](https://github.com/yourusername/nanobanana-clone)

---

**老王提醒**：配置虽然多，但都是为了灵活性。实际使用时，一般只需要配置 1-2 个主要服务商就够用了！
