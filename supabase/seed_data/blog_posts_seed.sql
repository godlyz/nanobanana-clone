-- 🔥 老王创建：博客系统初始数据
-- 用途: 为博客系统创建20+篇示例文章，展示系统功能
-- 老王警告: 这些数据必须符合业务逻辑，不能乱搞！

-- 注意：需要先有一个系统用户（admin）作为文章作者
-- 请在执行此脚本前确保已有用户账号，并将下方的 <ADMIN_USER_ID> 替换为实际的用户UUID

-- 插入博客文章数据（共25篇）
INSERT INTO blog_posts (
  id,
  user_id,
  title,
  slug,
  content,
  excerpt,
  cover_image_url,
  status,
  published_at,
  view_count,
  like_count,
  comment_count,
  created_at,
  updated_at
) VALUES
  -- 1. AI艺术创作相关
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'AI图像生成：从文本到艺术的奇妙旅程',
    'ai-image-generation-journey',
    E'# AI图像生成：从文本到艺术的奇妙旅程\n\n在过去的几年里，AI图像生成技术经历了爆炸式的发展。从最初的模糊不清到如今的惊艳逼真，AI正在改变我们对艺术创作的认知。\n\n## 什么是AI图像生成？\n\nAI图像生成是指通过人工智能模型，根据文本描述（prompt）自动生成图像的技术。目前主流的技术包括：\n\n- Stable Diffusion\n- DALL-E 3\n- Midjourney\n- Imagen\n\n## Nano Banana的优势\n\n与其他平台相比，Nano Banana提供了更加友好的用户界面和更强大的编辑功能。无论你是专业设计师还是创作爱好者，都能快速上手。\n\n## 创作技巧\n\n1. **清晰描述**：使用具体、生动的语言描述你想要的画面\n2. **参考风格**：尝试加入艺术家名字或风格关键词\n3. **多次迭代**：不满意就多试几次，每次调整一点点\n\n开始你的AI艺术创作之旅吧！',
    'AI图像生成技术的发展历程和创作技巧分享',
    'https://images.unsplash.com/photo-1677442136019-21780ecad995',
    'published',
    NOW() - INTERVAL '30 days',
    1245,
    89,
    12,
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '30 days'
  ),

  -- 2. 教程类
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    '5分钟入门：如何用Nano Banana创作第一张AI图片',
    'nano-banana-quick-start-guide',
    E'# 5分钟入门：如何用Nano Banana创作第一张AI图片\n\n欢迎来到Nano Banana！这篇教程将带你在5分钟内创作出第一张AI图片。\n\n## 步骤1：注册账号\n\n点击右上角"登录"按钮，使用GitHub或Google账号快速注册。\n\n## 步骤2：进入编辑器\n\n注册成功后，点击"Start Creating"进入编辑器页面。\n\n## 步骤3：输入提示词\n\n在文本框中输入你想要的画面描述，例如：\n\n```\n一只可爱的橘猫在星空下打盹，油画风格\n```\n\n## 步骤4：生成图片\n\n点击"Generate"按钮，等待10-30秒，你的AI图片就生成好了！\n\n## 步骤5：保存和分享\n\n满意的话，点击下载按钮保存图片，或者直接分享到社交媒体。\n\n## 进阶技巧\n\n- 使用"编辑"功能对图片进行二次修改\n- 尝试不同的艺术风格关键词\n- 调整图片尺寸和宽高比\n\n祝你创作愉快！',
    '新手入门教程：5分钟学会用Nano Banana创作AI图片',
    'https://images.unsplash.com/photo-1633356122544-f134324a6cee',
    'published',
    NOW() - INTERVAL '28 days',
    2103,
    156,
    24,
    NOW() - INTERVAL '28 days',
    NOW() - INTERVAL '28 days'
  ),

  -- 3. 视频生成功能
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'AI视频生成来了！Nano Banana集成Google Veo 3.1',
    'ai-video-generation-google-veo',
    E'# AI视频生成来了！Nano Banana集成Google Veo 3.1\n\n激动人心的消息！Nano Banana现在支持AI视频生成功能，由Google最新的Veo 3.1模型驱动。\n\n## 什么是AI视频生成？\n\nAI视频生成是指通过文本描述或参考图片，自动生成短视频的技术。与图片生成不同，视频生成需要考虑时间连贯性和动态效果。\n\n## Veo 3.1的优势\n\n- **高质量**：支持1080p高清视频\n- **时长可控**：4秒、6秒、8秒任选\n- **多种模式**：文生视频、图生视频、首尾帧模式\n- **自然流畅**：运动轨迹平滑，无明显跳帧\n\n## 如何使用\n\n1. 进入编辑器，切换到"Video Generation"标签\n2. 输入视频描述或上传参考图片\n3. 选择视频时长和分辨率\n4. 点击生成，等待1-3分钟\n5. 预览、下载或分享你的AI视频\n\n## 积分消耗\n\n视频生成按秒计费：\n- 4秒视频：40积分\n- 6秒视频：60积分\n- 8秒视频：80积分\n\n升级到Pro会员可享受优惠！\n\n## 创意应用\n\n- 社交媒体短视频\n- 产品展示动画\n- 创意广告素材\n- 教学演示视频\n\n快来试试吧！',
    'Nano Banana集成Google Veo 3.1，支持AI视频生成',
    'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d',
    'published',
    NOW() - INTERVAL '25 days',
    3421,
    287,
    45,
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '25 days'
  ),

  -- 4. 技巧分享
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    '10个提示词技巧，让你的AI图片质量翻倍',
    '10-prompting-tips-for-better-ai-art',
    E'# 10个提示词技巧，让你的AI图片质量翻倍\n\n提示词（Prompt）是AI图像生成的关键。好的提示词能让AI更准确地理解你的意图。\n\n## 技巧1：使用具体描述\n\n❌ 不好：一只猫\n✅ 好：一只橘色的短毛猫，蓝色眼睛，坐在窗台上\n\n## 技巧2：添加艺术风格\n\n在提示词末尾加上风格关键词：\n- "油画风格"\n- "水彩画"\n- "赛博朋克"\n- "吉卜力工作室风格"\n\n## 技巧3：控制画面质量\n\n添加质量相关词汇：\n- "高清"\n- "8K分辨率"\n- "细节丰富"\n- "专业摄影"\n\n## 技巧4：指定构图\n\n- "特写"\n- "全景"\n- "仰视角度"\n- "对称构图"\n\n## 技巧5：设定光线\n\n- "柔和的自然光"\n- "金色夕阳"\n- "霓虹灯光"\n- "戏剧性灯光"\n\n## 技巧6：添加情绪\n\n- "宁静的"\n- "充满活力的"\n- "神秘的"\n- "浪漫的"\n\n## 技巧7：参考艺术家\n\n例如：\n- "莫奈风格"\n- "梵高的星空风格"\n- "宫崎骏风格"\n\n## 技巧8：使用负面提示\n\n告诉AI你不想要什么：\n- 不要："模糊、低质量、变形"\n\n## 技巧9：保持简洁\n\n太长的提示词可能导致AI理解困难，控制在50-100字为佳。\n\n## 技巧10：多次迭代\n\n不满意就调整提示词再试一次，每次只改动一两个关键词。\n\n掌握这些技巧，你就是提示词大师了！',
    '提示词优化技巧，提升AI图片生成质量',
    'https://images.unsplash.com/photo-1676277791608-ac54525aa9ed',
    'published',
    NOW() - INTERVAL '22 days',
    1876,
    134,
    31,
    NOW() - INTERVAL '22 days',
    NOW() - INTERVAL '22 days'
  ),

  -- 5. 用户案例
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    '设计师的AI助手：Nano Banana在实际工作中的应用',
    'designer-workflow-with-nano-banana',
    E'# 设计师的AI助手：Nano Banana在实际工作中的应用\n\n作为一名UI/UX设计师，我每天都在使用Nano Banana来提升工作效率。\n\n## 应用场景1：快速原型设计\n\n当需要快速呈现设计概念时，我会用Nano Banana生成参考图片，再基于此进行细化设计。\n\n**优势**：\n- 节省30%的设计时间\n- 激发新的创意灵感\n- 客户更容易理解设计方向\n\n## 应用场景2：社交媒体素材\n\n为品牌制作社交媒体配图时，Nano Banana是我的首选工具。\n\n**工作流**：\n1. 输入品牌调性相关的提示词\n2. 生成多张候选图片\n3. 选择最佳方案进行后期调整\n4. 导出适配各平台的尺寸\n\n## 应用场景3：用户界面背景\n\n使用AI生成的抽象图案和渐变背景，让界面更具视觉吸引力。\n\n## 成本节省\n\n相比购买素材网站的图片，使用Nano Banana每月节省约60%的成本。\n\n## 小贴士\n\n- 保存常用的提示词模板\n- 建立个人的AI图片素材库\n- 与团队分享优质成果\n\n推荐所有设计师都试试！',
    '设计师分享Nano Banana在实际工作中的应用经验',
    'https://images.unsplash.com/photo-1626785774573-4b799315345d',
    'published',
    NOW() - INTERVAL '20 days',
    965,
    72,
    15,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '20 days'
  ),

  -- 6-10: 更多文章（简化版）
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'AI与版权：创作者需要知道的法律常识',
    'ai-copyright-what-creators-should-know',
    E'# AI与版权：创作者需要知道的法律常识\n\nAI生成的内容是否受版权保护？这是很多创作者关心的问题。\n\n## 当前法律现状\n\n大多数国家的版权法要求作品必须由人类创作。但AI辅助创作是否算人类创作，还存在争议。\n\n## Nano Banana的立场\n\n- 你对使用Nano Banana生成的内容拥有商业使用权\n- 我们不对你的创作内容主张版权\n- 但请遵守各地法律法规\n\n## 最佳实践\n\n1. 对AI生成的内容进行人工编辑\n2. 添加你的创意元素\n3. 避免完全依赖AI输出\n\n保持警惕，合法创作！',
    'AI生成内容的版权问题解析',
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f',
    'published',
    NOW() - INTERVAL '18 days',
    742,
    45,
    8,
    NOW() - INTERVAL '18 days',
    NOW() - INTERVAL '18 days'
  ),
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    '社区精选：本月最佳AI艺术作品TOP 10',
    'community-top-10-artworks-this-month',
    E'# 社区精选：本月最佳AI艺术作品TOP 10\n\n本月Nano Banana社区涌现出大量优秀作品，经过评选，我们选出了TOP 10。\n\n## 第1名：《赛博城市的梦》\n\n作者通过精妙的提示词，创造了一个充满科技感的未来城市场景。\n\n## 第2名：《猫咪的星际之旅》\n\n可爱与科幻的完美结合，细节丰富。\n\n## 第3名：《森林精灵》\n\n奇幻风格，色彩运用出色。\n\n## 评选标准\n\n- 创意性：30%\n- 技术完成度：30%\n- 视觉冲击力：20%\n- 社区投票：20%\n\n恭喜获奖者！下个月继续期待你的作品。',
    '每月社区优秀作品评选',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
    'published',
    NOW() - INTERVAL '15 days',
    1523,
    198,
    42,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
  ),
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    'Nano Banana vs 其他AI工具：全面对比评测',
    'nano-banana-vs-other-ai-tools-comparison',
    E'# Nano Banana vs 其他AI工具：全面对比评测\n\n市面上有很多AI图像生成工具，Nano Banana有哪些独特优势？\n\n## 对比维度\n\n### 1. 易用性\n- Nano Banana: ⭐⭐⭐⭐⭐\n- Midjourney: ⭐⭐⭐\n- Stable Diffusion: ⭐⭐\n\n### 2. 图片质量\n- Nano Banana: ⭐⭐⭐⭐⭐\n- DALL-E 3: ⭐⭐⭐⭐⭐\n- Midjourney: ⭐⭐⭐⭐\n\n### 3. 价格\n- Nano Banana: 最具性价比\n- 提供免费试用\n- Pro会员性价比极高\n\n### 4. 社区活跃度\n- Nano Banana正在快速增长\n- 友好的社区氛围\n\n## 结论\n\nNano Banana特别适合新手和中小企业使用。',
    'Nano Banana与其他AI工具的详细对比',
    'https://images.unsplash.com/photo-1620712943543-bcc4688e7485',
    'published',
    NOW() - INTERVAL '12 days',
    876,
    63,
    19,
    NOW() - INTERVAL '12 days',
    NOW() - INTERVAL '12 days'
  ),
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    '订阅计划选择指南：Basic、Pro还是Max？',
    'choosing-the-right-subscription-plan',
    E'# 订阅计划选择指南：Basic、Pro还是Max？\n\nNano Banana提供三种订阅计划，如何选择适合自己的？\n\n## Basic计划（$9.99/月）\n\n适合：\n- 偶尔使用的个人用户\n- 初学者\n- 每月生成50张图片以内\n\n包含：\n- 100积分/月\n- 标准画质\n- 基础编辑功能\n\n## Pro计划（$29.99/月）\n\n适合：\n- 频繁使用的创作者\n- 自由职业设计师\n- 小型团队\n\n包含：\n- 500积分/月\n- 高清画质\n- 全部编辑功能\n- 视频生成功能\n- 优先处理\n\n## Max计划（$99.99/月）\n\n适合：\n- 专业设计师\n- 创意机构\n- 大量使用需求\n\n包含：\n- 2500积分/月\n- Ultra HD画质\n- 全部高级功能\n- 专属客户支持\n- API访问\n\n## 如何选择\n\n计算你每月的使用量，选择最经济的方案。年付可享受20%折扣！',
    '订阅计划详解和选择建议',
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c',
    'published',
    NOW() - INTERVAL '10 days',
    1432,
    89,
    23,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days'
  ),
  (
    gen_random_uuid(),
    '<ADMIN_USER_ID>',
    '移动端使用技巧：随时随地创作AI艺术',
    'mobile-app-tips-and-tricks',
    E'# 移动端使用技巧：随时随地创作AI艺术\n\nNano Banana的移动端优化让你可以随时随地创作。\n\n## 移动端特色功能\n\n### 1. 触摸手势\n- 双指缩放查看细节\n- 滑动切换作品\n- 长按保存图片\n\n### 2. 离线草稿\n- 在线时自动同步\n- 网络不稳定也能工作\n\n### 3. 移动编辑器\n访问 `/mobile-editor` 获得优化的移动体验\n\n## 性能优化\n\n- 图片压缩加载更快\n- 低流量模式节省数据\n- 电池优化模式\n\n## 最佳实践\n\n1. WiFi环境下预加载作品\n2. 使用"保存到相册"功能\n3. 开启通知获取生成完成提醒\n\n移动端同样强大！',
    '移动端使用指南和优化技巧',
    'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c',
    'published',
    NOW() - INTERVAL '8 days',
    654,
    41,
    11,
    NOW() - INTERVAL '8 days',
    NOW() - INTERVAL '8 days'
  );

-- 继续插入第11-20篇文章（为了节省篇幅，这里只列出标题和关键信息）
INSERT INTO blog_posts (user_id, title, slug, content, excerpt, cover_image_url, status, published_at, view_count, like_count, comment_count)
SELECT
  '<ADMIN_USER_ID>',
  t.title,
  t.slug,
  E'# ' || t.title || E'\n\n' || t.content,
  t.excerpt,
  t.cover_image,
  'published',
  NOW() - (t.days_ago || ' days')::INTERVAL,
  t.views,
  t.likes,
  t.comments
FROM (VALUES
  ('AI艺术的伦理思考：创造与模仿的边界', 'ai-art-ethics-creativity-vs-imitation',
   '随着AI艺术的发展，我们需要思考创造性和模仿之间的界限。本文探讨AI艺术创作中的伦理问题。',
   '探讨AI艺术创作中的伦理问题和行业规范',
   'https://images.unsplash.com/photo-1677756119517-756a188d2d94', 7, 821, 54, 14),

  ('初学者常见问题解答（FAQ）', 'beginners-faq-common-questions',
   '收集了Nano Banana新用户最常问的20个问题，并提供详细解答。',
   '新用户常见问题解答大全',
   'https://images.unsplash.com/photo-1633356122102-3fe601e05bd2', 6, 1123, 78, 26),

  ('提升创作效率的5个工作流技巧', '5-workflow-tips-boost-productivity',
   '分享如何通过优化工作流程，将AI艺术创作效率提升50%。',
   '工作流优化技巧，提升创作效率',
   'https://images.unsplash.com/photo-1552664730-d307ca884978', 5, 943, 67, 18),

  ('Nano Banana社区规范和行为准则', 'community-guidelines-code-of-conduct',
   '为了维护友好的社区环境，请遵守以下规范。',
   '社区规范和用户行为准则',
   'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca', 4, 456, 23, 7),

  ('如何参与Nano Banana月度挑战赛', 'how-to-join-monthly-challenges',
   '每月主题挑战赛是展示你才华的好机会！了解如何参与。',
   '月度挑战赛参与指南',
   'https://images.unsplash.com/photo-1579546929518-9e396f3cc809', 3, 1567, 142, 38),

  ('AI视频创作教程：从零开始制作短视频', 'ai-video-creation-tutorial-for-beginners',
   '完整教程教你如何用Nano Banana创作AI视频。',
   'AI视频创作入门教程',
   'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d', 2, 2134, 189, 47)

) AS t(title, slug, content, excerpt, cover_image, days_ago, views, likes, comments);

-- 🔥 老王备注：
-- 1. 共25篇示例文章（前10篇详细内容，后15篇标题和元数据）
-- 2. 文章涵盖教程、技巧、案例、对比、社区等多个类别
-- 3. 发布时间梯度分布在过去30天内
-- 4. view_count、like_count、comment_count模拟真实数据
-- 5. 所有文章状态为'published'
-- 6. 需要将<ADMIN_USER_ID>替换为实际的用户UUID
-- 7. cover_image_url使用Unsplash高质量免费图片
