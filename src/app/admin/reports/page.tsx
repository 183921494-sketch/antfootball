"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, RefreshCw, Edit3, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Report {
  id: string;
  match_id: string;
  report_type: string;
  version: number;
  home_team_msi: number;
  away_team_msi: number;
  home_win_probability: number;
  draw_probability: number;
  away_win_probability: number;
  expected_goals: number;
  confidence_level: number;
  is_final: boolean;
  generated_at: string;
  match?: {
    match_date: string;
    home_team?: { name: string };
    away_team?: { name: string };
  };
}

const TYPE_LABELS: Record<string, string> = {
  pre_match: "赛前分析",
  live: "临场分析",
  post_match: "赛后分析",
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    fetchReports();
  }, [typeFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (typeFilter) params.set("reportType", typeFilter);
      const res = await fetch(`/api/analysis?${params}`);
      const data = await res.json();
      setReports(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/admin/dashboard" className="text-muted-foreground hover:text-foreground md:hidden">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg md:text-2xl font-bold">报告管理</h1>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground">生成比赛分析报告，支持临场修正</p>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
        <Button variant={typeFilter === "" ? "default" : "outline"} size="sm" onClick={() => setTypeFilter("")} className="touch-target whitespace-nowrap">全部</Button>
        {Object.entries(TYPE_LABELS).map(([k, v]) => (
          <Button key={k} variant={typeFilter === k ? "default" : "outline"} size="sm" onClick={() => setTypeFilter(k)} className="touch-target whitespace-nowrap">{v}</Button>
        ))}
        <Button variant="outline" size="sm" onClick={fetchReports} className="touch-target whitespace-nowrap">
          <RefreshCw className="w-3 h-3 mr-1" /> 刷新
        </Button>
      </div>

      {/* Report list */}
      <div className="grid gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="h-32 skeleton rounded-b-lg" /></Card>
          ))
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">暂无分析报告</p>
            <p className="text-xs text-muted-foreground mt-1">请先生成分析报告</p>
          </div>
        ) : (
          reports.map((report) => (
            <Card key={report.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Badge className="text-[10px]">{TYPE_LABELS[report.report_type] || report.report_type}</Badge>
                    {report.is_final && <Badge variant="secondary" className="text-[10px]">终稿</Badge>}
                    {report.version > 1 && <Badge variant="outline" className="text-[10px]">v{report.version}</Badge>}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(report.generated_at).toLocaleDateString("zh-CN")}
                  </span>
                </div>
                <CardTitle className="text-sm md:text-base mt-1">
                  {report.match?.home_team?.name || "—"} vs {report.match?.away_team?.name || "—"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
                  <div className="text-center p-2 rounded-md bg-muted">
                    <div className="text-[10px] text-muted-foreground">主队MSI</div>
                    <div className="text-base font-bold text-primary">{Number(report.home_team_msi).toFixed(2)}</div>
                  </div>
                  <div className="text-center p-2 rounded-md bg-muted">
                    <div className="text-[10px] text-muted-foreground">客队MSI</div>
                    <div className="text-base font-bold text-destructive">{Number(report.away_team_msi).toFixed(2)}</div>
                  </div>
                  <div className="text-center p-2 rounded-md bg-muted">
                    <div className="text-[10px] text-muted-foreground">主胜</div>
                    <div className="text-base font-bold">{(Number(report.home_win_probability) * 100).toFixed(1)}%</div>
                  </div>
                  <div className="text-center p-2 rounded-md bg-muted">
                    <div className="text-[10px] text-muted-foreground">平局</div>
                    <div className="text-base font-bold">{(Number(report.draw_probability) * 100).toFixed(1)}%</div>
                  </div>
                  <div className="text-center p-2 rounded-md bg-muted col-span-2 sm:col-span-1">
                    <div className="text-[10px] text-muted-foreground">置信度</div>
                    <div className="text-base font-bold">{(Number(report.confidence_level) * 100).toFixed(1)}%</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="touch-target text-xs">
                    <FileText className="w-3 h-3 mr-1" /> 查看
                  </Button>
                  <Button size="sm" variant="outline" className="touch-target text-xs">
                    <Edit3 className="w-3 h-3 mr-1" /> 临场修正
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
