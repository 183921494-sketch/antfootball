"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Trophy, CalendarDays, FileText, Handshake, Wallet,
  Settings, Menu, X, LogOut, Home, LayoutDashboard
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "概览", icon: LayoutDashboard, shortLabel: "概览" },
  { href: "/admin/teams", label: "球队管理", icon: Trophy, shortLabel: "球队" },
  { href: "/admin/matches", label: "比赛管理", icon: CalendarDays, shortLabel: "比赛" },
  { href: "/admin/reports", label: "报告管理", icon: FileText, shortLabel: "报告" },
  { href: "/admin/partners", label: "合作方管理", icon: Handshake, shortLabel: "合作" },
  { href: "/admin/commissions", label: "佣金管理", icon: Wallet, shortLabel: "佣金" },
  { href: "/admin/config", label: "系统配置", icon: Settings, shortLabel: "配置" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<{ name?: string; email?: string }>({});

  useEffect(() => {
    const token = sessionStorage.getItem("admin_token");
    if (!token && pathname !== "/admin/login") {
      router.push("/admin/login");
      return;
    }
    try {
      setAdminUser(JSON.parse(sessionStorage.getItem("admin_user") || "{}"));
    } catch { /* ignore */ }
  }, [pathname, router]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_user");
    router.push("/admin/login");
  };

  // Don't render layout on login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex flex-col border-r border-border bg-card sidebar-transition
        ${collapsed ? "w-16" : "w-60"}`}
      >
        <SidebarContent
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          adminUser={adminUser}
          handleLogout={handleLogout}
          pathname={pathname}
        />
      </aside>

      {/* Sidebar - Mobile (slide-in) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transform transition-transform duration-300 md:hidden
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <SidebarContent
          collapsed={false}
          setCollapsed={() => {}}
          adminUser={adminUser}
          handleLogout={handleLogout}
          pathname={pathname}
          onCloseMobile={() => setMobileOpen(false)}
        />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 safe-top">
          <button
            onClick={() => setMobileOpen(true)}
            className="touch-target flex items-center justify-center rounded-md p-2 hover:bg-accent"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">🐜</span>
            <span className="font-bold">蚂蚁足球</span>
          </div>
          <div className="w-9" /> {/* Spacer for centering */}
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 smooth-scroll overflow-y-auto">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden sticky bottom-0 z-30 border-t border-border bg-card safe-bottom">
          <div className="grid grid-cols-5 gap-1 px-2 py-1">
            {NAV_ITEMS.slice(0, 5).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`touch-target flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[10px] transition-colors
                  ${pathname === item.href
                    ? "text-primary font-bold bg-primary/5"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.shortLabel}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

function SidebarContent({
  collapsed,
  setCollapsed,
  adminUser,
  handleLogout,
  pathname,
  onCloseMobile,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  adminUser: { name?: string; email?: string };
  handleLogout: () => void;
  pathname: string;
  onCloseMobile?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo / Title */}
      <div className="flex items-center justify-between border-b border-border p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-xl">🐜</span>
            <div>
              <h2 className="font-bold text-sm">蚂蚁足球</h2>
              <p className="text-[10px] text-muted-foreground">后台管理</p>
            </div>
          </div>
        )}
        {collapsed && <span className="text-xl mx-auto">🐜</span>}
        {onCloseMobile ? (
          <button onClick={onCloseMobile} className="rounded-md p-1 hover:bg-accent md:hidden">
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:block rounded-md p-1 hover:bg-accent"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        <Link
          href="/"
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors
            ${collapsed ? "justify-center" : ""} hover:bg-accent`}
        >
          <Home className="w-4 h-4 shrink-0" />
          {!collapsed && <span>返回首页</span>}
        </Link>

        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onCloseMobile}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors
              ${collapsed ? "justify-center" : ""}
              ${pathname === item.href
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-accent text-foreground/80"
              }`}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* User info & logout */}
      <div className="border-t border-border p-3">
        {!collapsed && (
          <div className="mb-2 px-1">
            <div className="text-xs font-medium truncate">{adminUser.name || "管理员"}</div>
            <div className="text-[10px] text-muted-foreground truncate">{adminUser.email}</div>
          </div>
        )}
        <Button
          variant="outline"
          size={collapsed ? "icon" : "sm"}
          onClick={handleLogout}
          className="w-full"
        >
          {collapsed ? <LogOut className="w-4 h-4" /> : "退出登录"}
        </Button>
      </div>
    </div>
  );
}
