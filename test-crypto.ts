/**
 * 测试加密解密功能
 */
import { encrypt, decrypt, maskSensitiveData, testEncryption } from './lib/crypto-utils'

console.log('🧪 老王测试：加密解密功能')
console.log('=' .repeat(60))

// 测试1：基础加密解密
console.log('\n📝 测试1：基础加密解密')
const testKey = 'my-super-secret-api-key-12345'
console.log('原始API Key:', testKey)

const encrypted = encrypt(testKey)
console.log('加密后:', encrypted)
console.log('加密后长度:', encrypted.length)

const decrypted = decrypt(encrypted)
console.log('解密后:', decrypted)
console.log('解密成功?', decrypted === testKey ? '✅' : '❌')

// 测试2：脱敏显示
console.log('\n📝 测试2：脱敏显示')
const masked = maskSensitiveData(testKey, 4)
console.log('脱敏显示:', masked)
console.log('脱敏格式正确?', masked.includes('****') && masked.startsWith('my-s') ? '✅' : '❌')

// 测试3：内置测试
console.log('\n📝 测试3：内置加密测试')
const testResult = testEncryption()
console.log('测试结果:', testResult ? '✅ 通过' : '❌ 失败')

console.log('\n' + '='.repeat(60))
console.log('🎉 加密解密测试完成')
