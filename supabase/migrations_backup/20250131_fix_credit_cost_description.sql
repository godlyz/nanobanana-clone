-- =============================================================================
-- 修正积分消耗配置描述
-- 创建时间: 2025-01-31
-- 描述: 在description字段中明确写出消耗多少积分
-- =============================================================================

-- 🔥 老王修正：让description更清晰，直接写出消耗的积分数

UPDATE system_configs
SET description = 'AI文生图功能积分消耗配置（1积分/张图片）'
WHERE config_key = 'credit.text_to_image.cost';

UPDATE system_configs
SET description = 'AI图生图功能积分消耗配置（2积分/张图片）'
WHERE config_key = 'credit.image_to_image.cost';

-- 验证修正结果
SELECT
    config_key,
    config_value->>'amount' AS amount,
    config_value->>'unit' AS unit,
    config_value->>'description' AS config_value_desc,
    description AS table_description,
    is_active
FROM system_configs
WHERE config_type = 'credit_cost'
ORDER BY config_key;

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ 积分消耗配置描述修正完成！';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    RAISE NOTICE '当前积分消耗规则:';
    RAISE NOTICE '- 文生图（Text to Image）：1积分/张';
    RAISE NOTICE '- 图生图（Image to Image）：2积分/张';
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
END $$;
