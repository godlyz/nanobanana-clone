-- ============================================================================
-- 🔥 老王的暴躁数据库迁移文件
-- 功能：为 video_generation_history 表添加多种生成模式支持
-- 创建时间：2025-11-18
-- ============================================================================

-- ========================================
-- 1. 添加新字段
-- ========================================

-- 生成模式字段（三选一）
ALTER TABLE video_generation_history
ADD COLUMN IF NOT EXISTS generation_mode VARCHAR(50) NOT NULL DEFAULT 'text-to-video'
  CHECK (generation_mode IN ('text-to-video', 'reference-images', 'first-last-frame'));

COMMENT ON COLUMN video_generation_history.generation_mode IS
'生成模式：text-to-video（纯文生视频）| reference-images（参考图片模式，最多3张）| first-last-frame（首尾帧模式，2张）';

-- 参考图片数组（参考图片模式使用）
ALTER TABLE video_generation_history
ADD COLUMN IF NOT EXISTS reference_images TEXT[];

COMMENT ON COLUMN video_generation_history.reference_images IS
'参考图片URL数组，最多3张，用于reference-images模式保持主体/角色/产品一致性';

-- 第一帧图片URL（首尾帧模式使用）
ALTER TABLE video_generation_history
ADD COLUMN IF NOT EXISTS first_frame_url TEXT;

COMMENT ON COLUMN video_generation_history.first_frame_url IS
'视频第一帧图片URL，用于first-last-frame模式精确控制视频开始画面';

-- 最后一帧图片URL（首尾帧模式使用）
ALTER TABLE video_generation_history
ADD COLUMN IF NOT EXISTS last_frame_url TEXT;

COMMENT ON COLUMN video_generation_history.last_frame_url IS
'视频最后一帧图片URL，用于first-last-frame模式精确控制视频结束画面';

-- 参考图片来源元数据（JSONB数组，记录图片来自哪次历史生成）
ALTER TABLE video_generation_history
ADD COLUMN IF NOT EXISTS reference_image_sources JSONB;

COMMENT ON COLUMN video_generation_history.reference_image_sources IS
'参考图片来源元数据数组（可追溯性）：
[
  {
    "history_id": "uuid",
    "image_index": 0,
    "generation_type": "text_to_image",
    "tool_type": null,
    "prompt": "A beautiful sunset",
    "created_at": "2025-01-17T12:00:00Z"
  }
]
用于分析用户偏好选择哪类图片作为视频参考，以及优化推荐算法';

-- ========================================
-- 2. 添加索引优化查询性能
-- ========================================

-- 按生成模式过滤（用于统计不同模式的使用频率）
CREATE INDEX IF NOT EXISTS idx_video_generation_mode
ON video_generation_history(generation_mode);

COMMENT ON INDEX idx_video_generation_mode IS
'用于统计和分析不同生成模式的使用频率，帮助产品优化';

-- ========================================
-- 3. 数据完整性约束
-- ========================================

-- 🔥 艹，确保不同模式下必填字段的约束（使用触发器检查）
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

    -- 参考图片模式下，首尾帧字段必须为空
    IF NEW.first_frame_url IS NOT NULL OR NEW.last_frame_url IS NOT NULL THEN
      RAISE EXCEPTION '参考图片模式下 first_frame_url 和 last_frame_url 必须为空';
    END IF;
  END IF;

  -- 首尾帧模式：first_frame_url 和 last_frame_url 必须都有值
  IF NEW.generation_mode = 'first-last-frame' THEN
    IF NEW.first_frame_url IS NULL OR NEW.last_frame_url IS NULL THEN
      RAISE EXCEPTION '首尾帧模式下 first_frame_url 和 last_frame_url 都必须填写';
    END IF;

    -- 首尾帧模式下，参考图片数组必须为空
    IF NEW.reference_images IS NOT NULL AND array_length(NEW.reference_images, 1) > 0 THEN
      RAISE EXCEPTION '首尾帧模式下 reference_images 必须为空';
    END IF;
  END IF;

  -- 纯文生视频模式：所有图片字段都必须为空
  IF NEW.generation_mode = 'text-to-video' THEN
    IF (NEW.reference_images IS NOT NULL AND array_length(NEW.reference_images, 1) > 0)
       OR NEW.first_frame_url IS NOT NULL
       OR NEW.last_frame_url IS NOT NULL THEN
      RAISE EXCEPTION '纯文生视频模式下所有图片字段都必须为空';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_video_generation_mode_constraints() IS
'艹，确保不同生成模式下图片字段的正确性，防止用户提交错误数据';

-- 创建触发器
DROP TRIGGER IF EXISTS video_generation_mode_validation_trigger ON video_generation_history;
CREATE TRIGGER video_generation_mode_validation_trigger
  BEFORE INSERT OR UPDATE ON video_generation_history
  FOR EACH ROW
  EXECUTE FUNCTION check_video_generation_mode_constraints();

COMMENT ON TRIGGER video_generation_mode_validation_trigger ON video_generation_history IS
'在插入或更新视频生成记录时，自动验证不同模式下的字段完整性';

-- ========================================
-- 4. 更新现有数据（兜底处理）
-- ========================================

-- 🔥 将所有现有记录设置为 text-to-video 模式（兼容旧数据）
UPDATE video_generation_history
SET generation_mode = 'text-to-video'
WHERE generation_mode IS NULL
   OR generation_mode NOT IN ('text-to-video', 'reference-images', 'first-last-frame');

-- ========================================
-- 5. 权限设置（继承原表RLS）
-- ========================================
-- 新字段自动继承 video_generation_history 表的 RLS 策略
-- 无需额外配置

-- ============================================================================
-- 迁移完成！艹，这个表现在支持三种生成模式了！
-- ============================================================================
