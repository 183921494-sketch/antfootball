'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

// ============ Types ============

interface TeamInfo {
  abbr: string
  teamName: string
  logo?: string
  msiScore: number
  rosterDepth: number
  tacticalSystem: number
  keyPlayerImpact: number
  coachDecision: number
  matchupData: number
  mentalResilience: number
}

interface Prediction {
  recommendation: string
  homeWinProb: number
  drawProb: number
  awayWinProb: number
  confidence: number
  confidenceLevel?: number
  confidenceLabel?: string
  scorePredictions: { score: string; probability: number; marketOdds?: number; valueEdge?: number }[]
  expectedHomeGoals: number
  expectedAwayGoals: number
  expectedTotalGoals: number
  overProb: number
  underProb: number
  overUnderLine: number | string
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  insight?: string
  risk?: string
  opportunity?: string
  keyInsights?: string[]
  riskFactors?: string[]
  opportunityFactors?: string[]
  methodNote?: string
  valueAnalysis?: any
  bettingOdds?: any
  marketProb?: any
  updatedAt: string
}

interface MatchData {
  matchId: string
  espnMatchId: string
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  venue: string
  startTime: string
  date: string
  status: string // pre | inprogress | finished
  period: string
  clock: string
  homeScore?: number
  awayScore?: number
  prediction: Prediction
  group?: string
}

// ============ Sub-components ============

function DimensionBar({ label, home, away, weight }: {
  label: string; home: number; away: number; weight: string
}) {
  const total = home + away
  const homePct = total > 0 ? (home / total) * 100 : 50
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-green-400">{home.toFixed(1)}</span>
        <span className="text-[#F7F5F0]/40">{label} <span className="text-[10px] text-[#F7F5F0]/20">({weight})</span></span>
        <span className="text-red-400">{away.toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden flex">
        <div className="bg-green-500/60" style={{ width: `${homePct}%` }} />
        <div className="bg-red-500/60" style={{ width: `${100 - homePct}%` }} />
      </div>
    </div>
  )
}

function ScoreCard({ score, prob, rank }: { score: string; prob: number; rank: number }) {
  const colors = ['text-[#B08D57]', 'text-[#F7F5F0]/60', 'text-[#F7F5F0]/40', 'text-[#F7F5F0]/30', 'text-[#F7F5F0]/20']
  return (
    <div className="bg-white/[0.04] rounded-lg p-2.5 text-center">
      <div className={`text-base font-bold ${colors[rank - 1] || 'text-[#F7F5F0]/20'}`}>{score}</div>
      <div className="text-[10px] text-[#F7F5F0]/30">{(prob * 100).toFixed(1)}%</div>
    </div>
  )
}

function LiveBadge({ clock }: { clock: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full animate-pulse">
      <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
      LIVE {clock}
    </span>
  )
}

function AnalysisReport({ pred, homeName, awayName }: { pred: Prediction; homeName: string; awayName: string }) {
  const recText = pred.recommendation === 'home'
    ? `主队 ${homeName} 胜`
    : pred.recommendation === 'away'
      ? `客队 ${awayName} 胜`
      : '平局'

  const conf = (pred.confidence || pred.confidenceLevel || 0.5) * 100

  return (
    <section className="bg-white/[0.03] border border-[#B08D57]/10 rounded-xl p-4 space-y-4">
      {/* Report header */}
      <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
        <span className="text-lg">📋</span>
        <h2 className="text-sm font-bold text-[#B08D57]">AI 分析报告</h2>
        {pred.methodNote && (
          <span className="ml-auto text-[10px] text-[#F7F5F0]/25 bg-white/[0.03] px-2 py-0.5 rounded-full">{pred.methodNote}</span>
        )}
      </div>

      {/* 1. 核心结论 */}
      <div className="bg-gradient-to-r from-[#B08D57]/8 to-transparent rounded-lg p-3 border border-[#B08D57]/15">
        <div className="text-[10px] text-[#B08D57]/60 uppercase tracking-wider mb-1">核心预测</div>
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-lg font-bold ${
              pred.recommendation === 'home' ? 'text-green-400' :
              pred.recommendation === 'away' ? 'text-red-400' : 'text-yellow-400'
            }`}>{recText}</span>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#F7F5F0]/40">置信度</div>
            <div className={`text-lg font-bold ${conf >= 75 ? 'text-green-400' : conf >= 55 ? 'text-yellow-400' : 'text-[#F7F5F0]/40'}`}>{conf.toFixed(0)}%</div>
          </div>
        </div>
      </div>

      {/* 2. 胜平负概率 */}
      <div>
        <div className="text-[10px] text-[#F7F5F0]/40 uppercase tracking-wider mb-2">胜平负概率分布</div>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="bg-green-500/8 rounded-lg p-2.5 text-center border border-green-500/10">
            <div className="text-xs text-[#F7F5F0]/40">主胜</div>
            <div className="text-xl font-bold text-green-400">{(pred.homeWinProb * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-yellow-500/8 rounded-lg p-2.5 text-center border border-yellow-500/10">
            <div className="text-xs text-[#F7F5F0]/40">平局</div>
            <div className="text-xl font-bold text-yellow-400">{(pred.drawProb * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-red-500/8 rounded-lg p-2.5 text-center border border-red-500/10">
            <div className="text-xs text-[#F7F5F0]/40">客胜</div>
            <div className="text-xl font-bold text-red-400">{(pred.awayWinProb * 100).toFixed(1)}%</div>
          </div>
        </div>
        {/* Probability bar */}
        <div className="flex h-6 rounded-full overflow-hidden text-[10px] font-bold">
          <div className="bg-green-500/70 flex items-center justify-center text-white" style={{ width: `${pred.homeWinProb * 100}%` }}>
            {pred.homeWinProb > 0.12 ? `${(pred.homeWinProb * 100).toFixed(0)}%` : ''}
          </div>
          <div className="bg-yellow-500/70 flex items-center justify-center text-black" style={{ width: `${pred.drawProb * 100}%` }}>
            {pred.drawProb > 0.12 ? `${(pred.drawProb * 100).toFixed(0)}%` : ''}
          </div>
          <div className="bg-red-500/70 flex items-center justify-center text-white" style={{ width: `${pred.awayWinProb * 100}%` }}>
            {pred.awayWinProb > 0.12 ? `${(pred.awayWinProb * 100).toFixed(0)}%` : ''}
          </div>
        </div>
        <div className="flex justify-between text-[9px] text-[#F7F5F0]/25 mt-1">
          <span>{homeName}</span><span>平局</span><span>{awayName}</span>
        </div>
      </div>

      {/* 3. 波胆预测 */}
      <div>
        <div className="text-[10px] text-[#F7F5F0]/40 uppercase tracking-wider mb-2">波胆预测（最可能比分 Top 5）</div>
        <div className="grid grid-cols-5 gap-1.5">
          {pred.scorePredictions.map((s: any, i: number) => (
            <div key={s.score} className={`rounded-lg p-2 text-center ${i === 0 ? 'bg-[#B08D57]/10 border border-[#B08D57]/20' : 'bg-white/[0.03]'}`}>
              <div className={`text-base font-bold ${i === 0 ? 'text-[#B08D57]' : 'text-[#F7F5F0]/70'}`}>{s.score}</div>
              <div className="text-[10px] text-[#F7F5F0]/30">{(s.probability * 100).toFixed(1)}%</div>
              {s.marketOdds && <div className="text-[9px] text-[#F7F5F0]/20">@{s.marketOdds.toFixed(2)}</div>}
              {s.valueEdge !== undefined && s.valueEdge > 0 && (
                <div className="text-[9px] text-green-400 mt-0.5">+{(s.valueEdge * 100).toFixed(1)}%</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. 进球数分析 */}
      <div>
        <div className="text-[10px] text-[#F7F5F0]/40 uppercase tracking-wider mb-2">进球数预期</div>
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
            <div className="text-[10px] text-[#F7F5F0]/35">主队期望</div>
            <div className="text-lg font-bold text-green-400">{pred.expectedHomeGoals.toFixed(2)}</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
            <div className="text-[10px] text-[#F7F5F0]/35">客队期望</div>
            <div className="text-lg font-bold text-red-400">{pred.expectedAwayGoals.toFixed(2)}</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
            <div className="text-[10px] text-[#F7F5F0]/35">总期望</div>
            <div className="text-lg font-bold text-[#B08D57]">{pred.expectedTotalGoals.toFixed(2)}</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
            <div className="text-[10px] text-[#F7F5F0]/35">盘口线</div>
            <div className="text-lg font-bold text-blue-400">{String(pred.overUnderLine)}</div>
          </div>
        </div>
        {/* Over/Under */}
        <div className="mt-2 flex items-center gap-3">
          <div className="flex-1 bg-blue-500/8 rounded-lg p-2.5 text-center border border-blue-500/10">
            <div className="text-[10px] text-blue-400/60">大球 {pred.overUnderLine}</div>
            <div className="text-lg font-bold text-blue-400">{(pred.overProb * 100).toFixed(1)}%</div>
          </div>
          <div className="flex-1 bg-purple-500/8 rounded-lg p-2.5 text-center border border-purple-500/10">
            <div className="text-[10px] text-purple-400/60">小球 {pred.overUnderLine}</div>
            <div className="text-lg font-bold text-purple-400">{(pred.underProb * 100).toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* 5. MSI 六维对比 */}
      <div>
        <div className="text-[10px] text-[#F7F5F0]/40 uppercase tracking-wider mb-2">MSI 六维实力对比</div>
        <div className="space-y-2">
          <DimensionBar label="阵容深度" home={pred.homeTeam.rosterDepth} away={pred.awayTeam.rosterDepth} weight="25%" />
          <DimensionBar label="战术体系" home={pred.homeTeam.tacticalSystem} away={pred.awayTeam.tacticalSystem} weight="25%" />
          <DimensionBar label="关键球员" home={pred.homeTeam.keyPlayerImpact} away={pred.awayTeam.keyPlayerImpact} weight="20%" />
          <DimensionBar label="教练决策" home={pred.homeTeam.coachDecision} away={pred.awayTeam.coachDecision} weight="15%" />
          <DimensionBar label="对阵数据" home={pred.homeTeam.matchupData} away={pred.awayTeam.matchupData} weight="10%" />
          <DimensionBar label="心理意志" home={pred.homeTeam.mentalResilience} away={pred.awayTeam.mentalResilience} weight="5%" />
          <div className="pt-2 mt-2 border-t border-white/[0.06] flex items-center justify-center gap-4">
            <span className="text-green-400 font-bold">{pred.homeTeam.msiScore.toFixed(2)}</span>
            <span className="text-[#F7F5F0]/20 text-xs">MSI 综合评分</span>
            <span className="text-red-400 font-bold">{pred.awayTeam.msiScore.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 6. AI 洞察 */}
      {(pred.keyInsights?.length || pred.insight) && (
        <div>
          <div className="text-[10px] text-[#F7F5F0]/40 uppercase tracking-wider mb-2">🔍 AI 分析洞察</div>
          <div className="space-y-1.5">
            {pred.keyInsights?.map((insight: string, i: number) => (
              <div key={i} className="bg-white/[0.02] rounded-lg px-3 py-2 text-xs text-[#F7F5F0]/65 leading-relaxed">
                • {insight}
              </div>
            ))}
            {pred.insight && !pred.keyInsights?.length && (
              <div className="bg-[#B08D57]/8 border border-[#B08D57]/12 rounded-lg px-3 py-2 text-xs text-[#F7F5F0]/65">
                💡 {pred.insight}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. 风险提示 */}
      {(pred.riskFactors?.length || pred.risk) && (
        <div>
          <div className="text-[10px] text-[#F7F5F0]/40 uppercase tracking-wider mb-2">⚠️ 风险因素</div>
          <div className="space-y-1.5">
            {pred.riskFactors?.map((rf: string, i: number) => (
              <div key={i} className="bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2 text-xs text-[#F7F5F0]/55">
                ⚠ {rf}
              </div>
            ))}
            {pred.risk && !pred.riskFactors?.length && (
              <div className="bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2 text-xs text-[#F7F5F0]/55">
                ⚠ {pred.risk}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. 投注机会 */}
      {(pred.opportunityFactors?.length || pred.opportunity || pred.valueAnalysis?.bestBet) && (
        <div>
          <div className="text-[10px] text-[#F7F5F0]/40 uppercase tracking-wider mb-2">💰 价值机会</div>
          <div className="space-y-1.5">
            {pred.opportunityFactors?.map((opp: string, i: number) => (
              <div key={i} className="bg-green-500/5 border border-green-500/10 rounded-lg px-3 py-2 text-xs text-[#F7F5F0]/65">
                💰 {opp}
              </div>
            ))}
            {pred.valueAnalysis?.bestBet && (
              <div className="bg-green-500/8 border border-green-500/15 rounded-lg px-3 py-2 text-xs text-green-300">
                🎯 最佳价值投注：{pred.valueAnalysis.bestBet === 'home' ? homeName :
                  pred.valueAnalysis.bestBet === 'away' ? awayName : '平局'}
                （Kelly建议 {(pred.valueAnalysis.kellyFraction * 100).toFixed(1)}%）
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

// ============ Main Page ============

export default function MatchPage({ params }: { params: { matchId: string } }) {
  const { matchId } = params
  const [data, setData] = useState<MatchData | null>(null)
  const [liveUpdate, setLiveUpdate] = useState<any>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    fetch(`/api/predict?matchId=${matchId}`)
      .then(r => r.json())
      .then(j => {
        if (j.data?.length > 0) {
          setData(j.data[0])
          setError('')
        } else {
          setError('未找到该比赛的预测数据')
        }
        setLoading(false)
      })
      .catch(() => { setError('加载失败'); setLoading(false) })
  }, [matchId])

  useEffect(() => {
    const es = new EventSource('/api/predictions-sse')
    esRef.current = es
    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if ((msg.type === 'init' || msg.type === 'update') && msg.matches?.[matchId]) {
          setLiveUpdate(msg.matches[matchId])
        }
      } catch { /* ignore */ }
    }
    return () => { es.close(); esRef.current = null }
  }, [matchId])

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-[#F7F5F0]/30">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#B08D57]/30 border-t-[#B08D57] rounded-full mx-auto mb-3" />
        <p>正在生成分析报告...</p>
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
      <img src="/logo.png" alt="" className="w-16 h-16 mb-4 opacity-30" />
      <div className="text-[#F7F5F0]/50 mb-4">{error || '未找到该比赛'}</div>
      <Link href="/" className="text-[#B08D57] hover:underline text-sm">← 返回首页</Link>
    </div>
  )

  const d = data
  const isFinished = liveUpdate?.status === 'finished' || d.status === 'finished'
  const isLive = liveUpdate?.status === 'inprogress' || d.status === 'inprogress'
  const liveScore = liveUpdate ? { home: liveUpdate.homeScore, away: liveUpdate.awayScore } : null

  const dateStr = new Date(d.startTime).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })
  const timeStr = new Date(d.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })

  const pred = liveUpdate?.prediction || d.prediction

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#F7F5F0]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#111111]/95 backdrop-blur border-b border-white/5 px-4 py-2.5 flex items-center gap-3">
        <Link href="/" className="text-[#B08D57] hover:text-[#c9a56a] text-sm">← 返回</Link>
        <div className="flex items-center gap-2 ml-auto">
          <span className={`text-[10px] ${connected ? 'text-green-400' : 'text-red-400'}`}>
            {connected ? '● 实时' : '○ 离线'}
          </span>
          {d.group && <span className="text-[10px] text-[#B08D57]/50 bg-[#B08D57]/8 px-2 py-0.5 rounded-full">G{d.group}</span>}
        </div>
      </header>

      {/* Match header */}
      <div className="bg-[#111111] border-b border-white/5 px-4 py-5">
        <div className="max-w-md mx-auto">
          {/* Group + Date */}
          <div className="text-center text-xs text-[#F7F5F0]/25 mb-3">
            {dateStr} · 第{d.group || '?'}组 · {d.venue || ''}
          </div>
          {/* Teams */}
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              {d.homeTeam.logo && <img src={d.homeTeam.logo} alt="" className="w-14 h-14 mx-auto mb-1.5 object-contain" />}
              <div className="text-base font-bold">{d.homeTeam.teamName}</div>
              <div className="text-xs text-[#B08D57]">MSI {d.homeTeam.msiScore.toFixed(2)}</div>
            </div>
            <div className="text-center px-5">
              {isLive || isFinished ? (
                <>
                  <div className={`text-4xl font-bold tabular-nums ${isFinished ? 'text-[#F7F5F0]/80' : ''}`}>
                    <span className={liveScore && liveScore.home > liveScore.away ? 'text-green-400' : ''}>
                      {liveScore?.home ?? d.homeScore ?? 0}
                    </span>
                    <span className="text-[#B08D57] mx-2">:</span>
                    <span className={liveScore && liveScore.away > liveScore.home ? 'text-green-400' : ''}>
                      {liveScore?.away ?? d.awayScore ?? 0}
                    </span>
                  </div>
                  {isLive && <LiveBadge clock={liveUpdate?.clock || d.clock} />}
                  {isFinished && <div className="text-xs text-[#F7F5F0]/30 mt-1">已结束</div>}
                </>
              ) : (
                <>
                  <div className="text-3xl text-[#F7F5F0]/20 font-bold">VS</div>
                  <div className="text-xs text-[#F7F5F0]/30 mt-1">{timeStr}</div>
                </>
              )}
            </div>
            <div className="text-center flex-1">
              {d.awayTeam.logo && <img src={d.awayTeam.logo} alt="" className="w-14 h-14 mx-auto mb-1.5 object-contain" />}
              <div className="text-base font-bold">{d.awayTeam.teamName}</div>
              <div className="text-xs text-[#B08D57]">MSI {d.awayTeam.msiScore.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {isFinished ? (
          /* Finished: result only */
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 text-center space-y-4">
            <div className="text-sm text-[#F7F5F0]/40">比赛已结束</div>
            <div className="text-5xl font-bold tabular-nums">
              <span className="text-green-400">{liveScore?.home ?? d.homeScore ?? 0}</span>
              <span className="text-[#B08D57] mx-3">:</span>
              <span className="text-red-400">{liveScore?.away ?? d.awayScore ?? 0}</span>
            </div>
            <div className="text-xs text-[#F7F5F0]/25">最终比分 · 预测内容已隐藏</div>
            {pred && (
              <div className="pt-4 border-t border-white/[0.06]">
                <div className="text-xs text-[#F7F5F0]/30 mb-2">赛前预测回顾</div>
                <div className="inline-block bg-white/[0.03] rounded-lg px-4 py-2">
                  <span className={
                    pred.recommendation === 'home' ? 'text-green-400' :
                    pred.recommendation === 'away' ? 'text-red-400' : 'text-yellow-400'
                  }>
                    {pred.recommendation === 'home' ? d.homeTeam.teamName :
                     pred.recommendation === 'away' ? d.awayTeam.teamName : '平局'}胜
                  </span>
                  <span className="text-[#B08D57] ml-2">置信度 {(pred.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Full analysis report */
          <AnalysisReport pred={pred} homeName={d.homeTeam.teamName} awayName={d.awayTeam.teamName} />
        )}
      </div>

      <div className="text-center text-[#F7F5F0]/8 text-xs pb-8">
        蚂蚁足球 · 高精度世界杯预测 · 仅供参考 · 请理性对待
      </div>
    </div>
  )
}
