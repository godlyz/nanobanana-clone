-- 🔥 老王：添加图片名称字段到generation_history表
-- 用JSONB数组存储每张生成图片的名称，与generated_images数组一一对应

-- 添加image_names字段（JSONB类型，默认为空数组）
ALTER TABLE generation_history
ADD COLUMN IF NOT EXISTS image_names JSONB DEFAULT '[]'::jsonb;

-- 添加注释说明
COMMENT ON COLUMN generation_history.image_names IS '图片名称数组，与generated_images一一对应，每个元素是字符串';

-- 验证字段添加成功
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'generation_history'
    AND column_name = 'image_names'
  ) THEN
    RAISE NOTICE '✅ image_names字段添加成功';
  ELSE
    RAISE EXCEPTION '❌ image_names字段添加失败';
  END IF;
END $$;
