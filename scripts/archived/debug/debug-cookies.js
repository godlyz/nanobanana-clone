/**
 * 调试 Cookie 和权限验证
 * 运行方式: node scripts/debug-cookies.js
 */

// 模拟一个带 admin-access-token 的请求
console.log('🔍 Cookie 调试脚本\n')

console.log('当前用户访问审计日志或活动规则页面时：')
console.log('1. 浏览器发送请求到 API')
console.log('2. API 调用 withRBAC 中间件')
console.log('3. withRBAC 调用 getUserRole 函数')
console.log('4. getUserRole 从 req.cookies 读取 admin-access-token')
console.log('5. 使用 token 验证用户身份和角色')
console.log('')

console.log('❓ 可能的问题：')
console.log('- Cookie 未正确设置（path 问题）')
console.log('- Cookie 未正确发送（credentials 问题）')
console.log('- Token 验证失败（过期或无效）')
console.log('- admin_users 表查询失败')
console.log('')

console.log('💡 解决方案：')
console.log('1. 在浏览器中登录后，打开开发者工具（F12）')
console.log('2. 进入 Application/存储 > Cookies > http://localhost:3000')
console.log('3. 查找 admin-access-token，确认：')
console.log('   - 值是否存在（不为空）')
console.log('   - Path 是否为 /（不是 /admin）')
console.log('   - HttpOnly 是否勾选')
console.log('4. 然后访问审计日志页面，查看：')
console.log('   - Network 标签中的请求是否带上了 Cookie')
console.log('   - Console 标签中是否有错误信息')
console.log('   - 服务器终端是否打印了日志（🔍、⚠️、✅）')
console.log('')

console.log('📋 需要收集的信息：')
console.log('1. admin-access-token cookie 是否存在？')
console.log('2. API 请求的 Request Headers 中是否包含 Cookie？')
console.log('3. API 响应状态码是多少？（403 还是 500？）')
console.log('4. 服务器终端打印了哪些日志？')
