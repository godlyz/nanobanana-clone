import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { randomBytes, createHash } from "crypto"

// 🔥 老王 Day 3 修复：Next.js 16 要求 params 是 Promise
interface RouteParams {
  params: Promise<{
    id: string
  }>
}

const maskKey = (value: string) => {
  if (!value || value.length <= 8) {
    return value || "••••"
  }
  return `${value.substring(0, 4)}••••${value.substring(value.length - 4)}`
}

export async function POST(_request: Request, { params }: RouteParams) {
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

    const newKey = `nb_${randomBytes(24).toString("hex")}`
    const keyPrefix = newKey.substring(0, 8)
    const keyHash = createHash("sha256").update(newKey).digest("hex")

    const { data, error } = await supabase
      .from("api_keys")
      .update({
        key_hash: keyHash,
        key_prefix: keyPrefix,
        status: "active",
        last_used: null
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, name, status, created_at, last_used, key_prefix")
      .single()

    if (error) {
      console.error("❌ 重新生成 API Key 失败:", error)
      return NextResponse.json({
        success: false,
        error: "Failed to rotate API key"
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
        maskedKey: maskKey(keyPrefix),
        maskSource: keyPrefix,
        keyPrefix,
        secret: newKey
      }
    })
  } catch (error) {
    console.error("❌ API Keys rotate 异常:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}
