import { NextRequest, NextResponse } from "next/server"
import { roleHome, verifySessionToken, SESSION_COOKIE } from "@/lib/session"

const PROTECTED_PREFIXES = ["/member", "/mentor", "/admin", "/change-password"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === "/login") {
    const token = request.cookies.get(SESSION_COOKIE)?.value
    const session = token ? await verifySessionToken(token) : null
    if (session) {
      const url = request.nextUrl.clone()
      url.pathname = session.mustChangePassword ? "/change-password" : roleHome(session.role)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  if (!PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (session.mustChangePassword && pathname !== "/change-password") {
    const url = request.nextUrl.clone()
    url.pathname = "/change-password"
    return NextResponse.redirect(url)
  }

  const home = roleHome(session.role)
  if (!session.mustChangePassword && pathname.startsWith(home) === false && pathname !== "/change-password") {
    const url = request.nextUrl.clone()
    url.pathname = home
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/login", "/member/:path*", "/mentor/:path*", "/admin/:path*", "/change-password"],
}
