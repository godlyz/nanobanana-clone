/**
 * 🔥 老王的订阅服务层
 * 用途：封装订阅相关的数据库操作（副作用函数）
 *
 * 原则：
 * - 使用依赖注入（传入 SupabaseClient），便于测试时 Mock
 * - 每个函数职责单一，便于理解和维护
 * - 保持业务逻辑不变，只是提取和封装
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlanTier, BillingCycle, SubscriptionInfo } from './types'

/**
 * 获取用户当前的活跃订阅
 *
 * @param client - Supabase Client（依赖注入）
 * @param userId - 用户ID
 * @returns 订阅信息（如果没有则返回null）
 * @throws 如果数据库查询失败
 */
export async function getActiveSubscription(
  client: SupabaseClient,
  userId: string
): Promise<SubscriptionInfo | null> {
  const { data, error } = await client.rpc('get_user_active_subscription', {
    p_user_id: userId,
  })

  if (error) {
    console.error(`❌ 获取用户活跃订阅失败:`, error)
    throw new Error(`Failed to get active subscription: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return null
  }

  return data[0] as SubscriptionInfo
}

/**
 * 取消旧订阅（将状态改为 cancelled，延长到期时间）
 *
 * @param client - Supabase Client（依赖注入）
 * @param subscriptionId - 订阅ID
 * @param userId - 用户ID（用于安全校验）
 * @param newExpiresAt - 新到期时间（延长后的）
 * @throws 如果更新失败
 */
export async function cancelSubscription(
  client: SupabaseClient,
  subscriptionId: string,
  userId: string,
  newExpiresAt: string
): Promise<void> {
  const { error } = await client
    .from('user_subscriptions')
    .update({
      status: 'cancelled',
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .eq('user_id', userId)

  if (error) {
    console.error('❌ 取消旧订阅失败:', error)
    throw new Error(`Failed to cancel subscription: ${error.message}`)
  }

  console.log(`✅ 旧订阅已取消并延长: status=cancelled, expires_at=${newExpiresAt}`)
}

/**
 * 查询 FIFO 积分包（最早到期的月度充值包）
 *
 * 业务逻辑：
 * - 只查充值记录（transaction_type='subscription_refill'）
 * - 只查有剩余的（remaining_amount > 0）
 * - 只查未冻结的（is_frozen=false 或 null）
 * - 按到期时间升序排序（FIFO：First In First Out）
 * - 只取第一个（最早到期的）
 *
 * @param client - Supabase Client（依赖注入）
 * @param userId - 用户ID
 * @param subscriptionId - 订阅ID
 * @returns 积分包信息（如果没有则返回null）
 */
export async function getFifoPackage(
  client: SupabaseClient,
  userId: string,
  subscriptionId: string
): Promise<{
  id: string
  amount: number
  remaining_amount: number
  expires_at: string
  created_at: string
} | null> {
  const { data, error } = await client
    .from('credit_transactions')
    .select('id, amount, remaining_amount, expires_at, created_at')
    .eq('user_id', userId)
    .eq('related_entity_id', subscriptionId)
    .eq('transaction_type', 'subscription_refill')
    .gt('amount', 0) // 只查充值记录
    .gt('remaining_amount', 0) // 有剩余的
    .or('is_frozen.is.null,is_frozen.eq.false') // 未冻结的
    .order('expires_at', { ascending: true }) // FIFO：最早过期的优先
    .limit(1)

  if (error) {
    console.error('❌ 查询FIFO积分包失败:', error)
    throw new Error(`Failed to get FIFO package: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return null
  }

  return data[0]
}

/**
 * 获取订阅的到期时间
 *
 * @param client - Supabase Client（依赖注入）
 * @param subscriptionId - 订阅ID
 * @returns 到期时间（ISO 8601格式）
 * @throws 如果查询失败
 */
export async function getSubscriptionExpiresAt(
  client: SupabaseClient,
  subscriptionId: string
): Promise<string> {
  const { data, error } = await client
    .from('user_subscriptions')
    .select('expires_at')
    .eq('id', subscriptionId)
    .single()

  if (error || !data) {
    console.error('❌ 查询订阅到期时间失败:', error)
    throw new Error(`Failed to get subscription expires_at: ${error?.message}`)
  }

  return data.expires_at
}

/**
 * 冻结积分包
 *
 * @param client - Supabase Client（依赖注入）
 * @param packageId - 积分包ID
 * @param frozenUntil - 冻结至时间
 * @param remainingSeconds - 剩余秒数
 * @param newExpiresAt - 新到期时间
 * @param originalExpiresAt - 原到期时间
 * @param reason - 冻结原因
 * @throws 如果更新失败
 */
export async function freezeCreditPackage(
  client: SupabaseClient,
  packageId: string,
  frozenUntil: string,
  remainingSeconds: number,
  newExpiresAt: string,
  originalExpiresAt: string,
  reason: string
): Promise<void> {
  const { error } = await client
    .from('credit_transactions')
    .update({
      is_frozen: true,
      frozen_until: frozenUntil,
      frozen_remaining_seconds: remainingSeconds,
      original_expires_at: originalExpiresAt,
      expires_at: newExpiresAt,
      frozen_reason: reason,
    })
    .eq('id', packageId)

  if (error) {
    console.error('❌ 冻结积分包失败:', error)
    throw new Error(`Failed to freeze credit package: ${error.message}`)
  }

  console.log(`🧊 积分包已冻结: ID=${packageId}, frozen_until=${frozenUntil}`)
}
