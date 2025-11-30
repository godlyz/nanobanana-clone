/**
 * 🔥 老王创建：Forum Threads API 单元测试
 * 测试范围：GET + POST + PUT + DELETE
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// 测试环境配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const testApiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 测试数据
let testCategoryId: string
let testThreadId: string
let testUserToken: string
let testUserId: string

describe('Forum Threads API Tests', () => {
  // 测试前准备
  beforeAll(async () => {
    // 创建测试用户
    const { data: userData } = await supabase.auth.admin.createUser({
      email: 'thread-test@example.com',
      password: 'TestPass123!',
      email_confirm: true,
    })

    if (userData.user) {
      testUserId = userData.user.id
      const { data: sessionData } = await supabase.auth.signInWithPassword({
        email: 'thread-test@example.com',
        password: 'TestPass123!',
      })
      testUserToken = sessionData.session?.access_token || ''
    }

    // 创建测试分类
    const { data: category } = await supabase
      .from('forum_categories')
      .insert({
        name: '测试分类',
        slug: 'test-category-' + Date.now(),
      })
      .select()
      .single()

    testCategoryId = category?.id || ''
  })

  // 测试后清理
  afterAll(async () => {
    // 删除测试帖子（如果存在）
    if (testThreadId) {
      await supabase.from('forum_threads').delete().eq('id', testThreadId)
    }

    // 删除测试分类
    if (testCategoryId) {
      await supabase.from('forum_categories').delete().eq('id', testCategoryId)
    }

    // 删除测试用户
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId)
    }
  })

  describe('GET /api/forum/threads', () => {
    it('应该成功获取帖子列表（默认分页）', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/threads`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data.data)).toBe(true)
      expect(data.data.pagination).toHaveProperty('page')
      expect(data.data.pagination).toHaveProperty('limit')
      expect(data.data.pagination).toHaveProperty('total')
      expect(data.data.pagination.page).toBe(1)
      expect(data.data.pagination.limit).toBe(20)
    })

    it('应该支持自定义分页参数', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/threads?page=2&limit=10`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.pagination.page).toBe(2)
      expect(data.data.pagination.limit).toBe(10)
    })

    it('应该限制最大分页数量为100', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/threads?limit=200`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.pagination.limit).toBe(100)  // 应该被限制为100
    })

    it('应该支持按分类筛选', async () => {
      const response = await fetch(
        `${testApiUrl}/api/forum/threads?category_id=${testCategoryId}`
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('应该支持按状态筛选', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/threads?status=open`)
      const data = await response.json()

      expect(response.status).toBe(200)
      if (data.data.data.length > 0) {
        data.data.data.forEach((thread: any) => {
          expect(thread.status).toBe('open')
        })
      }
    })

    it('应该支持latest排序（默认）', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/threads?sort=latest`)
      const data = await response.json()

      expect(response.status).toBe(200)
      if (data.data.data.length > 1) {
        const thread1 = new Date(data.data.data[0].created_at)
        const thread2 = new Date(data.data.data[1].created_at)
        expect(thread1.getTime()).toBeGreaterThanOrEqual(thread2.getTime())
      }
    })

    it('应该支持unanswered排序（未回复）', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/threads?sort=unanswered`)
      const data = await response.json()

      expect(response.status).toBe(200)
      if (data.data.data.length > 0) {
        data.data.data.forEach((thread: any) => {
          expect(thread.reply_count).toBe(0)
        })
      }
    })

    it('应该支持只显示置顶帖子', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/threads?is_pinned=true`)
      const data = await response.json()

      expect(response.status).toBe(200)
      if (data.data.data.length > 0) {
        data.data.data.forEach((thread: any) => {
          expect(thread.is_pinned).toBe(true)
        })
      }
    })
  })

  describe('POST /api/forum/threads', () => {
    it('未登录用户不能创建帖子', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_id: testCategoryId,
          title: '测试帖子',
          content: '这是测试内容',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Authentication required')
    })

    it('缺少category_id应该失败', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          title: '测试帖子',
          content: '这是测试内容',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Category ID')
    })

    it('标题过短应该失败（<3字符）', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          category_id: testCategoryId,
          title: 'AB',  // 只有2个字符
          content: '这是测试内容',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('between 3 and 200 characters')
    })

    it('标题过长应该失败（>200字符）', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          category_id: testCategoryId,
          title: 'A'.repeat(201),  // 201个字符
          content: '这是测试内容',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('between 3 and 200 characters')
    })

    it('内容过短应该失败（<10字符）', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          category_id: testCategoryId,
          title: '测试帖子',
          content: '太短了',  // 只有3个字符
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('at least 10 characters')
    })

    it('登录用户可以成功创建帖子', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          category_id: testCategoryId,
          title: '测试帖子 - ' + Date.now(),
          content: '这是一个测试帖子的内容，应该足够长了。',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('id')
      expect(data.data).toHaveProperty('slug')
      expect(data.data.status).toBe('open')

      // 保存testThreadId用于后续测试
      testThreadId = data.data.id
    })

    it('相同标题应该生成不同的slug（自动添加数字后缀）', async () => {
      const sameTitle = '重复标题测试'

      // 创建第一个帖子
      const response1 = await fetch(`${testApiUrl}/api/forum/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          category_id: testCategoryId,
          title: sameTitle,
          content: '这是第一个帖子内容',
        }),
      })
      const data1 = await response1.json()
      const thread1Id = data1.data?.id
      const slug1 = data1.data?.slug

      // 创建第二个相同标题的帖子
      const response2 = await fetch(`${testApiUrl}/api/forum/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          category_id: testCategoryId,
          title: sameTitle,
          content: '这是第二个帖子内容',
        }),
      })
      const data2 = await response2.json()
      const thread2Id = data2.data?.id
      const slug2 = data2.data?.slug

      expect(slug1).not.toBe(slug2)  // slug应该不同
      expect(slug2).toContain(slug1.split('-')[0])  // slug2应该包含slug1的基础部分

      // 清理测试数据
      if (thread1Id) {
        await supabase.from('forum_threads').delete().eq('id', thread1Id)
      }
      if (thread2Id) {
        await supabase.from('forum_threads').delete().eq('id', thread2Id)
      }
    })
  })

  describe('GET /api/forum/threads/[id]', () => {
    it('应该成功获取帖子详情', async () => {
      if (!testThreadId) {
        console.warn('⚠️ testThreadId未设置，跳过此测试')
        return
      }

      const response = await fetch(`${testApiUrl}/api/forum/threads/${testThreadId}`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe(testThreadId)
      expect(data.data).toHaveProperty('category')
      expect(data.data).toHaveProperty('author')
    })

    it('获取不存在的帖子应该返回404', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await fetch(`${testApiUrl}/api/forum/threads/${fakeId}`)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toContain('not found')
    })
  })

  describe('PUT /api/forum/threads/[id]', () => {
    it('作者可以成功更新帖子', async () => {
      if (!testThreadId) {
        console.warn('⚠️ testThreadId未设置，跳过此测试')
        return
      }

      const response = await fetch(`${testApiUrl}/api/forum/threads/${testThreadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          title: '更新后的标题',
          content: '更新后的内容，应该足够长了。',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.title).toBe('更新后的标题')
      expect(data.data.content).toBe('更新后的内容，应该足够长了。')
    })

    it('更新标题应该重新生成slug', async () => {
      if (!testThreadId) {
        console.warn('⚠️ testThreadId未设置，跳过此测试')
        return
      }

      // 先获取原始slug
      const originalResponse = await fetch(`${testApiUrl}/api/forum/threads/${testThreadId}`)
      const originalData = await originalResponse.json()
      const originalSlug = originalData.data.slug

      // 更新标题
      const response = await fetch(`${testApiUrl}/api/forum/threads/${testThreadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          title: '全新的标题 ' + Date.now(),
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.slug).not.toBe(originalSlug)  // slug应该已改变
    })
  })

  describe('DELETE /api/forum/threads/[id]', () => {
    it('作者可以成功删除帖子（软删除）', async () => {
      if (!testThreadId) {
        console.warn('⚠️ testThreadId未设置，跳过此测试')
        return
      }

      const response = await fetch(`${testApiUrl}/api/forum/threads/${testThreadId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${testUserToken}`,
        },
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('deleted successfully')

      // 验证帖子已被软删除（无法再获取）
      const getResponse = await fetch(`${testApiUrl}/api/forum/threads/${testThreadId}`)
      const getData = await getResponse.json()
      expect(getResponse.status).toBe(404)

      // 清空testThreadId（已删除）
      testThreadId = ''
    })
  })
})
