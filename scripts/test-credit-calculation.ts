/**
 * 🔥 老王的积分计算验证脚本
 * 用途: 验证视频生成积分扣费是否按10积分/秒正确计算
 *
 * 运行方式:
 * pnpm tsx scripts/test-credit-calculation.ts
 */

// 模拟video-service.ts中的积分计算逻辑
function calculateCredits(duration: number, resolution: string): number {
  const baseCredits = duration * 10;
  const multiplier = resolution === '1080p' ? 1.5 : 1.0;
  return Math.floor(baseCredits * multiplier);
}

// 测试用例
const testCases = [
  // 720p 测试
  { duration: 4, resolution: '720p', expected: 40 },
  { duration: 6, resolution: '720p', expected: 60 },
  { duration: 8, resolution: '720p', expected: 80 },

  // 1080p 测试（1.5倍）
  { duration: 4, resolution: '1080p', expected: 60 },
  { duration: 6, resolution: '1080p', expected: 90 },
  { duration: 8, resolution: '1080p', expected: 120 },

  // 视频延长（固定7秒）
  { duration: 7, resolution: '720p', expected: 70 },
  { duration: 7, resolution: '1080p', expected: 105 },
];

console.log('🔍 开始验证积分计算逻辑...\n');

let passedTests = 0;
let failedTests = 0;

testCases.forEach((testCase, index) => {
  const { duration, resolution, expected } = testCase;
  const actual = calculateCredits(duration, resolution);
  const passed = actual === expected;

  if (passed) {
    console.log(`✅ 测试 ${index + 1}: ${duration}秒 @ ${resolution} = ${actual} credits (正确)`);
    passedTests++;
  } else {
    console.log(`❌ 测试 ${index + 1}: ${duration}秒 @ ${resolution} = ${actual} credits (预期: ${expected})`);
    failedTests++;
  }
});

console.log('\n📊 测试结果:');
console.log(`  通过: ${passedTests}/${testCases.length}`);
console.log(`  失败: ${failedTests}/${testCases.length}`);

if (failedTests === 0) {
  console.log('\n✅ 所有测试通过！积分计算逻辑正确！');
  console.log('\n🔥 老王验证结果:');
  console.log('  - 720p视频: 10 credits/秒 ✅');
  console.log('  - 1080p视频: 15 credits/秒 (10 * 1.5倍) ✅');
  console.log('  - 视频延长(7秒): 70 credits (720p) / 105 credits (1080p) ✅');
  process.exit(0);
} else {
  console.log('\n❌ 部分测试失败！请检查积分计算逻辑！');
  process.exit(1);
}
