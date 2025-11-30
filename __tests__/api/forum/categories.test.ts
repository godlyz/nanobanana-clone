/**
 * 🔥 老王创建：Forum Categories API 单元测试
 * 测试范围：GET + POST + PUT + DELETE
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// 测试环境配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const testApiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// 创建Supabase客户端（使用Service Role Key绕过RLS）
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 测试数据
let testCategoryId: string
let testAdminToken: string
let testUserToken: string

describe('Forum Categories API Tests', () => {
  // 测试前准备：创建测试用户和管理员
  beforeAll(async () => {
    // 创建管理员账号（用于测试管理员权限）
    const { data: adminData } = await supabase.auth.admin.createUser({
      email: 'admin-test@example.com',
      password: 'TestPass123!',
      email_confirm: true,
    })

    if (adminData.user) {
      // 设置管理员角色
      await supabase
        .from('user_profiles')
        .update({ role: 'admin' })
        .eq('user_id', adminData.user.id)

      // 获取管理员token
      const { data: sessionData } = await supabase.auth.signInWithPassword({
        email: 'admin-test@example.com',
        password: 'TestPass123!',
      })
      testAdminToken = sessionData.session?.access_token || ''
    }

    // 创建普通用户账号（用于测试权限限制）
    const { data: userData } = await supabase.auth.admin.createUser({
      email: 'user-test@example.com',
      password: 'TestPass123!',
      email_confirm: true,
    })

    if (userData.user) {
      // 获取普通用户token
      const { data: sessionData } = await supabase.auth.signInWithPassword({
        email: 'user-test@example.com',
        password: 'TestPass123!',
      })
      testUserToken = sessionData.session?.access_token || ''
    }
  })

  // 测试后清理：删除测试数据
  afterAll(async () => {
    // 删除测试分类（如果存在）
    if (testCategoryId) {
      await supabase.from('forum_categories').delete().eq('id', testCategoryId)
    }

    // 删除测试用户
    const { data: users } = await supabase.auth.admin.listUsers()
    const testUsers = users.users.filter((u) =>
      u.email?.includes('test@example.com')
    )
    for (const user of testUsers) {
      await supabase.auth.admin.deleteUser(user.id)
    }
  })

  describe('GET /api/forum/categories', () => {
    it('应该成功获取可见分类列表', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/categories`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)

      // 验证返回的分类包含必要字段
      if (data.data.length > 0) {
        const category = data.data[0]
        expect(category).toHaveProperty('id')
        expect(category).toHaveProperty('name')
        expect(category).toHaveProperty('slug')
        expect(category).toHaveProperty('is_visible')
        expect(category.is_visible).toBe(true)  // 默认只返回可见分类
      }
    })

    it('非管理员不能查看隐藏分类', async () => {
      const response = await fetch(
        `${testApiUrl}/api/forum/categories?include_hidden=true`,
        {
          headers: {
            Authorization: `Bearer ${testUserToken}`,
          },
        }
      )
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toContain('admin')
    })

    it('管理员可以查看隐藏分类', async () => {
      const response = await fetch(
        `${testApiUrl}/api/forum/categories?include_hidden=true`,
        {
          headers: {
            Authorization: `Bearer ${testAdminToken}`,
          },
        }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('POST /api/forum/categories', () => {
    it('未登录用户不能创建分类', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: '测试分类',
          slug: 'test-category',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Authentication required')
    })

    it('普通用户不能创建分类', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          name: '测试分类',
          slug: 'test-category',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Admin permission required')
    })

    it('管理员可以成功创建分类', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testAdminToken}`,
        },
        body: JSON.stringify({
          name: '测试分类',
          name_en: 'Test Category',
          slug: 'test-category-' + Date.now(),
          description: '这是一个测试分类',
          icon: '🧪',
          color: '#FF5733',
          sort_order: 99,
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('id')
      expect(data.data.name).toBe('测试分类')
      expect(data.data.slug).toContain('test-category')

      // 保存testCategoryId用于后续测试
      testCategoryId = data.data.id
    })

    it('缺少必填字段应该失败', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testAdminToken}`,
        },
        body: JSON.stringify({
          name: '测试分类',
          // 缺少slug
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('slug')
    })

    it('slug格式不正确应该失败', async () => {
      const response = await fetch(`${testApiUrl}/api/forum/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testAdminToken}`,
        },
        body: JSON.stringify({
          name: '测试分类',
          slug: 'Test Category!@#',  // 包含非法字符
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('lowercase letters, numbers, and hyphens')
    })
  })

  describe('GET /api/forum/categories/[id]', () => {
    it('应该成功获取单个分类详情', async () => {
      if (!testCategoryId) {
        console.warn('⚠️ testCategoryId未设置，跳过此测试')
        return
      }

      const response = await fetch(`${testApiUrl}/api/forum/categories/${testCategoryId}`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe(testCategoryId)
    })

    it('获取不存在的分类应该返回404', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await fetch(`${testApiUrl}/api/forum/categories/${fakeId}`)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toContain('not found')
    })
  })

  describe('PUT /api/forum/categories/[id]', () => {
    it('普通用户不能更新分类', async () => {
      if (!testCategoryId) {
        console.warn('⚠️ testCategoryId未设置，跳过此测试')
        return
      }

      const response = await fetch(`${testApiUrl}/api/forum/categories/${testCategoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          name: '更新后的分类名',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Admin permission required')
    })

    it('管理员可以成功更新分类', async () => {
      if (!testCategoryId) {
        console.warn('⚠️ testCategoryId未设置，跳过此测试')
        return
      }

      const response = await fetch(`${testApiUrl}/api/forum/categories/${testCategoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testAdminToken}`,
        },
        body: JSON.stringify({
          name: '更新后的测试分类',
          description: '更新后的描述',
        }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.name).toBe('更新后的测试分类')
      expect(data.data.description).toBe('更新后的描述')
    })
  })

  describe('DELETE /api/forum/categories/[id]', () => {
    it('普通用户不能删除分类', async () => {
      if (!testCategoryId) {
        console.warn('⚠️ testCategoryId未设置，跳过此测试')
        return
      }

      const response = await fetch(`${testApiUrl}/api/forum/categories/${testCategoryId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${testUserToken}`,
        },
      })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Admin permission required')
    })

    it('管理员可以成功删除分类（无帖子）', async () => {
      if (!testCategoryId) {
        console.warn('⚠️ testCategoryId未设置，跳过此测试')
        return
      }

      const response = await fetch(`${testApiUrl}/api/forum/categories/${testCategoryId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${testAdminToken}`,
        },
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('deleted successfully')

      // 清空testCategoryId（已删除）
      testCategoryId = ''
    })
  })
})
