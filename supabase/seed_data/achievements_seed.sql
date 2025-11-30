-- 🔥 老王创建：成就系统初始数据
-- 用途: 为成就系统创建预定义的成就徽章和规则
-- 老王警告: 这些成就必须合理，不能tm太容易也不能太难！

-- 插入成就定义数据（21个成就）
INSERT INTO achievements_definitions (
  id,
  name,
  name_en,
  description,
  description_en,
  badge_icon,
  condition_type,
  condition_value,
  tier,
  reward_credits,
  created_at
) VALUES
  -- 🥉 青铜级成就（入门级）
  (
    gen_random_uuid(),
    '初次创作',
    'First Creation',
    '完成你的第一件AI艺术作品',
    'Create your first AI artwork',
    '🎨',
    'works_count',
    1,
    'bronze',
    10,
    NOW()
  ),
  (
    gen_random_uuid(),
    '新手上路',
    'Getting Started',
    '累计创作10件作品',
    'Create 10 artworks in total',
    '✨',
    'works_count',
    10,
    'bronze',
    50,
    NOW()
  ),
  (
    gen_random_uuid(),
    '社交达人',
    'Social Butterfly',
    '关注5位创作者',
    'Follow 5 creators',
    '👥',
    'following_count',
    5,
    'bronze',
    20,
    NOW()
  ),
  (
    gen_random_uuid(),
    '点赞之手',
    'Like Giver',
    '给其他作品点赞10次',
    'Like 10 artworks',
    '❤️',
    'likes_given',
    10,
    'bronze',
    15,
    NOW()
  ),
  (
    gen_random_uuid(),
    '评论家',
    'Commentator',
    '发表5条评论',
    'Leave 5 comments',
    '💬',
    'comments_count',
    5,
    'bronze',
    25,
    NOW()
  ),

  -- 🥈 白银级成就（进阶级）
  (
    gen_random_uuid(),
    '创作达人',
    'Active Creator',
    '累计创作50件作品',
    'Create 50 artworks in total',
    '🎭',
    'works_count',
    50,
    'silver',
    100,
    NOW()
  ),
  (
    gen_random_uuid(),
    '受欢迎创作者',
    'Popular Creator',
    '获得100个点赞',
    'Receive 100 likes on your artworks',
    '⭐',
    'likes_received',
    100,
    'silver',
    150,
    NOW()
  ),
  (
    gen_random_uuid(),
    '视频创作者',
    'Video Creator',
    '创作10个AI视频',
    'Create 10 AI videos',
    '🎬',
    'video_count',
    10,
    'silver',
    200,
    NOW()
  ),
  (
    gen_random_uuid(),
    '粉丝团',
    'Fan Club',
    '获得20位关注者',
    'Get 20 followers',
    '🌟',
    'followers_count',
    20,
    'silver',
    120,
    NOW()
  ),
  (
    gen_random_uuid(),
    '连续创作',
    'Streak Master',
    '连续7天创作作品',
    'Create artworks for 7 days in a row',
    '🔥',
    'streak_days',
    7,
    'silver',
    180,
    NOW()
  ),

  -- 🥇 黄金级成就（高级）
  (
    gen_random_uuid(),
    '创作大师',
    'Creation Master',
    '累计创作200件作品',
    'Create 200 artworks in total',
    '👑',
    'works_count',
    200,
    'gold',
    300,
    NOW()
  ),
  (
    gen_random_uuid(),
    '人气王',
    'Popularity King',
    '获得500个点赞',
    'Receive 500 likes on your artworks',
    '💎',
    'likes_received',
    500,
    'gold',
    400,
    NOW()
  ),
  (
    gen_random_uuid(),
    '视频制作专家',
    'Video Expert',
    '创作50个AI视频',
    'Create 50 AI videos',
    '🎥',
    'video_count',
    50,
    'gold',
    500,
    NOW()
  ),
  (
    gen_random_uuid(),
    '影响力创作者',
    'Influencer',
    '获得100位关注者',
    'Get 100 followers',
    '🚀',
    'followers_count',
    100,
    'gold',
    350,
    NOW()
  ),
  (
    gen_random_uuid(),
    '月度冠军',
    'Monthly Champion',
    '单月作品浏览量超过10000次',
    'Get 10,000 views in a single month',
    '🏆',
    'monthly_views',
    10000,
    'gold',
    600,
    NOW()
  ),

  -- 💠 铂金级成就（资深）
  (
    gen_random_uuid(),
    '创作传奇',
    'Creation Legend',
    '累计创作500件作品',
    'Create 500 artworks in total',
    '🌌',
    'works_count',
    500,
    'platinum',
    800,
    NOW()
  ),
  (
    gen_random_uuid(),
    '万人迷',
    'Crowd Favorite',
    '获得2000个点赞',
    'Receive 2,000 likes on your artworks',
    '💫',
    'likes_received',
    2000,
    'platinum',
    1000,
    NOW()
  ),
  (
    gen_random_uuid(),
    '全能创作者',
    'All-Round Creator',
    '同时拥有100张图片作品和50个视频作品',
    'Have 100 images and 50 videos',
    '🎯',
    'mixed_works',
    150,
    'platinum',
    1200,
    NOW()
  ),

  -- 💎 钻石级成就（顶级）
  (
    gen_random_uuid(),
    '艺术大师',
    'Art Grandmaster',
    '累计创作1000件作品',
    'Create 1,000 artworks in total',
    '🔱',
    'works_count',
    1000,
    'diamond',
    2000,
    NOW()
  ),
  (
    gen_random_uuid(),
    '社区支柱',
    'Community Pillar',
    '获得500位关注者',
    'Get 500 followers',
    '⚡',
    'followers_count',
    500,
    'diamond',
    2500,
    NOW()
  ),
  (
    gen_random_uuid(),
    '终极创作者',
    'Ultimate Creator',
    '获得10000个点赞',
    'Receive 10,000 likes on your artworks',
    '🌠',
    'likes_received',
    10000,
    'diamond',
    5000,
    NOW()
  );

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_achievements_definitions_tier ON achievements_definitions(tier);
CREATE INDEX IF NOT EXISTS idx_achievements_definitions_condition_type ON achievements_definitions(condition_type);

-- 🔥 老王备注：
-- 1. 共21个成就，覆盖5个等级：bronze(5个)、silver(5个)、gold(5个)、platinum(3个)、diamond(3个)
-- 2. 成就类型多样化：
--    - works_count: 作品总数
--    - video_count: 视频作品数
--    - likes_received: 获得的点赞数
--    - followers_count: 粉丝数量
--    - following_count: 关注数量
--    - comments_count: 评论数
--    - likes_given: 给出的点赞数
--    - streak_days: 连续创作天数
--    - monthly_views: 单月浏览量
--    - mixed_works: 综合作品数
-- 3. 奖励积分递增：从10（青铜）到5000（钻石）
-- 4. badge_icon使用emoji，视觉效果好且无需额外资源
-- 5. 完整的中英双语支持
-- 6. 成就难度设计合理：
--    - 青铜：新手轻松达成
--    - 白银：活跃用户1-2周可达成
--    - 黄金：需要持续创作1-3个月
--    - 铂金：资深用户3-6个月
--    - 钻石：顶级用户半年以上
-- 7. 成就设计激励用户多方面参与：创作、社交、互动
