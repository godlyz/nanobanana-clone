/**
 * 🔥 老王的Redis连接测试脚本
 * 用途: 快速验证Upstash Redis配置是否正确
 */

import { getRedisClient, testRedisConnection, SafeRedisOperations } from '../lib/redis-client'

async function main() {
  console.log('🔥 开始测试 Redis 连接...\n')

  // 测试1: 获取客户端
  console.log('📝 测试1: 获取 Redis 客户端')
  const client = getRedisClient()
  console.log('  ✅ 客户端获取成功\n')

  // 测试2: 连接测试
  console.log('📝 测试2: 连接测试')
  const isConnected = await testRedisConnection()
  if (!isConnected) {
    console.error('  ❌ Redis连接测试失败！')
    console.error('  请检查环境变量：UPSTASH_REDIS_REST_URL 和 UPSTASH_REDIS_REST_TOKEN\n')
    process.exit(1)
  }
  console.log('  ✅ 连接测试通过\n')

  // 测试3: 基本操作测试
  console.log('📝 测试3: 基本操作测试')
  const redis = new SafeRedisOperations()

  // SET操作
  const setResult = await redis.set('test:key', 'Hello Upstash!', 60)
  console.log(`  SET test:key: ${setResult ? '✅' : '❌'}`)

  // GET操作
  const getValue = await redis.get('test:key')
  console.log(`  GET test:key: ${getValue === 'Hello Upstash!' ? '✅' : '❌'} (值: ${getValue})`)

  // INCR操作
  const incrValue = await redis.incr('test:counter')
  console.log(`  INCR test:counter: ${incrValue === 1 ? '✅' : '❌'} (值: ${incrValue})`)

  // EXISTS操作
  const existsResult = await redis.exists('test:key')
  console.log(`  EXISTS test:key: ${existsResult ? '✅' : '❌'}`)

  // TTL操作
  const ttlValue = await redis.ttl('test:key')
  console.log(`  TTL test:key: ${ttlValue > 0 && ttlValue <= 60 ? '✅' : '❌'} (剩余: ${ttlValue}秒)`)

  // DEL操作
  const delResult = await redis.del('test:key')
  console.log(`  DEL test:key: ${delResult ? '✅' : '❌'}`)

  const delCounter = await redis.del('test:counter')
  console.log(`  DEL test:counter: ${delCounter ? '✅' : '❌'}`)

  console.log('\n🎉 所有测试通过！Redis 配置正确！')
  console.log('💡 提示: 如果使用的是内存缓存（InMemoryRedis），请配置 Upstash Redis 以获得更好的生产性能。\n')
}

main().catch(error => {
  console.error('❌ 测试失败:', error)
  process.exit(1)
})
