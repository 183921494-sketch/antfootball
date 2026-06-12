"use client";

import { useLiveStream } from "@/components/live-stream-hook";
import { formatMatchDate } from "@/lib/espn-api";
import Link from "next/link";
import { ArrowLeft, Wifi, WifiOff, RefreshCw, Radio, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { useState, useEffect } from "react";

export default function LivePage() {
  const { events, connected, reconnect, commentaries, matchStates, scores, odds } = useLiveStream();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#B08D57] animate-pulse">连接中...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      {/* Top Bar */}
      <div className="bg-gradient-to-b from-[#1a1209] to-[#0a0a0a] py-4 px-4 border-b border-white/5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[#B08D57] hover:underline">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-lg font-bold text-[#F7F5F0] flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-400" />
              实时直播
            </h1>
            {connected ? (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <Wifi className="w-3 h-3" /> 已连接
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-red-400">
                <WifiOff className="w-3 h-3" /> 断开
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#F7F5F0]/40">{matchStates.length} 场比赛</span>
            <button
              onClick={reconnect}
              className="flex items-center gap-1 text-xs text-[#B08D57] hover:text-[#d4a76a] transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> 重连
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 flex gap-4">
        {/* Left: Live Score + Odds */}
        <div className="flex-1 space-y-4">
          {/* Live Score Cards */}
          {matchStates.length === 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
              <Radio className="w-8 h-8 text-[#B08D57] mx-auto mb-3 animate-pulse" />
              <p className="text-sm text-[#F7F5F0]/50">等待赛事数据...</p>
              <p className="text-xs text-[#F7F5F0]/30 mt-1">数据每30秒轮询一次ESPN</p>
            </div>
          )}

          {matchStates.map((ms) => {
            const score = ms.score as any;
            const oddsEvt = ms.odds as any;
            const pred = ms.prediction as any;
            if (!score) return null;

            const isLive = score.status === "live";
            const isFinished = score.status === "finished";
            const recLabel = pred?.prediction?.recommendation === "home" ? pred.prediction.homeTeam?.teamName
              : pred?.prediction?.recommendation === "away" ? pred.prediction.awayTeam?.teamName : "平局";
            const recColor = pred?.prediction?.recommendation === "home" ? "text-green-400"
              : pred?.prediction?.recommendation === "away" ? "text-red-400" : "text-yellow-400";

            return (
              <div key={ms.matchId} className={`bg-white/[0.03] border rounded-xl overflow-hidden transition-all ${
                isLive ? "border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]" :
                isFinished ? "border-white/[0.04]" : "border-blue-500/10"
              }`}>
                {/* Status + Clock */}
                <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/5">
                  <div className="flex items-center gap-2">
                    {isLive && (
                      <span className="flex items-center gap-1 text-xs text-red-400">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        直播中
                      </span>
                    )}
                    {isFinished && <span className="text-xs text-gray-400">已完场</span>}
                    {!isLive && !isFinished && <span className="text-xs text-blue-400">即将开赛</span>}
                  </div>
                  <div className="text-xs text-[#F7F5F0]/40">{score.clock || "VS"}</div>
                </div>

                {/* Score */}
                <div className="flex items-center justify-between px-4 py-4">
                  <div className="flex-1 text-right">
                    <div className="text-sm font-bold text-[#F7F5F0]">{score.homeTeam || "主队"}</div>
                  </div>
                  <div className="px-6 text-center">
                    <div className="text-3xl font-bold text-[#F7F5F0] tabular-nums">
                      <span className="text-green-400">{score.homeScore}</span>
                      <span className="text-[#B08D57] mx-2">:</span>
                      <span className="text-red-400">{score.awayScore}</span>
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-bold text-[#F7F5F0]">{score.awayTeam || "客队"}</div>
                  </div>
                </div>

                {/* Live Odds */}
                {oddsEvt?.odds1X2 && (
                  <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[#F7F5F0]/40">
                        <Activity className="w-3 h-3 inline mr-1" />
                        滚球盘口 ({oddsEvt.source})
                      </span>
                      <span className="text-[#F7F5F0]/30 text-[10px]">
                        {new Date(oddsEvt.timestamp).toLocaleTimeString("zh-CN")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold">
                        {oddsEvt.odds1X2.home.toFixed(2)}
                      </span>
                      <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded font-bold">
                        {oddsEvt.odds1X2.draw.toFixed(2)}
                      </span>
                      <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold">
                        {oddsEvt.odds1X2.away.toFixed(2)}
                      </span>
                      {oddsEvt.oddsOU && (
                        <span className="text-[#F7F5F0]/30 ml-2">
                          O/U {oddsEvt.oddsOU.line} ({oddsEvt.oddsOU.overOdds}/{oddsEvt.oddsOU.underOdds})
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Prediction */}
                {pred?.prediction && (
                  <div className="px-4 py-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#F7F5F0]/40">融合预测</span>
                        <div className="flex h-4 rounded-full overflow-hidden text-[10px] font-bold" style={{ width: "120px" }}>
                          <div className="bg-green-500/80 flex items-center justify-center text-white" style={{ width: `${pred.prediction.homeWinProb * 100}%` }}>
                            {pred.prediction.homeWinProb > 0.15 ? `${(pred.prediction.homeWinProb * 100).toFixed(0)}%` : ""}
                          </div>
                          <div className="bg-yellow-500/80 flex items-center justify-center text-black" style={{ width: `${pred.prediction.drawProb * 100}%` }}>
                            {pred.prediction.drawProb > 0.15 ? `${(pred.prediction.drawProb * 100).toFixed(0)}%` : ""}
                          </div>
                          <div className="bg-red-500/80 flex items-center justify-center text-white" style={{ width: `${pred.prediction.awayWinProb * 100}%` }}>
                            {pred.prediction.awayWinProb > 0.15 ? `${(pred.prediction.awayWinProb * 100).toFixed(0)}%` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={recColor}>→ {recLabel}</span>
                        <span className="text-[#F7F5F0]/30">
                          比分 {pred.prediction.mostLikelyScore} | 进球 {pred.prediction.expectedTotalGoals}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Commentary Feed */}
        <div className="w-80 shrink-0">
          <div className="sticky top-4">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-white/[0.04] border-b border-white/5 flex items-center gap-2">
                <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                <h2 className="text-sm font-bold text-[#B08D57]">AI 实时解说</h2>
                <span className="text-xs text-[#F7F5F0]/30 ml-auto">{commentaries.length} 条</span>
              </div>

              <div className="divide-y divide-white/[0.03] max-h-[70vh] overflow-y-auto">
                {commentaries.length === 0 && (
                  <div className="p-6 text-center">
                    <div className="text-2xl mb-2">📡</div>
                    <p className="text-xs text-[#F7F5F0]/40">等待赛事事件...</p>
                    <p className="text-[10px] text-[#F7F5F0]/20 mt-1">进球/红牌/盘口异动时会自动生成解说</p>
                  </div>
                )}

                {[...commentaries].reverse().map((c, i) => {
                  const isNew = i < 3;
                  return (
                    <div key={i} className={`px-4 py-3 ${isNew ? "bg-[#B08D57]/[0.03]" : ""}`}>
                      <div className="flex items-start gap-2">
                        {/* Event Icon */}
                        <div className={`mt-0.5 rounded-full p-1 ${
                          (c as any).eventType === "goal" ? "bg-green-500/20 text-green-400" :
                          (c as any).eventType === "card" ? "bg-red-500/20 text-red-400" :
                          (c as any).eventType === "odds_shift" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-blue-500/20 text-blue-400"
                        }`}>
                          {(c as any).eventType === "goal" ? <TrendingUp className="w-3 h-3" /> :
                           (c as any).eventType === "odds_shift" ? <TrendingDown className="w-3 h-3" /> :
                           <Radio className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#F7F5F0]/80 leading-relaxed">{c.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-[#F7F5F0]/30">
                              {new Date(c.timestamp).toLocaleTimeString("zh-CN")}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              (c as any).eventType === "goal" ? "bg-green-500/10 text-green-400" :
                              (c as any).eventType === "odds_shift" ? "bg-yellow-500/10 text-yellow-400" :
                              "bg-blue-500/10 text-blue-400"
                            }`}>
                              {(c as any).eventType === "goal" ? "进球" :
                               (c as any).eventType === "odds_shift" ? "盘口" :
                               (c as any).eventType === "prediction_tip" ? "预测" : "赛事"}
                            </span>
                          </div>
                        </div>
                        {isNew && (
                          <span className="text-[10px] text-red-400 font-bold animate-pulse">NEW</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="max-w-5xl mx-auto px-4 py-6 border-t border-white/5 mt-4">
        <div className="flex items-center justify-between text-xs text-[#F7F5F0]/30">
          <span>数据源：ESPN API + DraftKings滚球盘口</span>
          <span>轮询频率：每30秒 | 预测引擎：MSI+市场赔率融合</span>
          <span>事件接收：{events.length} 条</span>
        </div>
      </div>
    </main>
  );
}
