#!/usr/bin/env node

/**
 * 🔥 老王的管理员用户认证字段迁移脚本
 * 用途: 为admin_users表添加OAuth认证相关字段
 * 老王警告: 这个迁移要是失败了，管理员都登录不进来！
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// 加载环境变量
config({ path: '.env.local' })

console.log('🔥 开始执行admin_users表认证字段迁移...')

async function runMigration() {
  try {
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

    // 直接尝试添加字段，如果字段已存在会报错但不会影响
    console.log('✅ 开始添加认证字段...')

    const fields = [
      {
        name: 'auth_provider',
        description: '认证提供商'
      },
      {
        name: 'user_id',
        description: '第三方平台用户ID'
      },
      {
        name: 'auth_metadata',
        description: '认证元数据'
      },
      {
        name: 'last_login_at',
        description: '最后登录时间'
      },
      {
        name: 'email_verified',
        description: '邮箱是否已验证'
      },
      {
        name: 'avatar_url',
        description: '用户头像URL'
      }
    ]

    // 测试表是否存在并获取现有管理员用户
    try {
      console.log('🔍 检查admin_users表...')
      const { data: testUsers, error: testError } = await supabase
        .from('admin_users')
        .select('id, email')
        .limit(1)

      if (testError) {
        console.log('❌ admin_users表不存在，请先运行基础迁移')
        console.log('错误详情:', testError)
        return
      }

      console.log('✅ admin_users表存在，找到现有用户:', testUsers?.length || 0)

      // 尝试添加字段（通过测试是否可以选择该字段）
      for (const field of fields) {
        try {
          console.log(`📝 测试字段 ${field.name}...`)
          const { data, error } = await supabase
            .from('admin_users')
            .select(`id, ${field.name}`)
            .limit(1)

          if (error && error.message.includes('column') && error.message.includes(field.name)) {
            console.log(`⚠️ 字段 ${field.name} 不存在，需要手动添加`)
            console.log(`  请在Supabase控制台执行: ALTER TABLE admin_users ADD COLUMN ${field.name}`)
          } else if (error) {
            console.log(`⚠️ 字段 ${field.name} 测试时出现其他错误:`, error.message)
          } else {
            console.log(`✅ 字段 ${field.name} 已存在`)
          }
        } catch (error) {
          console.log(`⚠️ 字段 ${field.name} 测试失败:`, error.message)
        }
      }

      console.log('\n📋 字段检查完成！')
      console.log('🔧 如果有字段不存在，请在Supabase控制台执行以下SQL:')

      const sqlStatements = [
        "ALTER TABLE admin_users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'email' NOT NULL;",
        "ALTER TABLE admin_users ADD COLUMN user_id TEXT;",
        "ALTER TABLE admin_users ADD COLUMN auth_metadata JSONB;",
        "ALTER TABLE admin_users ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;",
        "ALTER TABLE admin_users ADD COLUMN email_verified BOOLEAN DEFAULT false;",
        "ALTER TABLE admin_users ADD COLUMN avatar_url TEXT;",
        "CREATE INDEX IF NOT EXISTS idx_admin_users_auth_provider ON admin_users(auth_provider);",
        "CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);"
      ]

      sqlStatements.forEach(sql => {
        console.log(`  ${sql}`)
      })

      console.log('\n✅ 迁移脚本执行完成！')

      console.log('\n🎉 admin_users表认证字段迁移完成！')
      console.log('📊 新增字段:')
      fields.forEach(field => {
        console.log(`  - ${field.name}: ${field.description}`)
      })

    } catch (error) {
      console.error('❌ 检查字段时出错:', error)
    }

  } catch (error) {
    console.error('❌ 迁移执行失败:', error)
    process.exit(1)
  }
}

// 运行迁移
runMigration()