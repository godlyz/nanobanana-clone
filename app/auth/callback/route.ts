import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Prefer configured site URL; fallback to request origin
      const envSite = process.env.NEXT_PUBLIC_SITE_URL
      let siteBase = origin
      try {
        if (envSite) {
          const u = new URL(envSite)
          siteBase = u.origin
        }
      } catch {
        // ignore invalid env URL, keep origin
      }

      // Do NOT trust x-forwarded-host; always use configured site base (or origin fallback)
      return NextResponse.redirect(`${siteBase}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
