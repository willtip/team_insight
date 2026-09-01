import { NextResponse } from 'next/server'
import { auth } from '@/auth'

export default auth((req) => {
  const isSignedIn = !!req.auth
  const isAuthRoute = req.nextUrl.pathname.startsWith('/api/auth')
  const isSignInPage = req.nextUrl.pathname.startsWith('/sign-in')

  if (!isSignedIn && !isAuthRoute && !isSignInPage) {
    const signInUrl = new URL('/sign-in', req.nextUrl.origin)
    signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
    return NextResponse.redirect(signInUrl)
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
