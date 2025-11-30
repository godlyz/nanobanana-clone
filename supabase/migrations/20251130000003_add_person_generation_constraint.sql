-- ============================================================================
-- 🔥 老王的暴躁数据库迁移文件 - Task A Day 1: 添加person_generation约束
-- 功能：为 video_generation_history.person_generation 添加CHECK约束
-- 创建时间：2025-11-30
-- 说明：person_generation字段已存在（VARCHAR(50)），此迁移添加值约束
-- ============================================================================

-- ========================================
-- 1. 添加 person_generation CHECK 约束
-- ========================================

-- 确保 person_generation 只能是以下3个值之一
ALTER TABLE video_generation_history
ADD CONSTRAINT video_generation_history_person_generation_check
  CHECK (person_generation IN ('allow_all', 'allow_adult', 'dont_allow') OR person_generation IS NULL);

COMMENT ON CONSTRAINT video_generation_history_person_generation_check ON video_generation_history IS
'人物生成控制约束：allow_all（允许所有人物，仅text-to-video可用） | allow_adult（仅成人，推荐，所有模式可用） | dont_allow（禁止人物，仅text-to-video可用）。
重要：EU/UK/CH/MENA地区强制allow_adult。reference-images/first-last-frame模式仅支持allow_adult。';

-- ========================================
-- 2. 更新触发器函数 - 添加person_generation验证
-- ========================================

-- 🔥 更新现有触发器函数，添加 person_generation 地区和模式验证
CREATE OR REPLACE FUNCTION check_video_generation_mode_constraints()
RETURNS TRIGGER AS $$
BEGIN
  -- ========================================
  -- A. 模式验证（原有逻辑）
  -- ========================================

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

    -- 🔥 reference-images 模式只支持 allow_adult
    IF NEW.person_generation IS NOT NULL AND NEW.person_generation != 'allow_adult' THEN
      RAISE EXCEPTION '参考图片模式下 person_generation 必须为 allow_adult';
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

    -- 🔥 first-last-frame 模式只支持 allow_adult
    IF NEW.person_generation IS NOT NULL AND NEW.person_generation != 'allow_adult' THEN
      RAISE EXCEPTION '首尾帧模式下 person_generation 必须为 allow_adult';
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

    -- 🔥 text-to-video 模式支持所有3个person_generation值
    -- （无需额外验证，CHECK约束已确保值合法）
  END IF;

  -- 🔥 视频延长模式验证
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

    -- 🔥 extend-video 模式支持所有3个person_generation值
    -- （无需额外验证，CHECK约束已确保值合法）
  END IF;

  -- 🔥 图生视频模式验证
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

    -- 🔥 image-to-video 模式支持所有3个person_generation值
    -- （无需额外验证，CHECK约束已确保值合法）
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_video_generation_mode_constraints() IS
'艹，确保不同生成模式下字段的正确性（已扩展支持person_generation验证）';

-- ========================================
-- 3. 数据完整性检查与修复
-- ========================================

-- 检查是否有非法的person_generation值
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM video_generation_history
  WHERE person_generation IS NOT NULL
    AND person_generation NOT IN ('allow_all', 'allow_adult', 'dont_allow');

  IF invalid_count > 0 THEN
    -- 修复非法值为默认值 allow_adult
    UPDATE video_generation_history
    SET person_generation = 'allow_adult'
    WHERE person_generation IS NOT NULL
      AND person_generation NOT IN ('allow_all', 'allow_adult', 'dont_allow');

    RAISE NOTICE '艹，发现并修复了 % 条非法 person_generation 记录（已设为 allow_adult）', invalid_count;
  END IF;
END $$;

-- 为 NULL 值设置默认值（推荐值）
UPDATE video_generation_history
SET person_generation = 'allow_adult'
WHERE person_generation IS NULL
  AND status IN ('completed', 'processing');

-- ============================================================================
-- 迁移完成！艹，person_generation约束已添加完成！
-- 总结：
-- ✅ 添加了CHECK约束（allow_all/allow_adult/dont_allow）
-- ✅ 更新了触发器函数（模式特定的person_generation验证）
-- ✅ 修复了现有数据（非法值→allow_adult）
-- ✅ 为NULL值设置默认值（allow_adult）
-- ============================================================================
