/**
 * 蚂蚁足球 - 路由保护 (Next.js 16 proxy.ts)
 * 保护 /admin/* 和 /match/* 路由
 * 公开路由: /login /api/auth /_next/* /favicon.ico
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth", "/_next", "/favicon.ico"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p));
}

export async function proxy(request: NextRequest): Promise<Response> {
  const { pathname } = request.nextUrl;

  // 公开路由直接放行
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 保护 /admin/* 路由 (仅超级管理员)
  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get("auth_token")?.value;
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== "super_admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // 保护 /match/* 路由 (需登录)
  if (pathname.startsWith("/match")) {
    const token = request.cookies.get("auth_token")?.value;
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      const url = new URL("/login", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/match/:path*"],
};
