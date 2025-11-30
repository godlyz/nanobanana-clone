-- =====================================================
-- 🔥 老王重构：自动解冻机制（pg_cron定时任务）
-- 创建时间: 2025-11-11
-- 用途：
--   1. 安装 pg_cron 扩展
--   2. 创建自动解冻函数
--   3. 设置每小时执行一次的定时任务
-- =====================================================

-- 🔥 步骤1：启用 pg_cron 扩展
-- 注意：在某些 Supabase 版本中，pg_cron 可能需要手动启用
-- 如果执行失败，请在 Supabase Dashboard 的 Database Settings 中启用
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================

-- 🔥 步骤2：创建自动解冻函数
-- 功能：检查所有冻结记录，如果冻结时间已过，自动解冻并计算新的过期时间
CREATE OR REPLACE FUNCTION auto_unfreeze_credits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_unfrozen_count INTEGER := 0;
    v_record RECORD;
BEGIN
    RAISE NOTICE '🔍 [auto_unfreeze] 开始检查需要解冻的积分记录...';

    -- 查询所有需要解冻的记录
    -- 条件：is_frozen = TRUE AND frozen_until <= NOW()
    FOR v_record IN
        SELECT
            id,
            user_id,
            amount,
            frozen_until,
            frozen_remaining_seconds,
            original_expires_at
        FROM credit_transactions
        WHERE is_frozen = TRUE
          AND frozen_until <= NOW()
          AND frozen_remaining_seconds IS NOT NULL
    LOOP
        -- 计算新的过期时间
        -- 新过期时间 = NOW() + frozen_remaining_seconds
        DECLARE
            v_new_expires_at TIMESTAMPTZ;
        BEGIN
            v_new_expires_at := NOW() + (v_record.frozen_remaining_seconds || ' seconds')::INTERVAL;

            RAISE NOTICE '🔓 [auto_unfreeze] 解冻积分包: % - 用户: % - 积分: % - 新过期: %',
                v_record.id,
                v_record.user_id,
                v_record.amount,
                v_new_expires_at;

            -- 更新记录：解冻 + 设置新的过期时间
            UPDATE credit_transactions
            SET
                is_frozen = FALSE,
                frozen_until = NULL,
                expires_at = v_new_expires_at,
                -- 保留 frozen_remaining_seconds 和 original_expires_at 用于审计
                description = CASE
                    WHEN description IS NOT NULL
                    THEN description || FORMAT(' [Auto-unfrozen on %s, new expiry: %s]',
                                               NOW()::TEXT,
                                               v_new_expires_at::TEXT)
                    ELSE FORMAT('Auto-unfrozen on %s, new expiry: %s',
                               NOW()::TEXT,
                               v_new_expires_at::TEXT)
                END
            WHERE id = v_record.id;

            v_unfrozen_count := v_unfrozen_count + 1;
        END;
    END LOOP;

    IF v_unfrozen_count > 0 THEN
        RAISE NOTICE '✅ [auto_unfreeze] 已解冻 % 条积分记录', v_unfrozen_count;
    ELSE
        RAISE NOTICE '💤 [auto_unfreeze] 无需解冻的记录';
    END IF;

    RETURN v_unfrozen_count;
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION auto_unfreeze_credits IS '自动解冻过了冻结期的积分包，计算新的过期时间 = NOW() + frozen_remaining_seconds';

-- =====================================================

-- 🔥 步骤3：设置 pg_cron 定时任务（每小时执行一次）
-- 任务名称: auto_unfreeze_credits_hourly
-- 执行频率: 每小时的第0分钟
-- 功能: 调用 auto_unfreeze_credits() 函数

-- 先删除可能存在的旧任务（避免重复）
SELECT cron.unschedule('auto_unfreeze_credits_hourly')
WHERE EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'auto_unfreeze_credits_hourly'
);

-- 创建新的定时任务
SELECT cron.schedule(
    'auto_unfreeze_credits_hourly',  -- 任务名称
    '0 * * * *',                      -- Cron表达式：每小时的第0分钟
    $$SELECT auto_unfreeze_credits()$$  -- 执行的SQL
);

RAISE NOTICE '⏰ [auto_unfreeze] pg_cron 定时任务已设置：每小时执行一次';

-- =====================================================

-- 🔥 步骤4：手动测试（可选）
-- 取消注释下面这行以立即测试自动解冻功能
-- SELECT auto_unfreeze_credits();

-- =====================================================
-- 迁移完成
-- =====================================================
