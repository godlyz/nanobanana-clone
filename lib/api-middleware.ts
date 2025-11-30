// lib/api-middleware.ts
// API 验证中间件
// 用于验证 API Key 和速率限制

import { NextRequest } from 'next/server';
import { createServiceClient } from './supabase/service';

/**
 * 验证 API Key
 * 返回用户 ID 或错误信息
 */
export async function validateApiKey(request: NextRequest): Promise<{
  valid: boolean;
  userId?: string;
  error?: string;
}> {
  // 1. 获取 API Key
  const apiKey = request.headers.get('x-api-key');

  if (!apiKey) {
    return { valid: false, error: 'Missing API key' };
  }

  // 2. 验证 API Key（使用 Service Role Client）
  const supabase = createServiceClient();

  // @ts-ignore - Supabase types not generated yet
  const { data, error } = await supabase
    .from('api_keys')
    .select('user_id, is_active, rate_limit_per_day')
    .eq('key', apiKey)
    .maybeSingle();

  if (error || !data || !data.is_active) {
    return { valid: false, error: 'Invalid or inactive API key' };
  }

  // TODO: 实现速率限制检查（可选）
  // 可以在这里添加基于 rate_limit_per_day 的限流逻辑

  return { valid: true, userId: data.user_id };
}
