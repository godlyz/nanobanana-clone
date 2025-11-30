# Nano Banana 用户指南补充 / User Guide Supplement

**版本**: 2.1 (补充工具页面和移动编辑器)
**最后更新**: 2025-11-23
**适用对象**: Phase 1 & Phase 2 功能完整说明

> 📘 **说明**: 本文档是 [`USER_GUIDE.md`](./USER_GUIDE.md) 的补充，专门介绍工具页面、移动编辑器和API故障排除。

---

## 📖 目录 / Table of Contents

1. [专用工具页面 / Dedicated Tool Pages](#专用工具页面--dedicated-tool-pages)
2. [移动编辑器 / Mobile Editor](#移动编辑器--mobile-editor)
3. [API 故障排除指南 / API Troubleshooting Guide](#api-故障排除指南--api-troubleshooting-guide)
4. [最佳实践和技巧 / Best Practices and Tips](#最佳实践和技巧--best-practices-and-tips)

---

## 专用工具页面 / Dedicated Tool Pages

Nano Banana 为每个AI功能提供了专用的工具页面，优化了工作流程和用户体验。

### 1. 视频生成工具 / Video Generation Tool

**访问路径** / Path: `/tools/video-generation`

**功能** / Features:
- 文本转视频（Text-to-Video）
- 图像转视频（Image-to-Video）
- 参考帧模式（Reference Images）
- 首尾帧模式（First-Last Frame）

**使用方法** / Usage:

1. **选择生成模式** / Select Generation Mode:
   ```
   📝 Text-to-Video: 仅用文字描述生成视频
   🖼️ Image-to-Video: 上传一张图片作为起始帧
   🎬 Reference Images: 上传多张参考图片（2-4张）
   ```

2. **输入提示词** / Enter Prompt:
   - **推荐格式** / Recommended Format:
     ```
     [主题] + [动作] + [环境] + [镜头运动] + [风格]

     示例 / Example:
     "一只橙色小猫在阳光明媚的花园里追逐蝴蝶，慢镜头跟随，电影般的灯光"
     "Orange kitten chasing butterflies in sunny garden, slow motion tracking shot, cinematic lighting"
     ```

3. **配置参数** / Configure Parameters:
   - **时长** / Duration: 4秒 / 6秒 / 8秒
   - **分辨率** / Resolution: 720p (推荐延长功能) / 1080p (更高质量)
   - **长宽比** / Aspect Ratio: 16:9 (横屏) / 9:16 (竖屏)
   - **人物生成** / Person Generation:
     - Allow All People (允许所有人物)
     - Adults Only (仅成人人物)
     - Don't Allow (不生成人物)

4. **查看积分消耗** / View Credit Cost:
   ```
   积分消耗计算公式 / Credit Calculation:
   基础积分 = 时长(秒) × 10
   分辨率倍数 = 720p: 1.0x | 1080p: 1.5x

   示例 / Examples:
   - 4s 720p = 40积分 (4 × 10 × 1.0)
   - 6s 1080p = 90积分 (6 × 10 × 1.5)
   - 8s 720p = 80积分 (8 × 10 × 1.0)
   ```

5. **生成视频** / Generate Video:
   - 点击"生成视频"按钮
   - 系统创建异步任务
   - 自动跳转到状态追踪页面 `/video-status/[task_id]`
   - 预计等待时间：2-5分钟

**提示词技巧** / Prompt Tips:
- ✅ 具体描述动作和场景（"小猫跳跃"而非"小猫"）
- ✅ 添加镜头运动（"镜头缓慢推进""俯视拍摄"）
- ✅ 描述光线和氛围（"金色黄昏""柔和自然光"）
- ❌ 避免过度复杂的描述（超过3个动作）
- ❌ 避免违禁内容（暴力、成人内容、政治敏感）

---

### 2. 背景移除工具 / Background Remover Tool

**访问路径** / Path: `/tools/background-remover`

**功能** / Features:
- 自动抠图（Automatic Matting）
- 智能边缘检测（Smart Edge Detection）
- 透明背景输出（PNG with Transparency）

**使用方法** / Usage:

1. **上传图片** / Upload Image:
   - 支持格式：JPG, PNG, WebP
   - 推荐尺寸：800×800px - 2048×2048px
   - 最大文件：10MB

2. **点击"移除背景"** / Click "Remove Background":
   - AI自动识别前景对象
   - 处理时间：5-15秒

3. **预览和下载** / Preview and Download:
   - 查看透明背景预览
   - 点击"下载"保存PNG格式

**适用场景** / Use Cases:
- 产品摄影（Product Photography）
- 人物照片（Portrait Photos）
- Logo设计（Logo Design）
- 社交媒体头像（Social Media Avatars）

**最佳实践** / Best Practices:
- ✅ 使用清晰、对焦准确的图片
- ✅ 主体与背景对比明显
- ✅ 避免复杂背景（如头发、透明物体）
- ⚠️ 精细边缘（头发、毛发）需要手动调整

---

### 3. 角色一致性工具 / Character Consistency Tool

**访问路径** / Path: `/tools/character-consistency`

**功能** / Features:
- 保持角色特征（Maintain Character Features）
- 多场景一致性（Multi-scene Consistency）
- 风格迁移（Style Transfer）

**使用方法** / Usage:

1. **上传参考角色** / Upload Reference Character:
   - 上传清晰的角色正面照
   - AI提取角色特征（面部、服装、风格）

2. **输入新场景提示词** / Enter New Scene Prompt:
   ```
   示例 / Example:
   "这个角色站在雪山顶峰，穿着登山服，背景是日出"
   "This character standing on snowy mountain peak, wearing climbing gear, sunrise background"
   ```

3. **生成新场景** / Generate New Scene:
   - AI生成保持角色特征的新图像
   - 处理时间：10-20秒

**适用场景** / Use Cases:
- 故事板创作（Storyboard Creation）
- 角色设计迭代（Character Design Iteration）
- 多场景插画（Multi-scene Illustrations）

---

### 4. 场景保留工具 / Scene Preservation Tool

**访问路径** / Path: `/tools/scene-preservation`

**功能** / Features:
- 保持背景不变（Maintain Background）
- 修改前景对象（Modify Foreground Objects）
- 局部编辑（Local Editing）

**使用方法** / Usage:

1. **上传原始图片** / Upload Original Image:
   - 上传要保留场景的图片

2. **描述修改内容** / Describe Modifications:
   ```
   示例 / Example:
   原图：森林中的小屋
   提示词："将小屋换成现代玻璃房子，保持森林背景不变"

   Original: Cabin in forest
   Prompt: "Replace cabin with modern glass house, keep forest background unchanged"
   ```

3. **生成结果** / Generate Result:
   - AI保留背景场景
   - 仅修改指定对象

**适用场景** / Use Cases:
- 建筑设计可视化（Architectural Visualization）
- 产品展示（Product Display）
- 场景概念设计（Scene Concept Design）

---

### 5. 一键编辑工具 / One-Shot Edit Tool

**访问路径** / Path: `/tools/one-shot`

**功能** / Features:
- 快速AI编辑（Quick AI Editing）
- 智能建议（Smart Suggestions）
- 一键优化（One-Click Enhancement）

**使用方法** / Usage:

1. **上传图片** / Upload Image:
   - 任意图片格式

2. **选择编辑类型** / Select Edit Type:
   - **风格化** / Stylize: 转换艺术风格
   - **增强** / Enhance: 提升画质和细节
   - **调色** / Color Grading: 电影级调色
   - **修复** / Restore: 修复老照片

3. **一键应用** / One-Click Apply:
   - 点击对应按钮即可完成编辑

**适用场景** / Use Cases:
- 快速美化照片（Quick Photo Enhancement）
- 批量风格统一（Batch Style Unification）
- 老照片修复（Old Photo Restoration）

---

### 6. 多图处理工具 / Multi-Image Tool

**访问路径** / Path: `/tools/multi-image`

**功能** / Features:
- 批量处理（Batch Processing）
- 风格统一（Style Unification）
- 组合生成（Composite Generation）

**使用方法** / Usage:

1. **上传多张图片** / Upload Multiple Images:
   - 支持同时上传2-10张图片
   - 拖拽排序调整顺序

2. **选择处理模式** / Select Processing Mode:
   - **批量风格化** / Batch Stylize: 统一艺术风格
   - **组合创作** / Composite Create: 融合多图元素
   - **批量背景移除** / Batch Background Removal

3. **批量生成** / Batch Generate:
   - 系统依次处理所有图片
   - 可下载单张或批量打包

**适用场景** / Use Cases:
- 作品集创作（Portfolio Creation）
- 产品系列图（Product Series Images）
- 社交媒体内容（Social Media Content）

---

## 移动编辑器 / Mobile Editor

专为移动设备优化的编辑体验。

### 移动编辑器入口 / Mobile Editor Entry

**访问路径** / Path: `/mobile-editor`

**设备要求** / Device Requirements:
- iOS 15+ (Safari, Chrome)
- Android 10+ (Chrome, Firefox, Edge)
- 屏幕尺寸：≥5英寸（推荐）

**自动检测** / Auto-Detection:
- 系统自动检测移动设备
- 桌面访问时显示提示："建议使用移动设备访问获得最佳体验"

---

### 移动对话编辑 / Mobile Chat Editor

**访问路径** / Path: `/mobile-editor/chat`

**功能** / Features:
- 对话式AI编辑（Conversational AI Editing）
- 语音输入支持（Voice Input Support）
- 实时预览（Real-time Preview）

**使用方法** / Usage:

1. **启动对话** / Start Conversation:
   - 点击麦克风图标（语音输入）或文字输入框
   - 描述你想要的编辑

2. **对话示例** / Conversation Example:
   ```
   你: "生成一张海滩日落的图片"
   AI: [生成图片]
   你: "让天空更加红色"
   AI: [调整图片]
   你: "添加一只海鸥"
   AI: [添加元素]
   ```

3. **保存结果** / Save Result:
   - 满意后点击"保存"
   - 图片自动保存到相册（需授权）

**移动端优化** / Mobile Optimizations:
- ✅ 触摸优化的UI组件
- ✅ 手势缩放和平移
- ✅ 低数据模式（在弱网下优化图片质量）
- ✅ 离线缓存（草稿本地保存）

---

### 移动图像编辑 / Mobile Image Editor

**访问路径** / Path: `/mobile-editor/image`

**功能** / Features:
- 触摸绘制（Touch Drawing）
- 图层管理（Layer Management）
- 快速滤镜（Quick Filters）

**使用方法** / Usage:

1. **上传或拍摄** / Upload or Capture:
   - 点击"相机"图标直接拍摄
   - 或从相册选择图片

2. **使用编辑工具** / Use Editing Tools:
   - **画笔** / Brush: 触摸绘制
   - **橡皮擦** / Eraser: 手指擦除
   - **文字** / Text: 添加文字标注
   - **贴纸** / Stickers: 添加表情和装饰

3. **应用AI功能** / Apply AI Features:
   - 点击底部工具栏的AI图标
   - 选择AI功能（背景移除、风格化等）

**手势操作** / Gesture Controls:
- **双指捏合** / Pinch: 缩放画布
- **双指拖动** / Two-Finger Drag: 平移画布
- **长按** / Long Press: 显示更多选项
- **双击** / Double Tap: 适应屏幕

---

### 移动端性能优化 / Mobile Performance Optimization

**优化功能** / Optimization Features:

1. **自适应图片质量** / Adaptive Image Quality:
   - 自动检测网络速度
   - 弱网环境降低图片质量
   - 强网环境提供高清预览

2. **渐进式加载** / Progressive Loading:
   - 先显示低分辨率预览
   - 逐步加载高分辨率版本

3. **电池优化** / Battery Optimization:
   - 降低动画帧率
   - 减少后台处理
   - 测试数据：每30分钟编辑消耗<10%电量

4. **离线模式** / Offline Mode (实验性 / Experimental):
   - 基础编辑功能离线可用
   - 草稿本地保存
   - 在线时自动同步

**性能指标** / Performance Metrics:
- Lighthouse Performance Score: ≥90
- First Contentful Paint: ≤1.5秒
- Time to Interactive: ≤3.0秒

---

## API 故障排除指南 / API Troubleshooting Guide

使用Nano Banana API时可能遇到的常见错误及解决方案。

### 常见HTTP错误代码 / Common HTTP Error Codes

#### 1. 401 Unauthorized（未授权）

**错误信息** / Error Message:
```json
{
  "error": "Invalid API key",
  "code": "INVALID_API_KEY"
}
```

**可能原因** / Possible Causes:
- API密钥错误或已过期
- 请求头缺少 `Authorization` 字段
- API密钥格式不正确

**解决方案** / Solutions:
1. **检查API密钥格式** / Check API Key Format:
   ```bash
   # 正确格式 / Correct Format
   Authorization: Bearer sk_live_xxxxxxxxxxxxx

   # 错误格式 / Wrong Format
   Authorization: sk_live_xxxxxxxxxxxxx  # ❌ 缺少 Bearer
   ```

2. **重新生成API密钥** / Regenerate API Key:
   - 访问 `/developer` → API Keys
   - 删除旧密钥
   - 创建新密钥并替换

3. **检查环境变量** / Check Environment Variables:
   ```bash
   # .env 文件
   NANO_BANANA_API_KEY=sk_live_xxxxxxxxxxxxx
   ```

---

#### 2. 403 Forbidden（禁止访问）

**错误信息** / Error Message:
```json
{
  "error": "Insufficient permissions",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**可能原因** / Possible Causes:
- API密钥权限不足
- 账号订阅等级不支持此功能
- IP地址被限制

**解决方案** / Solutions:
1. **检查订阅等级** / Check Subscription Tier:
   - Basic: 基础功能
   - Pro: 高级功能 + 优先队列
   - Max: 全部功能

2. **升级订阅** / Upgrade Subscription:
   - 访问 `/pricing` 选择更高等级

3. **检查IP白名单** / Check IP Whitelist:
   - 访问 `/developer` → Security
   - 添加当前IP到白名单

---

#### 3. 429 Too Many Requests（请求过多）

**错误信息** / Error Message:
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 60,
  "limit": 100,
  "reset_at": "2025-11-23T12:34:56Z"
}
```

**可能原因** / Possible Causes:
- 超过API速率限制
- 短时间内大量请求

**速率限制** / Rate Limits:
| 订阅等级 | 每分钟请求数 | 每天请求数 |
|---------|-------------|-----------|
| Basic   | 100         | 10,000    |
| Pro     | 500         | 50,000    |
| Max     | 1000        | 100,000   |

**解决方案** / Solutions:
1. **实现指数退避** / Implement Exponential Backoff:
   ```javascript
   async function retryWithBackoff(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn()
       } catch (error) {
         if (error.status === 429) {
           const waitTime = Math.pow(2, i) * 1000 // 1s, 2s, 4s...
           await new Promise(resolve => setTimeout(resolve, waitTime))
         } else {
           throw error
         }
       }
     }
   }
   ```

2. **使用请求队列** / Use Request Queue:
   ```javascript
   import PQueue from 'p-queue'

   const queue = new PQueue({ concurrency: 10 })

   // 添加请求到队列
   queue.add(() => fetchAPI('/generate'))
   ```

3. **升级订阅以获得更高限额** / Upgrade for Higher Limits

---

#### 4. 402 Payment Required（需要支付）

**错误信息** / Error Message:
```json
{
  "error": "Insufficient credits",
  "code": "INSUFFICIENT_CREDITS",
  "required": 80,
  "available": 15
}
```

**可能原因** / Possible Causes:
- 积分余额不足
- 订阅已过期

**解决方案** / Solutions:
1. **检查积分余额** / Check Credit Balance:
   ```bash
   curl -H "Authorization: Bearer sk_live_xxx" \
     https://api.nanobanana.com/v1/credits/balance
   ```

2. **充值积分** / Top-up Credits:
   - 方式1: 升级订阅计划
   - 方式2: 完成成就解锁
   - 方式3: 等待下月自动充值

3. **优化积分使用** / Optimize Credit Usage:
   - 生成720p视频而非1080p（节省33%积分）
   - 缩短视频时长（8s → 6s → 4s）

---

#### 5. 500 Internal Server Error（服务器内部错误）

**错误信息** / Error Message:
```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "request_id": "req_1234567890"
}
```

**可能原因** / Possible Causes:
- 服务器临时故障
- 数据库连接问题
- AI模型服务不可用

**解决方案** / Solutions:
1. **重试请求** / Retry Request:
   - 等待5-10秒后重试
   - 使用指数退避策略

2. **检查系统状态** / Check System Status:
   - 访问 https://status.nanobanana.com
   - 查看是否有计划维护或故障公告

3. **联系支持** / Contact Support:
   - 提供 `request_id`（如 `req_1234567890`）
   - 发送邮件到 support@nanobanana.com
   - 预计响应时间：工作日24小时内

---

### 视频生成专用错误 / Video Generation Specific Errors

#### Error: PROMPT_CONTAINS_PROHIBITED_CONTENT

**错误信息** / Error Message:
```json
{
  "error": "Prompt contains prohibited content",
  "code": "PROMPT_CONTAINS_PROHIBITED_CONTENT",
  "flagged_keywords": ["violence", "gore"]
}
```

**解决方案** / Solutions:
1. **移除敏感词** / Remove Sensitive Words:
   - 检查提示词中的暴力、成人、政治敏感内容
   - 重新表述提示词

2. **查看内容政策** / Review Content Policy:
   - 访问 `/content-policy` 了解详细规则

---

#### Error: INSUFFICIENT_CREDITS_FOR_RESOLUTION

**错误信息** / Error Message:
```json
{
  "error": "Insufficient credits for selected resolution",
  "code": "INSUFFICIENT_CREDITS_FOR_RESOLUTION",
  "required_credits": 120,
  "available_credits": 50,
  "suggestion": "Try 720p resolution or shorter duration"
}
```

**解决方案** / Solutions:
1. **降低分辨率** / Lower Resolution:
   - 1080p → 720p（节省33%积分）

2. **缩短时长** / Shorten Duration:
   - 8s → 6s → 4s

3. **充值积分** / Top-up Credits

---

#### Error: VIDEO_EXTENSION_NOT_SUPPORTED

**错误信息** / Error Message:
```json
{
  "error": "Video extension not supported for 1080p videos",
  "code": "VIDEO_EXTENSION_NOT_SUPPORTED",
  "video_resolution": "1080p",
  "supported_resolutions": ["720p"]
}
```

**解决方案** / Solutions:
- **重新生成720p视频** / Regenerate as 720p:
  - 只有720p视频支持延长功能
  - 这是Google Veo API的技术限制

---

### API响应时间过长 / API Response Timeout

**问题描述** / Problem Description:
请求超过60秒未响应。

**可能原因** / Possible Causes:
- 视频生成队列拥堵
- 网络连接不稳定
- 服务器负载过高

**解决方案** / Solutions:
1. **使用异步API** / Use Async API:
   ```javascript
   // ❌ 同步等待（可能超时）
   const video = await generateVideo({ prompt: "..." })

   // ✅ 异步轮询（推荐）
   const task = await createVideoTask({ prompt: "..." })
   const taskId = task.id

   // 轮询任务状态
   let status = 'processing'
   while (status === 'processing') {
     await sleep(5000) // 每5秒检查一次
     const result = await getTaskStatus(taskId)
     status = result.status
   }
   ```

2. **增加超时时间** / Increase Timeout:
   ```javascript
   const response = await fetch('/api/generate', {
     timeout: 300000 // 5分钟超时
   })
   ```

3. **使用Webhook回调** / Use Webhook Callbacks:
   ```javascript
   const task = await createVideoTask({
     prompt: "...",
     webhook_url: "https://your-domain.com/webhook"
   })

   // 服务器完成后会POST结果到webhook_url
   ```

---

## 最佳实践和技巧 / Best Practices and Tips

### 提示词工程 / Prompt Engineering

**1. 结构化提示词模板** / Structured Prompt Template

```
[主体] + [动作/状态] + [环境/背景] + [光线/氛围] + [镜头/风格]

示例 / Example:
"一只金色拉布拉多犬 + 在草地上快乐奔跑 + 阳光明媚的公园 + 柔和自然光 + 跟随镜头,电影风格"

"Golden Labrador + running joyfully on grass + sunny park + soft natural lighting + tracking shot, cinematic style"
```

**2. 避免常见错误** / Avoid Common Mistakes

❌ **过于简单**:
```
"猫"
"cat"
```

✅ **具体描述**:
```
"一只橙色虎斑猫坐在窗台上晒太阳,背景是城市天际线,温暖的下午光线"
"Orange tabby cat sitting on windowsill basking in sunlight, city skyline background, warm afternoon light"
```

---

**3. 高级技巧** / Advanced Tips

**技巧1: 使用艺术风格参考** / Tip 1: Use Art Style References
```
"水彩画风格" / "watercolor style"
"油画笔触" / "oil painting brushstrokes"
"赛博朋克风格" / "cyberpunk style"
"吉卜力工作室风格" / "Studio Ghibli style"
```

**技巧2: 镜头运动描述** / Tip 2: Describe Camera Movements
```
"镜头缓慢推进" / "slow camera push in"
"俯视拍摄" / "aerial shot"
"跟随镜头" / "tracking shot"
"升降镜头" / "crane shot"
```

**技巧3: 控制细节程度** / Tip 3: Control Detail Level
```
高细节: "ultra detailed, 8k, photorealistic"
艺术风格: "abstract, impressionist, loose brushstrokes"
简约风格: "minimalist, clean lines, simple composition"
```

---

### 积分管理最佳实践 / Credit Management Best Practices

**1. 优化积分使用** / Optimize Credit Usage

| 操作 | 原积分消耗 | 优化后 | 节省 |
|------|----------|--------|------|
| 8s 1080p视频 | 120积分 | 6s 720p | 节省60积分 (50%) |
| 多次重试生成 | 200积分 | 精细化提示词一次成功 | 节省120积分 (60%) |
| 图像生成 | 20积分 | 使用参考图片 | 节省10积分 (50%) |

**2. 积分预算规划** / Credit Budget Planning

```
月度规划示例 / Monthly Planning Example:

Basic计划 (1000积分/月):
- 视频生成: 10个6s 720p视频 (600积分)
- 图像生成: 20张图片 (200积分)
- 视频延长: 3次 (120积分)
- 剩余备用: 80积分

Pro计划 (3500积分/月):
- 视频生成: 40个6s 720p视频 (2400积分)
- 图像生成: 50张图片 (500积分)
- 视频延长: 10次 (400积分)
- 剩余备用: 200积分
```

**3. 应急策略** / Emergency Strategies

**积分即将用完时** / When Credits Running Low:
1. 优先完成重要项目
2. 降低视频分辨率和时长
3. 使用成就系统赚取免费积分
4. 暂时使用免费功能（浏览、评论、点赞）

---

### 文件管理最佳实践 / File Management Best Practices

**1. 命名规范** / Naming Conventions

```bash
# 推荐格式 / Recommended Format
[项目]_[类型]_[日期]_[版本].[扩展名]

示例 / Examples:
- sunset_beach_video_20251123_v1.mp4
- cat_portrait_image_20251123_final.png
- product_showcase_video_20251123_draft.mp4
```

**2. 文件组织** / File Organization

```
项目文件夹结构 / Project Folder Structure:

my_nano_banana_projects/
├── videos/
│   ├── 2025-11/
│   │   ├── sunset_beach_v1.mp4
│   │   └── sunset_beach_v2.mp4
│   └── 2025-10/
├── images/
│   ├── portraits/
│   └── landscapes/
└── references/
    ├── prompts.txt
    └── style_references/
```

**3. 备份策略** / Backup Strategy

- ✅ 本地备份：定期下载重要作品
- ✅ 云端同步：使用Nano Banana云存储（Pro/Max计划）
- ✅ 版本管理：保留多个版本以便回滚

---

### 性能优化技巧 / Performance Optimization Tips

**1. 批量操作** / Batch Operations

```javascript
// ❌ 逐个处理（慢）
for (const image of images) {
  await processImage(image)
}

// ✅ 批量处理（快）
const tasks = images.map(image => processImage(image))
await Promise.all(tasks)
```

**2. 缓存优化** / Caching Optimization

```javascript
// 使用本地缓存避免重复请求
const cache = new Map()

async function getCachedResult(key, fetcher) {
  if (cache.has(key)) {
    return cache.get(key)
  }
  const result = await fetcher()
  cache.set(key, result)
  return result
}
```

**3. 网络优化** / Network Optimization

- ✅ 使用渐进式JPEG/WebP格式
- ✅ 启用HTTP/2多路复用
- ✅ 使用CDN加速静态资源
- ✅ 压缩API请求和响应

---

## 📚 相关资源 / Related Resources

- [完整用户指南](./USER_GUIDE.md) - 基础功能和社交功能
- [API参考文档](./API_REFERENCE.md) - 完整API接口说明
- [社区规范](./COMMUNITY_GUIDELINES.md) - 行为准则和内容规范
- [移动端性能优化报告](./MOBILE_PERFORMANCE_OPTIMIZATION.md) - 技术细节
- [Full User Guide](./USER_GUIDE.md) - Basic and Social Features
- [API Reference](./API_REFERENCE.md) - Complete API Documentation
- [Community Guidelines](./COMMUNITY_GUIDELINES.md) - Code of Conduct
- [Mobile Performance Report](./MOBILE_PERFORMANCE_OPTIMIZATION.md) - Technical Details

---

## 📝 更新日志 / Changelog

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| 2.1 | 2025-11-23 | 新增工具页面使用说明、移动编辑器详解、API故障排除指南 |

---

**感谢使用Nano Banana！** 🎨✨
**如有任何问题，请访问 [帮助中心](/help) 或联系 support@nanobanana.com**

**Thank you for using Nano Banana!** 🎨✨
**For any questions, visit [Help Center](/help) or contact support@nanobanana.com**
