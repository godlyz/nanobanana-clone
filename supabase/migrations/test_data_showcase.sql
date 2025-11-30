/**
 * 🔥 老王的 Showcase 测试数据
 * 用途：为开发环境添加测试案例，方便前端调试
 * 使用方法：在 Supabase SQL Editor 中执行本脚本
 * 老王警告：这是测试数据，别tm在生产环境执行！
 */

-- ============================================
-- 1. 获取当前用户ID（如果没有就使用管理员ID）
-- ============================================
DO $$
DECLARE
  v_user_id UUID;
  v_history_id UUID;
  v_submission_id UUID;
  v_showcase_id UUID;
BEGIN
  -- 获取第一个用户ID作为测试用户
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  -- 如果没有用户，抛出错误
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '❌ 数据库中没有用户，请先创建用户！';
  END IF;

  RAISE NOTICE '✅ 使用用户ID: %', v_user_id;

  -- ============================================
  -- 2. 创建测试用的 generation_history 记录
  -- ============================================

  -- 测试案例1：AI肖像
  INSERT INTO public.generation_history (
    user_id,
    tool_type,
    prompt,
    generated_images,
    image_names,
    created_at
  ) VALUES (
    v_user_id,
    'text_to_image',
    '一位穿着未来科技装的女性角色，赛博朋克风格',
    ARRAY['https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80'],
    ARRAY['赛博朋克女战士'],
    NOW()
  ) RETURNING id INTO v_history_id;

  -- 创建对应的 showcase_submission
  INSERT INTO public.showcase_submissions (
    user_id,
    generation_history_id,
    image_index,
    title,
    description,
    category,
    tags,
    status,
    created_at
  ) VALUES (
    v_user_id,
    v_history_id,
    0,
    '赛博朋克女战士',
    '使用AI生成的赛博朋克风格角色设计，充满未来科技感',
    'portrait',
    '["赛博朋克", "女性角色", "科幻"]'::jsonb,
    'approved',
    NOW()
  ) RETURNING id INTO v_submission_id;

  -- 创建对应的 showcase 记录
  INSERT INTO public.showcase (
    submission_id,
    creator_id,
    title,
    description,
    category,
    tags,
    image_url,
    thumbnail_url,
    creator_name,
    likes_count,
    views_count,
    featured,
    published_at,
    created_at
  ) VALUES (
    v_submission_id,
    v_user_id,
    '赛博朋克女战士',
    '使用AI生成的赛博朋克风格角色设计，充满未来科技感',
    'portrait',
    '["赛博朋克", "女性角色", "科幻"]'::jsonb,
    'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80',
    'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&q=80',
    'AI艺术家',
    156,
    1234,
    TRUE,
    NOW(),
    NOW()
  ) RETURNING id INTO v_showcase_id;

  RAISE NOTICE '✅ 测试案例1已创建: %', v_showcase_id;

  -- ============================================
  -- 测试案例2：风景照
  -- ============================================

  INSERT INTO public.generation_history (
    user_id,
    tool_type,
    prompt,
    generated_images,
    image_names,
    created_at
  ) VALUES (
    v_user_id,
    'text_to_image',
    '日落时分的山脉，梦幻般的天空',
    ARRAY['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80'],
    ARRAY['梦幻日落'],
    NOW()
  ) RETURNING id INTO v_history_id;

  INSERT INTO public.showcase_submissions (
    user_id,
    generation_history_id,
    image_index,
    title,
    description,
    category,
    tags,
    status,
    created_at
  ) VALUES (
    v_user_id,
    v_history_id,
    0,
    '梦幻日落山景',
    'AI生成的壮丽山景，日落时分的金色光芒照亮天空',
    'landscape',
    '["风景", "日落", "山脉"]'::jsonb,
    'approved',
    NOW()
  ) RETURNING id INTO v_submission_id;

  INSERT INTO public.showcase (
    submission_id,
    creator_id,
    title,
    description,
    category,
    tags,
    image_url,
    thumbnail_url,
    creator_name,
    likes_count,
    views_count,
    featured,
    published_at,
    created_at
  ) VALUES (
    v_submission_id,
    v_user_id,
    '梦幻日落山景',
    'AI生成的壮丽山景，日落时分的金色光芒照亮天空',
    'landscape',
    '["风景", "日落", "山脉"]'::jsonb,
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
    'AI艺术家',
    89,
    756,
    FALSE,
    NOW(),
    NOW()
  ) RETURNING id INTO v_showcase_id;

  RAISE NOTICE '✅ 测试案例2已创建: %', v_showcase_id;

  -- ============================================
  -- 测试案例3：产品设计
  -- ============================================

  INSERT INTO public.generation_history (
    user_id,
    tool_type,
    prompt,
    generated_images,
    image_names,
    created_at
  ) VALUES (
    v_user_id,
    'text_to_image',
    '未来主义风格的智能手机设计',
    ARRAY['https://images.unsplash.com/photo-1592286927505-3b9cbf0281d6?w=800&q=80'],
    ARRAY['未来手机'],
    NOW()
  ) RETURNING id INTO v_history_id;

  INSERT INTO public.showcase_submissions (
    user_id,
    generation_history_id,
    image_index,
    title,
    description,
    category,
    tags,
    status,
    created_at
  ) VALUES (
    v_user_id,
    v_history_id,
    0,
    '未来主义智能手机',
    'AI生成的概念手机设计，展现科技与美学的完美结合',
    'product',
    '["产品设计", "科技", "未来主义"]'::jsonb,
    'approved',
    NOW()
  ) RETURNING id INTO v_submission_id;

  INSERT INTO public.showcase (
    submission_id,
    creator_id,
    title,
    description,
    category,
    tags,
    image_url,
    thumbnail_url,
    creator_name,
    likes_count,
    views_count,
    featured,
    published_at,
    created_at
  ) VALUES (
    v_submission_id,
    v_user_id,
    '未来主义智能手机',
    'AI生成的概念手机设计，展现科技与美学的完美结合',
    'product',
    '["产品设计", "科技", "未来主义"]'::jsonb,
    'https://images.unsplash.com/photo-1592286927505-3b9cbf0281d6?w=800&q=80',
    'https://images.unsplash.com/photo-1592286927505-3b9cbf0281d6?w=400&q=80',
    'AI艺术家',
    234,
    1890,
    TRUE,
    NOW(),
    NOW()
  ) RETURNING id INTO v_showcase_id;

  RAISE NOTICE '✅ 测试案例3已创建: %', v_showcase_id;

  -- ============================================
  -- 测试案例4：创意插画
  -- ============================================

  INSERT INTO public.generation_history (
    user_id,
    tool_type,
    prompt,
    generated_images,
    image_names,
    created_at
  ) VALUES (
    v_user_id,
    'text_to_image',
    '抽象艺术风格的宇宙星空',
    ARRAY['https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&q=80'],
    ARRAY['星空幻想'],
    NOW()
  ) RETURNING id INTO v_history_id;

  INSERT INTO public.showcase_submissions (
    user_id,
    generation_history_id,
    image_index,
    title,
    description,
    category,
    tags,
    status,
    created_at
  ) VALUES (
    v_user_id,
    v_history_id,
    0,
    '抽象星空艺术',
    'AI创作的抽象风格宇宙主题作品，梦幻般的色彩和构图',
    'creative',
    '["抽象艺术", "星空", "创意"]'::jsonb,
    'approved',
    NOW()
  ) RETURNING id INTO v_submission_id;

  INSERT INTO public.showcase (
    submission_id,
    creator_id,
    title,
    description,
    category,
    tags,
    image_url,
    thumbnail_url,
    creator_name,
    likes_count,
    views_count,
    featured,
    published_at,
    created_at
  ) VALUES (
    v_submission_id,
    v_user_id,
    '抽象星空艺术',
    'AI创作的抽象风格宇宙主题作品，梦幻般的色彩和构图',
    'creative',
    '["抽象艺术", "星空", "创意"]'::jsonb,
    'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&q=80',
    'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&q=80',
    'AI艺术家',
    67,
    456,
    FALSE,
    NOW(),
    NOW()
  ) RETURNING id INTO v_showcase_id;

  RAISE NOTICE '✅ 测试案例4已创建: %', v_showcase_id;

  -- ============================================
  -- 测试案例5：动漫风格
  -- ============================================

  INSERT INTO public.generation_history (
    user_id,
    tool_type,
    prompt,
    generated_images,
    image_names,
    created_at
  ) VALUES (
    v_user_id,
    'text_to_image',
    '可爱的动漫风格猫咪女孩',
    ARRAY['https://images.unsplash.com/photo-1513569143478-b38b2c0ef97f?w=800&q=80'],
    ARRAY['猫耳少女'],
    NOW()
  ) RETURNING id INTO v_history_id;

  INSERT INTO public.showcase_submissions (
    user_id,
    generation_history_id,
    image_index,
    title,
    description,
    category,
    tags,
    status,
    created_at
  ) VALUES (
    v_user_id,
    v_history_id,
    0,
    '可爱猫耳少女',
    'AI生成的动漫风格角色，充满童趣和想象力',
    'anime',
    '["动漫", "猫耳", "可爱"]'::jsonb,
    'approved',
    NOW()
  ) RETURNING id INTO v_submission_id;

  INSERT INTO public.showcase (
    submission_id,
    creator_id,
    title,
    description,
    category,
    tags,
    image_url,
    thumbnail_url,
    creator_name,
    likes_count,
    views_count,
    featured,
    published_at,
    created_at
  ) VALUES (
    v_submission_id,
    v_user_id,
    '可爱猫耳少女',
    'AI生成的动漫风格角色，充满童趣和想象力',
    'anime',
    '["动漫", "猫耳", "可爱"]'::jsonb,
    'https://images.unsplash.com/photo-1513569143478-b38b2c0ef97f?w=800&q=80',
    'https://images.unsplash.com/photo-1513569143478-b38b2c0ef97f?w=400&q=80',
    'AI艺术家',
    312,
    2567,
    TRUE,
    NOW(),
    NOW()
  ) RETURNING id INTO v_showcase_id;

  RAISE NOTICE '✅ 测试案例5已创建: %', v_showcase_id;

END $$;

-- ============================================
-- ✅ 测试数据插入完成
-- ============================================
SELECT
  '🎉 老王的测试数据插入完成！共插入5个案例：' || E'\n' ||
  '1. 赛博朋克女战士 (156赞, 精选)' || E'\n' ||
  '2. 梦幻日落山景 (89赞)' || E'\n' ||
  '3. 未来主义智能手机 (234赞, 精选)' || E'\n' ||
  '4. 抽象星空艺术 (67赞)' || E'\n' ||
  '5. 可爱猫耳少女 (312赞, 精选)' || E'\n' ||
  '现在可以访问 /showcase 页面查看效果了！🔥' AS message;

-- 查看插入结果
SELECT
  id,
  title,
  category,
  likes_count,
  views_count,
  featured,
  TO_CHAR(published_at, 'YYYY-MM-DD HH24:MI:SS') as published_at
FROM public.showcase
ORDER BY published_at DESC;
