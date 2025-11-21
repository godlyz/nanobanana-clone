# 视频延长功能 - 完整实施文档

> **文档性质**: 技术实施指南，包含API设计、数据库设计、UI设计、测试计划
>
> **创建日期**: 2025-11-19
>
> **维护者**: 老王（技术流·暴躁派）
>
> **状态**: 📋 实施规划中，待Task 5（视频生成基础功能）完成后执行

---

## 📚 相关文档索引

| 文档 | 用途 | 状态 |
|------|------|------|
| [VIDEO_GENERATION_API.md](./VIDEO_GENERATION_API.md) | API完整规范 | ✅ 已完成 |
| [openspec/specs/video-generation/spec.md](./openspec/specs/video-generation/spec.md) | OpenSpec需求规范 | ✅ 已更新 |
| [TODO.md](./TODO.md) | 项目主控任务清单（Task 6） | ✅ 已添加 |
| [CHANGELOG.md](./CHANGELOG.md) | 变更日志 | ⏳ 实施后更新 |

---

## 🎯 需求背景

### 业务需求

通过研究 Google Gemini Veo 3.1 API 官方文档，发现了**未实现的核心功能**：

1. **视频延长（extend-video）**
   - 用户生成4秒视频后，希望延长到11秒、18秒等
   - 支持延长链（最多20次延长，最长144秒）
   - 避免重新生成（更便宜、更快、内容连贯）

2. **参数限制验证**
   - 不同模式对参数支持不同（如reference-images只支持16:9）
   - 当前系统缺少前置验证，导致API调用失败后才发现错误
   - 需要在前端和后端两层验证

3. **人物生成控制**
   - 不同模式对personGeneration支持不同
   - 地区限制（EU/UK等只能用allow_adult）
   - 当前系统未实现此控制

### 技术限制

**Google Veo 3.1 API限制**（来源：官方文档）：

| 功能 | 限制 | 影响 |
|------|------|------|
| 视频延长 | 只支持720p | 1080p视频无法延长 |
| 视频延长 | 固定延长7秒 | 无法自定义延长时长 |
| 视频延长 | 最长148秒 | 超过148秒无法继续延长 |
| 参考图片模式 | 只支持16:9, 8秒 | 不支持9:16竖屏和4/6秒 |
| 首尾帧插值 | 只支持8秒 | 不支持4/6秒 |
| 延长源视频 | 必须是Veo生成 | 外部上传视频无法延长 |

### 用户痛点

1. **1080p用户困惑**：为什么我的高清视频不能延长？
2. **参数错误**：选择参考图片模式后，9:16选项为何灰色？
3. **浪费积分**：提交后才发现参数错误，积分已扣除

---

## 🏗️ 系统架构

### 整体流程图

```
用户点击"延长"按钮
    ↓
前端验证（resolution=720p, duration+7<=148）
    ↓
显示确认对话框（新时长、积分消耗）
    ↓
POST /api/v1/video/extend
    ↓
后端验证（源视频存在、有gemini_video_uri、状态completed）
    ↓
扣除40积分
    ↓
调用Google Veo extension API
    ↓
返回task_id（与常规生成流程相同）
    ↓
异步轮询状态（复用现有轮询机制）
    ↓
下载+上传Supabase Storage
    ↓
更新status=completed
```

### 核心组件

| 组件 | 职责 | 文件路径 |
|------|------|---------|
| Extension API | 处理延长请求 | `app/api/v1/video/extend/route.ts` |
| Parameter Validator | 参数验证 | `lib/video-parameter-validator.ts` |
| Video Service | 业务逻辑 | `lib/video-service.ts` |
| Video Card UI | 显示延长按钮 | `components/video-card.tsx` |
| Extension Dialog | 延长确认对话框 | `components/video-extension-dialog.tsx` |

---

## 📊 数据库设计

### 新增字段（video_generation_history表）

```sql
-- 1. 源视频ID（用于延长链追踪）
ALTER TABLE video_generation_history
ADD COLUMN source_video_id UUID REFERENCES video_generation_history(id) ON DELETE SET NULL;

-- 2. 人物生成控制
ALTER TABLE video_generation_history
ADD COLUMN person_generation TEXT CHECK (person_generation IN ('allow_all', 'allow_adult', 'dont_allow'));

-- 3. 生成模式（用于参数验证）
ALTER TABLE video_generation_history
ADD COLUMN generation_mode TEXT CHECK (generation_mode IN (
  'text-to-video',
  'image-to-video',
  'reference-images',
  'first-last-frame',
  'extend-video'
));

-- 4. 创建索引
CREATE INDEX idx_video_generation_source_video ON video_generation_history(source_video_id);
CREATE INDEX idx_video_generation_mode ON video_generation_history(generation_mode);
CREATE INDEX idx_video_generation_combined ON video_generation_history(user_id, status, generation_mode);
```

### 迁移文件

**文件路径**: `supabase/migrations/20251119000001_add_video_extension_fields.sql`

```sql
-- 视频延长功能 - 数据库字段扩展
-- 创建日期: 2025-11-19
-- 维护者: 老王

BEGIN;

-- 1. 添加源视频ID字段（用于延长链）
ALTER TABLE video_generation_history
ADD COLUMN IF NOT EXISTS source_video_id UUID REFERENCES video_generation_history(id) ON DELETE SET NULL;

COMMENT ON COLUMN video_generation_history.source_video_id IS '源视频ID（用于延长链追踪），NULL表示原始视频';

-- 2. 添加人物生成控制字段
ALTER TABLE video_generation_history
ADD COLUMN IF NOT EXISTS person_generation TEXT
CHECK (person_generation IN ('allow_all', 'allow_adult', 'dont_allow'))
DEFAULT 'allow_adult';

COMMENT ON COLUMN video_generation_history.person_generation IS '人物生成控制：allow_all（所有年龄）, allow_adult（仅成人）, dont_allow（不生成人物）';

-- 3. 添加生成模式字段
ALTER TABLE video_generation_history
ADD COLUMN IF NOT EXISTS generation_mode TEXT
CHECK (generation_mode IN (
  'text-to-video',
  'image-to-video',
  'reference-images',
  'first-last-frame',
  'extend-video'
))
DEFAULT 'text-to-video';

COMMENT ON COLUMN video_generation_history.generation_mode IS '视频生成模式，用于参数验证和统计';

-- 4. 创建索引（提升查询性能）
CREATE INDEX IF NOT EXISTS idx_video_generation_source_video
ON video_generation_history(source_video_id)
WHERE source_video_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_video_generation_mode
ON video_generation_history(generation_mode);

CREATE INDEX IF NOT EXISTS idx_video_generation_combined
ON video_generation_history(user_id, status, generation_mode)
WHERE status IN ('processing', 'downloading', 'completed');

-- 5. 添加延长链计数函数（可选，用于统计）
CREATE OR REPLACE FUNCTION get_extension_chain_length(video_id UUID)
RETURNS INTEGER AS $$
DECLARE
  chain_length INTEGER := 0;
  current_id UUID := video_id;
BEGIN
  WHILE current_id IS NOT NULL LOOP
    SELECT source_video_id INTO current_id
    FROM video_generation_history
    WHERE id = current_id;

    IF current_id IS NOT NULL THEN
      chain_length := chain_length + 1;
    END IF;
  END LOOP;

  RETURN chain_length;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_extension_chain_length(UUID) IS '计算视频延长链的长度（第几次延长）';

COMMIT;
```

### RLS策略更新

```sql
-- 确保用户只能访问自己的延长视频
-- （现有RLS策略已覆盖，无需额外修改）

-- 验证RLS策略
SELECT * FROM pg_policies WHERE tablename = 'video_generation_history';
```

---

## 🔌 API设计

### 端点1: 创建延长任务

**POST** `/api/v1/video/extend`

#### 请求头

```http
x-api-key: your_api_key
Content-Type: application/json
```

#### 请求体

```json
{
  "source_video_id": "550e8400-e29b-41d4-a716-446655440000",
  "prompt": "继续之前的场景，太阳完全升起，照亮整个山谷",
  "negative_prompt": "blurry, low quality"
}
```

| 字段 | 类型 | 必需 | 说明 |
|-----|------|-----|------|
| `source_video_id` | string | ✅ | 源视频的数据库ID（video_generation_history表的id） |
| `prompt` | string | ✅ | 延长部分的提示词（建议与源视频内容连贯） |
| `negative_prompt` | string | ❌ | 负面提示词 |

#### 成功响应 (200)

```json
{
  "success": true,
  "task_id": "new-task-uuid",
  "source_video_id": "original-video-uuid",
  "operation_id": "projects/.../operations/...",
  "status": "processing",
  "credit_cost": 40,
  "original_duration": 4,
  "new_duration": 11,
  "message": "视频延长任务已创建，预计新视频时长11秒"
}
```

#### 错误响应

```json
// 400 - 源视频不存在
{
  "error": "SOURCE_VIDEO_NOT_FOUND",
  "message": "Source video with ID xxx not found"
}

// 400 - 源视频未完成生成
{
  "error": "SOURCE_VIDEO_NOT_READY",
  "message": "Source video is still processing or failed"
}

// 400 - 源视频过长（已达148秒）
{
  "error": "SOURCE_VIDEO_TOO_LONG",
  "message": "Source video is 148s, cannot extend further (max 148s)"
}

// 400 - 延长后将超过148秒
{
  "error": "EXTENSION_EXCEEDS_LIMIT",
  "message": "Extension would result in 155s video, exceeding maximum 148s"
}

// 400 - 源视频不是720p
{
  "error": "EXTENSION_NOT_SUPPORTED_FOR_1080P",
  "message": "Video extension only supports 720p. Please re-generate in 720p if extension is needed."
}

// 400 - 源视频非Veo生成
{
  "error": "INVALID_SOURCE_VIDEO",
  "message": "Source video must be generated by Veo API"
}

// 402 - 积分不足
{
  "error": "INSUFFICIENT_CREDITS",
  "message": "Insufficient credits for video extension. Required: 40, Available: 25"
}
```

### 端点2: 参数验证（已有端点增强）

**POST** `/api/v1/video/generate`

#### 新增验证逻辑

```typescript
// 伪代码示例
function validateVideoParameters(mode, params) {
  if (mode === 'reference-images') {
    if (params.aspectRatio !== '16:9') {
      throw new Error('INVALID_ASPECT_RATIO', 'Reference images mode only supports 16:9');
    }
    if (params.durationSeconds !== 8) {
      throw new Error('INVALID_DURATION', 'Reference images mode only supports 8 seconds');
    }
  }

  if (mode === 'first-last-frame') {
    if (params.durationSeconds !== 8) {
      throw new Error('INVALID_DURATION', 'First-last-frame mode only supports 8 seconds');
    }
  }

  // personGeneration验证
  const allowedPersonGen = getPersonGenerationOptions(mode, userRegion);
  if (!allowedPersonGen.includes(params.personGeneration)) {
    throw new Error('INVALID_PERSON_GENERATION', `Mode ${mode} only supports: ${allowedPersonGen.join(', ')}`);
  }
}
```

---

## 💻 前端UI设计

### 组件1: 视频卡片延长按钮

**文件**: `components/video-card.tsx`

```typescript
interface VideoCardProps {
  video: VideoRecord;
  onExtend: (videoId: string) => void;
}

function VideoCard({ video, onExtend }: VideoCardProps) {
  const shouldShowExtendButton = () => {
    return (
      video.status === 'completed' &&           // 生成成功
      video.resolution === '720p' &&            // 🔥 只支持720p
      video.duration_seconds + 7 <= 148 &&      // 延长后不超过148秒
      video.gemini_video_uri !== null           // 有Gemini URI
    );
  };

  return (
    <Card>
      {/* 视频预览 */}
      <video src={video.video_url} controls />

      {/* 视频信息 */}
      <div>
        <p>时长: {video.duration_seconds}秒</p>
        <p>分辨率: {video.resolution}</p>
      </div>

      {/* 延长按钮 */}
      {shouldShowExtendButton() && (
        <Button onClick={() => onExtend(video.id)}>
          延长 +7秒 (40积分)
        </Button>
      )}

      {/* 1080p提示 */}
      {video.resolution === '1080p' && video.duration_seconds < 148 && (
        <Tooltip>
          <AlertCircle size={16} />
          <span>延长功能仅支持720p视频</span>
        </Tooltip>
      )}
    </Card>
  );
}
```

### 组件2: 延长确认对话框

**文件**: `components/video-extension-dialog.tsx`

```typescript
interface ExtensionDialogProps {
  video: VideoRecord;
  onConfirm: (prompt: string, negativePrompt: string) => Promise<void>;
  onCancel: () => void;
}

function VideoExtensionDialog({ video, onConfirm, onCancel }: ExtensionDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const newDuration = video.duration_seconds + 7;
  const creditCost = 40;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(prompt, negativePrompt);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogHeader>
        <h2>延长视频</h2>
      </DialogHeader>

      <DialogBody>
        {/* 视频预览 */}
        <video src={video.video_url} controls className="mb-4" />

        {/* 延长信息 */}
        <div className="bg-blue-50 p-4 rounded mb-4">
          <p>当前时长: <strong>{video.duration_seconds}秒</strong></p>
          <p>延长后: <strong>{newDuration}秒</strong> (+7秒)</p>
          <p>消耗积分: <strong>{creditCost}积分</strong></p>
        </div>

        {/* 提示词输入 */}
        <div className="mb-4">
          <label>延长部分的提示词</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述延长部分的内容，建议与原视频保持连贯性..."
            rows={4}
          />
        </div>

        {/* 负面提示词 */}
        <div className="mb-4">
          <label>负面提示词（可选）</label>
          <input
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="不希望出现的元素..."
          />
        </div>

        {/* 最佳实践提示 */}
        <Alert variant="info">
          <Lightbulb size={16} />
          <p>💡 延长提示词应与原视频内容连贯，避免突然的场景切换</p>
        </Alert>
      </DialogBody>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          取消
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!prompt.trim() || loading}
          loading={loading}
        >
          确认延长（{creditCost}积分）
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
```

### 组件3: 延长链可视化

**文件**: `components/video-extension-chain.tsx`

```typescript
interface ExtensionChainProps {
  video: VideoRecord;
  allVideos: VideoRecord[];
}

function VideoExtensionChain({ video, allVideos }: ExtensionChainProps) {
  // 构建延长链
  const buildChain = () => {
    const chain: VideoRecord[] = [];
    let current: VideoRecord | undefined = video;

    // 向前追溯到原始视频
    while (current) {
      chain.unshift(current);
      current = allVideos.find(v => v.id === current?.source_video_id);
    }

    return chain;
  };

  const chain = buildChain();

  return (
    <div className="flex items-center space-x-2 overflow-x-auto">
      {chain.map((v, index) => (
        <Fragment key={v.id}>
          <div className="flex-shrink-0">
            <div className="text-xs text-gray-500">
              {index === 0 ? '原始' : `延长${index}次`}
            </div>
            <div className="w-24 h-16 rounded border">
              <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="text-xs text-center mt-1">
              {v.duration_seconds}秒
            </div>
          </div>

          {index < chain.length - 1 && (
            <ArrowRight size={16} className="text-gray-400 flex-shrink-0" />
          )}
        </Fragment>
      ))}
    </div>
  );
}
```

---

## 🧪 测试计划

### 单元测试

**文件**: `__tests__/lib/video-parameter-validator.test.ts`

```typescript
describe('Video Parameter Validator', () => {
  describe('validateByMode', () => {
    it('should accept 16:9 and 8s for reference-images mode', () => {
      expect(() => validateByMode('reference-images', {
        aspectRatio: '16:9',
        durationSeconds: 8
      })).not.toThrow();
    });

    it('should reject 9:16 for reference-images mode', () => {
      expect(() => validateByMode('reference-images', {
        aspectRatio: '9:16',
        durationSeconds: 8
      })).toThrow('INVALID_ASPECT_RATIO');
    });

    it('should reject 4s for reference-images mode', () => {
      expect(() => validateByMode('reference-images', {
        aspectRatio: '16:9',
        durationSeconds: 4
      })).toThrow('INVALID_DURATION');
    });
  });

  describe('validatePersonGeneration', () => {
    it('should allow allow_all for text-to-video', () => {
      expect(() => validatePersonGeneration('text-to-video', 'allow_all')).not.toThrow();
    });

    it('should reject allow_all for reference-images', () => {
      expect(() => validatePersonGeneration('reference-images', 'allow_all')).toThrow();
    });
  });
});
```

### 集成测试

**文件**: `__tests__/api/video/extend.test.ts`

```typescript
describe('POST /api/v1/video/extend', () => {
  it('should create extension task successfully for 720p video', async () => {
    const sourceVideo = await createTestVideo({ resolution: '720p', duration: 4 });

    const response = await fetch('/api/v1/video/extend', {
      method: 'POST',
      headers: { 'x-api-key': TEST_API_KEY },
      body: JSON.stringify({
        source_video_id: sourceVideo.id,
        prompt: '继续之前的场景'
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.credit_cost).toBe(40);
    expect(data.new_duration).toBe(11);
  });

  it('should reject extension for 1080p video', async () => {
    const sourceVideo = await createTestVideo({ resolution: '1080p', duration: 4 });

    const response = await fetch('/api/v1/video/extend', {
      method: 'POST',
      headers: { 'x-api-key': TEST_API_KEY },
      body: JSON.stringify({
        source_video_id: sourceVideo.id,
        prompt: '继续之前的场景'
      })
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('EXTENSION_NOT_SUPPORTED_FOR_1080P');
  });

  it('should reject extension if duration + 7 > 148', async () => {
    const sourceVideo = await createTestVideo({ resolution: '720p', duration: 145 });

    const response = await fetch('/api/v1/video/extend', {
      method: 'POST',
      headers: { 'x-api-key': TEST_API_KEY },
      body: JSON.stringify({
        source_video_id: sourceVideo.id,
        prompt: '继续之前的场景'
      })
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('EXTENSION_EXCEEDS_LIMIT');
  });
});
```

### E2E测试

**文件**: `e2e/video-extension.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Video Extension Flow', () => {
  test('should extend 720p video successfully', async ({ page }) => {
    // 1. 登录
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('[type="submit"]');

    // 2. 导航到历史记录
    await page.goto('/history');

    // 3. 找到720p视频并点击延长按钮
    await page.click('[data-testid="video-card-720p"] [data-testid="extend-button"]');

    // 4. 填写延长提示词
    await page.fill('[name="prompt"]', '太阳升起，照亮山谷');

    // 5. 确认延长
    await page.click('[data-testid="confirm-extension"]');

    // 6. 验证任务创建成功
    await expect(page.locator('text=延长任务已创建')).toBeVisible();
    await expect(page.locator('text=消耗40积分')).toBeVisible();

    // 7. 验证新视频出现在历史记录中
    await expect(page.locator('[data-testid="new-extended-video"]')).toBeVisible();
  });

  test('should not show extend button for 1080p video', async ({ page }) => {
    await page.goto('/history');

    const extendButton = page.locator('[data-testid="video-card-1080p"] [data-testid="extend-button"]');
    await expect(extendButton).not.toBeVisible();

    // 验证提示信息
    const tooltip = page.locator('[data-testid="video-card-1080p"] [data-testid="extension-tooltip"]');
    await expect(tooltip).toContainText('延长功能仅支持720p');
  });
});
```

---

## 📝 部署检查清单

### Pre-Deployment

- [ ] **代码审查**
  - [ ] 所有代码遵循SOLID原则
  - [ ] 所有函数有完整的TypeScript类型
  - [ ] 错误处理完整（try-catch + 明确错误码）
  - [ ] 代码注释清晰（关键逻辑有注释）

- [ ] **测试验证**
  - [ ] 单元测试覆盖率 ≥ 75%
  - [ ] 集成测试通过（所有API端点）
  - [ ] E2E测试通过（完整用户流程）
  - [ ] 边界测试通过（148秒上限、720p限制）

- [ ] **数据库准备**
  - [ ] 迁移脚本已测试（本地Supabase）
  - [ ] RLS策略验证通过
  - [ ] 索引创建成功
  - [ ] 备份现有数据

- [ ] **文档更新**
  - [ ] VIDEO_GENERATION_API.md已更新
  - [ ] TODO.md任务状态更新
  - [ ] CHANGELOG.md添加新版本记录
  - [ ] OpenSpec规范已更新

### Deployment

- [ ] **Staging环境**
  - [ ] 执行数据库迁移
  - [ ] 运行完整测试套件
  - [ ] 手动测试关键流程
  - [ ] 性能测试（API响应时间 < 500ms）

- [ ] **生产环境**
  - [ ] 执行数据库迁移（使用事务）
  - [ ] 监控错误率（前30分钟）
  - [ ] 验证API端点可访问
  - [ ] 检查Supabase Storage权限

### Post-Deployment

- [ ] **监控验证**
  - [ ] Vercel部署成功（无构建错误）
  - [ ] API响应正常（/api/v1/video/extend）
  - [ ] 数据库查询性能正常
  - [ ] Supabase Storage读写正常

- [ ] **功能验证**
  - [ ] 720p视频可以延长
  - [ ] 1080p视频不显示延长按钮
  - [ ] 积分正确扣除（40积分）
  - [ ] 延长链可视化正常
  - [ ] 错误提示明确（超长视频、1080p拒绝）

- [ ] **用户通知**
  - [ ] 更新用户指南（添加延长功能说明）
  - [ ] 通知Beta用户测试新功能
  - [ ] 收集用户反馈

---

## 🚨 常见问题与故障排查

### 问题1: 延长任务创建失败

**症状**: API返回500错误

**可能原因**:
1. 源视频缺少`gemini_video_uri`字段
2. Google Veo API调用失败
3. 积分扣除失败

**排查步骤**:
```sql
-- 1. 检查源视频数据
SELECT id, status, gemini_video_uri, duration_seconds, resolution
FROM video_generation_history
WHERE id = 'source_video_id';

-- 2. 检查用户积分余额
SELECT get_user_credits('user_id');

-- 3. 查看错误日志
SELECT * FROM logs WHERE path = '/api/v1/video/extend' ORDER BY created_at DESC LIMIT 10;
```

### 问题2: 延长按钮不显示

**症状**: 720p视频也不显示延长按钮

**可能原因**:
1. `shouldShowExtendButton()`逻辑错误
2. `gemini_video_uri`为null
3. 视频状态不是`completed`

**排查步骤**:
```typescript
// 检查视频记录
console.log('Video:', video);
console.log('Resolution:', video.resolution);
console.log('Duration:', video.duration_seconds);
console.log('Gemini URI:', video.gemini_video_uri);
console.log('Status:', video.status);

// 计算延长后时长
const newDuration = video.duration_seconds + 7;
console.log('New Duration:', newDuration, 'Max: 148');
```

### 问题3: 参数验证失败

**症状**: reference-images模式可以选择9:16

**可能原因**:
1. 前端验证逻辑缺失
2. 参数验证中间件未集成
3. 缓存问题（前端代码未更新）

**排查步骤**:
```bash
# 1. 检查前端代码
grep -n "reference-images" app/editor/image-edit/page.tsx

# 2. 检查API验证
curl -X POST /api/v1/video/generate \
  -H "x-api-key: KEY" \
  -d '{"mode":"reference-images","aspectRatio":"9:16","durationSeconds":8}'

# 应该返回400错误
```

---

## 📊 成功指标

### 功能指标

| 指标 | 目标值 | 测量方式 |
|------|--------|---------|
| 延长成功率 | ≥ 95% | completed / total extension tasks |
| API响应时间 | < 500ms | 平均响应时间（/api/v1/video/extend） |
| 错误率 | < 2% | failed tasks / total tasks |
| 测试覆盖率 | ≥ 75% | Jest coverage report |

### 用户体验指标

| 指标 | 目标值 | 测量方式 |
|------|--------|---------|
| 720p延长使用率 | ≥ 30% | extension tasks / 720p completed videos |
| 1080p困惑率 | < 5% | support tickets about "why can't extend 1080p" |
| 平均延长次数 | 2-3次 | AVG(extension_count) per video chain |
| 用户满意度 | ≥ 4.5/5 | 用户反馈调查 |

---

## 🔄 后续优化计划

### Phase 2: 1080p延长支持（待Google API支持）

**当Google Veo支持1080p延长时**:
1. 更新`shouldShowExtendButton()`逻辑（移除resolution检查）
2. 更新API验证逻辑
3. 更新文档和提示信息
4. 通知用户新功能上线

### Phase 3: 自定义延长时长

**如果API支持自定义时长**:
1. 添加时长选择器（4s/7s/10s）
2. 动态计算积分消耗
3. 更新UI确认对话框

### Phase 4: 批量延长

**高级功能**:
1. 支持一次性延长多个视频
2. 队列管理（并发限制）
3. 进度批量追踪

---

## 📚 参考资料

- [Google Veo 3.1 API Documentation](https://ai.google.dev/gemini-api/docs/veo)
- [VIDEO_GENERATION_API.md](./VIDEO_GENERATION_API.md)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

**最后更新**: 2025-11-19

**维护者**: 老王（技术流·暴躁派）

**原则**: KISS + DRY + SOLID

**态度**: 艹，细节决定成败！每个边界条件都得考虑到，每个错误都得有明确提示！文档写这么详细就是为了实施时不出岔子！💪
