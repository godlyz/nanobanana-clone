/**
 * 使用现有 admin_users 表结构添加管理员
 * 适配项目中已存在的表结构
 */

const { createClient } = require('@supabase/supabase-js')

async function main() {
  console.log('\n=== 添加管理员到现有表 ===\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ 缺少环境变量')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const email = 'kn197884@gmail.com'
  const role = 'super_admin'

  try {
    // 检查是否已存在
    const { data: existing, error: checkError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (checkError) {
      throw checkError
    }

    if (existing) {
      console.log('✅ 管理员账号已存在!\n')
      console.log('管理员信息:')
      console.log('  - ID:', existing.id)
      console.log('  - 邮箱:', existing.email)
      console.log('  - 姓名:', existing.name || '(未设置)')
      console.log('  - 角色:', existing.role)
      console.log('  - 状态:', existing.status)
      console.log('  - 认证方式:', existing.auth_provider || '(未设置)')
      
      if (existing.role !== role || existing.status !== 'active') {
        console.log(`\n💡 需要更新? 在 Supabase Dashboard -> SQL Editor 中执行:`)
        console.log(`
UPDATE admin_users 
SET role = '${role}', status = 'active', updated_at = NOW()
WHERE email = '${email}';
        `)
      }
      
      process.exit(0)
    }

    // 插入新管理员
    console.log('正在添加管理员...\n')

    const { data: newAdmin, error: insertError } = await supabase
      .from('admin_users')
      .insert({
        email: email.toLowerCase(),
        name: email.split('@')[0], // 使用邮箱前缀作为名字
        role: role,
        status: 'active',
        auth_provider: 'email', // 或 'google'
        email_verified: true
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    console.log('✅ 管理员添加成功!\n')
    console.log('管理员信息:')
    console.log('  - ID:', newAdmin.id)
    console.log('  - 邮箱:', newAdmin.email)
    console.log('  - 角色:', newAdmin.role)
    console.log('  - 状态:', newAdmin.status)
    
    console.log('\n⚠️  重要提醒:')
    console.log('现在需要在 Supabase 中为此邮箱设置密码:')
    console.log('\n方法 1: 使用 Supabase Dashboard')
    console.log('  1. 打开 Supabase Dashboard -> Authentication -> Users')
    console.log('  2. 找到或创建 kn197884@gmail.com 用户')
    console.log('  3. 设置密码')
    console.log('\n方法 2: 使用 SQL (如果 auth.users 中已有此用户)')
    console.log(`
UPDATE auth.users 
SET encrypted_password = crypt('YourNewPassword123!', gen_salt('bf'))
WHERE email = '${email}';
    `)
    console.log('\n设置密码后，访问: http://localhost:3000/admin/login')

  } catch (error) {
    console.error('\n❌ 操作失败:', error.message)
    
    if (error.details) {
      console.error('详细错误:', error.details)
    }
    
    process.exit(1)
  }
}

main()
