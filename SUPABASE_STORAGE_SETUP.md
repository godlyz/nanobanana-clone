# Supabase Storage 配置指南

## 概述

本项目需要创建 3 个 Supabase Storage 存储桶来存储图像文件：

1. **generation-history** - 存储生成历史记录的图像
2. **subjects** - 存储主体库的图像（背景移除后的主体）
3. **scenes** - 存储场景库的图像（场景保留后的背景）

## 配置步骤

### 1. 登录 Supabase 控制台

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目（当前项目URL: `https://gtpvyxrgkuccgpcaeeyt.supabase.co`）
3. 进入 **Storage** 页面

### 2. 创建存储桶

#### 2.1 创建 generation-history 桶

1. 点击 **New bucket** 按钮
2. 配置如下：
   - **Name**: `generation-history`
   - **Public bucket**: ✅ **勾选**（允许公开访问生成的图像）
   - **File size limit**: `10 MB`（单个文件大小限制）
   - **Allowed MIME types**: `image/png, image/jpeg, image/webp`
3. 点击 **Create bucket**

#### 2.2 创建 subjects 桶

1. 点击 **New bucket** 按钮
2. 配置如下：
   - **Name**: `subjects`
   - **Public bucket**: ✅ **勾选**（允许公开访问主体图像）
   - **File size limit**: `10 MB`
   - **Allowed MIME types**: `image/png`（主体图像通常是PNG透明背景）
3. 点击 **Create bucket**

#### 2.3 创建 scenes 桶

1. 点击 **New bucket** 按钮
2. 配置如下：
   - **Name**: `scenes`
   - **Public bucket**: ✅ **勾选**（允许公开访问场景图像）
   - **File size limit**: `10 MB`
   - **Allowed MIME types**: `image/png, image/jpeg, image/webp`
3. 点击 **Create bucket**

### 3. 配置 RLS 安全策略

虽然桶是公开的，但我们仍需配置 RLS 策略来控制**写入权限**。

#### 3.1 generation-history 桶策略

进入 `generation-history` 桶的 **Policies** 标签，创建以下策略：

**策略 1: 允许认证用户上传**
```sql
-- 名称: Allow authenticated users to upload
-- 操作: INSERT
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'generation-history' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**策略 2: 允许用户删除自己的文件**
```sql
-- 名称: Allow users to delete own files
-- 操作: DELETE
CREATE POLICY "Allow users to delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'generation-history' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**策略 3: 允许公开读取**
```sql
-- 名称: Allow public read access
-- 操作: SELECT
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'generation-history');
```

#### 3.2 subjects 桶策略

进入 `subjects` 桶的 **Policies** 标签，创建以下策略：

**策略 1: 允许认证用户上传**
```sql
-- 名称: Allow authenticated users to upload
-- 操作: INSERT
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'subjects' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**策略 2: 允许用户删除自己的文件**
```sql
-- 名称: Allow users to delete own files
-- 操作: DELETE
CREATE POLICY "Allow users to delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'subjects' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**策略 3: 允许公开读取**
```sql
-- 名称: Allow public read access
-- 操作: SELECT
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'subjects');
```

#### 3.3 scenes 桶策略

进入 `scenes` 桶的 **Policies** 标签，创建以下策略：

**策略 1: 允许认证用户上传**
```sql
-- 名称: Allow authenticated users to upload
-- 操作: INSERT
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'scenes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**策略 2: 允许用户删除自己的文件**
```sql
-- 名称: Allow users to delete own files
-- 操作: DELETE
CREATE POLICY "Allow users to delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'scenes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**策略 3: 允许公开读取**
```sql
-- 名称: Allow public read access
-- 操作: SELECT
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'scenes');
```

### 4. 文件路径结构

所有上传的文件应遵循以下路径结构：

```
generation-history/
  └── {user_id}/
      └── {timestamp}_{random}.{ext}

subjects/
  └── {user_id}/
      └── {timestamp}_{random}.png

scenes/
  └── {user_id}/
      └── {timestamp}_{random}.{ext}
```

示例：
```
generation-history/550e8400-e29b-41d4-a716-446655440000/20251022_abc123.png
subjects/550e8400-e29b-41d4-a716-446655440000/20251022_def456.png
scenes/550e8400-e29b-41d4-a716-446655440000/20251022_ghi789.jpg
```

### 5. 代码中的使用示例

#### 5.1 上传文件到 generation-history

```typescript
import { createClient } from '@/lib/supabase/client'

async function uploadGeneratedImage(imageBlob: Blob, userId: string) {
  const supabase = createClient()

  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(7)
  const fileName = `${timestamp}_${randomId}.png`
  const filePath = `${userId}/${fileName}`

  const { data, error } = await supabase.storage
    .from('generation-history')
    .upload(filePath, imageBlob, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error

  // 获取公开URL
  const { data: { publicUrl } } = supabase.storage
    .from('generation-history')
    .getPublicUrl(filePath)

  return publicUrl
}
```

#### 5.2 上传文件到 subjects

```typescript
async function uploadSubjectImage(imageBlob: Blob, userId: string) {
  const supabase = createClient()

  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(7)
  const fileName = `${timestamp}_${randomId}.png`
  const filePath = `${userId}/${fileName}`

  const { data, error } = await supabase.storage
    .from('subjects')
    .upload(filePath, imageBlob, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('subjects')
    .getPublicUrl(filePath)

  return publicUrl
}
```

#### 5.3 删除文件

```typescript
async function deleteImage(bucket: string, filePath: string) {
  const supabase = createClient()

  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath])

  if (error) throw error
}

// 使用示例
await deleteImage('generation-history', '550e8400-e29b-41d4-a716-446655440000/20251022_abc123.png')
```

### 6. 验证配置

配置完成后，可以通过以下步骤验证：

1. 在 Supabase Storage 页面查看是否有 3 个桶
2. 每个桶都应该有 3 个 RLS 策略
3. 尝试通过代码上传测试图像
4. 验证公开 URL 是否可以正常访问

### 7. 注意事项

⚠️ **重要提醒**：

1. **文件大小限制**：单个文件最大 10MB，如需更大请调整桶配置
2. **文件命名规范**：始终使用 `{user_id}/` 前缀确保 RLS 策略生效
3. **公开访问**：所有桶都是公开的，敏感图像请勿上传
4. **定期清理**：建议定期清理过期的历史记录图像以节省空间
5. **备份策略**：Supabase 免费版不包含自动备份，重要数据请手动备份

## 配置检查清单

- [ ] 创建 `generation-history` 桶
- [ ] 创建 `subjects` 桶
- [ ] 创建 `scenes` 桶
- [ ] 为 `generation-history` 配置 3 个 RLS 策略
- [ ] 为 `subjects` 配置 3 个 RLS 策略
- [ ] 为 `scenes` 配置 3 个 RLS 策略
- [ ] 测试上传功能
- [ ] 测试公开URL访问
- [ ] 测试删除功能

---

配置完成后，继续进行 API 路由的开发工作！
