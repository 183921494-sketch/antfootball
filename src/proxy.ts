/**
 * 蚂蚁足球 - 路由保护 (Next.js 16 proxy.ts)
 * 保护 /admin/* 和 /partner/* 路由
 * 公开路由: / /reports /api/* /admin/login /partner/login
 */
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/reports", "/api/", "/admin/login", "/partner/login"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

function verifyAdminToken(token: string | undefined): boolean {
  return typeof token === "string" && token.startsWith("admin_");
}

function verifyPartnerToken(token: string | undefined): boolean {
  return typeof token === "string" && token.startsWith("partner_");
}

export async function proxy(request: NextRequest): Promise<Response> {
  const { pathname } = request.nextUrl;

  // 公开路由直接放行
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 保护 /admin/* 路由（排除 /admin/login）
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token =
      request.cookies.get("admin_token")?.value ||
      request.headers.get("x-admin-token") || undefined;

    if (!verifyAdminToken(token)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // 注入 header 让后续 API 路由可以验证
    const response = NextResponse.next();
    if (token) response.headers.set("x-admin-token", token);
    return response;
  }

  // 保护 /partner/* 路由（排除 /partner/login）
  if (pathname.startsWith("/partner") && pathname !== "/partner/login") {
    const token =
      request.cookies.get("partner_token")?.value ||
      request.headers.get("x-partner-token") || undefined;

    if (!verifyPartnerToken(token)) {
      return NextResponse.redirect(new URL("/partner/login", request.url));
    }

    const response = NextResponse.next();
    if (token) response.headers.set("x-partner-token", token);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/partner/:path*"],
};