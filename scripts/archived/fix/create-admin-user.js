/**
 * 创建后台管理员账号脚本
 * 用法: node scripts/create-admin-user.js
 */

const { createClient } = require('@supabase/supabase-js')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

async function main() {
  console.log('\n=== 创建后台管理员账号 ===\n')

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

  // 2. 输入管理员信息
  const email = await question('邮箱地址: ')
  const password = await question('密码 (至少8位): ')
  const roleInput = await question('角色 (super_admin/admin/viewer, 默认: admin): ')
  const role = roleInput.trim() || 'admin'

  if (!email || !password) {
    console.error('❌ 错误: 邮箱和密码不能为空')
    rl.close()
    process.exit(1)
  }

  if (password.length < 8) {
    console.error('❌ 错误: 密码至少需要 8 个字符')
    rl.close()
    process.exit(1)
  }

  if (!['super_admin', 'admin', 'viewer'].includes(role)) {
    console.error('❌ 错误: 角色必须是 super_admin, admin 或 viewer')
    rl.close()
    process.exit(1)
  }

  console.log('\n正在创建管理员账号...\n')

  try {
    // 3. 创建 Auth 用户
    console.log('步骤 1/2: 创建 Auth 用户...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.error('❌ 错误: 该邮箱已经注册过了')
        console.log('\n尝试查找现有用户...')
        
        // 查找现有用户
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
        
        if (listError) {
          console.error('❌ 错误:', listError.message)
          rl.close()
          process.exit(1)
        }

        const existingUser = existingUsers.users.find(u => u.email === email.toLowerCase())
        
        if (!existingUser) {
          console.error('❌ 错误: 无法找到现有用户')
          rl.close()
          process.exit(1)
        }

        console.log('✅ 找到现有用户:', existingUser.id)
        
        // 检查是否已经是管理员
        const { data: existingAdmin, error: checkError } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', existingUser.id)
          .single()

        if (!checkError && existingAdmin) {
          console.log('\n该用户已经是管理员:')
          console.log('  - 邮箱:', existingAdmin.email)
          console.log('  - 角色:', existingAdmin.role)
          console.log('  - 状态:', existingAdmin.status)
          rl.close()
          process.exit(0)
        }

        // 将现有用户提升为管理员
        console.log('\n步骤 2/2: 将用户添加到管理员表...')
        const { error: insertError } = await supabase
          .from('admin_users')
          .insert({
            user_id: existingUser.id,
            email: email.toLowerCase(),
            role,
            status: 'active'
          })

        if (insertError) {
          console.error('❌ 错误:', insertError.message)
          rl.close()
          process.exit(1)
        }

        console.log('\n✅ 成功将用户提升为管理员!')
        console.log('\n管理员信息:')
        console.log('  - 邮箱:', email.toLowerCase())
        console.log('  - 角色:', role)
        console.log('  - 用户ID:', existingUser.id)
        console.log('\n现在可以使用该账号登录后台: http://localhost:3000/admin/login')
        
        rl.close()
        process.exit(0)
      }
      
      throw authError
    }

    console.log('✅ Auth 用户创建成功')
    console.log('  - 用户ID:', authData.user.id)

    // 4. 添加到管理员表
    console.log('\n步骤 2/2: 添加到管理员表...')
    const { error: insertError } = await supabase
      .from('admin_users')
      .insert({
        user_id: authData.user.id,
        email: email.toLowerCase(),
        role,
        status: 'active'
      })

    if (insertError) {
      console.error('❌ 错误:', insertError.message)
      console.log('\n⚠️  注意: Auth 用户已创建，但添加到管理员表失败')
      console.log('请手动执行以下 SQL:')
      console.log(`
INSERT INTO admin_users (user_id, email, role, status)
VALUES ('${authData.user.id}', '${email.toLowerCase()}', '${role}', 'active');
      `)
      rl.close()
      process.exit(1)
    }

    console.log('✅ 管理员账号创建成功!\n')
    console.log('管理员信息:')
    console.log('  - 邮箱:', email.toLowerCase())
    console.log('  - 密码: ******** (已设置)')
    console.log('  - 角色:', role)
    console.log('  - 用户ID:', authData.user.id)
    console.log('\n现在可以使用该账号登录后台: http://localhost:3000/admin/login')

  } catch (error) {
    console.error('\n❌ 创建失败:', error.message)
    process.exit(1)
  } finally {
    rl.close()
  }
}

main()
