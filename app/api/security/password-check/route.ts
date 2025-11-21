import { NextRequest, NextResponse } from "next/server"
import { isPasswordCompromised } from "@/lib/security/password-check"

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (typeof password !== "string" || password.length === 0) {
      return NextResponse.json({ message: "缺少密码参数" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({
        message: "密码长度至少 8 位"
      }, { status: 400 })
    }

    const compromised = await isPasswordCompromised(password)

    if (compromised) {
      return NextResponse.json({
        compromised: true,
        message: "该密码已出现在泄漏名单中，请更换"
      }, { status: 400 })
    }

    return NextResponse.json({ compromised: false })
  } catch (error) {
    console.error("❌ 密码泄漏检测失败:", error)
    return NextResponse.json({
      message: "密码安全检测暂时不可用，请稍后再试"
    }, { status: 503 })
  }
}
