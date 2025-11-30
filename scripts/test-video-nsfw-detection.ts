#!/usr/bin/env tsx
/**
 * 手动运行视频NSFW检测的小工具
 *
 * 用法:
 *   pnpm tsx scripts/test-video-nsfw-detection.ts <video_url_or_path> [帧数(默认3)]
 *
 * 示例:
 *   pnpm tsx scripts/test-video-nsfw-detection.ts ./samples/safe.mp4
 *   pnpm tsx scripts/test-video-nsfw-detection.ts https://example.com/demo.mp4 5
 */

import { detectVideoNSFW } from '@/lib/nsfw-detector';

async function main() {
  const videoUrl = process.argv[2];
  const framesArg = Number(process.argv[3] || '3');
  const framesToCheck = Number.isFinite(framesArg) && framesArg > 0 ? framesArg : 3;

  if (!videoUrl) {
    console.error('❌ 缺少参数\n用法: pnpm tsx scripts/test-video-nsfw-detection.ts <video_url_or_path> [帧数]');
    process.exit(1);
  }

  console.log(`🎬 开始检测: ${videoUrl}`);
  console.log(`🔍 将提取 ${framesToCheck} 帧进行审核...`);

  const result = await detectVideoNSFW(videoUrl, framesToCheck);

  console.log('-------------------------------');
  console.log('检测详情:');
  console.log(JSON.stringify(result, null, 2));

  if (!result.safe) {
    console.error(`❌ 审核未通过: ${result.reason || '检测到不当内容'}`);
    process.exit(2);
  }

  console.log('✅ 审核通过，内容安全');
}

main().catch(error => {
  console.error('❌ 检测过程中发生错误:', error);
  process.exit(1);
});
