import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { createSession, verifySession } from "@/lib/session-manager"
import { getClientIp } from "@/lib/request-ip"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user || !data.user.email) {
      return NextResponse.json({ message: "未登录" }, { status: 401 })
    }

    const user = data.user
    const clientIp = getClientIp(request.headers)
    const userAgent = request.headers.get("user-agent") || undefined

    const serviceClient = createServiceClient()
    const { data: identities } = await serviceClient
      .from('auth.identities')
      .select('provider')
      .eq('user_id', user.id)

    const hasPasswordIdentity = identities?.some(identity => identity.provider === 'email') ?? false

    const { data: existingSessions } = await serviceClient
      .from("user_sessions")
      .select("session_token")
      .eq("user_id", user.id)
      .order("expires_at", { ascending: false })
      .limit(1)

    let sessionToken: string | null = null
    let expiresAt: Date | null = null
    let hasPassword = hasPasswordIdentity

    if (existingSessions && existingSessions.length > 0) {
      const verifyResult = await verifySession(existingSessions[0].session_token, clientIp)
      if (verifyResult.valid && verifyResult.session) {
        sessionToken = verifyResult.session.sessionToken
        expiresAt = verifyResult.session.expiresAt
        hasPassword = verifyResult.session.hasPassword
      }
    }

    if (!sessionToken) {
      const session = await createSession(user.id, user.email || '', clientIp, userAgent, hasPasswordIdentity)
      if (!session) {
        return NextResponse.json({ message: "创建会话失败" }, { status: 500 })
      }
      sessionToken = session.sessionToken
      expiresAt = session.expiresAt
      hasPassword = session.hasPassword
    }

    return NextResponse.json({
      session: {
        token: sessionToken,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        hasPassword
      },
      user: {
        id: user.id,
        email: user.email,
        username: user.user_metadata?.username || (user.email ? user.email.split("@")[0] : "")
      }
    })
  } catch (error) {
    console.error("❌ 获取会话失败:", error)
    return NextResponse.json({ message: "服务器错误" }, { status: 500 })
  }
}
