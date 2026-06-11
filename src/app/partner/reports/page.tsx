"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";

interface Report {
  id: string;
  match_id: string;
  report_type: string;
  home_win_probability: number;
  draw_probability: number;
  away_win_probability: number;
  key_insights: string;
  generated_at: string;
  read: boolean;
}

export default function PartnerReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    try {
      const token = document.cookie.split("; ").find((r) => r.startsWith("partner_token="))?.split("=")[1];
      if (!token) { router.push("/partner/login"); return; }
      const res = await fetch("/api/analysis?type=partner-reports", { headers: { "x-partner-token": token } });
      if (res.ok) { const data = await res.json(); setReports(data.reports || []); }
    } catch { setReports([]); }
    finally { setLoading(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="text-[#B08D57] animate-pulse">加载中...</div></div>;
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <h1 className="text-lg md:text-xl font-bold text-[#F7F5F0]">分析报告</h1>
        <p className="text-xs text-[#F7F5F0]/50 mt-1">查看收到的赛前预测和临场分析</p>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-16 text-[#F7F5F0]/50">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">暂无收到报告</p>
          <p className="text-xs mt-1 text-[#F7F5F0]/30">管理员生成报告后您将在此收到</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div
              key={r.id}
              className={`bg-white/5 border rounded-xl p-4 md:p-6 hover:border-[#B08D57]/40 transition-colors
                ${r.read ? "border-[#B08D57]/10" : "border-[#B08D57]/40"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {!r.read && <span className="text-[10px] bg-[#B08D57] text-[#111] px-1.5 py-0.5 rounded font-medium">未读</span>}
                  <span className="text-xs text-[#F7F5F0]/50">{r.report_type === "pre_match" ? "赛前分析" : "临场修正"}</span>
                </div>
                <span className="text-[10px] text-[#F7F5F0]/40">{new Date(r.generated_at).toLocaleDateString()}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 md:gap-4 mt-3">
                <div className="text-center p-2 bg-green-500/10 rounded-lg">
                  <div className="text-[10px] text-green-400/70 mb-0.5">主胜</div>
                  <div className="text-base md:text-lg font-bold text-green-400">{(r.home_win_probability * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center p-2 bg-[#B08D57]/10 rounded-lg">
                  <div className="text-[10px] text-[#B08D57]/70 mb-0.5">平局</div>
                  <div className="text-base md:text-lg font-bold text-[#B08D57]">{(r.draw_probability * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center p-2 bg-red-500/10 rounded-lg">
                  <div className="text-[10px] text-red-400/70 mb-0.5">客胜</div>
                  <div className="text-base md:text-lg font-bold text-red-400">{(r.away_win_probability * 100).toFixed(1)}%</div>
                </div>
              </div>

              {r.key_insights && (
                <div className="mt-3 p-2.5 bg-white/5 rounded-lg text-xs text-[#F7F5F0]/60 line-clamp-2">
                  {r.key_insights.slice(0, 120)}...
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
