/**
 * 将现有用户提升为管理员
 * 用法: node scripts/promote-to-admin.js your-email@example.com [role]
 */

const { createClient } = require('@supabase/supabase-js')

async function main() {
  console.log('\n=== 将用户提升为管理员 ===\n')

  // 1. 获取参数
  const email = process.argv[2]
  const role = process.argv[3] || 'admin'

  if (!email) {
    console.error('❌ 错误: 请提供邮箱地址')
    console.error('用法: node scripts/promote-to-admin.js your-email@example.com [role]')
    console.error('角色可选: super_admin, admin, viewer (默认: admin)')
    process.exit(1)
  }

  if (!['super_admin', 'admin', 'viewer'].includes(role)) {
    console.error('❌ 错误: 角色必须是 super_admin, admin 或 viewer')
    process.exit(1)
  }

  // 2. 获取 Supabase 凭证
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

  try {
    // 3. 查找用户
    console.log(`正在查找用户: ${email.toLowerCase()}...\n`)
    
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      throw listError
    }

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (!user) {
      console.error('❌ 未找到该邮箱的用户')
      console.error(`邮箱: ${email}`)
      console.log('\n提示: 请先创建该用户或检查邮箱拼写')
      process.exit(1)
    }

    console.log('✅ 找到用户:', user.id)

    // 4. 检查是否已经是管理员
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!checkError && existingAdmin) {
      console.log('\n⚠️  该用户已经是管理员:')
      console.log('  - 当前角色:', existingAdmin.role)
      console.log('  - 当前状态:', existingAdmin.status)
      
      // 询问是否更新角色
      if (existingAdmin.role !== role) {
        console.log(`\n💡 要将角色从 ${existingAdmin.role} 更新为 ${role}，请在 Supabase SQL Editor 中执行:`)
        console.log(`
UPDATE admin_users 
SET role = '${role}', updated_at = NOW()
WHERE user_id = '${user.id}';
        `)
      }
      
      process.exit(0)
    }

    // 5. 添加到管理员表
    console.log(`\n正在将用户添加到管理员表 (角色: ${role})...\n`)

    const { error: insertError } = await supabase
      .from('admin_users')
      .insert({
        user_id: user.id,
        email: email.toLowerCase(),
        role,
        status: 'active'
      })

    if (insertError) {
      throw insertError
    }

    // 6. 成功
    console.log('✅ 成功将用户提升为管理员!\n')
    console.log('管理员信息:')
    console.log('  - 邮箱:', email.toLowerCase())
    console.log('  - 角色:', role)
    console.log('  - 用户ID:', user.id)
    console.log('  - 状态: 激活')
    console.log('\n现在可以使用该账号登录后台: http://localhost:3000/admin/login')
    
    // 如果用户之前通过 OAuth 登录，提醒需要设置密码
    if (!user.email_confirmed_at) {
      console.log('\n⚠️  注意: 该用户邮箱未验证，可能是通过 OAuth 创建的')
      console.log('需要为该用户设置密码才能登录后台')
      console.log('\n在 Supabase Dashboard -> Authentication -> Users 中找到该用户，点击 "Reset Password"')
    }

  } catch (error) {
    console.error('\n❌ 操作失败:', error.message)
    process.exit(1)
  }
}

main()
