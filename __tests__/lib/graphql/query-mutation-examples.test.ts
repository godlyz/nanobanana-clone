/**
 * GraphQL Query/Mutation 测试示例
 *
 * 艹！这是老王我写的 GraphQL API 使用示例！
 * 展示如何使用 Week 32 Day 3-4 新增的 Query 和 Mutation！
 */

import { describe, it, expect } from 'vitest'

describe('GraphQL Query/Mutation Examples', () => {
  describe('Query Examples（查询示例）', () => {
    it('示例 1：获取论坛主题列表（分页 + 过滤）', () => {
      const query = `
        query GetForumThreads($categoryId: ID, $status: String, $limit: Int, $offset: Int) {
          forumThreads(
            categoryId: $categoryId
            status: $status
            limit: $limit
            offset: $offset
          ) {
            id
            title
            content
            status
            viewCount
            replyCount
            createdAt
            author {
              id
              username
              avatarUrl
            }
          }
        }
      `

      const variables = {
        categoryId: 'cat-123',
        status: 'open',
        limit: 20,
        offset: 0
      }

      // 艹！这就是一个标准的 GraphQL Query 调用！
      expect(query).toContain('forumThreads')
      expect(variables.limit).toBe(20)
    })

    it('示例 2：获取单个论坛主题详情', () => {
      const query = `
        query GetForumThread($id: ID!) {
          forumThread(id: $id) {
            id
            title
            content
            status
            viewCount
            replyCount
            createdAt
            author {
              id
              username
              avatarUrl
            }
            category {
              id
              name
            }
          }
        }
      `

      const variables = {
        id: 'thread-456'
      }

      expect(query).toContain('forumThread')
      expect(variables.id).toBe('thread-456')
    })

    it('示例 3：获取作品列表（多态查询：图片或视频）', () => {
      const query = `
        query GetArtworks($artworkType: String, $userId: ID, $limit: Int) {
          artworks(
            artworkType: $artworkType
            userId: $userId
            limit: $limit
          ) {
            id
            artworkType
            imageUrl
            videoUrl
            prompt
            createdAt
            user {
              id
              username
            }
            likesCount
          }
        }
      `

      const variables = {
        artworkType: 'image', // 或 'video'
        userId: 'user-789',
        limit: 20
      }

      // 艹！这个查询支持动态选择表（image_generations 或 video_generation_history）！
      expect(query).toContain('artworks')
      expect(variables.artworkType).toBe('image')
    })

    it('示例 4：获取排行榜（按分数排序）', () => {
      const query = `
        query GetLeaderboard($limit: Int) {
          leaderboard(limit: $limit) {
            id
            userId
            leaderboardScore
            totalLikes
            totalComments
            totalFollowers
            totalArtworks
            user {
              id
              username
              avatarUrl
            }
          }
        }
      `

      const variables = {
        limit: 100
      }

      expect(query).toContain('leaderboard')
      expect(variables.limit).toBe(100)
    })

    it('示例 5：获取论坛回复列表（嵌套回复）', () => {
      const query = `
        query GetForumReplies($threadId: ID, $parentId: ID, $limit: Int) {
          forumReplies(
            threadId: $threadId
            parentId: $parentId
            limit: $limit
          ) {
            id
            content
            createdAt
            author {
              id
              username
            }
            upvoteCount
            downvoteCount
            # 艹！嵌套查询：获取该回复的子回复
            replies {
              id
              content
              author {
                id
                username
              }
            }
          }
        }
      `

      const variables = {
        threadId: 'thread-456',
        parentId: null, // null = 顶级回复，非null = 子回复
        limit: 20
      }

      expect(query).toContain('forumReplies')
    })

    it('示例 6：获取评论列表（支持多种内容类型 + 嵌套）', () => {
      const query = `
        query GetComments($contentId: ID, $contentType: String, $parentId: ID) {
          comments(
            contentId: $contentId
            contentType: $contentType
            parentId: $parentId
          ) {
            id
            content
            createdAt
            user {
              id
              username
            }
            likesCount
            # 艹！嵌套查询：获取该评论的回复（最多2层）
            replies {
              id
              content
              user {
                id
                username
              }
            }
          }
        }
      `

      const variables = {
        contentId: 'post-123',
        contentType: 'blog_post', // 或 'artwork', 'video'
        parentId: null
      }

      expect(query).toContain('comments')
      expect(variables.contentType).toBe('blog_post')
    })
  })

  describe('Mutation Examples（变更示例）', () => {
    it('示例 1：创建博客文章', () => {
      const mutation = `
        mutation CreateBlogPost($input: CreateBlogPostInput!) {
          createBlogPost(input: $input) {
            id
            title
            slug
            content
            status
            createdAt
            author {
              id
              username
            }
          }
        }
      `

      const variables = {
        input: {
          title: '我的第一篇博客',
          slug: 'my-first-blog',
          content: '这是博客内容...',
          excerpt: '这是摘要',
          status: 'published',
          categoryIds: ['cat-1', 'cat-2'],
          tagIds: ['tag-1', 'tag-2']
        }
      }

      expect(mutation).toContain('createBlogPost')
      expect(variables.input.status).toBe('published')
    })

    it('示例 2：更新博客文章', () => {
      const mutation = `
        mutation UpdateBlogPost($id: ID!, $input: UpdateBlogPostInput!) {
          updateBlogPost(id: $id, input: $input) {
            id
            title
            content
            updatedAt
          }
        }
      `

      const variables = {
        id: 'post-123',
        input: {
          title: '更新后的标题',
          content: '更新后的内容...'
        }
      }

      expect(mutation).toContain('updateBlogPost')
      expect(variables.id).toBe('post-123')
    })

    it('示例 3：删除博客文章（软删除）', () => {
      const mutation = `
        mutation DeleteBlogPost($id: ID!) {
          deleteBlogPost(id: $id)
        }
      `

      const variables = {
        id: 'post-123'
      }

      // 艹！返回 boolean，成功则为 true
      expect(mutation).toContain('deleteBlogPost')
    })

    it('示例 4：创建评论', () => {
      const mutation = `
        mutation CreateComment($input: CreateCommentInput!) {
          createComment(input: $input) {
            id
            content
            createdAt
            user {
              id
              username
            }
          }
        }
      `

      const variables = {
        input: {
          contentId: 'post-123',
          contentType: 'blog_post',
          content: '这是一条评论',
          parentId: null // 顶级评论；如果是回复则填写父评论ID
        }
      }

      expect(mutation).toContain('createComment')
      expect(variables.input.contentType).toBe('blog_post')
    })

    it('示例 5：点赞', () => {
      const mutation = `
        mutation CreateLike($input: CreateLikeInput!) {
          createLike(input: $input) {
            id
            targetId
            targetType
            createdAt
          }
        }
      `

      const variables = {
        input: {
          targetId: 'post-123',
          targetType: 'blog_post' // 或 'artwork', 'comment'
        }
      }

      expect(mutation).toContain('createLike')
    })

    it('示例 6：取消点赞', () => {
      const mutation = `
        mutation DeleteLike($input: DeleteLikeInput!) {
          deleteLike(input: $input)
        }
      `

      const variables = {
        input: {
          targetId: 'post-123',
          targetType: 'blog_post'
        }
      }

      // 艹！返回 boolean
      expect(mutation).toContain('deleteLike')
    })

    it('示例 7：关注用户', () => {
      const mutation = `
        mutation CreateFollow($input: CreateFollowInput!) {
          createFollow(input: $input) {
            id
            followingId
            createdAt
          }
        }
      `

      const variables = {
        input: {
          followingId: 'user-456' // 要关注的用户ID
        }
      }

      expect(mutation).toContain('createFollow')
    })

    it('示例 8：取消关注', () => {
      const mutation = `
        mutation DeleteFollow($input: DeleteFollowInput!) {
          deleteFollow(input: $input)
        }
      `

      const variables = {
        input: {
          followingId: 'user-456'
        }
      }

      expect(mutation).toContain('deleteFollow')
    })

    it('示例 9：创建论坛主题', () => {
      const mutation = `
        mutation CreateForumThread($input: CreateForumThreadInput!) {
          createForumThread(input: $input) {
            id
            title
            content
            status
            createdAt
            author {
              id
              username
            }
          }
        }
      `

      const variables = {
        input: {
          categoryId: 'cat-123',
          title: '论坛主题标题',
          content: '论坛主题内容...',
          tagIds: ['tag-1', 'tag-2']
        }
      }

      expect(mutation).toContain('createForumThread')
    })

    it('示例 10：创建论坛回复', () => {
      const mutation = `
        mutation CreateForumReply($input: CreateForumReplyInput!) {
          createForumReply(input: $input) {
            id
            content
            createdAt
            author {
              id
              username
            }
          }
        }
      `

      const variables = {
        input: {
          threadId: 'thread-456',
          content: '这是一条回复',
          parentId: null // 顶级回复；如果是嵌套回复则填写父回复ID
        }
      }

      expect(mutation).toContain('createForumReply')
    })

    it('示例 11：创建论坛投票（upvote）', () => {
      const mutation = `
        mutation CreateForumVote($input: CreateForumVoteInput!) {
          createForumVote(input: $input) {
            id
            targetType
            targetId
            voteType
            createdAt
          }
        }
      `

      const variables = {
        input: {
          targetType: 'thread', // 或 'reply'
          targetId: 'thread-456',
          voteType: 'upvote' // 或 'downvote'
        }
      }

      expect(mutation).toContain('createForumVote')
      expect(variables.input.voteType).toBe('upvote')
    })

    it('示例 12：更新论坛投票（从upvote改为downvote）', () => {
      const mutation = `
        mutation UpdateForumVote($id: ID!, $input: UpdateForumVoteInput!) {
          updateForumVote(id: $id, input: $input) {
            id
            voteType
            updatedAt
          }
        }
      `

      const variables = {
        id: 'vote-789',
        input: {
          voteType: 'downvote' // 从 upvote 改为 downvote
        }
      }

      expect(mutation).toContain('updateForumVote')
    })

    it('示例 13：取消论坛投票', () => {
      const mutation = `
        mutation DeleteForumVote($input: DeleteForumVoteInput!) {
          deleteForumVote(input: $input)
        }
      `

      const variables = {
        input: {
          targetType: 'thread',
          targetId: 'thread-456'
        }
      }

      expect(mutation).toContain('deleteForumVote')
    })
  })

  describe('Advanced Examples（高级示例）', () => {
    it('示例 1：组合查询（获取主题 + 回复 + 作者信息）', () => {
      const query = `
        query GetThreadWithReplies($threadId: ID!) {
          forumThread(id: $threadId) {
            id
            title
            content
            viewCount
            replyCount
            author {
              id
              username
              avatarUrl
            }
          }

          forumReplies(threadId: $threadId, limit: 10) {
            id
            content
            upvoteCount
            author {
              id
              username
            }
          }
        }
      `

      const variables = {
        threadId: 'thread-456'
      }

      // 艹！一次查询获取主题详情 + 回复列表！
      expect(query).toContain('forumThread')
      expect(query).toContain('forumReplies')
    })

    it('示例 2：批量操作（先创建博客文章，再创建评论）', () => {
      const mutation = `
        mutation CreateBlogPostAndComment(
          $postInput: CreateBlogPostInput!
          $commentInput: CreateCommentInput!
        ) {
          createBlogPost(input: $postInput) {
            id
            title
          }

          createComment(input: $commentInput) {
            id
            content
          }
        }
      `

      const variables = {
        postInput: {
          title: '新博客',
          content: '内容...',
          status: 'published'
        },
        commentInput: {
          contentId: 'post-123',
          contentType: 'blog_post',
          content: '第一条评论'
        }
      }

      // 艹！GraphQL 支持一次调用多个 Mutation！
      expect(mutation).toContain('createBlogPost')
      expect(mutation).toContain('createComment')
    })

    it('示例 3：条件过滤（获取特定状态的主题）', () => {
      const query = `
        query GetOpenThreads($categoryId: ID!) {
          forumThreads(
            categoryId: $categoryId
            status: "open"
            limit: 50
            orderBy: "created_at"
          ) {
            id
            title
            replyCount
            viewCount
          }
        }
      `

      const variables = {
        categoryId: 'cat-123'
      }

      expect(query).toContain('status: "open"')
    })
  })

  describe('Error Handling Examples（错误处理示例）', () => {
    it('示例：未登录时的错误处理', () => {
      // 艹！所有需要认证的 Mutation 都会检查用户登录状态
      const expectedError = '未登录，无法创建博客文章'

      const mutation = `
        mutation CreateBlogPost($input: CreateBlogPostInput!) {
          createBlogPost(input: $input) {
            id
          }
        }
      `

      // 如果未登录，resolver 会抛出错误
      expect(expectedError).toContain('未登录')
    })

    it('示例：权限错误（只能更新自己的文章）', () => {
      const expectedError = '更新博客文章失败'

      const mutation = `
        mutation UpdateBlogPost($id: ID!, $input: UpdateBlogPostInput!) {
          updateBlogPost(id: $id, input: $input) {
            id
          }
        }
      `

      // 艹！.eq('author_id', user.id) 确保只能更新自己的文章
      expect(expectedError).toContain('失败')
    })
  })
})
