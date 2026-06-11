"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Wallet, TrendingUp, Bell } from "lucide-react";

interface Stats {
  totalReports: number;
  unreadReports: number;
  totalCommissions: number;
  pendingCommissions: number;
}

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("partner_token="))
      ?.split("=")[1];

    if (!token) {
      router.push("/partner/login");
      return;
    }

    // For now use placeholder stats until API is fully wired
    setStats({
      totalReports: 0,
      unreadReports: 0,
      totalCommissions: 0,
      pendingCommissions: 0,
    });
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[#B08D57] animate-pulse text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-[#F7F5F0]">合作方概览</h1>
        <p className="text-sm text-[#F7F5F0]/50 mt-1">查看您的报告和佣金信息</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <DarkStatCard
          title="收到报告"
          value={stats?.totalReports ?? 0}
          icon={<FileText className="w-5 h-5" />}
        />
        <DarkStatCard
          title="未读报告"
          value={stats?.unreadReports ?? 0}
          icon={<Bell className="w-5 h-5" />}
          highlight
        />
        <DarkStatCard
          title="累计佣金"
          value={`¥${(stats?.totalCommissions ?? 0).toLocaleString()}`}
          icon={<Wallet className="w-5 h-5" />}
        />
        <DarkStatCard
          title="待结算"
          value={`¥${(stats?.pendingCommissions ?? 0).toLocaleString()}`}
          icon={<TrendingUp className="w-5 h-5" />}
          highlight
        />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <Link href="/partner/reports">
          <Card className="bg-white/5 border-[#B08D57]/20 rounded-xl p-5 hover:border-[#B08D57]/40 hover:bg-white/10 transition-all cursor-pointer active:scale-[0.98]">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-[#B08D57]/10 text-[#B08D57]">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold text-[#F7F5F0]">查看报告</div>
                <div className="text-sm text-[#F7F5F0]/50 mt-1">浏览收到的分析报告与赛前预测</div>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/partner/commissions">
          <Card className="bg-white/5 border-[#B08D57]/20 rounded-xl p-5 hover:border-[#B08D57]/40 hover:bg-white/10 transition-all cursor-pointer active:scale-[0.98]">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-[#B08D57]/10 text-[#B08D57]">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold text-[#F7F5F0]">佣金记录</div>
                <div className="text-sm text-[#F7F5F0]/50 mt-1">查看佣金结算明细与提现记录</div>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Info banner */}
      <div className="mt-6 p-4 bg-[#B08D57]/5 border border-[#B08D57]/20 rounded-xl">
        <div className="flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div>
            <div className="text-sm font-medium text-[#B08D57]">后置分佣模式</div>
            <div className="text-xs text-[#F7F5F0]/50 mt-1">
              无预付费用、无保底任务、无亏损分摊，仅从增量收益中按比例分佣
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DarkStatCard({
  title,
  value,
  icon,
  highlight = false,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-white/5 border rounded-xl p-4 md:p-5 transition-colors
      ${highlight ? "border-[#B08D57]/30" : "border-[#B08D57]/20"}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#B08D57]/70">{icon}</span>
        <span className="text-[10px] md:text-xs text-[#F7F5F0]/40">{title}</span>
      </div>
      <div className={`text-xl md:text-2xl font-bold ${highlight ? "text-[#B08D57]" : "text-[#F7F5F0]"}`}>
        {value}
      </div>
    </div>
  );
}
