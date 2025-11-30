-- 🔥 老王创建：作品展示初始数据
-- 用途: 为画廊/Showcase页面创建示例图片和视频作品
-- 老王警告: 这些作品必须是高质量的，能展示平台实力！

-- 注意：需要先有一个系统用户作为作品创建者
-- 请将 <ADMIN_USER_ID> 替换为实际的用户UUID

-- 1. 插入图片作品数据（示例作品）
INSERT INTO generation_history (
  id,
  user_id,
  prompt,
  image_url,
  created_at,
  privacy
) VALUES
  -- 艺术风格作品
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'A serene Japanese garden with cherry blossoms in full bloom, koi fish swimming in a crystal-clear pond, traditional wooden bridge, soft morning light filtering through trees, watercolor painting style',
    'https://images.unsplash.com/photo-1528164344705-47542687000d?w=1200',
    NOW() - INTERVAL '25 days',
    'public'
  ),
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'Cyberpunk cityscape at night, neon lights reflecting on wet streets, flying cars in the distance, holographic advertisements, rain, cinematic lighting, ultra detailed, 8K resolution',
    'https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=1200',
    NOW() - INTERVAL '23 days',
    'public'
  ),
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'Majestic dragon flying over a medieval castle during sunset, clouds illuminated in orange and pink, fantasy art style, epic composition, highly detailed scales and wings',
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200',
    NOW() - INTERVAL '22 days',
    'public'
  ),

  -- 自然风光
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'Northern lights dancing over a frozen lake, snow-covered mountains in the background, starry night sky, long exposure photography style, vibrant aurora colors',
    'https://images.unsplash.com/photo-1579033461380-adb47c3eb938?w=1200',
    NOW() - INTERVAL '20 days',
    'public'
  ),
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'Underwater coral reef teeming with colorful tropical fish, sunlight penetrating from the surface, crystal clear water, vibrant marine life, National Geographic photography style',
    'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=1200',
    NOW() - INTERVAL '18 days',
    'public'
  ),
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'Ancient redwood forest, massive tree trunks, soft moss covering the ground, ethereal fog floating between trees, golden hour sunbeams, magical atmosphere',
    'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1200',
    NOW() - INTERVAL '17 days',
    'public'
  ),

  -- 科幻题材
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'Futuristic space station orbiting a gas giant planet, detailed spacecraft docking, stars and nebula in the background, sci-fi concept art, highly detailed, 4K',
    'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=1200',
    NOW() - INTERVAL '15 days',
    'public'
  ),
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'Humanoid robot with glowing blue circuits, sleek metallic surface, standing in a high-tech laboratory, cinematic lighting, photorealistic, 8K resolution',
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200',
    NOW() - INTERVAL '14 days',
    'public'
  ),

  -- 奇幻生物
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'Cute baby phoenix with iridescent feathers, sitting on a branch surrounded by glowing embers, magical forest background, Studio Ghibli style, warm colors',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200',
    NOW() - INTERVAL '12 days',
    'public'
  ),
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'Elegant unicorn with flowing mane, standing in a meadow of wildflowers, rainbow in the sky, ethereal lighting, fantasy illustration, highly detailed',
    'https://images.unsplash.com/photo-1615789591457-74a63395c990?w=1200',
    NOW() - INTERVAL '10 days',
    'public'
  ),

  -- 建筑与城市
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'Modern architectural masterpiece, glass and steel structure, minimalist design, reflective surfaces, blue sky, architectural photography, ultra sharp',
    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1200',
    NOW() - INTERVAL '9 days',
    'public'
  ),
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'Cozy European street cafe at twilight, warm string lights, outdoor seating, cobblestone streets, romantic atmosphere, impressionist painting style',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200',
    NOW() - INTERVAL '7 days',
    'public'
  ),

  -- 抽象艺术
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'Abstract fluid art, swirling patterns of turquoise and gold, marble texture, organic shapes, high contrast, modern art style, 4K resolution',
    'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1200',
    NOW() - INTERVAL '5 days',
    'public'
  ),
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'Geometric abstract composition, vibrant colors, overlapping shapes, modernist style, bold lines, high contrast, digital art',
    'https://images.unsplash.com/photo-1567095761054-7a02e69e5c43?w=1200',
    NOW() - INTERVAL '4 days',
    'public'
  ),

  -- 人物肖像
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'Portrait of a wise old wizard with long white beard, glowing staff, mystical robes, detailed wrinkles, fantasy character design, dramatic lighting',
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=1200',
    NOW() - INTERVAL '3 days',
    'public'
  ),
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'Cyberpunk hacker girl with neon-lit goggles, purple and blue color scheme, detailed tech accessories, urban background, anime art style, highly detailed',
    'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=1200',
    NOW() - INTERVAL '2 days',
    'public'
  );

-- 2. 插入视频作品数据（示例视频）
INSERT INTO video_generation_history (
  id,
  user_id,
  operation_id,
  status,
  prompt,
  aspect_ratio,
  resolution,
  duration,
  credit_cost,
  permanent_video_url,
  thumbnail_url,
  created_at,
  completed_at,
  privacy
) VALUES
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'showcase-video-001',
    'completed',
    'Ocean waves crashing on a tropical beach at sunset, palm trees swaying gently, seagulls flying, cinematic camera movement',
    '16:9',
    '1080p',
    6,
    60,
    'https://www.pexels.com/video/4069318/download/',
    'https://images.pexels.com/videos/4069318/pexels-photo-4069318.jpeg?w=600',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days',
    'public'
  ),
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'showcase-video-002',
    'completed',
    'Time-lapse of a bustling city intersection at night, light trails from cars, neon signs glowing, urban energy',
    '16:9',
    '1080p',
    8,
    80,
    'https://www.pexels.com/video/1448735/download/',
    'https://images.pexels.com/videos/1448735/pexels-photo-1448735.jpeg?w=600',
    NOW() - INTERVAL '12 days',
    NOW() - INTERVAL '12 days',
    'public'
  ),
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'showcase-video-003',
    'completed',
    'Cute kitten playing with a ball of yarn, slow motion, soft focus background, warm afternoon sunlight',
    '9:16',
    '720p',
    4,
    40,
    'https://www.pexels.com/video/3571264/download/',
    'https://images.pexels.com/videos/3571264/pexels-photo-3571264.jpeg?w=600',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days',
    'public'
  ),
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'showcase-video-004',
    'completed',
    'Waterfall in a lush rainforest, mist rising, tropical plants, birds chirping, serene nature scene',
    '16:9',
    '1080p',
    6,
    60,
    'https://www.pexels.com/video/4803906/download/',
    'https://images.pexels.com/videos/4803906/pexels-photo-4803906.jpeg?w=600',
    NOW() - INTERVAL '8 days',
    NOW() - INTERVAL '8 days',
    'public'
  ),
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'showcase-video-005',
    'completed',
    'Abstract colorful particles flowing and morphing, psychedelic visuals, smooth transitions, electronic music vibe',
    '16:9',
    '720p',
    8,
    80,
    'https://www.pexels.com/video/3141211/download/',
    'https://images.pexels.com/videos/3141211/pexels-photo-3141211.jpeg?w=600',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days',
    'public'
  );

-- 3. 更新作品的互动数据（点赞数等）
-- 注意：这里使用随机数模拟真实的用户互动

-- 为图片作品添加点赞记录（模拟数据，仅用于展示）
-- 实际生产环境中，点赞记录应该由真实用户产生

-- 🔥 老王备注：
-- 1. 共16张图片作品 + 5个视频作品
-- 2. 图片涵盖多种风格：艺术、自然、科幻、奇幻、建筑、抽象、人物
-- 3. 视频涵盖多种场景：自然、城市、动物、抽象
-- 4. 所有作品的privacy设置为'public'，可在showcase展示
-- 5. 作品创建时间分布在过去25天内
-- 6. image_url和video_url使用高质量免费资源（Unsplash、Pexels）
-- 7. 需要将<ADMIN_USER_ID>替换为实际的用户UUID
-- 8. prompt描述详细，展示AI生成的能力
-- 9. 视频使用Pexels免费视频作为占位符（实际生产环境应使用真实生成的视频）
