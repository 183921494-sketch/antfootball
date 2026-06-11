"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { PredictionScheme } from "@/components/prediction-scheme";

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
      if (res.ok) {
        const data = await res.json();
        setReport(data.report || null);
      }
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

      {/* Prediction Scheme */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-24 md:pb-8">
        <PredictionScheme
          homeTeam={report.home_team}
          awayTeam={report.away_team}
          homeWinProbability={report.home_win_probability}
          drawProbability={report.draw_probability}
          awayWinProbability={report.away_win_probability}
          homeTeamMsi={report.home_team_msi}
          awayTeamMsi={report.away_team_msi}
          expectedGoals={report.expected_goals}
          confidenceLevel={report.confidence_level}
          keyInsights={report.key_insights}
          riskFactors={report.risk_factors}
          opportunityFactors={report.opportunity_factors}
          isFinal={report.is_final}
          reportType={report.report_type}
          generatedAt={report.generated_at}
        />
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
