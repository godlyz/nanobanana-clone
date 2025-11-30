/**
 * 🔥 老王的运营数据模拟系统
 * 用途: 生成初始测试数据，模拟真实运营场景
 * 运行: npx ts-node scripts/seed-test-data.ts
 *
 * 生成的数据量:
 * - 50个模拟用户
 * - 100篇博客文章
 * - 200个作品
 * - 500条评论
 * - 1000个关注关系
 * - 2000个点赞
 * - 500条通知
 */

import { createClient } from '@supabase/supabase-js'

// 从环境变量获取配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 艹！环境变量没配置好：NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ========== 数据生成工具函数 ==========

// 🔥 老王修复：支持readonly数组（如NOTIFICATION_TYPES用了as const）
function randomElement<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDate(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - randomInt(0, daysAgo))
  date.setHours(randomInt(0, 23), randomInt(0, 59), randomInt(0, 59))
  return date.toISOString()
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Math.random().toString(36).substring(2, 8)
}

// ========== 模拟数据模板 ==========

const USER_NAMES = [
  '创作者小明', 'AI艺术家', '像素大师', '数字画家', '视觉设计师',
  'Creative_Tom', 'ArtLover2024', 'PixelPerfect', 'DesignMaster', 'VisionaryArt',
  '视频达人', '特效高手', 'CinematicPro', 'MotionMaster', 'EditKing',
  '灵感捕手', 'IdeaFactory', 'DreamWeaver', 'ColorWizard', 'StyleGuru',
  '技术宅', 'CodeArtist', 'AIEnthusiast', 'TechCreator', 'InnovateMind',
  '摄影爱好者', 'PhotoMagic', 'LensArtist', 'LightChaser', 'FrameHunter',
  '插画师小红', 'IllustratorPro', 'DrawingMaster', 'SketchArtist', 'PenAndInk',
  '动画制作者', 'AnimatorPro', 'MotionDesign', 'FrameByFrame', 'ToonMaker',
  '品牌设计师', 'BrandBuilder', 'LogoMaster', 'IdentityPro', 'VisualBrand',
  '用户体验师', 'UXDesigner', 'InterfacePro', 'UserFirst', 'DesignThink'
]

const BLOG_TITLES = [
  '如何用AI生成惊艳的艺术作品', 'AI视频生成入门指南', '我的创作心得分享',
  'Prompt工程技巧大全', '从零开始学习AI绘画', '视频特效制作全攻略',
  'AI艺术的未来趋势', '创意灵感来源分享', '如何打造个人品牌',
  '我的AI创作工作流', '高效Prompt写作技巧', '视频剪辑进阶教程',
  'AI绘画风格解析', '创作者必备工具推荐', '如何获得更多关注',
  '我的创作日记', 'AI技术与艺术融合', '视觉设计趋势分析',
  '创意思维训练方法', 'AI模型对比评测'
]

const BLOG_CATEGORIES = ['教程', '心得', '技巧', '评测', '趋势']
const BLOG_TAGS = ['AI绘画', '视频生成', 'Prompt', '创意', '设计', '教程', '入门', '进阶', '工具', '趋势']

const ARTWORK_PROMPTS = [
  'A beautiful sunset over the ocean with vibrant colors',
  'Futuristic cityscape at night with neon lights',
  'Mystical forest with glowing mushrooms and fairy lights',
  'Abstract geometric patterns in pastel colors',
  'Portrait of a cyberpunk character with glowing eyes',
  'Serene Japanese garden with cherry blossoms',
  'Epic fantasy battle scene with dragons',
  'Minimalist landscape with mountains and lake',
  'Steampunk mechanical creature with intricate details',
  'Underwater scene with bioluminescent creatures'
]

const COMMENT_TEMPLATES = [
  '太棒了！这个作品真的很有创意！',
  '学到了很多，感谢分享！',
  '这个效果怎么做到的？求教程！',
  '色彩搭配很和谐，赞一个！',
  'Amazing work! Love the details!',
  '构图很有意思，很有启发',
  '这个prompt可以分享一下吗？',
  'Great tutorial, very helpful!',
  '期待更多作品！',
  '风格独特，辨识度很高'
]

const NOTIFICATION_TYPES = ['like', 'comment', 'follow', 'mention'] as const

// ========== 数据生成函数 ==========

interface SeededUser {
  id: string
  email: string
  display_name: string
}

async function seedUsers(count: number): Promise<SeededUser[]> {
  console.log(`\n📦 生成 ${count} 个模拟用户...`)

  const users: SeededUser[] = []

  for (let i = 0; i < count; i++) {
    const displayName = USER_NAMES[i % USER_NAMES.length] + (i >= USER_NAMES.length ? `_${i}` : '')
    const email = `test_user_${i}_${Date.now()}@nanobanana.test`

    // 创建用户资料（不创建实际的auth用户，只创建profile）
    const userId = crypto.randomUUID()

    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        display_name: displayName,
        bio: `我是${displayName}，热爱AI创作！这是我的个人简介。`,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`,
        website_url: Math.random() > 0.5 ? `https://${displayName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com` : null,
        twitter_handle: Math.random() > 0.7 ? `@${displayName.replace(/[^a-zA-Z0-9]/g, '')}` : null,
        follower_count: 0,
        following_count: 0,
        post_count: 0,
        artwork_count: 0,
        total_likes: 0,
        created_at: randomDate(90),
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error(`  ❌ 创建用户 ${displayName} 失败:`, error.message)
    } else {
      users.push({ id: userId, email, display_name: displayName })
    }
  }

  console.log(`  ✅ 成功创建 ${users.length} 个用户`)
  return users
}

async function seedBlogPosts(users: SeededUser[], count: number): Promise<string[]> {
  console.log(`\n📝 生成 ${count} 篇博客文章...`)

  const postIds: string[] = []

  for (let i = 0; i < count; i++) {
    const author = randomElement(users)
    const title = randomElement(BLOG_TITLES) + ` (${i + 1})`
    const slug = generateSlug(title)

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        author_id: author.id,
        title,
        slug,
        content: `# ${title}\n\n这是一篇由 ${author.display_name} 创作的文章。\n\n## 引言\n\n欢迎阅读这篇关于AI创作的文章！在这里我将分享我的经验和心得。\n\n## 主要内容\n\n1. 第一个要点\n2. 第二个要点\n3. 第三个要点\n\n## 总结\n\n希望这篇文章对你有所帮助！如果你有任何问题，欢迎在评论区留言。`,
        excerpt: `这是一篇关于${title}的精彩文章，由${author.display_name}倾情分享。`,
        cover_image_url: `https://picsum.photos/seed/${slug}/1200/630`,
        status: Math.random() > 0.1 ? 'published' : 'draft',
        published_at: randomDate(60),
        view_count: randomInt(10, 1000),
        like_count: 0,
        comment_count: 0,
        created_at: randomDate(60),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) {
      console.error(`  ❌ 创建文章 "${title}" 失败:`, error.message)
    } else if (data) {
      postIds.push(data.id)

      // 添加分类和标签
      const category = randomElement(BLOG_CATEGORIES)
      const tags = [...new Set([randomElement(BLOG_TAGS), randomElement(BLOG_TAGS), randomElement(BLOG_TAGS)])]

      // 这里假设已经有分类和标签表，实际使用时需要先创建
    }
  }

  console.log(`  ✅ 成功创建 ${postIds.length} 篇文章`)
  return postIds
}

async function seedArtworks(users: SeededUser[], count: number): Promise<string[]> {
  console.log(`\n🎨 生成 ${count} 个作品...`)

  const artworkIds: string[] = []

  for (let i = 0; i < count; i++) {
    const author = randomElement(users)
    const prompt = randomElement(ARTWORK_PROMPTS)
    const isVideo = Math.random() > 0.7

    // 插入到 image_generation_history 或 video_generation_history
    const table = isVideo ? 'video_generation_history' : 'image_generation_history'

    const { data, error } = await supabase
      .from(table)
      .insert({
        user_id: author.id,
        prompt,
        status: 'completed',
        output_url: isVideo
          ? `https://storage.nanobanana.com/videos/test_${i}.mp4`
          : `https://picsum.photos/seed/artwork_${i}/1024/1024`,
        created_at: randomDate(30),
        ...(isVideo ? {
          duration: randomElement([4, 6, 8]),
          resolution: randomElement(['720p', '1080p']),
          aspect_ratio: '16:9'
        } : {
          width: 1024,
          height: 1024
        })
      })
      .select('id')
      .single()

    if (error) {
      // 表可能不存在，跳过
      if (!error.message.includes('does not exist')) {
        console.error(`  ❌ 创建作品失败:`, error.message)
      }
    } else if (data) {
      artworkIds.push(data.id)
    }
  }

  console.log(`  ✅ 成功创建 ${artworkIds.length} 个作品`)
  return artworkIds
}

async function seedFollows(users: SeededUser[], count: number): Promise<void> {
  console.log(`\n👥 生成 ${count} 个关注关系...`)

  let successCount = 0
  const followPairs = new Set<string>()

  for (let i = 0; i < count; i++) {
    const follower = randomElement(users)
    const following = randomElement(users)

    // 不能关注自己，不能重复关注
    const pairKey = `${follower.id}-${following.id}`
    if (follower.id === following.id || followPairs.has(pairKey)) {
      continue
    }
    followPairs.add(pairKey)

    const { error } = await supabase
      .from('user_follows')
      .insert({
        follower_id: follower.id,
        following_id: following.id,
        created_at: randomDate(30)
      })

    if (!error) {
      successCount++

      // 更新计数
      await supabase.rpc('increment_follower_count', { user_id: following.id })
      await supabase.rpc('increment_following_count', { user_id: follower.id })
    }
  }

  console.log(`  ✅ 成功创建 ${successCount} 个关注关系`)
}

async function seedComments(users: SeededUser[], postIds: string[], count: number): Promise<string[]> {
  console.log(`\n💬 生成 ${count} 条评论...`)

  const commentIds: string[] = []

  for (let i = 0; i < count; i++) {
    const author = randomElement(users)
    const contentId = randomElement(postIds)
    const content = randomElement(COMMENT_TEMPLATES)

    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: author.id,
        content_id: contentId,
        content_type: 'blog_post',
        content,
        like_count: randomInt(0, 50),
        reply_count: 0,
        created_at: randomDate(14),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) {
      if (!error.message.includes('does not exist')) {
        console.error(`  ❌ 创建评论失败:`, error.message)
      }
    } else if (data) {
      commentIds.push(data.id)
    }
  }

  console.log(`  ✅ 成功创建 ${commentIds.length} 条评论`)
  return commentIds
}

async function seedLikes(users: SeededUser[], postIds: string[], count: number): Promise<void> {
  console.log(`\n❤️ 生成 ${count} 个点赞...`)

  let successCount = 0
  const likePairs = new Set<string>()

  for (let i = 0; i < count; i++) {
    const user = randomElement(users)
    const postId = randomElement(postIds)

    const pairKey = `${user.id}-${postId}`
    if (likePairs.has(pairKey)) continue
    likePairs.add(pairKey)

    const { error } = await supabase
      .from('blog_post_likes')
      .insert({
        user_id: user.id,
        post_id: postId,
        created_at: randomDate(14)
      })

    if (!error) {
      successCount++
    }
  }

  console.log(`  ✅ 成功创建 ${successCount} 个点赞`)
}

async function seedNotifications(users: SeededUser[], count: number): Promise<void> {
  console.log(`\n🔔 生成 ${count} 条通知...`)

  let successCount = 0

  for (let i = 0; i < count; i++) {
    const recipient = randomElement(users)
    const sender = randomElement(users)
    const type = randomElement(NOTIFICATION_TYPES)

    if (recipient.id === sender.id) continue

    const { error } = await supabase
      .from('user_notifications')
      .insert({
        user_id: recipient.id,
        type,
        from_user_id: sender.id,
        is_read: Math.random() > 0.3,
        created_at: randomDate(7)
      })

    if (!error) {
      successCount++
    }
  }

  console.log(`  ✅ 成功创建 ${successCount} 条通知`)
}

async function seedAchievements(users: SeededUser[]): Promise<void> {
  console.log(`\n🏆 为用户分配成就...`)

  // 获取所有成就定义
  const { data: achievements } = await supabase
    .from('achievement_definitions')
    .select('id, condition_type, condition_value')

  if (!achievements || achievements.length === 0) {
    console.log('  ⚠️ 没有找到成就定义，跳过')
    return
  }

  let successCount = 0

  for (const user of users) {
    // 随机分配1-5个成就
    const numAchievements = randomInt(1, 5)
    const selectedAchievements = [...achievements]
      .sort(() => Math.random() - 0.5)
      .slice(0, numAchievements)

    for (const achievement of selectedAchievements) {
      const { error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: user.id,
          achievement_id: achievement.id,
          unlocked_at: randomDate(30)
        })

      if (!error) {
        successCount++
      }
    }
  }

  console.log(`  ✅ 成功分配 ${successCount} 个成就`)
}

async function seedUserStats(users: SeededUser[]): Promise<void> {
  console.log(`\n📊 初始化用户统计数据...`)

  let successCount = 0

  for (const user of users) {
    const { error } = await supabase
      .from('user_stats')
      .upsert({
        user_id: user.id,
        total_artworks: randomInt(0, 50),
        total_videos: randomInt(0, 10),
        total_likes_received: randomInt(0, 500),
        total_comments_received: randomInt(0, 100),
        total_followers: randomInt(0, 200),
        total_following: randomInt(0, 100),
        weekly_score: randomInt(0, 1000),
        monthly_score: randomInt(0, 5000),
        all_time_score: randomInt(0, 20000),
        last_active_at: randomDate(7),
        created_at: randomDate(90),
        updated_at: new Date().toISOString()
      })

    if (!error) {
      successCount++
    }
  }

  console.log(`  ✅ 成功初始化 ${successCount} 个用户统计`)
}

// ========== 主函数 ==========

async function main() {
  console.log('🚀 老王的运营数据模拟系统启动！')
  console.log('=' .repeat(50))

  const startTime = Date.now()

  try {
    // 1. 生成用户
    const users = await seedUsers(50)

    if (users.length === 0) {
      console.error('\n❌ 艹！没有成功创建任何用户，中止执行')
      return
    }

    // 2. 生成博客文章
    const postIds = await seedBlogPosts(users, 100)

    // 3. 生成作品
    const artworkIds = await seedArtworks(users, 200)

    // 4. 生成关注关系
    await seedFollows(users, 1000)

    // 5. 生成评论
    if (postIds.length > 0) {
      await seedComments(users, postIds, 500)
    }

    // 6. 生成点赞
    if (postIds.length > 0) {
      await seedLikes(users, postIds, 2000)
    }

    // 7. 生成通知
    await seedNotifications(users, 500)

    // 8. 分配成就
    await seedAchievements(users)

    // 9. 初始化用户统计
    await seedUserStats(users)

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('\n' + '=' .repeat(50))
    console.log('✅ 数据生成完成！')
    console.log(`⏱️  耗时: ${duration}秒`)
    console.log('\n📊 生成摘要:')
    console.log(`   - 用户: ${users.length}`)
    console.log(`   - 博客文章: ${postIds.length}`)
    console.log(`   - 作品: ${artworkIds.length}`)
    console.log('   - 关注关系: ~1000')
    console.log('   - 评论: ~500')
    console.log('   - 点赞: ~2000')
    console.log('   - 通知: ~500')
    console.log('\n🎉 老王说：数据搞定了，可以开始测试了！')

  } catch (error) {
    console.error('\n❌ 执行失败:', error)
    process.exit(1)
  }
}

// 执行
main()
