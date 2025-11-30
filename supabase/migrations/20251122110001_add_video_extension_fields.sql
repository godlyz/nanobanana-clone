-- ============================================================================
-- 🔥 老王的暴躁数据库迁移文件 - Task 6: 视频延长功能
-- 功能：为 video_generation_history 表添加视频延长相关字段
-- 创建时间：2025-11-22
-- ============================================================================

-- ========================================
-- 1. 扩展 generation_mode 枚举值
-- ========================================

-- 首先删除现有约束
ALTER TABLE video_generation_history
DROP CONSTRAINT IF EXISTS video_generation_history_generation_mode_check;

-- 重新创建约束，添加 extend-video 模式
ALTER TABLE video_generation_history
ADD CONSTRAINT video_generation_history_generation_mode_check
  CHECK (generation_mode IN ('text-to-video', 'reference-images', 'first-last-frame', 'extend-video', 'image-to-video'));

COMMENT ON CONSTRAINT video_generation_history_generation_mode_check ON video_generation_history IS
'视频生成模式约束：text-to-video（纯文生视频） | reference-images（参考图片） | first-last-frame（首尾帧） | extend-video（延长视频） | image-to-video（图生视频）';

-- ========================================
-- 2. 添加延长功能相关字段
-- ========================================

-- 源视频ID（延长链关系）
ALTER TABLE video_generation_history
ADD COLUMN IF NOT EXISTS source_video_id UUID REFERENCES video_generation_history(id) ON DELETE SET NULL;

COMMENT ON COLUMN video_generation_history.source_video_id IS
'源视频ID，用于视频延长功能。记录当前视频是从哪个视频延长而来（延长链追溯）';

-- Gemini原始视频URI（用于延长API调用）
ALTER TABLE video_generation_history
ADD COLUMN IF NOT EXISTS gemini_video_uri TEXT;

COMMENT ON COLUMN video_generation_history.gemini_video_uri IS
'Google Gemini/Veo返回的原始视频URI，用于视频延长API调用（extendVideo需要此参数）';

-- 实际时长（秒）
ALTER TABLE video_generation_history
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

COMMENT ON COLUMN video_generation_history.duration_seconds IS
'视频实际时长（秒）。注意：duration字段存储用户选择的时长（4/6/8），此字段存储实际生成的时长（可能因延长而变化）';

-- 人物生成控制
ALTER TABLE video_generation_history
ADD COLUMN IF NOT EXISTS person_generation VARCHAR(50);

COMMENT ON COLUMN video_generation_history.person_generation IS
'人物生成控制：allow_all（允许所有人物，text-to-video可用） | allow_adult（仅成人，推荐） | dont_allow（禁止人物，text-to-video可用）。
EU/UK/CH/MENA地区强制allow_adult。reference-images/first-last-frame模式仅支持allow_adult。';

-- ========================================
-- 3. 添加索引优化查询性能
-- ========================================

-- source_video_id 索引（用于查询延长链）
CREATE INDEX IF NOT EXISTS idx_video_generation_source_video_id
ON video_generation_history(source_video_id)
WHERE source_video_id IS NOT NULL;

COMMENT ON INDEX idx_video_generation_source_video_id IS
'用于快速查询延长链：找到所有从某个视频延长而来的视频列表';

-- generation_mode + source_video_id 组合索引（用于统计延长视频）
CREATE INDEX IF NOT EXISTS idx_video_generation_mode_source
ON video_generation_history(generation_mode, source_video_id)
WHERE generation_mode = 'extend-video';

COMMENT ON INDEX idx_video_generation_mode_source IS
'用于快速统计和分析视频延长功能的使用情况';

-- gemini_video_uri 索引（用于延长API验证）
CREATE INDEX IF NOT EXISTS idx_video_generation_gemini_uri
ON video_generation_history(gemini_video_uri)
WHERE gemini_video_uri IS NOT NULL AND status = 'completed' AND resolution = '720p';

COMMENT ON INDEX idx_video_generation_gemini_uri IS
'用于快速查找可延长的视频（必须有gemini_video_uri、已完成、720p）';

-- ========================================
-- 4. 更新触发器（扩展模式验证）
-- ========================================

-- 🔥 更新现有触发器函数，添加 extend-video 模式验证
CREATE OR REPLACE FUNCTION check_video_generation_mode_constraints()
RETURNS TRIGGER AS $$
BEGIN
  -- 参考图片模式：reference_images 必须非空且长度1-3
  IF NEW.generation_mode = 'reference-images' THEN
    IF NEW.reference_images IS NULL
       OR array_length(NEW.reference_images, 1) IS NULL
       OR array_length(NEW.reference_images, 1) < 1
       OR array_length(NEW.reference_images, 1) > 3 THEN
      RAISE EXCEPTION '参考图片模式下 reference_images 必须包含 1-3 张图片';
    END IF;

    IF NEW.first_frame_url IS NOT NULL OR NEW.last_frame_url IS NOT NULL THEN
      RAISE EXCEPTION '参考图片模式下 first_frame_url 和 last_frame_url 必须为空';
    END IF;
  END IF;

  -- 首尾帧模式：first_frame_url 和 last_frame_url 必须都有值
  IF NEW.generation_mode = 'first-last-frame' THEN
    IF NEW.first_frame_url IS NULL OR NEW.last_frame_url IS NULL THEN
      RAISE EXCEPTION '首尾帧模式下 first_frame_url 和 last_frame_url 都必须填写';
    END IF;

    IF NEW.reference_images IS NOT NULL AND array_length(NEW.reference_images, 1) > 0 THEN
      RAISE EXCEPTION '首尾帧模式下 reference_images 必须为空';
    END IF;
  END IF;

  -- 纯文生视频模式：所有图片字段都必须为空
  IF NEW.generation_mode = 'text-to-video' THEN
    IF (NEW.reference_images IS NOT NULL AND array_length(NEW.reference_images, 1) > 0)
       OR NEW.first_frame_url IS NOT NULL
       OR NEW.last_frame_url IS NOT NULL
       OR NEW.source_video_id IS NOT NULL THEN
      RAISE EXCEPTION '纯文生视频模式下所有图片字段和source_video_id都必须为空';
    END IF;
  END IF;

  -- 🔥 新增：视频延长模式验证
  IF NEW.generation_mode = 'extend-video' THEN
    -- 必须有source_video_id
    IF NEW.source_video_id IS NULL THEN
      RAISE EXCEPTION '视频延长模式下 source_video_id 必须填写（指向源视频）';
    END IF;

    -- 不能有图片字段
    IF (NEW.reference_images IS NOT NULL AND array_length(NEW.reference_images, 1) > 0)
       OR NEW.first_frame_url IS NOT NULL
       OR NEW.last_frame_url IS NOT NULL
       OR NEW.reference_image_url IS NOT NULL THEN
      RAISE EXCEPTION '视频延长模式下所有图片字段都必须为空';
    END IF;

    -- 固定时长必须是7秒
    IF NEW.duration_seconds IS NOT NULL AND NEW.duration_seconds != 7 THEN
      RAISE EXCEPTION '视频延长模式下 duration_seconds 必须是 7 秒';
    END IF;
  END IF;

  -- 🔥 新增：图生视频模式验证
  IF NEW.generation_mode = 'image-to-video' THEN
    -- 必须有reference_image_url
    IF NEW.reference_image_url IS NULL THEN
      RAISE EXCEPTION '图生视频模式下 reference_image_url 必须填写';
    END IF;

    -- 不能有其他图片字段
    IF (NEW.reference_images IS NOT NULL AND array_length(NEW.reference_images, 1) > 0)
       OR NEW.first_frame_url IS NOT NULL
       OR NEW.last_frame_url IS NOT NULL
       OR NEW.source_video_id IS NOT NULL THEN
      RAISE EXCEPTION '图生视频模式下其他图片字段和source_video_id都必须为空';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_video_generation_mode_constraints() IS
'艹，确保不同生成模式下字段的正确性（已扩展支持extend-video和image-to-video模式）';

-- ========================================
-- 5. 数据完整性约束
-- ========================================

-- 🔥 确保延长链不循环（A延长B，B不能延长A）
-- 注意：这个约束只能防止直接循环，不能防止间接循环（A→B→C→A）
-- 间接循环需要在应用层验证（已在video-service.ts中实现）
ALTER TABLE video_generation_history
ADD CONSTRAINT check_no_self_extension
  CHECK (id != source_video_id OR source_video_id IS NULL);

COMMENT ON CONSTRAINT check_no_self_extension ON video_generation_history IS
'防止视频延长自己（id != source_video_id）';

-- ========================================
-- 6. 更新现有数据（兜底处理）
-- ========================================

-- 将 duration 值同步到 duration_seconds（历史数据兼容）
UPDATE video_generation_history
SET duration_seconds = duration
WHERE duration_seconds IS NULL
  AND duration IS NOT NULL;

-- 为所有completed状态的视频设置默认person_generation
UPDATE video_generation_history
SET person_generation = 'allow_adult'
WHERE person_generation IS NULL
  AND status = 'completed';

-- ============================================================================
-- 迁移完成！艹，视频延长功能的数据库准备好了！
-- ============================================================================
