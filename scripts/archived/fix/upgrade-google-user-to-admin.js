#!/usr/bin/env node

/**
 * 🔥 老王的Google账号升级脚本
 * 用途: 将普通用户的 Google 账号升级为管理员权限
 * 老王警告: 这个操作要是执行失败，用户可能再也登录不进来了！
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// 加载环境变量
config({ path: '.env.local' })

console.log('🔥 开始升级 Google 账号为管理员...')

// 需要升级的用户邮箱列表
const GOOGLE_USERS = [
  'kn197884@gmail.com',  // 老王的Google账号
  'admin@example.com',
  'ops@example.com'
  // 可以添加更多需要升级的管理员邮箱
]

async function upgradeGoogleUserToAdmin(userEmail) {
  try {
    console.log(`🔍 检查用户: ${userEmail}`)

    // 验证是否为管理员邮箱
    if (!GOOGLE_USERS.includes(userEmail.toLowerCase())) {
      console.log(`⚠️ 邮箱 ${userEmail} 不在管理员白名单中`)
      return { success: false, message: `邮箱 ${userEmail} 不在管理员白名单中` }
    }

    // 使用service role key创建客户端
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 检查用户是否已存在
    const { data: existingUser, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', userEmail.toLowerCase())
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('❌ 检查用户失败:', error)
      return { success: false, message: '查询用户失败' }
    }

    // 检查用户角色
    let userRole = existingUser?.role || null
    const isNewAdmin = !existingUser || existingUser.role !== 'super_admin'

    if (existingUser) {
      console.log(`📋 用户 ${userEmail} 已存在，当前角色: ${userRole}`)

      if (userRole === 'super_admin') {
        console.log(`✅ 用户 ${userEmail} 已经是超级管理员`)
        return { success: true, message: '用户已经是超级管理员' }
      }

      console.log(`🔄 升级用户 ${userEmail} 角色: super_admin`)

      // 升级为管理员
      const { data: updatedUser, error: updateError } = await supabase
        .from('admin_users')
        .update({
          role: 'super_admin',
          auth_provider: 'google',
          email_verified: true,
          updated_by: 'system_upgrade',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ 升级用户失败:', updateError)
        return { success: false, message: '升级管理员权限失败' }
      }

      console.log(`✅ 用户 ${userEmail} 升级成功: super_admin`)
      userRole = 'super_admin'
    } else {
      // 创建新用户
      console.log(`📝 用户 ${userEmail} 不存在，创建新的管理员账户`)

      const { data: newUser, error: createError } = await supabase
        .from('admin_users')
        .insert({
          email: userEmail.toLowerCase(),
          name: `Google Admin - ${userEmail}`,
          role: 'super_admin',
          status: 'active',
          auth_provider: 'google',
          email_verified: true,
          created_by: 'system_upgrade',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ 创建管理员用户失败:', createError)
        return { success: false, message: '创建管理员用户失败' }
      }

      console.log(`✅ 创建新管理员用户成功: ${userEmail}`)
      userRole = 'super_admin'
    }

    // 显示管理员白名单状态
    console.log('✅ 管理员白名单状态:')
    console.log('📊 当前管理员:')

    for (const email of GOOGLE_USERS) {
      try {
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', email.toLowerCase())
          .single()

        const status = adminUser ? '✓' : '✗'
        console.log(`  - ${email}: ${status ? '已存在' : '不存在'} (${adminUser?.role || 'unknown'})`)

        if (adminUser && adminUser.role === 'super_admin') {
          console.log(`    ⭐ 超级管理员: ${adminUser.email}`)
        }
      } catch (err) {
        console.log(`  - ${email}: 查询失败`)
      }
    }

    console.log('\n🎉 Google 账号升级完成！')

    return {
      success: true,
      message: `用户 ${userEmail} 已升级为超级管理员`,
      userRole,
      isNewAdmin
    }

  } catch (error) {
    console.error('❌ 升级用户失败:', error)
    return {
      success: false,
      message: '升级失败: ' + (error instanceof Error ? error.message : '未知错误')
    }
  }
}

// 主函数
async function main() {
  console.log('🔥 Google 账号升级工具')
  console.log(`📊 管理员白名单: ${GOOGLE_USERS.join(', ')}`)
  console.log(`📊 准备升级 ${GOOGLE_USERS.length} 个用户`)

  let successCount = 0
  let failCount = 0

  for (const userEmail of GOOGLE_USERS) {
    try {
      const result = await upgradeGoogleUserToAdmin(userEmail)

      if (result.success) {
        successCount++
        console.log(`✅ ${userEmail} 升级成功`)
      } else {
        failCount++
        console.error(`❌ ${userEmail} 升级失败: ${result.message}`)
      }
    } catch (error) {
      failCount++
      console.error(`❌ ${userEmail} 升级异常:`, error.message)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`\n📊 升级结果统计:`)
  console.log(`  ✅ 成功: ${successCount}`)
  console.log(`  ❌ 失败: ${failCount}`)

  if (successCount > 0) {
    console.log('🎉 Google 账号管理员升级完成！')
  } else {
    console.log('⚠️ Google 账号管理员升级失败！')
  }
}

// 检查是否提供了要升级的用户邮箱
const targetEmail = process.argv[2]

if (!targetEmail) {
  console.log('🔥 Google 账号升级工具')
  console.log('')
  console.log('使用方法:')
  console.log('  node scripts/upgrade-google-user-to-admin.js <your-email@example.com>')
  console.log('')
  console.log('或者更新脚本中的 GOOGLE_USERS 数组中的邮箱')
  console.log('当前管理员白名单:')
  GOOGLE_USERS.forEach(email => {
    console.log(`  - ${email}`)
  })
  process.exit(0)
}

// 运行升级主函数
try {
  main()
} catch (error) {
  console.error('❌ 升级脚本执行失败:', error)
  process.exit(1)
}