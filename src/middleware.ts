import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, getAppPassword, isValidSession } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  if (!getAppPassword()) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (await isValidSession(token)) return NextResponse.next();

  // API calls get a 401; pages redirect to the login screen.
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const login = req.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    // Everything except the login page, Next internals, and public assets.
    "/((?!login|_next/static|_next/image|favicon\\.ico|icon\\.svg|apple-icon|manifest\\.webmanifest).*)",
  ],
};
