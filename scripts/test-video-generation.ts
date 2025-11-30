#!/usr/bin/env ts-node
/**
 * 视频生成功能集成测试脚本
 * 测试完整的视频生成流程
 *
 * 使用方法:
 * pnpm ts-node scripts/test-video-generation.ts
 *
 * 环境变量要求:
 * - TEST_API_KEY: 测试用API Key
 * - NEXT_PUBLIC_APP_URL: 应用URL (默认 http://localhost:3000)
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// ============================================
// 配置
// ============================================

const API_KEY = process.env.TEST_API_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

if (!API_KEY) {
  console.error('❌ 错误: 未配置 TEST_API_KEY 环境变量');
  console.log('💡 提示: 在 .env.local 中添加 TEST_API_KEY=your_api_key');
  process.exit(1);
}

// ============================================
// 辅助函数
// ============================================

async function apiRequest(
  endpoint: string,
  method: string = 'GET',
  body?: any
) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`\n🔗 ${method} ${url}`);

  const options: RequestInit = {
    method,
    headers: {
      'x-api-key': API_KEY!,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
    console.log('📤 Request Body:', JSON.stringify(body, null, 2));
  }

  const response = await fetch(url, options);
  const data = await response.json();

  console.log(`📥 Response (${response.status}):`, JSON.stringify(data, null, 2));

  return { status: response.status, data };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// 测试用例
// ============================================

async function test1_CreateVideoTask() {
  console.log('\n========================================');
  console.log('✅ 测试 1: 创建视频生成任务');
  console.log('========================================');

  const { status, data } = await apiRequest('/api/v1/video/generate', 'POST', {
    prompt: 'A beautiful sunset over the ocean with waves crashing on the beach',
    aspect_ratio: '16:9',
    resolution: '720p',
    duration: 4,
  });

  if (status !== 200 || !data.success) {
    console.error('❌ 测试失败: 创建任务失败');
    console.error('状态码:', status);
    console.error('响应:', data);
    return null;
  }

  console.log('✅ 测试通过: 任务创建成功');
  console.log('📋 任务ID:', data.task_id);
  console.log('🆔 操作ID:', data.operation_id);
  console.log('💰 积分消费:', data.credit_cost);

  return data.task_id;
}

async function test2_QueryTaskStatus(taskId: string) {
  console.log('\n========================================');
  console.log('✅ 测试 2: 查询任务状态');
  console.log('========================================');

  const { status, data } = await apiRequest(`/api/v1/video/status/${taskId}`);

  if (status !== 200) {
    console.error('❌ 测试失败: 查询状态失败');
    console.error('状态码:', status);
    console.error('响应:', data);
    return;
  }

  console.log('✅ 测试通过: 状态查询成功');
  console.log('📊 任务状态:', data.status);
  console.log('⏱️ 创建时间:', data.created_at);

  if (data.status === 'completed') {
    console.log('🎬 视频URL:', data.video_url);
    console.log('🖼️ 缩略图URL:', data.thumbnail_url);
  } else if (data.status === 'failed') {
    console.log('❌ 错误信息:', data.error_message);
    console.log('🔢 错误代码:', data.error_code);
  }
}

async function test3_InvalidParameters() {
  console.log('\n========================================');
  console.log('✅ 测试 3: 参数验证');
  console.log('========================================');

  // 测试缺少必需字段
  const { status: status1 } = await apiRequest('/api/v1/video/generate', 'POST', {
    aspect_ratio: '16:9',
    resolution: '720p',
    duration: 4,
    // 缺少 prompt
  });

  if (status1 === 400) {
    console.log('✅ 测试通过: 正确拒绝缺少prompt的请求');
  } else {
    console.error('❌ 测试失败: 应该返回400错误');
  }

  // 测试非法aspect_ratio
  const { status: status2 } = await apiRequest('/api/v1/video/generate', 'POST', {
    prompt: 'Test video',
    aspect_ratio: '4:3', // 非法值
    resolution: '720p',
    duration: 4,
  });

  if (status2 === 400) {
    console.log('✅ 测试通过: 正确拒绝非法aspect_ratio');
  } else {
    console.error('❌ 测试失败: 应该返回400错误');
  }

  // 测试非法duration
  const { status: status3 } = await apiRequest('/api/v1/video/generate', 'POST', {
    prompt: 'Test video',
    aspect_ratio: '16:9',
    resolution: '720p',
    duration: 10, // 非法值（只支持4,6,8）
  });

  if (status3 === 400) {
    console.log('✅ 测试通过: 正确拒绝非法duration');
  } else {
    console.error('❌ 测试失败: 应该返回400错误');
  }
}

async function test4_InvalidTaskId() {
  console.log('\n========================================');
  console.log('✅ 测试 4: 非法任务ID验证');
  console.log('========================================');

  // 测试非UUID格式
  const { status: status1 } = await apiRequest('/api/v1/video/status/invalid-id');

  if (status1 === 400) {
    console.log('✅ 测试通过: 正确拒绝非UUID格式的任务ID');
  } else {
    console.error('❌ 测试失败: 应该返回400错误');
  }

  // 测试不存在的任务ID
  const fakeUuid = '00000000-0000-0000-0000-000000000000';
  const { status: status2 } = await apiRequest(`/api/v1/video/status/${fakeUuid}`);

  if (status2 === 404) {
    console.log('✅ 测试通过: 正确返回任务不存在');
  } else {
    console.error('❌ 测试失败: 应该返回404错误');
  }
}

async function test5_MissingApiKey() {
  console.log('\n========================================');
  console.log('✅ 测试 5: API Key验证');
  console.log('========================================');

  const url = `${BASE_URL}/api/v1/video/generate`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 故意不发送 x-api-key
    },
    body: JSON.stringify({
      prompt: 'Test',
      aspect_ratio: '16:9',
      resolution: '720p',
      duration: 4,
    }),
  });

  if (response.status === 401) {
    console.log('✅ 测试通过: 正确拒绝缺少API Key的请求');
  } else {
    console.error('❌ 测试失败: 应该返回401错误');
  }
}

// ============================================
// 主函数
// ============================================

async function main() {
  console.log('========================================');
  console.log('🚀 视频生成功能集成测试');
  console.log('========================================');
  console.log('🔑 API Key:', API_KEY?.substring(0, 10) + '...');
  console.log('🌐 Base URL:', BASE_URL);

  try {
    // 测试 1: 创建任务
    const taskId = await test1_CreateVideoTask();

    if (taskId) {
      // 等待1秒后查询状态
      await sleep(1000);

      // 测试 2: 查询状态
      await test2_QueryTaskStatus(taskId);

      console.log('\n💡 提示: 任务正在处理中，可以持续轮询状态:');
      console.log(`   curl -H "x-api-key: ${API_KEY}" ${BASE_URL}/api/v1/video/status/${taskId}`);
    }

    // 测试 3: 参数验证
    await test3_InvalidParameters();

    // 测试 4: 非法任务ID
    await test4_InvalidTaskId();

    // 测试 5: API Key验证
    await test5_MissingApiKey();

    console.log('\n========================================');
    console.log('✅ 所有测试完成');
    console.log('========================================');

  } catch (error: any) {
    console.error('\n❌ 测试过程中出错:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 执行测试
main();
