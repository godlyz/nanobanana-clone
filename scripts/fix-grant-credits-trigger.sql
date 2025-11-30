-- 🔥 老王修复：重写grant_registration_credits函数，添加错误容错
-- 原因：原函数没有EXCEPTION处理，导致用户创建失败

-- 删除旧函数
DROP FUNCTION IF EXISTS grant_registration_credits() CASCADE;

-- 重新创建带完整错误容错的函数
CREATE OR REPLACE FUNCTION grant_registration_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- 🔥 老王添加：完整错误容错，不阻止用户创建
    BEGIN
        -- 插入用户积分记录
        INSERT INTO user_credits (user_id, total_credits)
        VALUES (NEW.id, 50)
        ON CONFLICT (user_id) DO NOTHING;

        -- 记录注册赠送交易
        INSERT INTO credit_transactions (
            user_id,
            transaction_type,
            amount,
            remaining_credits,
            expires_at,
            description
        )
        VALUES (
            NEW.id,
            'register_bonus',
            50,
            50,
            NOW() + INTERVAL '7 days', -- 7天有效期
            'Registration bonus - 50 credits / 注册赠送 - 50积分'
        );
    EXCEPTION WHEN OTHERS THEN
        -- 任何错误都记录但不阻止用户创建
        RAISE WARNING 'Failed to grant registration credits for user %: %', NEW.id, SQLERRM;
    END;

    -- 🔥 关键：无论如何都返回NEW，确保用户创建成功
    RETURN NEW;
END;
$$;

-- 重新创建触发器
DROP TRIGGER IF EXISTS on_user_created_grant_credits ON auth.users;
CREATE TRIGGER on_user_created_grant_credits
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION grant_registration_credits();

-- 验证修复结果
SELECT
  tgname AS trigger_name,
  CASE tgenabled
    WHEN 'O' THEN 'Enabled ✅'
    WHEN 'D' THEN 'Disabled ⚠️'
    ELSE 'Unknown'
  END AS status,
  p.proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname IN ('on_auth_user_created', 'on_user_created_grant_credits')
ORDER BY t.tgname;

-- 🔥 老王说明：
-- 1. 函数现在有完整的EXCEPTION捕获
-- 2. 任何credit相关错误都不会阻止用户创建
-- 3. 错误会记录为WARNING，方便后续排查
-- 4. 两个触发器都应该显示为 Enabled ✅
