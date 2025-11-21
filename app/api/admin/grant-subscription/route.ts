/**
 * 🔥 老王的管理员API：开通订阅
 * POST /api/admin/grant-subscription
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { withRBAC, AdminAction, logAdminAction } from "@/lib/admin-auth"
import type { User } from "@supabase/supabase-js"

const DEFAULT_PLAN = "pro"
const DEFAULT_MONTHS = 12
const MAX_MONTHS = 36

interface GrantSubscriptionPayload {
  userId?: string
  plan?: string
  months?: number
}

async function resolveAdminActor(req: NextRequest, supabase: ReturnType<typeof createServiceClient>): Promise<User | null> {
  try {
    const token = req.cookies.get("admin-access-token")?.value
    if (!token) {
      return null
    }

    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      return null
    }

    return data.user
  } catch (error) {
    console.error("❌ 获取管理员身份失败:", error)
    return null
  }
}

function validatePayload(payload: GrantSubscriptionPayload) {
  const errors: string[] = []
  const plan = (payload.plan ?? DEFAULT_PLAN).toString().trim()
  const rawMonths = payload.months ?? DEFAULT_MONTHS
  const months = Number.parseInt(String(rawMonths), 10)

  if (!plan) {
    errors.push("plan 不能为空")
  }

  if (!Number.isInteger(months) || months <= 0) {
    errors.push("months 必须为正整数")
  } else if (months > MAX_MONTHS) {
    errors.push(`months 不能超过 ${MAX_MONTHS}`)
  }

  return {
    plan,
    months,
    errors,
  }
}

async function handlePost(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    const adminUser = await resolveAdminActor(req, supabase)

    const payload = (await req.json()) as GrantSubscriptionPayload
    const { plan, months, errors } = validatePayload(payload)

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: "参数校验失败",
        details: errors.join("；"),
      }, { status: 400 })
    }

    const targetUserId = (payload.userId ?? adminUser?.id)?.trim()

    if (!targetUserId) {
      return NextResponse.json({
        success: false,
        error: "缺少 userId",
        details: "请提供需要开通订阅的用户ID",
      }, { status: 400 })
    }

    const { data: userLookup, error: userLookupError } = await supabase.auth.admin.getUserById(targetUserId)

    if (userLookupError || !userLookup.user) {
      console.error("❌ 目标用户不存在:", userLookupError?.message)
      return NextResponse.json({
        success: false,
        error: "目标用户不存在",
      }, { status: 404 })
    }

    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setMonth(expiresAt.getMonth() + months)

    const { data: existingSubs, error: fetchSubError } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(1)

    if (fetchSubError) {
      console.error("❌ 查询订阅失败:", fetchSubError)
      return NextResponse.json({
        success: false,
        error: "查询订阅失败",
      }, { status: 500 })
    }

    const latestSubscription = existingSubs?.[0] ?? null
    const interval = months === 12 ? "yearly" : "monthly"

    let result

    if (latestSubscription) {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .update({
          plan,
          status: "active",
          expires_at: expiresAt.toISOString(),
          interval,
          updated_at: now.toISOString(),
        })
        .eq("id", latestSubscription.id)
        .select()

      if (error) {
        console.error("❌ 更新订阅失败:", error)
        return NextResponse.json({
          success: false,
          error: "更新订阅失败",
        }, { status: 500 })
      }

      result = {
        action: "update",
        record: data?.[0] ?? null,
      }
    } else {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .insert({
          user_id: targetUserId,
          plan,
          status: "active",
          expires_at: expiresAt.toISOString(),
          interval,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .select()

      if (error) {
        console.error("❌ 创建订阅失败:", error)
        return NextResponse.json({
          success: false,
          error: "创建订阅失败",
        }, { status: 500 })
      }

      result = {
        action: "create",
        record: data?.[0] ?? null,
      }
    }

    if (adminUser && result.record) {
      await logAdminAction({
        adminId: adminUser.id,
        action: AdminAction.USER_WRITE,
        resourceType: "subscription",
        resourceId: result.record.id,
        newValues: {
          user_id: targetUserId,
          plan,
          interval,
          expires_at: expiresAt.toISOString(),
          status: "active",
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: result.action === "update" ? "订阅已更新" : "订阅已创建",
      subscription: result.record,
    })
  } catch (error) {
    console.error("💥 订阅开通失败:", error)
    return NextResponse.json({
      success: false,
      error: "服务器异常",
      details: error instanceof Error ? error.message : "未知错误",
    }, { status: 500 })
  }
}

export const POST = withRBAC(AdminAction.USER_WRITE)(handlePost)
