// 🔥 老王注释：删除指定的API密钥
// DELETE: 删除用户的特定API密钥

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * 🔥 老王DELETE端点：删除指定的API密钥
 *
 * @param request - HTTP请求
 * @param params - URL参数，包含密钥ID
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 艹，没登录还想删密钥？门儿都没有！
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated", requiresAuth: true },
        { status: 401 }
      )
    }

    // 获取URL参数中的密钥ID
    const { id } = await params

    // 验证ID格式（应该是UUID）
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid API key ID" },
        { status: 400 }
      )
    }

    // UUID格式验证
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Invalid UUID format" },
        { status: 400 }
      )
    }

    // 🔥 老王安全检查：先查询确认这个密钥属于当前用户
    // 虽然RLS会自动处理权限，但显式检查更安全
    const { data: existingKey, error: fetchError } = await supabase
      .from("api_keys")
      .select("id, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingKey) {
      // 可能是密钥不存在，或者不属于当前用户
      return NextResponse.json(
        { error: "API key not found or access denied" },
        { status: 404 }
      )
    }

    // 删除密钥（RLS策略会再次验证权限）
    const { error: deleteError } = await supabase
      .from("api_keys")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id) // 双重保险

    if (deleteError) {
      console.error("删除API密钥失败:", deleteError)
      return NextResponse.json(
        { error: "Failed to delete API key" },
        { status: 500 }
      )
    }

    // 🔥 老王成功响应：密钥已删除
    return NextResponse.json({
      message: "API key deleted successfully",
      deleted_id: id,
    }, { status: 200 })

  } catch (error) {
    console.error("API密钥删除错误:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
