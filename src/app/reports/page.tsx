"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Filter } from "lucide-react";

interface ReportSummary {
  id: string;
  match_id: string;
  report_type: string;
  home_team: string;
  away_team: string;
  home_win_probability: number;
  draw_probability: number;
  away_win_probability: number;
  confidence_level: number;
  generated_at: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pre_match" | "live_adjust">("all");

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    try {
      const res = await fetch(`/api/analysis?type=list&report_type=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111]">
      {/* Hero - compact on mobile */}
      <div className="bg-gradient-to-b from-[#3B2B20] to-[#111] py-8 md:py-16 px-4 md:px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <FileText className="w-6 h-6 md:w-8 md:h-8 text-[#B08D57]" />
          <h1 className="text-xl md:text-3xl font-bold text-[#F7F5F0]">世界杯分析报告</h1>
        </div>
        <p className="text-sm md:text-base text-[#B08D57]">基于MSI六维模型的专业足球预测分析</p>
      </div>

      {/* Filter tabs - scrollable on mobile */}
      <div className="px-4 md:px-6 py-3 flex gap-2 justify-center">
        {(["all", "pre_match", "live_adjust"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-sm transition-colors touch-target
              ${filter === f
                ? "bg-[#B08D57] text-[#111] font-bold"
                : "bg-white/5 text-[#F7F5F0]/70 hover:bg-white/10"
              }`}
          >
            {f === "all" ? "全部" : f === "pre_match" ? "赛前分析" : "临场修正"}
          </button>
        ))}
      </div>

      {/* Reports list */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 pb-24 md:pb-20">
        {loading ? (
          <div className="space-y-4 mt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/5 border border-[#B08D57]/20 rounded-xl p-5">
                <div className="skeleton h-5 w-48 rounded mb-4" />
                <div className="grid grid-cols-3 gap-3">
                  <div className="skeleton h-16 rounded-lg" />
                  <div className="skeleton h-16 rounded-lg" />
                  <div className="skeleton h-16 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 md:py-20 text-[#F7F5F0]/50">
            <div className="text-4xl md:text-5xl mb-4">📭</div>
            <p className="text-sm md:text-base">暂无公开报告</p>
            <p className="text-xs text-[#F7F5F0]/30 mt-2">报告将在比赛日前生成</p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4 mt-4">
            {reports.map((r) => (
              <Link
                key={r.id}
                href={`/reports/${r.match_id}`}
                className="block bg-white/5 border border-[#B08D57]/20 rounded-xl p-4 md:p-6 hover:border-[#B08D57]/40 hover:bg-white/10 transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-base md:text-lg font-bold text-[#F7F5F0]">
                      {r.home_team} vs {r.away_team}
                    </span>
                    <span className="ml-2 text-[10px] md:text-xs bg-white/10 px-1.5 md:px-2 py-0.5 rounded text-[#F7F5F0]/50">
                      {r.report_type === "pre_match" ? "赛前" : "临场"}
                    </span>
                  </div>
                  <span className="text-xs text-[#F7F5F0]/50 shrink-0 ml-2">
                    {new Date(r.generated_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Probability cards - responsive */}
                <div className="grid grid-cols-3 gap-2 md:gap-4">
                  <div className="text-center p-2 md:p-3 bg-green-500/10 rounded-lg">
                    <div className="text-[10px] md:text-xs text-green-400/70 mb-0.5">主胜</div>
                    <div className="text-lg md:text-xl font-bold text-green-400">
                      {(r.home_win_probability * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center p-2 md:p-3 bg-[#B08D57]/10 rounded-lg">
                    <div className="text-[10px] md:text-xs text-[#B08D57]/70 mb-0.5">平局</div>
                    <div className="text-lg md:text-xl font-bold text-[#B08D57]">
                      {(r.draw_probability * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center p-2 md:p-3 bg-red-500/10 rounded-lg">
                    <div className="text-[10px] md:text-xs text-red-400/70 mb-0.5">客胜</div>
                    <div className="text-lg md:text-xl font-bold text-red-400">
                      {(r.away_win_probability * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="mt-2 md:mt-3 text-[10px] md:text-xs text-[#F7F5F0]/50">
                  置信度 {(r.confidence_level * 100).toFixed(0)}%
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Mobile bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20 md:hidden bg-[#111]/95 backdrop-blur border-t border-[#B08D57]/20 p-4 safe-bottom">
        <Link
          href="/"
          className="block text-center py-2.5 bg-[#B08D57] text-[#111] font-bold rounded-lg text-sm"
        >
          🐜 返回首页
        </Link>
      </div>
    </div>
  );
}
