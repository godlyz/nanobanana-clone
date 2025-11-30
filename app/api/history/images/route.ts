// app/api/history/images/route.ts
// 🔥 老王的历史图片查询API - 专门为视频生成场景优化
// GET /api/history/images - 查询用户历史生成的图片（支持分类、搜索、分页）

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/history/images
 * 查询用户历史生成的图片列表（扁平化返回，适合图片选择器）
 *
 * Query Parameters:
 * - source_type: 图片来源类型过滤 (optional)
 *   - 'all': 全部图片（默认）
 *   - 'text_to_image': 文生图（generation_type='text_to_image' AND tool_type IS NULL）
 *   - 'image_to_image': 图生图（generation_type='image_to_image' AND tool_type IS NULL）
 *   - 'toolbox': 工具箱生成（tool_type IS NOT NULL）
 * - search: 搜索关键词（按提示词模糊匹配）(optional)
 * - page: 页码（从1开始，默认1）(optional)
 * - limit: 每页数量（默认20，最多50）(optional)
 *
 * Response:
 * {
 *   images: [
 *     {
 *       id: 'record-uuid-imageIndex',
 *       url: 'https://...',
 *       thumbnail_url: 'https://...',
 *       image_name: 'custom-name' | null,
 *       prompt: '...',
 *       generation_type: 'text_to_image' | 'image_to_image',
 *       tool_type: string | null,
 *       created_at: '2025-01-17T12:00:00Z',
 *       record_id: 'record-uuid',
 *       image_index: 0
 *     }
 *   ],
 *   total: 35,
 *   page: 1,
 *   limit: 20,
 *   hasMore: true
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 验证用户身份
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const sourceType = searchParams.get('source_type') || 'all'; // all | text_to_image | image_to_image | toolbox
    const searchKeyword = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // 3. 构建查询
    let query = supabase
      .from('generation_history')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // 🔥 按来源类型过滤
    if (sourceType === 'text_to_image') {
      query = query.eq('generation_type', 'text_to_image').is('tool_type', null);
    } else if (sourceType === 'image_to_image') {
      query = query.eq('generation_type', 'image_to_image').is('tool_type', null);
    } else if (sourceType === 'toolbox') {
      query = query.not('tool_type', 'is', null);
    }
    // sourceType === 'all' 不加过滤

    // 🔥 按提示词搜索（模糊匹配）
    if (searchKeyword.trim()) {
      query = query.ilike('prompt', `%${searchKeyword.trim()}%`);
    }

    // 4. 分页查询
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: records, error: queryError, count } = await query.range(from, to);

    if (queryError) {
      console.error('❌ Query error:', queryError);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    // 5. 扁平化图片列表（一条记录可能有多张图片）
    const images = (records || []).flatMap((record) => {
      const generatedImages = record.generated_images || [];
      const thumbnailImages = record.thumbnail_images || [];
      const imageNames = record.image_names || [];

      return generatedImages.map((url: string, index: number) => ({
        id: `${record.id}-${index}`, // 唯一标识：记录ID + 图片索引
        url,
        thumbnail_url: thumbnailImages[index] || url, // 如果没有缩略图，使用原图
        image_name: imageNames[index] || null,
        prompt: record.prompt,
        generation_type: record.generation_type,
        tool_type: record.tool_type,
        created_at: record.created_at,
        record_id: record.id,
        image_index: index,
      }));
    });

    // 6. 返回结果
    const total = count || 0;
    const hasMore = from + images.length < total;

    return NextResponse.json({
      images,
      total,
      page,
      limit,
      hasMore,
    });
  } catch (error: any) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
