import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { provider = 'github' } = body as { provider?: 'github' | 'google' }

    const supabase = await createClient()

    // Compute safe redirect base: prefer env, fallback to request origin
    const { origin } = new URL(request.url)
    let siteBase = origin
    try {
      const envSite = process.env.NEXT_PUBLIC_SITE_URL
      if (envSite) {
        const u = new URL(envSite)
        siteBase = u.origin
      }
    } catch {
      // ignore invalid env URL
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${siteBase}/auth/callback`,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ url: data.url, redirectToUsed: `${siteBase}/auth/callback` })
  } catch (error) {
    console.error('Login route error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to initiate login'
      },
      { status: 500 }
    )
  }
}
