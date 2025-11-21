-- =============================================================================
-- 修正积分包描述文本
-- 创建时间: 2025-01-31
-- 描述: 修正积分包的description字段，从"永久有效"改为"365天有效"
-- =============================================================================

-- 🔥 老王修正：同时更新description字段，把"永久有效"改成"365天有效"或"一年有效"

UPDATE system_configs
SET description = CASE config_key
  WHEN 'package.starter' THEN 'Starter积分包 - $12.99，100积分（365天有效）'
  WHEN 'package.popular' THEN 'Popular积分包 - $34.99，300积分+15%赠送（365天有效）'
  WHEN 'package.pro' THEN 'Pro积分包 - $69.99，700积分+20%赠送（365天有效）'
  WHEN 'package.ultimate' THEN 'Ultimate积分包 - $129.99，1500积分+30%赠送（365天有效）'
END
WHERE config_key IN (
  'package.starter',
  'package.popular',
  'package.pro',
  'package.ultimate'
);

-- 验证修正结果
SELECT
    config_key,
    config_value->>'name' AS package_name,
    config_value->>'credits' AS credits,
    config_value->>'validity_days' AS validity_days,
    description
FROM system_configs
WHERE config_type = 'package'
ORDER BY config_key;

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ 积分包描述修正完成！';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    RAISE NOTICE '已修正:';
    RAISE NOTICE '- Starter积分包：365天有效';
    RAISE NOTICE '- Popular积分包：365天有效';
    RAISE NOTICE '- Pro积分包：365天有效';
    RAISE NOTICE '- Ultimate积分包：365天有效';
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
END $$;
