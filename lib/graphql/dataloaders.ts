import DataLoader from 'dataloader'
import type { SupabaseClient } from '@supabase/supabase-js'

// 简化的DataLoaders接口，先让基础功能跑起来
export function createDataLoaders(supabase: SupabaseClient, userId?: string | null) {
  return {
    // 批量加载用户
    userLoader: new DataLoader(async (userIds: readonly string[]) => {
      const { data: users, error } = await supabase.auth.admin.listUsers()

      if (error) {
        console.error('Error loading users:', error)
        return userIds.map(() => null)
      }

      const userMap = new Map(
        users.users.map(user => [user.id, user])
      )

      return userIds.map(id => userMap.get(id) || null)
    }),

    // 批量加载用户资料
    userProfileLoader: new DataLoader(async (userIds: readonly string[]) => {
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .in('user_id', userIds as string[])

      if (error) {
        console.error('Error loading user profiles:', error)
        return userIds.map(() => null)
      }

      const profileMap = new Map(
        profiles?.map(profile => [profile.user_id, profile])
      )

      return userIds.map(id => profileMap.get(id) || null)
    }),

    // 批量加载作品
    artworkLoader: new DataLoader(async (artworkIds: readonly string[]) => {
      const { data: artworks, error } = await supabase
        .from('generation_records')
        .select('*')
        .in('id', artworkIds as string[])
        .is('deleted_at', null)

      if (error) {
        console.error('Error loading artworks:', error)
        return artworkIds.map(() => null)
      }

      const artworkMap = new Map(
        artworks?.map(artwork => [artwork.id, artwork])
      )

      return artworkIds.map(id => artworkMap.get(id) || null)
    }),

    // 批量加载视频
    videoLoader: new DataLoader(async (videoIds: readonly string[]) => {
      const { data: videos, error } = await supabase
        .from('video_records')
        .select('*')
        .in('id', videoIds as string[])
        .is('deleted_at', null)

      if (error) {
        console.error('Error loading videos:', error)
        return videoIds.map(() => null)
      }

      const videoMap = new Map(
        videos?.map(video => [video.id, video])
      )

      return videoIds.map(id => videoMap.get(id) || null)
    }),

    // 批量加载点赞数
    likeCountLoader: new DataLoader(async (keys: readonly { targetType: string; targetId: string }[]) => {
      // 首先尝试使用现有的RPC函数
      try {
        const { data: results, error } = await supabase.rpc('batch_get_like_counts', {
          target_types: keys.map(k => k.targetType),
          target_ids: keys.map(k => k.targetId)
        })

        if (!error && results) {
          const countMap = new Map(
            results.map((r: any) => [`${r.target_type}:${r.target_id}`, r.count])
          )
          return keys.map(key => countMap.get(`${key.targetType}:${key.targetId}`) || 0)
        }
      } catch (e) {
        console.error('RPC function not available, falling back to individual queries')
      }

      // 回退方案：分别查询不同类型的点赞
      const promises = keys.map(async (key) => {
        let tableName = ''
        switch (key.targetType) {
          case 'ARTWORK':
            tableName = 'artwork_likes'
            break
          case 'VIDEO':
            tableName = 'video_likes'
            break
          case 'COMMENT':
            tableName = 'comment_likes'
            break
          case 'BLOG_POST':
            tableName = 'blog_likes'
            break
          default:
            return 0
        }

        const { data: likes, error } = await supabase
          .from(tableName)
          .select('id', { count: 'exact', head: true })
          .eq('target_id', key.targetId)

        return error ? 0 : likes?.length || 0
      })

      const results = await Promise.all(promises)
      return results
    }),

    // 批量加载评论数
    commentCountLoader: new DataLoader(async (keys: readonly { targetType: string; targetId: string }[]) => {
      const promises = keys.map(async (key) => {
        let tableName = ''
        switch (key.targetType) {
          case 'ARTWORK':
            tableName = 'artwork_comments'
            break
          case 'VIDEO':
            tableName = 'video_comments'
            break
          case 'BLOG_POST':
            tableName = 'blog_comments'
            break
          case 'FORUM_THREAD':
            tableName = 'forum_replies'
            break
          default:
            return 0
        }

        const { data: comments, error } = await supabase
          .from(tableName)
          .select('id', { count: 'exact', head: true })
          .eq('target_id', key.targetId)
          .is('deleted_at', null)

        return error ? 0 : comments?.length || 0
      })

      const results = await Promise.all(promises)
      return results
    }),

    // 批量加载粉丝数
    followerCountLoader: new DataLoader(async (userIds: readonly string[]) => {
      const promises = userIds.map(async (userId) => {
        const { data: followers, error } = await supabase
          .from('user_follows')
          .select('follower_id', { count: 'exact', head: true })
          .eq('following_id', userId)

        return error ? 0 : followers?.length || 0
      })

      const results = await Promise.all(promises)
      return results
    }),

    // 批量加载作品点赞详情
    artworkLikesLoader: new DataLoader(async (artworkIds: readonly string[]) => {
      const { data: likes, error } = await supabase
        .from('artwork_likes')
        .select('target_id, user_id, created_at')
        .in('target_id', artworkIds as string[])
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading artwork likes:', error)
        return artworkIds.map(() => [])
      }

      const likesMap = new Map<string, any[]>()
      likes?.forEach(like => {
        if (!likesMap.has(like.target_id)) {
          likesMap.set(like.target_id, [])
        }
        likesMap.get(like.target_id)!.push(like)
      })

      return artworkIds.map(id => likesMap.get(id) || [])
    }),

    // 批量加载视频点赞详情
    videoLikesLoader: new DataLoader(async (videoIds: readonly string[]) => {
      const { data: likes, error } = await supabase
        .from('video_likes')
        .select('target_id, user_id, created_at')
        .in('target_id', videoIds as string[])
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading video likes:', error)
        return videoIds.map(() => [])
      }

      const likesMap = new Map<string, any[]>()
      likes?.forEach(like => {
        if (!likesMap.has(like.target_id)) {
          likesMap.set(like.target_id, [])
        }
        likesMap.get(like.target_id)!.push(like)
      })

      return videoIds.map(id => likesMap.get(id) || [])
    }),

    // 批量加载评论点赞详情
    commentLikesLoader: new DataLoader(async (commentIds: readonly string[]) => {
      const { data: likes, error } = await supabase
        .from('comment_likes')
        .select('target_id, user_id, created_at')
        .in('target_id', commentIds as string[])
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading comment likes:', error)
        return commentIds.map(() => [])
      }

      const likesMap = new Map<string, any[]>()
      likes?.forEach(like => {
        if (!likesMap.has(like.target_id)) {
          likesMap.set(like.target_id, [])
        }
        likesMap.get(like.target_id)!.push(like)
      })

      return commentIds.map(id => likesMap.get(id) || [])
    }),

    // 批量加载未读通知数
    notificationCountLoader: new DataLoader(async (userIds: readonly string[]) => {
      const promises = userIds.map(async (userId) => {
        const { data: notifications, error } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_read', false)

        return error ? 0 : notifications?.length || 0
      })

      const results = await Promise.all(promises)
      return results
    }),

    // 艹！老王我添加的批量加载博客文章点赞状态！
    // 用于查询当前用户是否点赞了某些博客文章
    blogPostLikesLoader: new DataLoader(async (postIds: readonly string[]) => {
      // 艹！未登录用户全部返回false！
      if (!userId) {
        console.log(`[DataLoader] No user logged in, returning false for ${postIds.length} posts`)
        return postIds.map(() => false)
      }

      console.log(`[DataLoader] Loading ${postIds.length} blog post like statuses for user ${userId}:`, postIds)

      // 批量查询点赞记录
      const { data, error } = await supabase
        .from('blog_post_likes')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', postIds as string[])

      if (error) {
        console.error('[DataLoader] Error loading blog post likes:', error)
        return postIds.map(() => false)
      }

      // 创建已点赞的文章ID集合
      const likedPostIds = new Set(data?.map((like) => like.post_id) || [])

      // 按照输入顺序返回结果
      return postIds.map((id) => likedPostIds.has(id))
    }),

    // ============================================
    // 艹！Week 30 新增：Blog 系统 DataLoaders
    // ============================================

    // 批量加载博客文章的分类列表
    blogPostCategoriesLoader: new DataLoader(async (postIds: readonly string[]) => {
      const { data, error } = await supabase
        .from('blog_post_categories')
        .select('post_id, category_id, blog_categories(*)')
        .in('post_id', postIds as string[])

      if (error) {
        console.error('Error loading blog post categories:', error)
        return postIds.map(() => [])
      }

      // 按 post_id 分组
      const categoriesMap = new Map<string, any[]>()
      data?.forEach(relation => {
        if (!categoriesMap.has(relation.post_id)) {
          categoriesMap.set(relation.post_id, [])
        }
        if (relation.blog_categories) {
          categoriesMap.get(relation.post_id)!.push(relation.blog_categories)
        }
      })

      return postIds.map(id => categoriesMap.get(id) || [])
    }),

    // 批量加载博客文章的标签列表
    blogPostTagsLoader: new DataLoader(async (postIds: readonly string[]) => {
      const { data, error } = await supabase
        .from('blog_post_tags')
        .select('post_id, tag_id, blog_tags(*)')
        .in('post_id', postIds as string[])

      if (error) {
        console.error('Error loading blog post tags:', error)
        return postIds.map(() => [])
      }

      // 按 post_id 分组
      const tagsMap = new Map<string, any[]>()
      data?.forEach(relation => {
        if (!tagsMap.has(relation.post_id)) {
          tagsMap.set(relation.post_id, [])
        }
        if (relation.blog_tags) {
          tagsMap.get(relation.post_id)!.push(relation.blog_tags)
        }
      })

      return postIds.map(id => tagsMap.get(id) || [])
    }),

    // 批量加载博客文章的评论列表
    blogPostCommentsLoader: new DataLoader(async (postIds: readonly string[]) => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('target_type', 'blog_post')
        .in('target_id', postIds as string[])
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading blog post comments:', error)
        return postIds.map(() => [])
      }

      // 按 target_id 分组
      const commentsMap = new Map<string, any[]>()
      data?.forEach(comment => {
        if (!commentsMap.has(comment.target_id)) {
          commentsMap.set(comment.target_id, [])
        }
        commentsMap.get(comment.target_id)!.push(comment)
      })

      return postIds.map(id => commentsMap.get(id) || [])
    }),

    // ============================================
    // 艹！Week 30 新增：Forum 系统 DataLoaders
    // ============================================

    // 批量加载论坛帖子的回复列表
    forumThreadRepliesLoader: new DataLoader(async (threadIds: readonly string[]) => {
      const { data, error } = await supabase
        .from('forum_replies')
        .select('*')
        .in('thread_id', threadIds as string[])
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading forum thread replies:', error)
        return threadIds.map(() => [])
      }

      // 按 thread_id 分组
      const repliesMap = new Map<string, any[]>()
      data?.forEach(reply => {
        if (!repliesMap.has(reply.thread_id)) {
          repliesMap.set(reply.thread_id, [])
        }
        repliesMap.get(reply.thread_id)!.push(reply)
      })

      return threadIds.map(id => repliesMap.get(id) || [])
    }),

    // 批量加载论坛帖子的投票列表
    forumThreadVotesLoader: new DataLoader(async (threadIds: readonly string[]) => {
      const { data, error } = await supabase
        .from('forum_votes')
        .select('*')
        .eq('target_type', 'thread')
        .in('target_id', threadIds as string[])

      if (error) {
        console.error('Error loading forum thread votes:', error)
        return threadIds.map(() => [])
      }

      // 按 target_id 分组
      const votesMap = new Map<string, any[]>()
      data?.forEach(vote => {
        if (!votesMap.has(vote.target_id)) {
          votesMap.set(vote.target_id, [])
        }
        votesMap.get(vote.target_id)!.push(vote)
      })

      return threadIds.map(id => votesMap.get(id) || [])
    }),

    // 批量加载论坛帖子的标签列表
    forumThreadTagsLoader: new DataLoader(async (threadIds: readonly string[]) => {
      const { data, error } = await supabase
        .from('forum_thread_tags')
        .select('thread_id, tag_id, forum_tags(*)')
        .in('thread_id', threadIds as string[])

      if (error) {
        console.error('Error loading forum thread tags:', error)
        return threadIds.map(() => [])
      }

      // 按 thread_id 分组
      const tagsMap = new Map<string, any[]>()
      data?.forEach(relation => {
        if (!tagsMap.has(relation.thread_id)) {
          tagsMap.set(relation.thread_id, [])
        }
        if (relation.forum_tags) {
          tagsMap.get(relation.thread_id)!.push(relation.forum_tags)
        }
      })

      return threadIds.map(id => tagsMap.get(id) || [])
    }),

    // 批量加载论坛帖子的订阅状态（当前用户是否订阅）
    forumThreadSubscriptionsLoader: new DataLoader(async (threadIds: readonly string[]) => {
      // 艹！未登录用户全部返回false！
      if (!userId) {
        return threadIds.map(() => false)
      }

      const { data, error } = await supabase
        .from('forum_subscriptions')
        .select('thread_id')
        .eq('user_id', userId)
        .in('thread_id', threadIds as string[])

      if (error) {
        console.error('Error loading forum thread subscriptions:', error)
        return threadIds.map(() => false)
      }

      // 创建已订阅的帖子ID集合
      const subscribedThreadIds = new Set(data?.map(sub => sub.thread_id) || [])

      return threadIds.map(id => subscribedThreadIds.has(id))
    }),

    // ============================================
    // 艹！Week 30 新增：通知系统 DataLoaders
    // ============================================

    // 批量加载通知的触发用户（from_user）
    notificationFromUserLoader: new DataLoader(async (notificationIds: readonly string[]) => {
      const { data: notifications, error } = await supabase
        .from('user_notifications')
        .select('id, from_user_id')
        .in('id', notificationIds as string[])

      if (error) {
        console.error('Error loading notification from_user_ids:', error)
        return notificationIds.map(() => null)
      }

      // 提取所有 from_user_id
      const fromUserIds = notifications
        ?.map(n => n.from_user_id)
        .filter((id): id is string => id !== null) || []

      // 批量加载用户信息
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
      if (usersError) {
        console.error('Error loading users:', usersError)
        return notificationIds.map(() => null)
      }

      const userMap = new Map(users.users.map(user => [user.id, user]))

      // 创建 notification_id -> from_user 映射
      const notificationUserMap = new Map(
        notifications?.map(n => [n.id, n.from_user_id ? userMap.get(n.from_user_id) : null])
      )

      return notificationIds.map(id => notificationUserMap.get(id) || null)
    }),

    // 批量加载通知的关联内容（content）
    notificationContentLoader: new DataLoader(async (keys: readonly { notificationId: string; contentType: string; contentId: string }[]) => {
      // 艹！按 content_type 分组查询
      const blogPostIds = keys.filter(k => k.contentType === 'blog_post').map(k => k.contentId)
      const artworkIds = keys.filter(k => k.contentType === 'artwork').map(k => k.contentId)
      const videoIds = keys.filter(k => k.contentType === 'video').map(k => k.contentId)
      const commentIds = keys.filter(k => k.contentType === 'comment').map(k => k.contentId)

      // 批量查询各类内容
      const [blogPosts, artworks, videos, comments] = await Promise.all([
        blogPostIds.length > 0
          ? supabase.from('blog_posts').select('*').in('id', blogPostIds)
          : { data: [] },
        artworkIds.length > 0
          ? supabase.from('generation_records').select('*').in('id', artworkIds)
          : { data: [] },
        videoIds.length > 0
          ? supabase.from('video_records').select('*').in('id', videoIds)
          : { data: [] },
        commentIds.length > 0
          ? supabase.from('comments').select('*').in('id', commentIds)
          : { data: [] }
      ])

      // 创建内容映射
      const contentMap = new Map<string, any>()
      blogPosts.data?.forEach(post => contentMap.set(`blog_post:${post.id}`, post))
      artworks.data?.forEach(artwork => contentMap.set(`artwork:${artwork.id}`, artwork))
      videos.data?.forEach(video => contentMap.set(`video:${video.id}`, video))
      comments.data?.forEach(comment => contentMap.set(`comment:${comment.id}`, comment))

      // 按输入顺序返回结果
      return keys.map(key => {
        const mapKey = `${key.contentType}:${key.contentId}`
        return contentMap.get(mapKey) || null
      })
    }),
  }
}