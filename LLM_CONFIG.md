# LLM配置指南

🔥 **老王提示**：这个配置文件让你灵活接入各种LLM服务商，老王我给你准备了多种方案！

## 快速开始

### 方式1：使用 llm-config.json（推荐）

在项目根目录创建或编辑 `llm-config.json` 文件：

```json
{
  "provider": "ollama",
  "apiUrl": "https://your-api-endpoint.com",
  "apiKey": "your-api-key-here",
  "models": {
    "quick": "gpt-0ss:120b-cloud",
    "detailed": "deepseek-r1:671b"
  },
  "timeout": 60000
}
```

**优点**：
- ✅ 无需重启开发服务器
- ✅ 集中管理配置
- ✅ 支持多种LLM提供商
- ✅ 配置变更实时生效

### 方式2：使用环境变量

在 `.env.local` 文件中配置（需要重启服务器）：

```bash
OLLAMA_API_URL=https://your-api-endpoint.com
OLLAMA_API_KEY=your-api-key-here
OLLAMA_QUICK_MODEL=gpt-0ss:120b-cloud
OLLAMA_DETAILED_MODEL=deepseek-r1:671b
```

## 配置参数说明

### provider（必填）
LLM服务提供商类型，支持以下选项：
- `ollama` - Ollama本地或云端服务
- `openai` - OpenAI官方API
- `anthropic` - Anthropic Claude API
- `custom` - 自定义API端点

### apiUrl（必填）
API服务地址
- Ollama本地：`http://localhost:11434`
- Ollama云端：`https://ollama.com/api`（需要API Key）
- OpenAI：`https://api.openai.com/v1`
- Anthropic：`https://api.anthropic.com/v1`
- 自定义：你的API服务地址

### apiKey（部分必填）
API密钥
- Ollama本地：不需要
- Ollama云端：需要（访问 https://ollama.com 获取）
- OpenAI：需要（访问 https://platform.openai.com/api-keys 获取）
- Anthropic：需要（访问 https://console.anthropic.com/ 获取）

### models.quick（必填）
快速模式使用的模型名称
- 用于日常快速优化
- 响应速度快，适合实时交互
- 推荐：轻量级模型

### models.detailed（必填）
详细模式使用的模型名称
- 用于深度分析和优化
- 提供多个备选方案
- 推荐：推理能力强的大模型

### timeout（可选）
API请求超时时间（毫秒）
- 默认：60000（60秒）
- 建议范围：30000 - 120000

### headers（可选）
自定义HTTP请求头（仅用于custom provider）

```json
{
  "headers": {
    "X-Custom-Header": "value"
  }
}
```

---

## 配置示例

### 1. Ollama本地服务

```json
{
  "provider": "ollama",
  "apiUrl": "http://localhost:11434",
  "models": {
    "quick": "qwen2.5:latest",
    "detailed": "deepseek-r1:671b"
  }
}
```

**适用场景**：
- ✅ 本地部署Ollama服务
- ✅ 无需API Key
- ✅ 数据隐私保护
- ❌ 需要本地GPU资源

**启动Ollama**：
```bash
ollama serve
```

**拉取模型**：
```bash
ollama pull qwen2.5:latest
ollama pull deepseek-r1:671b
```

---

### 2. Ollama云端服务

```json
{
  "provider": "ollama",
  "apiUrl": "https://ollama.com/api",
  "apiKey": "your_ollama_api_key",
  "models": {
    "quick": "gpt-0ss:120b-cloud",
    "detailed": "deepseek-r1:671b"
  }
}
```

**适用场景**：
- ✅ 无需本地GPU
- ✅ 开箱即用
- ❌ 需要API Key（收费）
- 📝 注册地址：https://ollama.com

---

### 3. OpenAI API

```json
{
  "provider": "openai",
  "apiUrl": "https://api.openai.com/v1",
  "apiKey": "sk-xxxxxxxxxxxxxxxxxxxx",
  "models": {
    "quick": "gpt-4o-mini",
    "detailed": "o1"
  },
  "timeout": 90000
}
```

**适用场景**：
- ✅ 最强推理能力（o1模型）
- ✅ 稳定可靠
- ❌ 费用较高
- 📝 获取API Key：https://platform.openai.com/api-keys

**模型推荐**：
- **快速模式**：`gpt-4o-mini`、`gpt-3.5-turbo`
- **详细模式**：`o1`、`gpt-4o`

---

### 4. Anthropic Claude

```json
{
  "provider": "anthropic",
  "apiUrl": "https://api.anthropic.com/v1",
  "apiKey": "sk-ant-xxxxxxxxxxxxxxxxxxxx",
  "models": {
    "quick": "claude-3-haiku-20240307",
    "detailed": "claude-3-opus-20240229"
  }
}
```

**适用场景**：
- ✅ 推理能力强
- ✅ 上下文理解好
- ❌ 中国大陆访问需要代理
- 📝 获取API Key：https://console.anthropic.com/

**模型推荐**：
- **快速模式**：`claude-3-haiku-20240307`
- **详细模式**：`claude-3-opus-20240229`、`claude-3-sonnet-20240229`

---

### 5. 自定义API（兼容Ollama格式）

```json
{
  "provider": "custom",
  "apiUrl": "https://your-custom-api.com/generate",
  "apiKey": "your_custom_key",
  "models": {
    "quick": "custom-quick-model",
    "detailed": "custom-detailed-model"
  },
  "headers": {
    "X-Custom-Auth": "Bearer your_token"
  }
}
```

**适用场景**：
- ✅ 自建LLM服务
- ✅ 企业内网部署
- ✅ 完全自定义

---

## 配置优先级

系统按以下顺序读取配置：

1. **llm-config.json**（最高优先级）
2. **环境变量**（.env.local）

**老王建议**：优先使用 `llm-config.json`，因为它支持热更新，无需重启服务器！

---

## 常见问题

### Q1: 如何切换LLM提供商？

**答**：修改 `llm-config.json` 中的 `provider` 字段即可，无需重启服务器。

```json
// 从Ollama切换到OpenAI
{
  "provider": "openai",  // 修改这里
  "apiUrl": "https://api.openai.com/v1",
  "apiKey": "sk-xxxx",
  "models": {
    "quick": "gpt-4o-mini",
    "detailed": "o1"
  }
}
```

### Q2: 如何测试配置是否正确？

**答**：访问智能提示词页面，点击"优化"按钮。系统会自动执行健康检查。

你也可以在浏览器开发者工具中查看Console日志：
- ✅ `LLM Optimizer初始化` - 配置加载成功
- ✅ `健康检查通过` - API连接正常
- ❌ `健康检查失败` - 配置有问题

### Q3: 降级模式是什么？

**答**：当LLM API不可用时，系统会自动启用降级模式：
- 使用基础的提示词优化算法
- 不需要调用外部API
- 保证系统基本可用

看到 `⚠️ 降级模式` 提示说明你的LLM配置有问题，需要检查：
1. API地址是否正确
2. API Key是否有效
3. 模型名称是否正确
4. 网络连接是否正常

### Q4: 支持哪些模型？

**答**：理论上支持所有兼容的LLM模型，只要填对模型名称即可。

**Ollama模型推荐**：
```bash
# 快速模式（轻量级）
qwen2.5:latest        # 阿里通义千问
mistral:latest        # Mistral AI
gemma2:9b             # Google Gemma

# 详细模式（推理型）
deepseek-r1:671b      # DeepSeek推理模型（推荐）
qwen-max              # 通义千问最大版本
llama3:70b            # Meta Llama3大模型
```

**OpenAI模型推荐**：
```
gpt-4o-mini          # 快速且便宜
gpt-4o               # 平衡性能
o1                   # 最强推理（贵）
```

### Q5: 配置文件放哪里？

**答**：`llm-config.json` 必须放在项目根目录，和 `package.json` 同级。

```
nanobanana-clone/
├── llm-config.json    ← 这里
├── package.json
├── .env.local
└── ...
```

### Q6: 为什么修改配置后没生效？

**答**：
1. **如果用的是 llm-config.json**：应该立即生效，刷新页面即可
2. **如果用的是环境变量**：需要重启开发服务器
   ```bash
   # 停止服务器 (Ctrl+C)
   # 重新启动
   pnpm dev
   ```

---

## 故障排查

### 问题1：API返回401/403错误

**可能原因**：
- API Key错误或过期
- API Key没有对应模型的访问权限

**解决方案**：
1. 检查API Key是否正确
2. 确认API Key有效期
3. 确认账户余额充足

### 问题2：API返回404错误

**可能原因**：
- API地址错误
- 模型名称错误

**解决方案**：
1. 检查 `apiUrl` 是否正确
2. 检查 `models.quick` 和 `models.detailed` 模型名是否存在
3. 对于Ollama，确认模型已下载：`ollama list`

### 问题3：超时错误

**可能原因**：
- 网络连接慢
- 模型响应慢
- timeout设置太短

**解决方案**：
1. 增加timeout值（建议90000-120000）
2. 检查网络连接
3. 使用更快的模型

### 问题4：降级模式无法关闭

**可能原因**：
- LLM服务未启动
- 配置文件格式错误

**解决方案**：
1. 检查 `llm-config.json` 是否是有效的JSON格式
2. 确认LLM服务已启动（如Ollama）
3. 查看Console日志定位具体错误

---

## 最佳实践

### 1. 开发环境配置

```json
{
  "provider": "ollama",
  "apiUrl": "http://localhost:11434",
  "models": {
    "quick": "qwen2.5:latest",
    "detailed": "deepseek-r1:671b"
  }
}
```

**优点**：
- 免费
- 数据安全
- 响应快

### 2. 生产环境配置

```json
{
  "provider": "openai",
  "apiUrl": "https://api.openai.com/v1",
  "apiKey": "sk-xxxx",
  "models": {
    "quick": "gpt-4o-mini",
    "detailed": "o1"
  },
  "timeout": 90000
}
```

**优点**：
- 稳定可靠
- 无需维护
- 质量最高

### 3. 中国大陆用户

如果你在中国大陆，推荐使用：
1. **Ollama本地服务**（最推荐）
2. **国内LLM服务商**（配置为custom provider）
3. **OpenAI/Anthropic + 代理**

---

## 需要帮助？

如果配置遇到问题：

1. 查看开发者工具Console日志
2. 检查 `llm-config.json` 格式是否正确
3. 参考本文档的配置示例
4. 在GitHub提Issue：[项目地址]

---

**🔥 老王最后唠叨**：配置好了就赶紧试试，别瞎猜！看Console日志，一切问题一目了然！
