"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";

interface Commission {
  id: string;
  settlement_period: string;
  revenue_base: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  paid_at: string | null;
  notes: string | null;
}

export default function PartnerCommissionsPage() {
  const router = useRouter();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchCommissions(); }, []);

  const fetchCommissions = async () => {
    try {
      const token = document.cookie.split("; ").find((r) => r.startsWith("partner_token="))?.split("=")[1];
      if (!token) { router.push("/partner/login"); return; }
      const res = await fetch("/api/commissions?type=partner-list", { headers: { "x-partner-token": token } });
      if (res.ok) { const data = await res.json(); setCommissions(data.commissions || []); }
    } catch { setCommissions([]); }
    finally { setLoading(false); }
  };

  const statusText = (s: string) => s === "pending" ? "待结算" : s === "processing" ? "处理中" : s === "paid" ? "已支付" : s;
  const statusColor = (s: string) => s === "pending" ? "text-yellow-400" : s === "processing" ? "text-[#B08D57]" : s === "paid" ? "text-green-400" : "text-[#F7F5F0]/50";

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="text-[#B08D57] animate-pulse">加载中...</div></div>;
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <h1 className="text-lg md:text-xl font-bold text-[#F7F5F0]">佣金记录</h1>
        <p className="text-xs text-[#F7F5F0]/50 mt-1">查看结算明细与支付记录</p>
      </div>

      {commissions.length === 0 ? (
        <div className="text-center py-16 text-[#F7F5F0]/50">
          <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">暂无佣金记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {commissions.map((c) => (
            <div key={c.id} className="bg-white/5 border border-[#B08D57]/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-xs text-[#F7F5F0]/40">结算周期：</span>
                  <span className="text-sm text-[#F7F5F0]">{c.settlement_period}</span>
                </div>
                <span className={`text-xs font-medium ${statusColor(c.status)}`}>
                  {statusText(c.status)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="p-2 bg-white/5 rounded-lg">
                  <div className="text-[10px] text-[#F7F5F0]/40">营收基数</div>
                  <div className="text-sm text-[#F7F5F0] font-bold">¥{c.revenue_base.toLocaleString()}</div>
                </div>
                <div className="p-2 bg-white/5 rounded-lg">
                  <div className="text-[10px] text-[#F7F5F0]/40">佣金比例</div>
                  <div className="text-sm text-[#F7F5F0] font-bold">{(c.commission_rate * 100).toFixed(1)}%</div>
                </div>
                <div className="p-2 bg-[#B08D57]/5 rounded-lg">
                  <div className="text-[10px] text-[#B08D57]/60">佣金金额</div>
                  <div className="text-sm text-[#B08D57] font-bold">¥{c.commission_amount.toLocaleString()}</div>
                </div>
              </div>
              {c.paid_at && (
                <div className="mt-2 text-[10px] text-green-400/50">
                  支付时间：{new Date(c.paid_at).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
