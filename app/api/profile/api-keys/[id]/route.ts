import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// 🔥 老王 Day 3 修复：Next.js 16 要求 params 是 Promise
interface RouteParams {
  params: Promise<{
    id: string
  }>
}

const maskKey = (value: string | null) => {
  if (!value || value.length <= 8) {
    return value || "••••"
  }
  return `${value.substring(0, 4)}••••${value.substring(value.length - 4)}`
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  // 🔥 老王修复：await params 解构参数
  const { id } = await params

  if (!id) {
    return NextResponse.json({
      success: false,
      error: "Missing API key id"
    }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: "Not authenticated"
      }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("api_keys")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")

    if (error) {
      console.error("❌ 删除 API Key 失败:", error)
      return NextResponse.json({
        success: false,
        error: "Failed to delete API key"
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        error: "API key not found"
      }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("❌ API Keys DELETE 异常:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  // 🔥 老王修复：await params 解构参数
  const { id } = await params

  if (!id) {
    return NextResponse.json({
      success: false,
      error: "Missing API key id"
    }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: "Not authenticated"
      }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const status = typeof body.status === "string" ? body.status : null

    if (!status || !["active", "inactive"].includes(status)) {
      return NextResponse.json({
        success: false,
        error: "Invalid status"
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("api_keys")
      .update({ status })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, name, status, created_at, last_used, key_prefix")
      .single()

    if (error) {
      console.error("❌ 更新 API Key 状态失败:", error)
      return NextResponse.json({
        success: false,
        error: "Failed to update API key"
      }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({
        success: false,
        error: "API key not found"
      }, { status: 404 })
    }

    return NextResponse.json({
      apiKey: {
        id: data.id,
        name: data.name,
        status: data.status,
        createdAt: data.created_at,
        lastUsed: data.last_used,
        maskedKey: maskKey(data.key_prefix ?? null),
        maskSource: data.key_prefix ?? null,
        keyPrefix: data.key_prefix ?? null
      }
    })
  } catch (error) {
    console.error("❌ API Keys PATCH 异常:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}
