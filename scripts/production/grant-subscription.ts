/**
 * 🔥 老王的订阅开通脚本
 * 用法: pnpm tsx scripts/grant-subscription.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 环境变量未配置！')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '已配置' : '未配置')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '已配置' : '未配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function grantSubscription() {
  try {
    console.log('🔍 查询当前登录用户...')

    // 获取所有用户
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (usersError) {
      console.error('❌ 查询用户失败:', usersError)

      // 尝试直接从 user_subscriptions 表找到用户ID
      console.log('🔍 从订阅表查找用户...')
      const { data: subs, error: subsError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (subsError) {
        console.error('❌ 查询订阅失败:', subsError)
        return
      }

      console.log('📋 现有订阅:', subs)

      if (!subs || subs.length === 0) {
        console.log('❌ 没有找到任何订阅记录，请先登录一次')
        return
      }

      const userId = subs[0].user_id
      console.log(`🎯 使用用户ID: ${userId}`)

      // 更新该用户的订阅
      await updateSubscription(userId)
      return
    }

    console.log('📋 用户列表:', users?.map(u => ({ id: u.id, email: u.email })))

    if (!users || users.length === 0) {
      console.log('❌ 没有找到用户')
      return
    }

    const userId = users[0].id
    await updateSubscription(userId)

  } catch (error) {
    console.error('💥 脚本执行失败:', error)
  }
}

async function updateSubscription(userId: string) {
  console.log(`\n🔧 开通订阅: 用户ID=${userId}`)

  // 检查现有订阅
  const { data: existingSub } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const now = new Date()
  const oneYearLater = new Date()
  oneYearLater.setFullYear(now.getFullYear() + 1)

  if (existingSub) {
    console.log('📝 更新现有订阅...')

    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({
        plan: 'pro',
        status: 'active',
        expires_at: oneYearLater.toISOString(),
        interval: 'yearly',
        updated_at: now.toISOString()
      })
      .eq('id', existingSub.id)
      .select()

    if (error) {
      console.error('❌ 更新失败:', error)
      return
    }

    console.log('✅ 订阅更新成功！')
    console.log({
      plan: 'pro (专业版)',
      status: 'active',
      created_at: existingSub.created_at,
      expires_at: oneYearLater.toISOString(),
      interval: 'yearly (年付)',
      有效期: '1年'
    })
  } else {
    console.log('📝 创建新订阅...')

    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        plan: 'pro',
        status: 'active',
        expires_at: oneYearLater.toISOString(),
        interval: 'yearly',
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .select()

    if (error) {
      console.error('❌ 创建失败:', error)
      return
    }

    console.log('✅ 订阅创建成功！')
    console.log({
      plan: 'pro (专业版)',
      status: 'active',
      created_at: now.toISOString(),
      expires_at: oneYearLater.toISOString(),
      interval: 'yearly (年付)',
      有效期: '1年'
    })
  }

  console.log('\n🎉 完成！请刷新页面查看效果')
}

grantSubscription()
