/**
 * Supabase Service Role Client
 * 老王备注: 这个SB文件提供Service Role权限的Supabase客户端
 *
 * ⚠️ 警告：Service Role拥有完整数据库权限，绕过所有RLS策略
 * 只能在服务端API中使用，绝对不能暴露给客户端！
 *
 * 用途：
 * - 图像生成API：保存历史记录、扣减积分
 * - 管理员API：批量操作、数据迁移
 * - Webhook处理：支付回调、订阅充值
 */

import { createClient } from '@supabase/supabase-js'

/**
 * 创建Service Role客户端
 * 老王提醒: 这个客户端拥有超级权限，小心使用！
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    supabaseUrl.includes('your_supabase') ||
    serviceRoleKey.includes('your_supabase')
  ) {
    throw new Error(
      '❌ Supabase Service Role未配置！请在.env.local中设置 SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
