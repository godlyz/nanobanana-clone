#!/usr/bin/env node

console.log('🔍 开始诊断 Next.js 项目...\n')

// 1. 检查 Node.js 版本
console.log('1️⃣ Node.js 版本:', process.version)

// 2. 检查文件是否存在
const fs = require('fs')
const path = require('path')

const criticalFiles = [
  'app/page.tsx',
  'app/layout.tsx',
  'package.json',
  'next.config.mjs',
  '.env.local'
]

console.log('\n2️⃣ 检查关键文件:')
criticalFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file))
  console.log(`   ${exists ? '✅' : '❌'} ${file}`)
})

// 3. 检查组件
const components = [
  'components/header.tsx',
  'components/hero.tsx',
  'components/footer.tsx'
]

console.log('\n3️⃣ 检查组件文件:')
components.forEach(comp => {
  const exists = fs.existsSync(path.join(__dirname, comp))
  console.log(`   ${exists ? '✅' : '❌'} ${comp}`)
})

// 4. 检查环境变量
console.log('\n4️⃣ 检查环境变量:')
const envVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'GOOGLE_AI_API_KEY'
]

try {
  require('dotenv').config({ path: '.env.local' })
  envVars.forEach(varName => {
    const exists = !!process.env[varName]
    console.log(`   ${exists ? '✅' : '❌'} ${varName}`)
  })
} catch (e) {
  console.log('   ⚠️  无法读取 .env.local，请手动检查')
}

// 5. 检查 node_modules
console.log('\n5️⃣ 检查依赖安装:')
const nodeModulesExists = fs.existsSync(path.join(__dirname, 'node_modules'))
console.log(`   ${nodeModulesExists ? '✅' : '❌'} node_modules 目录`)

const criticalPackages = [
  'node_modules/next',
  'node_modules/react',
  'node_modules/@supabase/supabase-js'
]

criticalPackages.forEach(pkg => {
  const exists = fs.existsSync(path.join(__dirname, pkg))
  console.log(`   ${exists ? '✅' : '❌'} ${pkg.replace('node_modules/', '')}`)
})

console.log('\n✅ 诊断完成！\n')
console.log('💡 如果一切正常，尝试运行: pnpm dev')
console.log('💡 如果看到错误，请将终端中的错误信息发给我\n')
