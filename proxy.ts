import { NextResponse, type NextRequest } from "next/server";

// A first, cookie-only look at who's asking: fans with a session go straight from the landing page to
// their diary, and anyone without one is sent to log in. Every page and action still checks the
// session itself; a cookie here proves nothing.

const hasSession = (request: NextRequest) =>
  request.cookies.has("better-auth.session_token") || request.cookies.has("__Secure-better-auth.session_token");

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/") return hasSession(request) ? NextResponse.redirect(new URL("/explore", request.url)) : NextResponse.next();
  if (hasSession(request)) return NextResponse.next();
  // Signed out, Explore opens only a match someone shared
  const m = request.nextUrl.searchParams.get("m");
  if (pathname === "/explore" && m && m !== "random") return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

// Not for the router's prefetches: a redirected prefetch fails, and the pages check the session anyway.
// Next reads this statically, so it's spelled out.
export const config = {
  matcher: [
    {
      source: "/",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    {
      // Explore opens signed out too, so a shared match's link works for anyone (the page lets a guest
      // see only that match)
      source: "/saga",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    {
      source: "/(explore|statistics|advanced)/:path*",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
