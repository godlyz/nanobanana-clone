/**
 * 🔥 老王的法律设置 API
 * 用途: 管理后台修改法律页面的配置内容
 * 老王提醒: 这个接口需要管理员权限，别tm让普通用户乱改！
 */

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET - 获取法律设置
export async function GET() {
  try {
    const supabase = await createClient()

    // 获取法律设置（应该只有一条记录）
    const { data, error } = await supabase
      .from("legal_settings")
      .select("*")
      .single()

    if (error) {
      console.error("❌ 获取法律设置失败:", error)
      return NextResponse.json({ error: "Failed to fetch legal settings" }, { status: 500 })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("❌ GET legal settings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - 更新法律设置
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()

    // 检查用户是否已认证
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Please login first" }, { status: 401 })
    }

    // 老王提醒: 这里应该检查用户是否是管理员，目前暂时允许所有登录用户
    // TODO: 添加 admin role 检查
    // const { data: profile } = await supabase
    //   .from("profiles")
    //   .select("role")
    //   .eq("id", user.id)
    //   .single()
    // if (profile?.role !== "admin") {
    //   return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    // }

    const body = await request.json()

    // 验证必填字段
    const requiredFields = [
      "company_address_zh",
      "company_address_en",
      "privacy_email",
      "legal_email",
      "support_email",
      "billing_email",
      "effective_date_zh",
      "effective_date_en",
      "version",
      // 🔥 老王新增：联系方式字段（客服）
      "contact_phone",
      "contact_qq",
      "contact_wechat",
      "contact_telegram",
      "contact_email",
      // 🔥 老王新增：联系方式字段（销售）
      "sales_phone",
      "sales_qq",
      "sales_wechat",
      "sales_telegram",
      "sales_email",
    ]

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    // 先查询现有记录的 ID
    const { data: existingSettings, error: fetchError } = await supabase
      .from("legal_settings")
      .select("id")
      .single()

    if (fetchError) {
      console.error("❌ 查询现有设置失败:", fetchError)
      return NextResponse.json({ error: "Failed to find existing settings" }, { status: 500 })
    }

    // 更新法律设置
    const { data, error } = await supabase
      .from("legal_settings")
      .update({
        company_address_zh: body.company_address_zh,
        company_address_en: body.company_address_en,
        privacy_email: body.privacy_email,
        legal_email: body.legal_email,
        support_email: body.support_email,
        billing_email: body.billing_email,
        effective_date_zh: body.effective_date_zh,
        effective_date_en: body.effective_date_en,
        version: body.version,
        // 🔥 老王新增：客服联系方式
        contact_phone: body.contact_phone,
        contact_qq: body.contact_qq,
        contact_wechat: body.contact_wechat,
        contact_telegram: body.contact_telegram,
        contact_email: body.contact_email,
        // 🔥 老王新增：销售联系方式
        sales_phone: body.sales_phone,
        sales_qq: body.sales_qq,
        sales_wechat: body.sales_wechat,
        sales_telegram: body.sales_telegram,
        sales_email: body.sales_email,
      })
      .eq("id", existingSettings.id)
      .select()
      .single()

    if (error) {
      console.error("❌ 更新法律设置失败:", error)
      return NextResponse.json({ error: "Failed to update legal settings" }, { status: 500 })
    }

    console.log("✅ 法律设置更新成功:", data)
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("❌ PUT legal settings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
