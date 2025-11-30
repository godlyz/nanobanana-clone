/**
 * 🔥 老王创建：Forum Replies + Votes API 单元测试
 * 测试范围：Replies（GET + POST + PUT + DELETE）+ Votes（POST）
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// 测试环境配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const testApiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// 🔥 老王修复：创建两个客户端
// adminClient用于管理操作（创建/删除用户、数据）
// anonClient用于用户认证登录（获取token）
const adminClient = createClient(supabaseUrl, supabaseServiceKey)
const anonClient = createClient(supabaseUrl, supabaseAnonKey)

// 测试数据
let testCategoryId: string
let testThreadId: string
let testReplyId: string
let testUserToken: string
let testUserId: string

describe('Forum Replies + Votes API Tests', () => {
  // 测试前准备
  beforeAll(async () => {
    // 🔥 老王修复：用adminClient创建测试用户
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email: `reply-test-${Date.now()}@example.com`,
      password: 'TestPass123!',
      email_confirm: true,
    })

    if (createError) {
      console.error('❌ 创建用户失败:', createError)
      throw createError
    }

    if (userData.user) {
      testUserId = userData.user.id
      console.log('✅ 测试用户创建成功:', testUserId)

      // 🔥 老王修复：用anonClient登录获取token
      const { data: sessionData, error: signInError } = await anonClient.auth.signInWithPassword({
        email: userData.user.email!,
        password: 'TestPass123!',
      })

      if (signInError) {
        console.error('❌ 登录失败:', signInError)
        throw signInError
      }

      testUserToken = sessionData.session?.access_token || ''

      if (!testUserToken) {
        throw new Error('❌ Token获取失败！')
      }
      console.log('✅ Token获取成功:', testUserToken.substring(0, 20) + '...')
    }

    // 🔥 老王修复：用adminClient创建测试分类
    const { data: category, error: catError } = await adminClient
      .from('forum_categories')
      .insert({
        name: '测试分类',
        slug: 'test-category-reply-' + Date.now(),
      })
      .select()
      .single()

    if (catError) {
      console.error('❌ 创建分类失败:', catError)
      throw catError
    }

    testCategoryId = category?.id || ''
    console.log('✅ 测试分类创建成功:', testCategoryId)

    // 🔥 老王修复：用adminClient创建测试帖子
    const { data: thread, error: threadError } = await adminClient
      .from('forum_threads')
      .insert({
        category_id: testCategoryId,
        user_id: testUserId,
        title: '测试帖子标题',
        slug: 'test-thread-' + Date.now(),
        content: '这是测试帖子的内容，用于测试Forum API功能',  // 至少10个字符
        status: 'open',
      })
      .select()
      .single()

    if (threadError) {
      console.error('❌ 创建帖子失败:', threadError)
      throw threadError
    }

    testThreadId = thread?.id || ''
    console.log('✅ 测试帖子创建成功:', testThreadId)
  })

  // 测试后清理
  afterAll(async () => {
    // 🔥 老王修复：用adminClient清理测试数据
    // 删除测试回复（如果存在）
    if (testReplyId) {
      await adminClient.from('forum_replies').delete().eq('id', testReplyId)
    }

    // 删除测试帖子
    if (testThreadId) {
      await adminClient.from('forum_threads').delete().eq('id', testThreadId)
    }

    // 删除测试分类
    if (testCategoryId) {
      await adminClient.from('forum_categories').delete().eq('id', testCategoryId)
    }

    // 删除测试用户
    if (testUserId) {
      await adminClient.auth.admin.deleteUser(testUserId)
    }
  })

  // ==================== Replies API Tests ====================

  describe('GET /api/forum/threads/[id]/replies', () => {
    it('应该成功获取回复列表（默认分页）', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/threads/${testThreadId}/replies`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data.data)).toBe(true)
      expect(data.data.pagination).toHaveProperty('page')
      expect(data.data.pagination.page).toBe(1)
      expect(data.data.pagination.limit).toBe(20)
    })

    it('应该支持自定义分页参数', async () => {
      const response = await fetch(
        `${testApiUrl}/api/forum/threads/${testThreadId}/replies?page=2&limit=10`
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.pagination.page).toBe(2)
      expect(data.data.pagination.limit).toBe(10)
    })

    it('应该支持oldest排序（默认）', async () => {
      const response = await fetch(
        `${testApiUrl}/api/forum/threads/${testThreadId}/replies?sort=oldest`
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      if (data.data.data.length > 1) {
        const reply1 = new Date(data.data.data[0].created_at)
        const reply2 = new Date(data.data.data[1].created_at)
        expect(reply1.getTime()).toBeLessThanOrEqual(reply2.getTime())
      }
    })

    it('应该支持newest排序', async () => {
      const response = await fetch(
        `${testApiUrl}/api/forum/threads/${testThreadId}/replies?sort=newest`
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      if (data.data.data.length > 1) {
        const reply1 = new Date(data.data.data[0].created_at)
        const reply2 = new Date(data.data.data[1].created_at)
        expect(reply1.getTime()).toBeGreaterThanOrEqual(reply2.getTime())
      }
    })

    it('获取不存在的帖子的回复应该返回404', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await fetch(`${testApiUrl}/api/forum/threads/${fakeId}/replies`)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toContain('not found')
    })
  })

  describe('POST /api/forum/threads/[id]/replies', () => {
    it('未登录用户不能创建回复', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/threads/${testThreadId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: '这是一个测试回复',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Authentication required')
    })

    it('内容为空应该失败', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/threads/${testThreadId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          content: '',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('cannot be empty')
    })

    it('登录用户可以成功创建回复', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/threads/${testThreadId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          content: '这是一个测试回复，测试回复的内容。',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('id')
      expect(data.data).toHaveProperty('author')
      expect(data.data.content).toBe('这是一个测试回复，测试回复的内容。')

      // 保存testReplyId用于后续测试
      testReplyId = data.data.id
    })

    it('回复后帖子的reply_count应该增加', async () => {
      // 先创建一个回复
      await fetch(`${testApiUrl}/api/forum/threads/${testThreadId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          content: '这是又一个测试回复',
        }),
      })

      // 获取帖子详情，验证reply_count
      const response = await fetch(`${testApiUrl}/api/forum/threads/${testThreadId}`)
      const data = await response.json()

      expect(data.data.reply_count).toBeGreaterThan(0)
    })

    it('不能回复已锁定的帖子', async () => {
      // 先锁定帖子
      await adminClient
        .from('forum_threads')
        .update({ is_locked: true })
        .eq('id', testThreadId)

      const response = await fetch(`${testApiUrl}/api/forum/threads/${testThreadId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          content: '尝试回复已锁定的帖子',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toContain('locked')

      // 解锁帖子（恢复测试环境）
      await adminClient
        .from('forum_threads')
        .update({ is_locked: false })
        .eq('id', testThreadId)
    })
  })

  describe('PUT /api/forum/replies/[id]', () => {
    it('作者可以成功更新回复', async () => {
      if (!testReplyId) {
        console.warn('⚠️ testReplyId未设置，跳过此测试')
        return
      }

      const response = await fetch(`${testApiUrl}/api/forum/replies/${testReplyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          content: '更新后的回复内容',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.content).toBe('更新后的回复内容')
    })

    it('更新的内容不能为空', async () => {
      if (!testReplyId) {
        console.warn('⚠️ testReplyId未设置，跳过此测试')
        return
      }

      const response = await fetch(`${testApiUrl}/api/forum/replies/${testReplyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          content: '',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('cannot be empty')
    })
  })

  describe('DELETE /api/forum/replies/[id]', () => {
    it('作者可以成功删除回复（软删除）', async () => {
      if (!testReplyId) {
        console.warn('⚠️ testReplyId未设置，跳过此测试')
        return
      }

      const response = await fetch(`${testApiUrl}/api/forum/replies/${testReplyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${testUserToken}`,
        },
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('deleted successfully')

      // 清空testReplyId（已删除）
      testReplyId = ''
    })
  })

  // ==================== Votes API Tests ====================

  describe('POST /api/forum/votes', () => {
    it('未登录用户不能投票', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          thread_id: testThreadId,
          vote_type: 'upvote',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Authentication required')
    })

    it('缺少thread_id和reply_id应该失败', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          vote_type: 'upvote',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Either thread_id or reply_id is required')
    })

    it('vote_type无效应该失败', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          thread_id: testThreadId,
          vote_type: 'invalid',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('upvote')
    })

    it('可以成功给帖子upvote（创建投票）', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          thread_id: testThreadId,
          vote_type: 'upvote',
        }),
      })
      const data = await response.json()

      expect([200, 201]).toContain(response.status)  // 200或201都可以
      expect(data.success).toBe(true)
      expect(data.data.action).toBe('created')
      expect(data.data.vote_type).toBe('upvote')
    })

    it('相同upvote应该取消投票（删除投票）', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          thread_id: testThreadId,
          vote_type: 'upvote',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.action).toBe('removed')
      expect(data.data.vote_type).toBeNull()
    })

    it('切换upvote到downvote（更新投票）', async () => {
      // 先upvote
      await fetch(`${testApiUrl}/api/forum/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          thread_id: testThreadId,
          vote_type: 'upvote',
        }),
      })

      // 切换到downvote
      const response = await fetch(`${testApiUrl}/api/forum/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          thread_id: testThreadId,
          vote_type: 'downvote',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.action).toBe('updated')
      expect(data.data.vote_type).toBe('downvote')
    })

    it('投票不存在的帖子应该返回404', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await fetch(`${testApiUrl}/api/forum/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          thread_id: fakeId,
          vote_type: 'upvote',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toContain('not found')
    })
  })
})
