"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, ArrowLeft, Trophy } from "lucide-react";
import Link from "next/link";

interface Match {
  id: string;
  match_date: string;
  world_cup_stage: string;
  group_letter: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  stadium: string;
  city: string;
  status: string;
  home_team?: { name: string };
  away_team?: { name: string };
}

const STAGE_LABELS: Record<string, string> = {
  group_stage: "小组赛",
  round_of_16: "1/8决赛",
  quarter_final: "1/4决赛",
  semi_final: "半决赛",
  third_place: "三四名",
  final: "决赛",
};

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState("group_stage");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches();
  }, [stageFilter]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ stage: stageFilter, limit: "104" });
      const res = await fetch(`/api/matches?${params}`);
      const data = await res.json();
      setMatches(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateScore = async (match: Match) => {
    const homeScore = prompt(`${match.home_team?.name || "主队"} 得分：`, String(match.home_score ?? "0"));
    if (homeScore === null) return;
    const awayScore = prompt(`${match.away_team?.name || "客队"} 得分：`, String(match.away_score ?? "0"));
    if (awayScore === null) return;

    setUpdatingId(match.id);
    try {
      const res = await fetch(`/api/matches?id=${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          home_score: parseInt(homeScore),
          away_score: parseInt(awayScore),
          status: "finished",
        }),
      });
      if (res.ok) fetchMatches();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const stages = ["group_stage", "round_of_16", "quarter_final", "semi_final", "third_place", "final"];

  return (
    <div>
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/admin/dashboard" className="text-muted-foreground hover:text-foreground md:hidden">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg md:text-2xl font-bold">比赛管理</h1>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground">管理2026世界杯全部104场比赛</p>
      </div>

      {/* Stage filter - scrollable */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
        {stages.map((s) => (
          <Button
            key={s}
            variant={stageFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStageFilter(s)}
            className="touch-target whitespace-nowrap shrink-0"
          >
            {STAGE_LABELS[s] || s}
          </Button>
        ))}
      </div>

      {/* Match list */}
      <div className="space-y-2 md:space-y-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="h-20 skeleton rounded-b-lg" />
            </Card>
          ))
        ) : matches.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无比赛数据</p>
          </div>
        ) : (
          matches.map((match) => (
            <Card key={match.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-3 md:p-4">
                {/* Mobile layout */}
                <div className="md:hidden">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(match.match_date).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                        {match.status === "scheduled" ? "待赛" : match.status === "ongoing" ? "进行中" : "已结束"}
                      </Badge>
                      {match.group_letter && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">{match.group_letter}组</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-right flex-1 truncate pr-2">
                      {match.home_team?.name || "TBD"}
                    </div>
                    <div className="text-center min-w-[50px]">
                      {match.status === "finished" || match.status === "ongoing" ? (
                        <span className={`text-lg font-bold ${match.status === "ongoing" ? "text-primary" : ""}`}>
                          {match.home_score} - {match.away_score}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">VS</span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-left flex-1 truncate pl-2">
                      {match.away_team?.name || "TBD"}
                    </div>
                  </div>
                  {match.status !== "finished" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2 touch-target text-xs h-8"
                      onClick={() => handleUpdateScore(match)}
                      disabled={updatingId === match.id}
                    >
                      {updatingId === match.id ? "更新中..." : "录入比分"}
                    </Button>
                  )}
                </div>

                {/* Desktop layout */}
                <div className="hidden md:flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-center min-w-[100px]">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(match.match_date).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {match.city}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-right min-w-[100px]">
                        <div className="font-bold">{match.home_team?.name || "TBD"}</div>
                      </div>
                      <div className="text-center min-w-[60px]">
                        {match.status === "finished" || match.status === "ongoing" ? (
                          <span className={`text-2xl font-bold ${match.status === "ongoing" ? "text-primary" : ""}`}>
                            {match.home_score} - {match.away_score}
                          </span>
                        ) : (
                          <span className="text-xl text-muted-foreground">VS</span>
                        )}
                      </div>
                      <div className="min-w-[100px]">
                        <div className="font-bold">{match.away_team?.name || "TBD"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {match.status === "scheduled" ? "待赛" : match.status === "ongoing" ? "进行中" : "已结束"}
                    </Badge>
                    {match.group_letter && (
                      <Badge variant="outline">{match.group_letter}组</Badge>
                    )}
                    {match.stadium && (
                      <span className="text-xs text-muted-foreground">{match.stadium}</span>
                    )}
                    {match.status !== "finished" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateScore(match)}
                        disabled={updatingId === match.id}
                      >
                        {updatingId === match.id ? "更新中..." : "录入比分"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
