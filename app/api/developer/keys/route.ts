// 🔥 老王注释：开发者API密钥管理路由
// GET: 获取用户的所有API密钥列表
// POST: 创建新的API密钥

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import {
  generateApiKey,
  hashApiKey,
  getApiKeyPreview,
  toApiKeyInfo,
  type ApiKeyRecord,
} from "@/lib/api-keys"

/**
 * 🔥 老王GET端点：获取用户的所有API密钥
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 艹，没登录还想看密钥？滚去登录！
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated", requiresAuth: true },
        { status: 401 }
      )
    }

    // 查询用户的所有API密钥（按创建时间倒序）
    const { data: keys, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("获取API密钥失败:", error)
      return NextResponse.json(
        { error: "Failed to fetch API keys" },
        { status: 500 }
      )
    }

    // 🔥 老王安全处理：过滤掉key_hash字段，绝不返回哈希值给客户端
    const safeKeys = (keys as ApiKeyRecord[]).map(toApiKeyInfo)

    return NextResponse.json({
      keys: safeKeys,
      count: safeKeys.length,
    })

  } catch (error) {
    console.error("API密钥查询错误:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * 🔥 老王POST端点：创建新的API密钥
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 艹，没登录还想创建密钥？门都没有！
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated", requiresAuth: true },
        { status: 401 }
      )
    }

    // 解析请求体
    const body = await request.json()
    const { name } = body

    // 验证密钥名称
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "API key name is required" },
        { status: 400 }
      )
    }

    // 名称长度限制
    if (name.length < 3 || name.length > 50) {
      return NextResponse.json(
        { error: "API key name must be between 3 and 50 characters" },
        { status: 400 }
      )
    }

    // 🔥 老王生成密钥：使用加密安全的随机数生成器
    const apiKey = generateApiKey()
    const keyHash = hashApiKey(apiKey)
    const keyPreview = getApiKeyPreview(apiKey)

    // 保存到数据库
    const { data: newKey, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: user.id,
        name: name,
        key_hash: keyHash,
        key_preview: keyPreview,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("创建API密钥失败:", error)

      // 🔥 老王错误处理：检查是否是数量限制触发的错误
      if (error.message.includes("API key limit reached")) {
        return NextResponse.json(
          { error: "Maximum 10 active API keys per user" },
          { status: 400 }
        )
      }

      // 检查是否是重复名称
      if (error.code === "23505") { // Postgres unique constraint violation
        return NextResponse.json(
          { error: "An API key with this name already exists" },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: "Failed to create API key" },
        { status: 500 }
      )
    }

    // 🔥 老王重要：只在创建时返回完整密钥！
    // 这是用户唯一能看到完整密钥的机会，必须提醒用户保存
    return NextResponse.json({
      key: {
        ...toApiKeyInfo(newKey as ApiKeyRecord),
        // 特别返回完整密钥（仅此一次）
        key: apiKey,
      },
      message: "API key created successfully. Please save this key, it will not be shown again.",
    }, { status: 201 })

  } catch (error) {
    console.error("API密钥创建错误:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
