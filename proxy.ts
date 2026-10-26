import { NextResponse, type NextRequest } from "next/server";

// Every page is open to anyone. A fan with a session who comes to the site from outside it (a typed
// address, a bookmark) skips the home page and goes straight to Explore; the logo, clicked from inside
// the site, still opens home. Starring and the saga check the session themselves; a cookie here proves
// nothing.

const hasSession = (request: NextRequest) =>
  request.cookies.has("better-auth.session_token") || request.cookies.has("__Secure-better-auth.session_token");

const fromInside = (request: NextRequest) => {
  const referer = request.headers.get("referer");
  try {
    return !!referer && new URL(referer).host === request.nextUrl.host;
  } catch {
    return false;
  }
};

export function proxy(request: NextRequest) {
  if (hasSession(request) && !fromInside(request)) return NextResponse.redirect(new URL("/explore", request.url));
  return NextResponse.next();
}

// Not for the router's prefetches: a redirected prefetch fails. Next reads this statically, so it's
// spelled out.
export const config = {
  matcher: [
    {
      source: "/",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
