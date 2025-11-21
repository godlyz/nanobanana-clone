/**
 * 为已存在的用户设置管理员权限
 * 用法: node scripts/setup-admin-for-existing-user.js
 */

const { createClient } = require('@supabase/supabase-js')

async function main() {
  console.log('\n=== 为已存在用户设置管理员权限 ===\n')

  // 1. 获取 Supabase 凭证
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ 错误: 缺少 Supabase 环境变量')
    console.error('请确保 .env.local 中配置了:')
    console.error('  - NEXT_PUBLIC_SUPABASE_URL')
    console.error('  - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // 你的用户信息
  const userId = 'bfb8182a-6865-4c66-a89e-05711796e2b2'
  const email = 'kn197884@gmail.com'
  const role = 'super_admin'

  try {
    console.log('步骤 1: 检查 admin_users 表是否存在...\n')

    // 检查表是否存在
    const { data: tables, error: tableError } = await supabase
      .from('admin_users')
      .select('id')
      .limit(1)

    if (tableError) {
      if (tableError.code === '42P01') {
        console.log('⚠️  admin_users 表不存在，正在创建...\n')
        
        // 创建表的 SQL
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS admin_users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
            email VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'viewer')),
            permissions JSONB DEFAULT '{}',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            created_by UUID REFERENCES auth.users(id),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT check_admin_role CHECK (role IN ('super_admin', 'admin', 'viewer'))
          );

          CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
          CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active) WHERE is_active = true;
          CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
        `

        console.log('请在 Supabase Dashboard -> SQL Editor 中执行以下 SQL:')
        console.log('=' .repeat(70))
        console.log(createTableSQL)
        console.log('=' .repeat(70))
        console.log('\n执行完成后，请重新运行此脚本\n')
        process.exit(0)
      } else {
        throw tableError
      }
    }

    console.log('✅ admin_users 表已存在\n')

    console.log('步骤 2: 检查用户是否已经是管理员...\n')

    // 检查是否已经是管理员
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    if (existingAdmin) {
      console.log('✅ 用户已经是管理员!')
      console.log('\n管理员信息:')
      console.log('  - 邮箱:', existingAdmin.email)
      console.log('  - 角色:', existingAdmin.role)
      console.log('  - 状态:', existingAdmin.is_active ? '激活' : '未激活')
      console.log('  - 用户ID:', existingAdmin.user_id)
      
      if (existingAdmin.role !== role) {
        console.log(`\n💡 当前角色是 ${existingAdmin.role}, 要更新为 ${role} 吗?`)
        console.log('\n在 Supabase Dashboard -> SQL Editor 中执行:')
        console.log(`
UPDATE admin_users 
SET role = '${role}', updated_at = NOW()
WHERE user_id = '${userId}';
        `)
      }
      
      process.exit(0)
    }

    console.log('步骤 3: 添加用户到 admin_users 表...\n')

    // 插入管理员记录
    const { data: newAdmin, error: insertError } = await supabase
      .from('admin_users')
      .insert({
        user_id: userId,
        email: email.toLowerCase(),
        role: role,
        is_active: true,
        created_by: userId
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    console.log('✅ 成功设置为管理员!\n')
    console.log('管理员信息:')
    console.log('  - 邮箱:', email)
    console.log('  - 角色:', role)
    console.log('  - 用户ID:', userId)
    console.log('  - 状态: 激活')
    
    console.log('\n⚠️  重要提醒:')
    console.log('由于你的账号是通过 Google OAuth 创建的，需要设置密码才能登录后台:')
    console.log('\n1. 打开 Supabase Dashboard -> Authentication -> Users')
    console.log('2. 找到 kn197884@gmail.com')
    console.log('3. 点击右侧菜单，选择 "Send Password Reset Email"')
    console.log('4. 或者在 SQL Editor 中执行:')
    console.log(`
-- 为用户设置密码（请替换 'your-new-password' 为实际密码）
UPDATE auth.users 
SET encrypted_password = crypt('your-new-password', gen_salt('bf'))
WHERE id = '${userId}';
    `)
    console.log('\n设置密码后，访问: http://localhost:3000/admin/login')

  } catch (error) {
    console.error('\n❌ 操作失败:', error.message)
    console.error('\n详细错误:', error)
    
    if (error.code === '23505') {
      console.log('\n这个错误表示用户已经在 admin_users 表中')
      console.log('可以尝试直接使用 SQL 更新:')
      console.log(`
UPDATE admin_users 
SET role = '${role}', is_active = true, updated_at = NOW()
WHERE user_id = '${userId}';
      `)
    }
    
    process.exit(1)
  }
}

main()
