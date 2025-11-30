-- =====================================================
-- 图像生成历史记录与素材库迁移
-- 创建时间: 2025-10-22
-- 描述: 创建生成历史、主体库、场景库、批量生成任务表
-- =====================================================

-- 1. 创建生成历史记录表 (generation_history)
-- 用途: 存储用户的所有图像生成记录,包括提示词、参考图、生成结果等
CREATE TABLE IF NOT EXISTS generation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 生成类型: 'text-to-image' 或 'image-to-image'
    generation_type VARCHAR(20) NOT NULL CHECK (generation_type IN ('text-to-image', 'image-to-image')),

    -- 提示词
    prompt TEXT NOT NULL,

    -- 参考图像 URLs (JSON数组, image-to-image时使用)
    reference_images JSONB DEFAULT '[]'::jsonb,

    -- 图像宽高比: '1:1', '16:9', '9:16', '4:3', '3:4'
    aspect_ratio VARCHAR(10) NOT NULL DEFAULT '1:1',

    -- 生成的图像 URL (Supabase Storage)
    generated_image_url TEXT NOT NULL,

    -- 额外参数 (JSON格式, 可存储模型、采样步数等)
    generation_params JSONB DEFAULT '{}'::jsonb,

    -- 时间戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 为 generation_history 创建索引
CREATE INDEX IF NOT EXISTS idx_generation_history_user_id ON generation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_history_created_at ON generation_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_history_type ON generation_history(generation_type);

-- generation_history RLS 策略
ALTER TABLE generation_history ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的历史记录
CREATE POLICY "Users can view own generation history"
    ON generation_history FOR SELECT
    USING (auth.uid() = user_id);

-- 用户只能插入自己的历史记录
CREATE POLICY "Users can insert own generation history"
    ON generation_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 用户只能删除自己的历史记录
CREATE POLICY "Users can delete own generation history"
    ON generation_history FOR DELETE
    USING (auth.uid() = user_id);

-- generation_history updated_at 触发器
CREATE TRIGGER update_generation_history_updated_at
    BEFORE UPDATE ON generation_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================

-- 2. 创建主体素材库表 (subjects)
-- 用途: 存储背景移除后的主体图像,用于角色一致性生成
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 主体名称
    name VARCHAR(255) NOT NULL,

    -- 主体描述
    description TEXT,

    -- 主体图像 URL (去除背景后的PNG)
    subject_image_url TEXT NOT NULL,

    -- 原始图像 URL (完整图像)
    original_image_url TEXT,

    -- 分类标签: 'person', 'animal', 'object', 'other'
    category VARCHAR(50) DEFAULT 'other',

    -- 自定义标签 (JSON数组)
    tags JSONB DEFAULT '[]'::jsonb,

    -- 是否为收藏
    is_favorite BOOLEAN DEFAULT FALSE,

    -- 时间戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 为 subjects 创建索引
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_created_at ON subjects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subjects_category ON subjects(category);
CREATE INDEX IF NOT EXISTS idx_subjects_favorite ON subjects(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_subjects_tags ON subjects USING GIN(tags);

-- subjects RLS 策略
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的主体库
CREATE POLICY "Users can view own subjects"
    ON subjects FOR SELECT
    USING (auth.uid() = user_id);

-- 用户只能插入自己的主体
CREATE POLICY "Users can insert own subjects"
    ON subjects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的主体
CREATE POLICY "Users can update own subjects"
    ON subjects FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 用户只能删除自己的主体
CREATE POLICY "Users can delete own subjects"
    ON subjects FOR DELETE
    USING (auth.uid() = user_id);

-- subjects updated_at 触发器
CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================

-- 3. 创建场景素材库表 (scenes)
-- 用途: 存储场景保留后的背景图像,用于角色一致性生成
CREATE TABLE IF NOT EXISTS scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 场景名称
    name VARCHAR(255) NOT NULL,

    -- 场景描述
    description TEXT,

    -- 场景图像 URL (保留背景,移除主体)
    scene_image_url TEXT NOT NULL,

    -- 原始图像 URL (完整图像)
    original_image_url TEXT,

    -- 分类标签: 'indoor', 'outdoor', 'nature', 'urban', 'other'
    category VARCHAR(50) DEFAULT 'other',

    -- 自定义标签 (JSON数组)
    tags JSONB DEFAULT '[]'::jsonb,

    -- 是否为收藏
    is_favorite BOOLEAN DEFAULT FALSE,

    -- 时间戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 为 scenes 创建索引
CREATE INDEX IF NOT EXISTS idx_scenes_user_id ON scenes(user_id);
CREATE INDEX IF NOT EXISTS idx_scenes_created_at ON scenes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenes_category ON scenes(category);
CREATE INDEX IF NOT EXISTS idx_scenes_favorite ON scenes(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_scenes_tags ON scenes USING GIN(tags);

-- scenes RLS 策略
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的场景库
CREATE POLICY "Users can view own scenes"
    ON scenes FOR SELECT
    USING (auth.uid() = user_id);

-- 用户只能插入自己的场景
CREATE POLICY "Users can insert own scenes"
    ON scenes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的场景
CREATE POLICY "Users can update own scenes"
    ON scenes FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 用户只能删除自己的场景
CREATE POLICY "Users can delete own scenes"
    ON scenes FOR DELETE
    USING (auth.uid() = user_id);

-- scenes updated_at 触发器
CREATE TRIGGER update_scenes_updated_at
    BEFORE UPDATE ON scenes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================

-- 4. 创建批量生成任务表 (batch_generation_tasks)
-- 用途: 管理角色一致性批量生成任务的状态和进度
CREATE TABLE IF NOT EXISTS batch_generation_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 关联的主体 ID
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,

    -- 场景提示词数组 (JSON格式)
    -- 示例: [{"scene_id": "uuid", "prompt": "场景描述"}, ...]
    scene_prompts JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- 总任务数
    total_count INTEGER NOT NULL DEFAULT 0,

    -- 已完成数
    completed_count INTEGER NOT NULL DEFAULT 0,

    -- 失败数
    failed_count INTEGER NOT NULL DEFAULT 0,

    -- 任务状态: 'pending', 'processing', 'completed', 'failed', 'cancelled'
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

    -- 生成的图像结果 (JSON数组)
    -- 示例: [{"scene_prompt": "描述", "image_url": "url", "status": "success/failed", "error": "错误信息"}, ...]
    generated_images JSONB DEFAULT '[]'::jsonb,

    -- 错误信息
    error_message TEXT,

    -- 时间戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 完成时间
    completed_at TIMESTAMPTZ
);

-- 为 batch_generation_tasks 创建索引
CREATE INDEX IF NOT EXISTS idx_batch_tasks_user_id ON batch_generation_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_tasks_subject_id ON batch_generation_tasks(subject_id);
CREATE INDEX IF NOT EXISTS idx_batch_tasks_status ON batch_generation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_batch_tasks_created_at ON batch_generation_tasks(created_at DESC);

-- batch_generation_tasks RLS 策略
ALTER TABLE batch_generation_tasks ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的批量任务
CREATE POLICY "Users can view own batch tasks"
    ON batch_generation_tasks FOR SELECT
    USING (auth.uid() = user_id);

-- 用户只能插入自己的批量任务
CREATE POLICY "Users can insert own batch tasks"
    ON batch_generation_tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的批量任务
CREATE POLICY "Users can update own batch tasks"
    ON batch_generation_tasks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 用户只能删除自己的批量任务
CREATE POLICY "Users can delete own batch tasks"
    ON batch_generation_tasks FOR DELETE
    USING (auth.uid() = user_id);

-- batch_generation_tasks updated_at 触发器
CREATE TRIGGER update_batch_tasks_updated_at
    BEFORE UPDATE ON batch_generation_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 迁移完成
-- =====================================================
