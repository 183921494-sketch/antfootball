"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, FileText, Wallet, Menu, X, LogOut, Home
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/partner/dashboard", label: "概览", icon: LayoutDashboard, shortLabel: "概览" },
  { href: "/partner/reports", label: "分析报告", icon: FileText, shortLabel: "报告" },
  { href: "/partner/commissions", label: "佣金记录", icon: Wallet, shortLabel: "佣金" },
];

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Don't render layout on login page
  if (pathname === "/partner/login") {
    return <>{children}</>;
  }

  const handleLogout = () => {
    document.cookie = "partner_token=; path=/; max-age=0";
    router.push("/partner/login");
  };

  return (
    <div className="min-h-screen bg-[#111]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Desktop top nav */}
      <header className="hidden md:flex items-center justify-between border-b border-[#B08D57]/20 px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🐜</span>
          <h1 className="text-lg font-bold text-[#F7F5F0]">蚂蚁足球 · 合作方后台</h1>
        </div>
        <nav className="flex items-center gap-1">
          <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-[#F7F5F0]/60 hover:text-[#F7F5F0] hover:bg-white/5 transition-colors">
            <Home className="w-4 h-4" />
            首页
          </Link>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors
                ${pathname === item.href
                  ? "text-[#B08D57] font-medium bg-[#B08D57]/10"
                  : "text-[#F7F5F0]/60 hover:text-[#F7F5F0] hover:bg-white/5"
                }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
          <div className="w-px h-6 bg-[#B08D57]/20 mx-2" />
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-[#F7F5F0]/40 hover:text-red-400 hover:bg-red-500/5 transition-colors">
            <LogOut className="w-4 h-4" />
            退出
          </button>
        </nav>
      </header>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-[#B08D57]/20 px-4 py-3 bg-[#111] safe-top">
        <button onClick={() => setMobileOpen(true)} className="touch-target flex items-center justify-center rounded-md p-2 text-[#F7F5F0]/60 hover:text-[#F7F5F0]">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg">🐜</span>
          <span className="font-bold text-[#F7F5F0] text-sm">合作方后台</span>
        </div>
        <button onClick={handleLogout} className="touch-target p-2 text-[#F7F5F0]/40 hover:text-red-400">
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Mobile slide-in drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1a1a1a] border-r border-[#B08D57]/20 transform transition-transform duration-300 md:hidden
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-[#B08D57]/20 p-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐜</span>
            <span className="font-bold text-[#F7F5F0] text-sm">蚂蚁足球</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="p-1 text-[#F7F5F0]/40 hover:text-[#F7F5F0]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[#F7F5F0]/60 hover:text-[#F7F5F0] hover:bg-white/5"
          >
            <Home className="w-4 h-4" />
            返回首页
          </Link>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors
                ${pathname === item.href
                  ? "text-[#B08D57] font-medium bg-[#B08D57]/10"
                  : "text-[#F7F5F0]/60 hover:text-[#F7F5F0] hover:bg-white/5"
                }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Page content */}
      <main className="pb-20 md:pb-6 smooth-scroll">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[#B08D57]/20 bg-[#111] safe-bottom">
        <div className="grid grid-cols-3 gap-1 px-4 py-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`touch-target flex flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[10px] transition-colors
                ${pathname === item.href
                  ? "text-[#B08D57] font-bold"
                  : "text-[#F7F5F0]/40"
                }`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.shortLabel}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
