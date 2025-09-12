import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Admin routes require admin or editor role
    if (pathname.startsWith('/admin')) {
      if (!token || !['ADMIN', 'EDITOR'].includes(token.role as string)) {
        return NextResponse.redirect(new URL('/', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Allow public routes
        if (
          pathname === '/' ||
          pathname.startsWith('/properties') ||
          pathname.startsWith('/agents') ||
          pathname.startsWith('/lifestyle') ||
          pathname.startsWith('/new-developments') ||
          pathname.startsWith('/about') ||
          pathname.startsWith('/contact') ||
          pathname.startsWith('/eliteview-media') ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/properties/search')
        ) {
          return true
        }

        // Admin routes require authentication
        if (pathname.startsWith('/admin')) {
          return !!token
        }

        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/admin/:path*',
  ],
}
