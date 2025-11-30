-- =============================================================================
-- 查询积分消耗配置详情
-- =============================================================================

-- 查看文生图和图生图的详细配置
SELECT
    config_key,
    config_type,
    config_value->>'amount' AS amount,
    config_value->>'unit' AS unit,
    config_value->>'description' AS config_description,
    description,
    is_active
FROM system_configs
WHERE config_type = 'credit_cost'
ORDER BY config_key;
