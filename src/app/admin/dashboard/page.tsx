"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Trophy, CalendarDays, TrendingUp,
  Handshake, FileText, Wallet, BarChart3, Settings
} from "lucide-react";

const QUICK_NAV = [
  { href: "/admin/teams", label: "球队管理", icon: Trophy, desc: "查看/编辑MSI评分", color: "text-blue-500" },
  { href: "/admin/matches", label: "比赛管理", icon: CalendarDays, desc: "赛程与状态管理", color: "text-green-500" },
  { href: "/admin/reports", label: "报告管理", icon: FileText, desc: "生成/临场修正报告", color: "text-purple-500" },
  { href: "/admin/partners", label: "合作方管理", icon: Handshake, desc: "彩票店与平台管理", color: "text-orange-500" },
  { href: "/admin/commissions", label: "佣金管理", icon: Wallet, desc: "结算与分佣记录", color: "text-amber-500" },
  { href: "/admin/config", label: "系统配置", icon: Settings, desc: "佣金比例与模型权重", color: "text-slate-500" },
];

interface Stats {
  totalTeams: number;
  totalMatches: number;
  totalPartners: number;
  totalCommissions: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalTeams: 0,
    totalMatches: 0,
    totalPartners: 0,
    totalCommissions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [teamsRes, matchesRes, partnersRes] = await Promise.all([
          fetch("/api/teams?limit=1"),
          fetch("/api/matches?limit=1"),
          fetch("/api/partners"),
        ]);

        const [teamsData, matchesData, partnersData] = await Promise.all([
          teamsRes.json(),
          matchesRes.json(),
          partnersRes.json(),
        ]);

        setStats({
          totalTeams: teamsData.pagination?.total || 0,
          totalMatches: matchesData.pagination?.total || 0,
          totalPartners: partnersData.pagination?.total || 0,
          totalCommissions: 0,
        });
      } catch (err) {
        console.error("获取统计数据失败:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const adminUser = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("admin_user") || "{}");
    } catch {
      return {};
    }
  })();

  return (
    <div>
      {/* Welcome header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold">管理后台概览</h1>
        <p className="text-sm text-muted-foreground">
          欢迎回来，{adminUser.name || "管理员"}
        </p>
      </div>

      {/* Stat cards - responsive grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <StatCard
          title="球队总数"
          value={stats.totalTeams}
          subtitle="2026参赛队"
          icon={<Trophy className="w-4 h-4 text-muted-foreground" />}
          loading={loading}
        />
        <StatCard
          title="比赛总数"
          value={stats.totalMatches}
          subtitle="小组赛+淘汰赛"
          icon={<CalendarDays className="w-4 h-4 text-muted-foreground" />}
          loading={loading}
        />
        <StatCard
          title="合作方"
          value={stats.totalPartners}
          subtitle="彩票店+平台"
          icon={<Handshake className="w-4 h-4 text-muted-foreground" />}
          loading={loading}
        />
        <StatCard
          title="累计佣金"
          value={`¥${stats.totalCommissions.toLocaleString()}`}
          subtitle="已结算金额"
          icon={<TrendingUp className="w-4 h-4 text-muted-foreground" />}
          loading={loading}
        />
      </div>

      {/* Quick nav - responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {QUICK_NAV.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer active:scale-[0.98]">
              <CardHeader className="flex flex-row items-center gap-3 p-4">
                <div className={`${item.color}`}>
                  <item.icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm md:text-base">{item.label}</CardTitle>
                  <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                </div>
                <BarChart3 className="w-4 h-4 ml-auto text-muted-foreground/30 shrink-0" />
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  title, value, subtitle, icon, loading
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 pb-2">
        <CardTitle className="text-xs md:text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {loading ? (
          <div className="h-7 w-16 skeleton rounded" />
        ) : (
          <div className="text-2xl md:text-3xl font-bold">{value}</div>
        )}
        <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
