# Google AI API 配置指南

## 概述

本项目已从 OpenRouter + OpenAI 方案迁移到 Google GenAI SDK，直接调用 Google Gemini API 进行图像生成和编辑。

## 配置步骤

### 1. 获取 Google AI API Key

1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 登录您的 Google 账户
3. 点击 "Create API Key"
4. 复制生成的 API Key

### 2. 配置环境变量

在项目根目录的 `.env.local` 文件中添加：

```bash
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

将 `your_google_ai_api_key_here` 替换为您在第1步中获取的实际 API Key。

### 3. 使用的模型

当前配置使用以下 Gemini 模型：
- **模型名称**: `gemini-2.5-flash-image-preview`
- **功能**: 支持图像编辑、多模态输入（文本+图像）
- **输出**: 结构化JSON响应，包含编辑后的图像和描述

## API 功能

### 支持的操作
- 图像编辑（基于文本提示修改现有图像）
- 多图像输入处理
- 同时生成图像和文本描述
- Base64 图像数据编码/解码

### 响应格式

API 返回JSON格式的响应：

```json
{
  "success": true,
  "type": "image", // 或 "text"
  "result": "data:image/jpeg;base64,/9j/4AAQ...", // Base64图像URL
  "text": "编辑描述文本"
}
```

## 错误处理

常见错误及解决方案：

1. **API Key 未配置**
   - 错误信息：`Google AI API key is not configured`
   - 解决：检查 `.env.local` 文件中的 `GOOGLE_AI_API_KEY` 是否正确设置

2. **API Key 无效**
   - 错误信息：`Request had invalid authentication credentials`
   - 解决：验证 API Key 是否正确，或重新生成新的 API Key

3. **配额超限**
   - 错误信息：`User quota exceeded`
   - 解决：检查 Google Cloud Console 中的 API 配额设置

## 成本和配额

- **免费配额**: Google AI API 提供一定的免费使用额度
- **计费方式**: 按使用的 token 数量计费
- **配额管理**: 可在 [Google Cloud Console](https://console.cloud.google.com/) 中监控和调整配额

## 技术细节

### 依赖包
```json
{
  "@google/generative-ai": "^0.24.1"
}
```

### 代码实现
主要实现在 `app/api/generate/route.ts` 文件中：

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "")
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-image-preview",
  generationConfig: {
    // 配置参数...
  }
})
```

### 图像处理
- 支持多种图像格式（JPEG、PNG等）
- 自动检测和转换图像MIME类型
- 优化的Base64编码处理

## 迁移说明

如果您是从之前的 OpenRouter 方案迁移而来：

1. **已更改**：
   - SDK 从 `openai` 更换为 `@google/generative-ai`
   - 环境变量从 `OPENROUTER_API_KEY` 更换为 `GOOGLE_AI_API_KEY`
   - API 调用方式完全重构

2. **保持不变**：
   - API 端点路径：`/api/generate`
   - 请求/响应格式
   - 前端调用逻辑

3. **改进**：
   - 更直接的 Google API 调用
   - 更稳定的连接和响应
   - 更好的错误处理
   - 支持结构化输出

## 测试

配置完成后，可以通过以下方式测试：

1. 启动开发服务器：`pnpm dev`
2. 访问图像编辑页面
3. 上传图像并输入编辑提示
4. 检查控制台日志和响应结果

如遇问题，请查看浏览器控制台和服务器终端日志获取详细错误信息。