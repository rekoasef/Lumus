import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // `manifest.webmanifest` va afuera sí o sí: el navegador lo pide para
    // decidir si la app es instalable, y el gate se lo contestaba con un 307 a
    // /login. Resultado: el manifest existía y nadie lo podía leer.
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
