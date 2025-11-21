/**
 * 🔥 老王的邮箱认证系统数据库迁移
 * 用途: 创建邮箱注册、验证、会话管理相关的表
 * 老王警告: 这些表结构设计得很精妙，别tm乱改！
 */

-- ============================================
-- 1. 用户会话表 (user_sessions)
-- 用于管理用户登录会话，支持IP绑定和7天有效期
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引优化：加快会话查询速度
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_token ON public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions(expires_at);

-- 老王注释：这个索引用于清理过期会话
CREATE INDEX idx_user_sessions_cleanup ON public.user_sessions(expires_at, created_at);

-- ============================================
-- 2. 邮箱验证码表 (email_verification_codes)
-- 用于存储注册、重置密码、修改密码的验证码
-- ============================================
CREATE TABLE IF NOT EXISTS public.email_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('register', 'reset_password', 'change_password')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引优化：加快验证码查询速度
CREATE INDEX idx_email_verification_email ON public.email_verification_codes(email);
CREATE INDEX idx_email_verification_code ON public.email_verification_codes(code);
CREATE INDEX idx_email_verification_purpose ON public.email_verification_codes(purpose);

-- 老王注释：这个组合索引用于快速验证验证码
CREATE INDEX idx_email_verification_lookup ON public.email_verification_codes(email, code, purpose, used, expires_at);

-- ============================================
-- 3. 登录日志表 (login_logs)
-- 用于记录所有登录尝试，成功和失败都记录
-- ============================================
CREATE TABLE IF NOT EXISTS public.login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引优化：加快日志查询和分析
CREATE INDEX idx_login_logs_user_id ON public.login_logs(user_id);
CREATE INDEX idx_login_logs_email ON public.login_logs(email);
CREATE INDEX idx_login_logs_ip_address ON public.login_logs(ip_address);
CREATE INDEX idx_login_logs_created_at ON public.login_logs(created_at);

-- 老王注释：这个索引用于分析失败的登录尝试
CREATE INDEX idx_login_logs_failures ON public.login_logs(success, ip_address, created_at) WHERE success = FALSE;

-- ============================================
-- 4. 速率限制日志表 (rate_limit_logs)
-- 用于记录各种操作的速率限制状态
-- ============================================
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL, -- IP地址或email
    action TEXT NOT NULL CHECK (action IN ('email_verification', 'login_attempt', 'password_reset', 'registration')),
    count INTEGER DEFAULT 1,
    reset_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引优化：加快速率限制检查
CREATE INDEX idx_rate_limit_identifier ON public.rate_limit_logs(identifier);
CREATE INDEX idx_rate_limit_action ON public.rate_limit_logs(action);

-- 老王注释：这个组合索引用于快速检查速率限制
CREATE INDEX idx_rate_limit_lookup ON public.rate_limit_logs(identifier, action, reset_at);

-- ============================================
-- 5. RLS (Row Level Security) 策略
-- 老王警告：这个很重要，保护用户数据安全！
-- ============================================

-- 启用RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- user_sessions 策略：用户只能查看自己的会话
CREATE POLICY "用户只能查看自己的会话"
    ON public.user_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

-- user_sessions 策略：用户可以删除自己的会话（登出）
CREATE POLICY "用户可以删除自己的会话"
    ON public.user_sessions
    FOR DELETE
    USING (auth.uid() = user_id);

-- email_verification_codes 策略：服务角色可以完全访问
CREATE POLICY "服务角色可以访问验证码"
    ON public.email_verification_codes
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- login_logs 策略：用户只能查看自己的登录日志
CREATE POLICY "用户只能查看自己的登录日志"
    ON public.login_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- rate_limit_logs 策略：服务角色可以完全访问
CREATE POLICY "服务角色可以访问速率限制日志"
    ON public.rate_limit_logs
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 6. 自动清理过期数据的函数
-- 老王智慧：定期清理垃圾数据，保持数据库整洁
-- ============================================

-- 清理过期会话的函数
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.user_sessions
    WHERE expires_at < NOW();

    RAISE NOTICE '✅ 已清理过期会话';
END;
$$;

-- 清理过期验证码的函数
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.email_verification_codes
    WHERE expires_at < NOW() AND used = FALSE;

    DELETE FROM public.email_verification_codes
    WHERE used = TRUE AND used_at < NOW() - INTERVAL '7 days';

    RAISE NOTICE '✅ 已清理过期验证码';
END;
$$;

-- 清理旧的登录日志（保留30天）
CREATE OR REPLACE FUNCTION public.cleanup_old_login_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.login_logs
    WHERE created_at < NOW() - INTERVAL '30 days';

    RAISE NOTICE '✅ 已清理旧登录日志';
END;
$$;

-- 清理过期的速率限制记录
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.rate_limit_logs
    WHERE reset_at < NOW();

    RAISE NOTICE '✅ 已清理过期速率限制记录';
END;
$$;

-- ============================================
-- 7. 触发器：自动更新 updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_rate_limit_logs_updated_at
    BEFORE UPDATE ON public.rate_limit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 8. 权限设置
-- 老王叮嘱：给服务角色足够的权限，但不要给匿名用户！
-- ============================================

-- 授予服务角色所有权限
GRANT ALL ON public.user_sessions TO service_role;
GRANT ALL ON public.email_verification_codes TO service_role;
GRANT ALL ON public.login_logs TO service_role;
GRANT ALL ON public.rate_limit_logs TO service_role;

-- 授予认证用户部分权限
GRANT SELECT, DELETE ON public.user_sessions TO authenticated;
GRANT SELECT ON public.login_logs TO authenticated;

-- ============================================
-- 完成！
-- 老王骄傲地说：这个数据库设计堪称完美！
-- ============================================

COMMENT ON TABLE public.user_sessions IS '用户会话表，支持IP绑定和7天有效期';
COMMENT ON TABLE public.email_verification_codes IS '邮箱验证码表，用于注册、重置密码、修改密码';
COMMENT ON TABLE public.login_logs IS '登录日志表，记录所有登录尝试';
COMMENT ON TABLE public.rate_limit_logs IS '速率限制日志表，防止恶意攻击';
