import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database.types'
import { hasAccess } from '@/lib/billing/access'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const publicPaths = ['/login', '/register', '/verify', '/forgot-password', '/reset-password']
  const isPublicPath = publicPaths.some(p => pathname.startsWith(p))
  const isApiRoute = pathname.startsWith('/api/')

  if (!user && !isPublicPath && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  const isBillingApiRoute = pathname.startsWith('/api/billing/')

  if (user && !pathname.startsWith('/onboarding')) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('onboarding_done')
      .eq('user_id', user.id)
      .single()

    if (!profile?.onboarding_done) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }

    if (profile.onboarding_done && !pathname.startsWith('/suscripcion') && !isBillingApiRoute) {
      // Suscripción activa o acceso de cortesía vigente — ver lib/billing/access
      if (!(await hasAccess(supabase, user.id))) {
        const url = request.nextUrl.clone()
        url.pathname = '/suscripcion'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
