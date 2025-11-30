import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { randomBytes, randomUUID, createHash } from "crypto"

const maskKey = (value: string) => {
  if (!value || value.length <= 8) {
    return value || "••••"
  }
  return `${value.substring(0, 4)}••••${value.substring(value.length - 4)}`
}

export async function GET() {
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

    // 🔥 老王修复：使用新的数据库字段名（is_active, last_used_at, key_preview）
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, name, is_active, created_at, last_used_at, key_hash, key_preview")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ 获取 API Keys 失败:", error)
      return NextResponse.json({
        success: false,
        error: "Failed to fetch API keys"
      }, { status: 500 })
    }

    const apiKeys = (data || []).map(record => ({
      id: record.id,
      name: record.name,
      status: record.is_active ? "active" : "inactive", // 映射 is_active → status
      createdAt: record.created_at,
      lastUsed: record.last_used_at, // 使用 last_used_at
      maskedKey: maskKey(record.key_preview ?? record.key_hash ?? record.id), // 使用 key_preview
      maskSource: record.key_preview ?? record.key_hash ?? record.id,
      keyPrefix: record.key_preview ?? null // 使用 key_preview
    }))

    return NextResponse.json({ apiKeys })
  } catch (error) {
    console.error("❌ API Keys GET 异常:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
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
    const name = typeof body.name === "string" && body.name.trim().length > 0
      ? body.name.trim()
      : "API Key"

    const rawKey = `nb_${randomBytes(24).toString("hex")}`
    const keyPrefix = rawKey.substring(0, 8)
    const keyHash = createHash("sha256").update(rawKey).digest("hex")

    // 🔥 老王修复：使用新的数据库字段名（is_active, key_preview）
    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        id: randomUUID(),
        user_id: user.id,
        name,
        key_hash: keyHash,
        key_preview: keyPrefix, // 使用 key_preview 而非 key_prefix
        is_active: true // 使用 is_active 而非 status
      })
      .select("id, name, is_active, created_at, last_used_at, key_hash, key_preview") // 修正字段名
      .single()

    if (error || !data) {
      console.error("❌ 创建 API Key 失败:", error)
      return NextResponse.json({
        success: false,
        error: "Failed to create API key"
      }, { status: 500 })
    }

    return NextResponse.json({
      apiKey: {
        id: data.id,
        name: data.name,
        status: data.is_active ? "active" : "inactive", // 映射 is_active → status
        createdAt: data.created_at,
        lastUsed: data.last_used_at, // 使用 last_used_at
        maskedKey: maskKey(rawKey),
        maskSource: rawKey,
        keyPrefix: data.key_preview ?? keyPrefix, // 使用 key_preview
        secret: rawKey
      }
    }, { status: 201 })
  } catch (error) {
    console.error("❌ API Keys POST 异常:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}
