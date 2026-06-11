"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, CheckCircle, Clock, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Commission {
  id: string;
  partner_id: string;
  settlement_period: string;
  revenue_base: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  paid_at: string | null;
  notes: string;
  created_at: string;
  partner?: { company_name: string; contact_person: string; phone: string; partner_type: string };
}

const STATUS_CONFIG: Record<string, { label: string; variant: "outline" | "default" | "destructive"; icon: React.ElementType }> = {
  pending: { label: "待结算", variant: "outline", icon: Clock },
  paid: { label: "已结算", variant: "default", icon: CheckCircle },
  disputed: { label: "有异议", variant: "destructive", icon: XCircle },
};

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => { fetchCommissions(); }, [statusFilter]);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/commissions?${params}`);
      const data = await res.json();
      setCommissions(data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleMarkPaid = async (c: Commission) => {
    try {
      const res = await fetch(`/api/commissions?id=${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      if (res.ok) fetchCommissions();
    } catch (err) { console.error(err); }
  };

  return (
    <div>
      <div className="mb-4 md:mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/admin/dashboard" className="text-muted-foreground hover:text-foreground md:hidden"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-lg md:text-2xl font-bold">佣金管理</h1>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground">查看并管理合作方佣金结算记录</p>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
        <Button variant={statusFilter === "" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("")} className="touch-target whitespace-nowrap">全部</Button>
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <Button key={k} variant={statusFilter === k ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(k)} className="touch-target whitespace-nowrap">
            <v.icon className="w-3 h-3 mr-1" /> {v.label}
          </Button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4">
        {(["pending", "paid", "disputed"] as const).map((s) => {
          const total = commissions.filter(c => c.status === s).reduce((sum, c) => sum + c.commission_amount, 0);
          const cfg = STATUS_CONFIG[s];
          return (
            <Card key={s}>
              <CardHeader className="flex flex-row items-center gap-1.5 pb-1 p-3 md:p-4">
                <cfg.icon className="w-3.5 h-3.5" />
                <CardTitle className="text-[10px] md:text-sm font-medium">{cfg.label}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0">
                <div className="text-lg md:text-2xl font-bold">¥{total.toLocaleString()}</div>
                <p className="text-[10px] md:text-xs text-muted-foreground">{commissions.filter(c => c.status === s).length} 笔</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-2 md:space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="h-20 skeleton rounded-b-lg" /></Card>
          ))
        ) : commissions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无佣金记录</p>
          </div>
        ) : (
          commissions.map((c) => {
            const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
            return (
              <Card key={c.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{c.partner?.company_name || "未知"}</div>
                      <div className="text-[10px] md:text-xs text-muted-foreground">{c.partner?.contact_person} · {c.partner?.phone}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{c.settlement_period} · 基础收益 ¥{Number(c.revenue_base).toLocaleString()}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base md:text-lg font-bold">¥{Number(c.commission_amount).toLocaleString()}</div>
                      <div className="text-[10px] text-muted-foreground">比例 {(Number(c.commission_rate) * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
                    {c.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => handleMarkPaid(c)} className="touch-target text-xs h-7">
                        <CheckCircle className="w-3 h-3 mr-1" /> 确认结算
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
