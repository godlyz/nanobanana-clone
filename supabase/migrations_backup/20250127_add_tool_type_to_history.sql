-- =============================================================================
-- 添加工具类型字段到历史记录表
-- 创建时间: 2025-01-27
-- 描述: 为 generation_history 表添加 tool_type 字段，支持工具箱和高级工具的历史记录过滤
-- =============================================================================
-- 执行方式：
-- 1. 打开 Supabase Dashboard
-- 2. 进入 SQL Editor
-- 3. 粘贴并执行本脚本
-- =============================================================================

-- 添加 tool_type 字段（允许为空，兼容旧数据）
ALTER TABLE generation_history
ADD COLUMN IF NOT EXISTS tool_type VARCHAR(50) NULL;

-- 添加注释说明
COMMENT ON COLUMN generation_history.tool_type IS '使用的工具类型：基础工具箱(style-transfer, background-remover, scene-preservation, consistent-generation)或高级工具(text-to-image-with-text, chat-edit, smart-prompt)，NULL表示基础编辑模式';

-- 添加索引加速工具类型查询
CREATE INDEX IF NOT EXISTS idx_generation_history_tool_type
ON generation_history(tool_type);

-- 添加组合索引（generation_type + tool_type）提升过滤性能
CREATE INDEX IF NOT EXISTS idx_generation_history_type_tool
ON generation_history(generation_type, tool_type);

-- 添加约束检查（确保tool_type值合法）
-- 🔥 先删除旧约束（如果存在），再添加新约束
ALTER TABLE generation_history
DROP CONSTRAINT IF EXISTS check_tool_type;

ALTER TABLE generation_history
ADD CONSTRAINT check_tool_type
CHECK (
  tool_type IS NULL OR
  tool_type IN (
    -- 基础工具箱
    'style-transfer',
    'background-remover',
    'scene-preservation',
    'consistent-generation',
    -- 高级工具
    'text-to-image-with-text',
    'chat-edit',
    'smart-prompt'
  )
);

-- =============================================================================
-- 数据兼容性说明
-- =============================================================================
-- 旧数据的 tool_type 字段默认为 NULL
-- NULL 值表示使用基础编辑模式（文生图或图片编辑，无额外工具）
--
-- 分类规则：
-- 1. tool_type = NULL + generation_type = 'text_to_image' → "文生图"标签
-- 2. tool_type = NULL + generation_type = 'image_to_image' → "图片编辑"标签
-- 3. tool_type = '基础工具名' → "工具箱"标签下的对应子标签
-- 4. tool_type = '高级工具名' → "高级工具"标签下的对应子标签
-- =============================================================================

-- =============================================================================
-- 验证脚本执行结果
-- =============================================================================

-- 检查字段是否添加成功
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'generation_history'
AND column_name = 'tool_type';

-- 检查索引是否创建成功
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'generation_history'
AND indexname IN ('idx_generation_history_tool_type', 'idx_generation_history_type_tool');

-- 统计各类型数据数量
SELECT
  CASE
    WHEN tool_type IS NULL AND generation_type = 'text_to_image' THEN '文生图'
    WHEN tool_type IS NULL AND generation_type = 'image_to_image' THEN '图片编辑'
    WHEN tool_type IN ('style-transfer', 'background-remover', 'scene-preservation', 'consistent-generation') THEN '工具箱-' || tool_type
    WHEN tool_type IN ('text-to-image-with-text', 'chat-edit', 'smart-prompt') THEN '高级工具-' || tool_type
    ELSE '未知类型'
  END AS category,
  COUNT(*) AS count
FROM generation_history
GROUP BY category
ORDER BY count DESC;

-- 执行成功！现在可以在前端使用 tool_type 字段进行历史记录过滤了！
