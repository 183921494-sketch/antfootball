"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

interface ReportDetail {
  id: string;
  match_id: string;
  report_type: string;
  version: number;
  home_team: string;
  away_team: string;
  home_team_msi: number;
  away_team_msi: number;
  home_win_probability: number;
  draw_probability: number;
  away_win_probability: number;
  expected_goals: number;
  confidence_level: number;
  key_insights: string;
  risk_factors: string;
  opportunity_factors: string;
  is_final: boolean;
  generated_at: string;
}

export default function ReportDetailPage() {
  const params = useParams();
  const matchId = params.matchId as string;
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReport(); }, [matchId]);

  const fetchReport = async () => {
    try {
      const res = await fetch(`/api/analysis?type=detail&match_id=${matchId}`);
      if (res.ok) { const data = await res.json(); setReport(data.report || null); }
    } catch { setReport(null); }
    finally { setLoading(false); }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#111] flex items-center justify-center"><div className="text-[#B08D57] animate-pulse">加载中...</div></div>;
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
        <div className="text-center text-[#F7F5F0]/50">
          <div className="text-4xl mb-4">🔍</div>
          <p>报告未找到</p>
          <Link href="/reports" className="text-[#B08D57] hover:underline mt-4 block text-sm">← 返回报告列表</Link>
        </div>
      </div>
    );
  }

  const maxProb = Math.max(report.home_win_probability, report.draw_probability, report.away_win_probability);

  return (
    <div className="min-h-screen bg-[#111]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#3B2B20] to-[#111] py-6 md:py-8 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/reports" className="inline-flex items-center gap-1 text-[#B08D57] hover:underline text-xs md:text-sm">
            <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" /> 返回报告列表
          </Link>

          <div className="mt-4 md:mt-6">
            <h1 className="text-xl md:text-2xl font-bold text-[#F7F5F0]">
              {report.home_team} vs {report.away_team}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[10px] md:text-xs bg-white/10 px-2 py-0.5 rounded text-[#F7F5F0]/50">
                {report.report_type === "pre_match" ? "赛前分析" : "临场修正"} v{report.version}
              </span>
              {report.is_final && (
                <span className="text-[10px] md:text-xs bg-[#B08D57] text-[#111] px-2 py-0.5 rounded font-bold">终版</span>
              )}
            </div>
            <div className="mt-1.5 text-[10px] md:text-xs text-[#F7F5F0]/40">
              生成：{new Date(report.generated_at).toLocaleString()} | 置信度 {(report.confidence_level * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-4 md:space-y-6 pb-24 md:pb-8">
        {/* MSI comparison */}
        <div className="bg-white/5 border border-[#B08D57]/20 rounded-xl p-4 md:p-6">
          <h2 className="text-base md:text-lg font-bold text-[#F7F5F0] mb-3 md:mb-4">MSI 六维评分对比</h2>
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <div className="text-center">
              <div className="text-[#F7F5F0]/50 text-xs md:text-sm mb-1 truncate">{report.home_team}</div>
              <div className="text-2xl md:text-4xl font-bold text-green-400">{report.home_team_msi.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-[#F7F5F0]/50 text-xs md:text-sm mb-1 truncate">{report.away_team}</div>
              <div className="text-2xl md:text-4xl font-bold text-red-400">{report.away_team_msi.toFixed(2)}</div>
            </div>
          </div>
          <div className="mt-3 relative h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-green-400 rounded-full transition-all" style={{ width: `${(report.home_team_msi / 10) * 100}%` }} />
          </div>
        </div>

        {/* Probabilities */}
        <div className="bg-white/5 border border-[#B08D57]/20 rounded-xl p-4 md:p-6">
          <h2 className="text-base md:text-lg font-bold text-[#F7F5F0] mb-3 md:mb-4">胜平负概率</h2>
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <ProbBar label="主胜" value={report.home_win_probability} max={maxProb} color="green" />
            <ProbBar label="平局" value={report.draw_probability} max={maxProb} color="gold" />
            <ProbBar label="客胜" value={report.away_win_probability} max={maxProb} color="red" />
          </div>
          <div className="mt-3 text-center text-xs text-[#F7F5F0]/50">
            预期进球：{report.expected_goals.toFixed(1)}
          </div>
        </div>

        {/* Key insights */}
        {report.key_insights && (
          <div className="bg-white/5 border border-[#B08D57]/20 rounded-xl p-4 md:p-6">
            <h2 className="text-base md:text-lg font-bold text-[#F7F5F0] mb-2 md:mb-3">💡 关键洞察</h2>
            <div className="text-xs md:text-sm text-[#F7F5F0]/80 whitespace-pre-wrap">{report.key_insights}</div>
          </div>
        )}

        {/* Risk factors */}
        {report.risk_factors && (
          <div className="bg-white/5 border border-red-500/20 rounded-xl p-4 md:p-6">
            <h2 className="text-base md:text-lg font-bold text-red-400 mb-2 md:mb-3">⚠️ 风险因素</h2>
            <div className="text-xs md:text-sm text-[#F7F5F0]/80 whitespace-pre-wrap">{report.risk_factors}</div>
          </div>
        )}

        {/* Opportunity factors */}
        {report.opportunity_factors && (
          <div className="bg-white/5 border border-green-500/20 rounded-xl p-4 md:p-6">
            <h2 className="text-base md:text-lg font-bold text-green-400 mb-2 md:mb-3">✅ 机会因素</h2>
            <div className="text-xs md:text-sm text-[#F7F5F0]/80 whitespace-pre-wrap">{report.opportunity_factors}</div>
          </div>
        )}

        {/* Print button - fixed on mobile */}
        <div className="hidden md:block text-center print:hidden">
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-[#B08D57] text-[#111] font-bold rounded-lg hover:bg-[#B08D57]/90 transition-colors"
          >
            🖨️ 打印报告
          </button>
        </div>
      </div>

      {/* Mobile fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20 md:hidden bg-[#111]/95 backdrop-blur border-t border-[#B08D57]/20 p-4 safe-bottom print:hidden">
        <button
          onClick={() => window.print()}
          className="w-full py-2.5 bg-[#B08D57] text-[#111] font-bold rounded-lg flex items-center justify-center gap-2 text-sm"
        >
          <Printer className="w-4 h-4" /> 打印报告
        </button>
      </div>
    </div>
  );
}

function ProbBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = (value * 100).toFixed(1);
  const barWidth = (value / max) * 100;
  const colors = { green: "bg-green-400", gold: "bg-[#B08D57]", red: "bg-red-400" };

  return (
    <div className="text-center">
      <div className="text-[10px] md:text-xs text-[#F7F5F0]/50 mb-0.5">{label}</div>
      <div className="text-lg md:text-2xl font-bold text-[#F7F5F0] mb-1.5">{pct}%</div>
      <div className="h-1.5 md:h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${colors[color as keyof typeof colors]} rounded-full transition-all`} style={{ width: `${barWidth}%` }} />
      </div>
    </div>
  );
}
