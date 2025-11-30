/**
 * 🔥 老王的NSFW检测功能测试脚本
 * 用途: 验证Google Cloud Vision API配置是否正确
 * 运行方式: pnpm tsx scripts/test-nsfw-detection.ts
 */

// 🔥 老王提醒：必须先加载环境变量！
import dotenv from 'dotenv';
import path from 'path';

// 加载 .env.local 文件
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { getNSFWDetector } from '../lib/nsfw-detector';

async function testNSFWDetection() {
  console.log('🔍 开始测试NSFW检测功能...\n');

  try {
    const detector = getNSFWDetector();

    // 测试图片1: 安全的风景照（Unsplash免费图片）
    const safeImageUrl = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4';

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📸 测试图片: 风景照片（应该是安全的）');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('URL:', safeImageUrl);
    console.log('\n正在检测中...\n');

    const result = await detector.detectImage(safeImageUrl);

    console.log('✅ 检测完成！\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 检测结果:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  是否安全:', result.safe ? '✅ 安全' : '❌ 不安全');
    console.log('\n详细评估:');
    console.log('  🔞 成人内容:', result.adult);
    console.log('  🔪 暴力内容:', result.violence);
    console.log('  💋 性感内容:', result.racy);
    console.log('  💊 医疗内容:', result.medical);
    console.log('  🎭 恶搞内容:', result.spoof);

    if (!result.safe && result.reason) {
      console.log('\n⚠️  不安全原因:', result.reason);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 测试成功！NSFW检测系统工作正常！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 配置信息:');
    console.log('  凭证文件:', process.env.GOOGLE_CLOUD_VISION_CREDENTIALS);
    console.log('  项目ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
    console.log('  成人内容阈值:', process.env.NSFW_THRESHOLD_ADULT || 'POSSIBLE (默认)');
    console.log('  暴力内容阈值:', process.env.NSFW_THRESHOLD_VIOLENCE || 'LIKELY (默认)');
    console.log('  性感内容阈值:', process.env.NSFW_THRESHOLD_RACY || 'LIKELY (默认)');

    console.log('\n✅ 所有检查通过！可以开始使用NSFW检测功能了！\n');

  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ 测试失败！');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('错误信息:', error.message);
    console.error('\n🔍 可能的原因:');
    console.error('  1. 凭证文件路径不正确或文件不存在');
    console.error('  2. GOOGLE_CLOUD_PROJECT_ID 未设置或不正确');
    console.error('  3. Cloud Vision API 未启用');
    console.error('  4. 服务账号权限不足');
    console.error('  5. 凭证文件格式错误（不是有效的JSON）');
    console.error('\n📝 调试信息:');
    console.error('  凭证文件路径:', process.env.GOOGLE_CLOUD_VISION_CREDENTIALS);
    console.error('  项目ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
    console.error('\n📚 参考文档: /NSFW_DETECTION_SETUP.md\n');

    process.exit(1);
  }
}

// 运行测试
testNSFWDetection().catch(error => {
  console.error('💥 脚本执行失败:', error);
  process.exit(1);
});
