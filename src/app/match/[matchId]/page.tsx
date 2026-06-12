"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Radio, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { useLiveStream } from "@/components/live-stream-hook";
import type { MatchPrediction } from "@/lib/prediction-engine";

/**
 * 比赛详情页（客户端渲染 + 实时比分/盘口/预测更新）
 *
 * 数据来源：
 * 1. 初始加载：/api/predict?matchId=xxx
 * 2. 实时更新：SSE /api/live（自动更新比分、盘口、重新计算预测）
 */

interface PredictionDetailClient extends MatchPrediction {
  espnMatchId: string;
  matchDate: string;
  matchStatus: "upcoming" | "live" | "finished";
  homeScore: string;
  awayScore: string;
  homeAbbrev: string;
  awayAbbrev: string;
  homeLogo: string;
  awayLogo: string;
  venue: string;
  city: string;
  attendance: number;
  homeStats: Record<string, string>;
  awayStats: Record<string, string>;
  homeForm: string;
  awayForm: string;
  rawOdds?: {
    homeOdds: number; drawOdds: number; awayOdds: number;
    ouLine: number; overOdds: number; underOdds: number;
    marketMargin: string;
  };
}

function DimensionBar({ label, home, away, weight }: { label: string; home: number; away: number; weight: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-green-400 font-bold">{home.toFixed(1)}</span>
        <span className="text-[#F7F5F0]/50">{label} <span className="text-[#B08D57]">({weight})</span></span>
        <span className="text-red-400 font-bold">{away.toFixed(1)}</span>
      </div>
      <div className="flex gap-1 h-2">
        <div className="flex-1 flex justify-end">
          <div className="bg-green-500/70 rounded-l-full" style={{ width: `${(home / 10) * 100}%` }} />
        </div>
        <div className="flex-1">
          <div className="bg-red-500/70 rounded-r-full" style={{ width: `${(away / 10) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ score, prob, rank }: { score: string; prob: number; rank: number }) {
  return (
    <div className="bg-white/[0.04] rounded-lg p-2 text-center">
      <div className="text-[10px] text-[#B08D57] mb-1">#{rank}</div>
      <div className="text-lg font-bold text-[#F7F5F0]">{score}</div>
      <div className="text-xs text-[#F7F5F0]/50">{(prob * 100).toFixed(1)}%</div>
    </div>
  );
}

export default function MatchDetailPage({ params }: { params: { matchId: string } }) {
  const matchId = params.matchId;

  const [detail, setDetail] = useState<PredictionDetailClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 实时覆盖数据
  const [liveHomeScore, setLiveHomeScore] = useState<string | null>(null);
  const [liveAwayScore, setLiveAwayScore] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<"upcoming" | "live" | "finished" | null>(null);
  const [liveClock, setLiveClock] = useState<string>("");
  const [liveOdds, setLiveOdds] = useState<any>(null);
  const [livePrediction, setLivePrediction] = useState<MatchPrediction | null>(null);

  // SSE 实时流
  const { connected, commentaries, matchStates } = useLiveStream();

  // 初始加载
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/predict?matchId=${matchId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.success && json.data?.length > 0) {
          if (!cancelled) {
            setDetail(json.data[0]);
            setLoading(false);
          }
        } else {
          if (!cancelled) {
            setError("未找到该比赛的预测数据");
            setLoading(false);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [matchId]);

  // 处理 SSE 事件：只关注当前 matchId
  useEffect(() => {
    for (const ms of matchStates) {
      if (ms.matchId !== matchId) continue;

      // 比分更新
      if (ms.score) {
        const s = ms.score as any;
        setLiveHomeScore(s.homeScore ?? null);
        setLiveAwayScore(s.awayScore ?? null);
        setLiveStatus(s.status ?? null);
        setLiveClock(s.clock ?? "");
      }

      // 盘口更新
      if (ms.odds) {
        setLiveOdds(ms.odds as any);
      }

      // 预测更新（type === "prediction_update" 时才有 prediction 属性）
      if (ms.prediction && (ms.prediction as any).type === "prediction_update") {
        setLivePrediction((ms.prediction as any).prediction ?? null);
      }
    }
  }, [matchStates, matchId]);

  // 合并显示数据（实时优先）
  const display = useMemo(() => {
    if (!detail) return null;
    return {
      ...detail,
      homeScore: liveHomeScore ?? detail.homeScore,
      awayScore: liveAwayScore ?? detail.awayScore,
      matchStatus: liveStatus ?? detail.matchStatus,
      prediction: livePrediction ?? detail,
    };
  }, [detail, liveHomeScore, liveAwayScore, liveStatus, livePrediction]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center text-[#B08D57] animate-pulse">加载比赛数据中...</div>
      </main>
    );
  }

  if (error || !detail || !display) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center text-[#F7F5F0]/50">
          <div className="text-4xl mb-4">🔍</div>
          <p>{error || "比赛未找到"}</p>
          <Link href="/" className="text-[#B08D57] hover:underline mt-4 block text-sm">← 返回首页</Link>
        </div>
      </div>
    );
  }

  const d = display;
  const pred = livePrediction ?? detail;
  const isFinished = d.matchStatus === "finished";
  const isLive = d.matchStatus === "live";

  const recLabel = pred.recommendation === "home" ? d.homeTeam.teamName
    : pred.recommendation === "away" ? d.awayTeam.teamName : "平局";
  const recColor = pred.recommendation === "home" ? "text-green-400"
    : pred.recommendation === "away" ? "text-red-400" : "text-yellow-400";

  const dDate = new Date(d.matchDate);
  const dateStr = dDate.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  const timeStr = dDate.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });

  // 过滤当前比赛的AI解说
  const matchCommentaries = commentaries.filter((c: any) => c.matchId === matchId);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#1a1209] to-[#0a0a0a] py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="inline-flex items-center gap-1 text-[#B08D57] hover:underline text-xs">
              <ArrowLeft className="w-3 h-3" /> 返回赛程
            </Link>
            {/* 连接状态 */}
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${connected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
              {connected ? "● 实时连接" : "● 重连中"}
            </span>
          </div>

          {/* 对阵 + 实时比分 */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex-1 text-center">
              {d.homeLogo && <img src={d.homeLogo} alt="" className="w-12 h-12 mx-auto mb-2" />}
              <div className="text-lg font-bold text-[#F7F5F0]">{d.homeTeam.teamName}</div>
              <div className="text-xs text-[#B08D57]">MSI {d.homeTeam.msiScore.toFixed(2)}</div>
            </div>
            <div className="px-6 text-center">
              {/* 实时比分 */}
              <div className="text-4xl font-bold tabular-nums">
                <span className={isLive ? "text-green-400" : "text-[#F7F5F0]"}>{d.homeScore}</span>
                <span className="text-[#B08D57] mx-2">:</span>
                <span className={isLive ? "text-red-400" : "text-[#F7F5F0]"}>{d.awayScore}</span>
              </div>
              {isLive && (
                <div className="text-xs text-red-400 animate-pulse mt-1">LIVE {liveClock}</div>
              )}
              {!isLive && !isFinished && (
                <div className="text-2xl font-bold text-[#B08D57] mt-1">VS</div>
              )}
              <div className="text-xs text-[#F7F5F0]/40 mt-1">{dateStr} {timeStr}</div>
              {d.venue && <div className="text-xs text-[#F7F5F0]/30 mt-0.5">{d.venue}</div>}
            </div>
            <div className="flex-1 text-center">
              {d.awayLogo && <img src={d.awayLogo} alt="" className="w-12 h-12 mx-auto mb-2" />}
              <div className="text-lg font-bold text-[#F7F5F0]">{d.awayTeam.teamName}</div>
              <div className="text-xs text-[#B08D57]">MSI {d.awayTeam.msiScore.toFixed(2)}</div>
            </div>
          </div>

          {/* 实时盘口（若有） */}
          {liveOdds?.odds1X2 && (
            <div className="mt-4 max-w-md mx-auto">
              <div className="bg-white/[0.04] rounded-lg p-3 flex items-center justify-between text-xs">
                <span className="text-[#F7F5F0]/40">
                  <Activity className="w-3 h-3 inline mr-1" />
                  滚球盘口 ({liveOdds.source})
                </span>
                <div className="flex gap-2 font-bold">
                  <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                    {liveOdds.odds1X2.home.toFixed(2)}
                  </span>
                  <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                    {liveOdds.odds1X2.draw.toFixed(2)}
                  </span>
                  <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                    {liveOdds.odds1X2.away.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* 1. 胜平负预测（实时更新） */}
        <section>
          <h2 className="text-sm font-bold text-[#B08D57] mb-3 flex items-center gap-2">
            📊 胜平负预测
            {livePrediction && (
              <span className="text-[10px] bg-[#B08D57]/20 text-[#B08D57] px-2 py-0.5 rounded animate-pulse">
                实时更新
              </span>
            )}
          </h2>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <div className="text-center mb-4 p-3 bg-[#B08D57]/10 rounded-lg border border-[#B08D57]/20">
              <div className="text-xs text-[#F7F5F0]/50 mb-1">推荐结果</div>
              <div className="text-xl font-bold text-[#B08D57]">{recLabel}</div>
            </div>

            {/* 概率条（用实时预测数据） */}
            <div className="flex h-8 rounded-full overflow-hidden text-sm font-bold mb-2">
              <div className="bg-green-500/80 flex items-center justify-center text-white" style={{ width: `${pred.homeWinProb * 100}%` }}>
                {(pred.homeWinProb * 100).toFixed(1)}%
              </div>
              <div className="bg-yellow-500/80 flex items-center justify-center text-black" style={{ width: `${pred.drawProb * 100}%` }}>
                {(pred.drawProb * 100).toFixed(1)}%
              </div>
              <div className="bg-red-500/80 flex items-center justify-center text-white" style={{ width: `${pred.awayWinProb * 100}%` }}>
                {(pred.awayWinProb * 100).toFixed(1)}%
              </div>
            </div>
            <div className="flex justify-between text-xs text-[#F7F5F0]/40">
              <span>主胜 {d.homeTeam.teamName}</span>
              <span>平局</span>
              <span>客胜 {d.awayTeam.teamName}</span>
            </div>
          </div>
        </section>

        {/* 2. 比分预测 Top5 */}
        <section>
          <h2 className="text-sm font-bold text-[#B08D57] mb-3">🎯 比分预测 Top 5</h2>
          <div className="grid grid-cols-5 gap-2">
            {pred.scorePredictions.map((s: any, i: number) => (
              <ScoreCard key={s.score} score={s.score} prob={s.probability} rank={i + 1} />
            ))}
          </div>
        </section>

        {/* 3. 进球数预测 */}
        <section>
          <h2 className="text-sm font-bold text-[#B08D57] mb-3">⚽ 进球数预测</h2>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div>
                <div className="text-xs text-[#F7F5F0]/40">主队期望</div>
                <div className="text-xl font-bold text-green-400">{pred.expectedHomeGoals}</div>
              </div>
              <div>
                <div className="text-xs text-[#F7F5F0]/40">总期望</div>
                <div className="text-xl font-bold text-[#B08D57]">{pred.expectedTotalGoals}</div>
              </div>
              <div>
                <div className="text-xs text-[#F7F5F0]/40">客队期望</div>
                <div className="text-xl font-bold text-red-400">{pred.expectedAwayGoals}</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
              <div className="text-center flex-1">
                <div className="text-xs text-blue-400">大球 {pred.overUnderLine}</div>
                <div className="text-lg font-bold text-blue-400">{(pred.overProb * 100).toFixed(1)}%</div>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div className="text-center flex-1">
                <div className="text-xs text-purple-400">小球 {pred.overUnderLine}</div>
                <div className="text-lg font-bold text-purple-400">{(pred.underProb * 100).toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. MSI六维对比 */}
        <section>
          <h2 className="text-sm font-bold text-[#B08D57] mb-3">📐 MSI 六维对比</h2>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
            <DimensionBar label="阵容深度" home={d.homeTeam.rosterDepth} away={d.awayTeam.rosterDepth} weight="25%" />
            <DimensionBar label="战术体系" home={d.homeTeam.tacticalSystem} away={d.awayTeam.tacticalSystem} weight="25%" />
            <DimensionBar label="关键球员" home={d.homeTeam.keyPlayerImpact} away={d.awayTeam.keyPlayerImpact} weight="20%" />
            <DimensionBar label="教练决策" home={d.homeTeam.coachDecision} away={d.awayTeam.coachDecision} weight="15%" />
            <DimensionBar label="对阵数据" home={d.homeTeam.matchupData} away={d.awayTeam.matchupData} weight="10%" />
            <DimensionBar label="心理意志" home={d.homeTeam.mentalResilience} away={d.awayTeam.mentalResilience} weight="5%" />
            <div className="pt-3 mt-3 border-t border-white/10 text-center">
              <div className="flex items-center justify-center gap-4">
                <span className="text-green-400 font-bold text-lg">{d.homeTeam.msiScore.toFixed(2)}</span>
                <span className="text-[#B08D57]">MSI总分</span>
                <span className="text-red-400 font-bold text-lg">{d.awayTeam.msiScore.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. AI 实时解说（当前比赛） */}
        {matchCommentaries.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-[#B08D57] mb-3 flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-400 animate-pulse" />
              AI 实时解说
            </h2>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="divide-y divide-white/[0.03] max-h-[40vh] overflow-y-auto">
                {[...matchCommentaries].reverse().map((c: any, i: number) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 rounded-full p-1 ${
                        c.eventType === "goal" ? "bg-green-500/20 text-green-400" :
                        c.eventType === "odds_shift" ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-blue-500/20 text-blue-400"
                      }`}>
                        {c.eventType === "goal" ? <TrendingUp className="w-3 h-3" /> :
                         c.eventType === "odds_shift" ? <TrendingDown className="w-3 h-3" /> :
                         <Radio className="w-3 h-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#F7F5F0]/80 leading-relaxed">{c.message}</p>
                        <span className="text-[10px] text-[#F7F5F0]/30">
                          {new Date(c.timestamp).toLocaleTimeString("zh-CN")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 6. 洞察/风险/机会 */}
        {d.keyInsights.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-[#B08D57] mb-3">💡 关键洞察</h2>
            <div className="space-y-2">
              {d.keyInsights.map((insight: string, i: number) => (
                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-sm text-[#F7F5F0]/70">
                  {insight}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 置信度 */}
        <section className="text-center pb-8">
          <div className="inline-flex items-center gap-2 bg-white/[0.03] rounded-full px-4 py-2">
            <span className="text-xs text-[#F7F5F0]/40">预测置信度</span>
            <span className="text-sm font-bold text-[#B08D57]">
              {(pred.confidenceLevel * 100).toFixed(0)}% ({pred.confidenceLabel})
            </span>
            {livePrediction && (
              <span className="text-[10px] text-green-400 animate-pulse">● 实时</span>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
