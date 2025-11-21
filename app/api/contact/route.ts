/**
 * 🔥 老王的联系方式 API
 * 用途: 公开接口，返回客服和销售团队的联系方式
 * 老王提醒: 这个接口不需要认证，任何人都可以访问！
 */

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // 获取法律设置中的联系方式字段
    const { data, error } = await supabase
      .from("legal_settings")
      .select(
        `
        contact_phone,
        contact_qq,
        contact_wechat,
        contact_telegram,
        contact_email,
        sales_phone,
        sales_qq,
        sales_wechat,
        sales_telegram,
        sales_email
      `
      )
      .single()

    if (error) {
      console.error("❌ 获取联系方式失败:", error)
      // 返回默认联系方式（防止页面报错）
      return NextResponse.json(
        {
          support: {
            phone: "+86 xxx-xxxx-xxxx",
            qq: "12345678",
            wechat: "nanobanana_service",
            telegram: "@nanobanana_support",
            email: "support@nanobanana.ai",
          },
          sales: {
            phone: "+86 xxx-xxxx-xxxx",
            qq: "87654321",
            wechat: "nanobanana_sales",
            telegram: "@nanobanana_sales",
            email: "sales@nanobanana.ai",
          },
        },
        { status: 200 }
      )
    }

    // 返回结构化的联系方式数据
    return NextResponse.json(
      {
        support: {
          phone: data.contact_phone,
          qq: data.contact_qq,
          wechat: data.contact_wechat,
          telegram: data.contact_telegram,
          email: data.contact_email,
        },
        sales: {
          phone: data.sales_phone,
          qq: data.sales_qq,
          wechat: data.sales_wechat,
          telegram: data.sales_telegram,
          email: data.sales_email,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("❌ GET contact info error:", error)
    // 返回默认联系方式（防止页面报错）
    return NextResponse.json(
      {
        support: {
          phone: "+86 xxx-xxxx-xxxx",
          qq: "12345678",
          wechat: "nanobanana_service",
          telegram: "@nanobanana_support",
          email: "support@nanobanana.ai",
        },
        sales: {
          phone: "+86 xxx-xxxx-xxxx",
          qq: "87654321",
          wechat: "nanobanana_sales",
          telegram: "@nanobanana_sales",
          email: "sales@nanobanana.ai",
        },
      },
      { status: 200 }
    )
  }
}
