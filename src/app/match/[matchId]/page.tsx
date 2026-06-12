'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

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
  scorePredictions: { score: string; probability: number }[]
  expectedHomeGoals: number
  expectedAwayGoals: number
  expectedTotalGoals: number
  overProb: number
  underProb: number
  overUnderLine: string
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  insight: string
  risk: string
  opportunity: string
  updatedAt: string
}

interface MatchData {
  matchId: string
  espnMatchId: string
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  venue: string
  startTime: string
  status: string
  period: string
  clock: string
  homeScore?: number
  awayScore?: number
  prediction: Prediction
}

function DimensionBar({ label, home, away, weight }: {
  label: string
  home: number
  away: number
  weight: string
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
    <div className="bg-white/[0.04] rounded-lg p-2 text-center">
      <div className={`text-sm font-bold ${colors[rank - 1] || 'text-[#F7F5F0]/20'}`}>{score}</div>
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

  // Real-time updates via SSE
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
      加载比赛数据中...
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
      <div className="text-4xl mb-4 text-[#F7F5F0]/20">⚽</div>
      <div className="text-[#F7F5F0]/50 mb-4">{error || '未找到该比赛'}</div>
      <Link href="/" className="text-[#B08D57] hover:underline text-sm">← 返回首页</Link>
    </div>
  )

  const d = data
  const isFinished = liveUpdate?.status === 'finished' || d.status === 'finished'
  const isLive = liveUpdate?.status === 'inprogress' || d.status === 'inprogress'
  const liveScore = liveUpdate ? { home: liveUpdate.homeScore, away: liveUpdate.awayScore } : null

  const dateStr = new Date(d.startTime).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  const timeStr = new Date(d.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  const pred = liveUpdate?.prediction || d.prediction

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#F7F5F0]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#111111]/90 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-[#B08D57] hover:text-[#c9a56a]">←</Link>
        <span className="text-sm font-medium text-[#F7F5F0]/50">
          <span className={connected ? 'text-green-400' : 'text-red-400'}>{connected ? '●' : '○'}</span>
          {connected ? ' 实时' : ' 离线'}
        </span>
        <span className="text-xs text-[#F7F5F0]/30 ml-auto">{dateStr}</span>
      </header>

      {/* Match header */}
      <div className="bg-[#111111] border-b border-white/5 px-4 py-6">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="text-center flex-1">
            {d.homeTeam.logo && <img src={d.homeTeam.logo} alt="" className="w-14 h-14 mx-auto mb-2 object-contain" />}
            <div className="text-base font-bold">{d.homeTeam.teamName}</div>
            <div className="text-xs text-[#B08D57]">MSI {d.homeTeam.msiScore.toFixed(2)}</div>
          </div>
          <div className="text-center px-5">
            {isLive || isFinished ? (
              <>
                <div className={`text-4xl font-bold tabular-nums ${isFinished ? 'text-[#F7F5F0]/80' : 'text-[#F7F5F0]'}`}>
                  {liveScore?.home ?? d.homeScore ?? 0}
                  <span className="text-[#B08D57] mx-2">:</span>
                  {liveScore?.away ?? d.awayScore ?? 0}
                </div>
                {isLive && <LiveBadge clock={liveUpdate?.clock || d.clock} />}
                {isFinished && <div className="text-xs text-[#F7F5F0]/30 mt-1">已结束</div>}
              </>
            ) : (
              <div className="text-2xl text-[#F7F5F0]/30">VS</div>
            )}
            <div className="text-xs text-[#F7F5F0]/30 mt-1">{timeStr}</div>
          </div>
          <div className="text-center flex-1">
            {d.awayTeam.logo && <img src={d.awayTeam.logo} alt="" className="w-14 h-14 mx-auto mb-2 object-contain" />}
            <div className="text-base font-bold">{d.awayTeam.teamName}</div>
            <div className="text-xs text-[#B08D57]">MSI {d.awayTeam.msiScore.toFixed(2)}</div>
          </div>
        </div>
        {d.venue && <div className="text-center text-xs text-[#F7F5F0]/20 mt-2">{d.venue}</div>}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Finished: show result only, no predictions */}
        {isFinished ? (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 text-center">
            <div className="text-lg text-[#B08D57] font-bold mb-3">📝 比赛已结束</div>
            <div className="text-5xl font-bold tabular-nums mb-4">
              <span className="text-green-400">{liveScore?.home ?? d.homeScore ?? 0}</span>
              <span className="text-[#B08D57] mx-3">:</span>
              <span className="text-red-400">{liveScore?.away ?? d.awayScore ?? 0}</span>
            </div>
            <div className="text-xs text-[#F7F5F0]/30">最终比分 · 预测内容已隐藏</div>
            {pred && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-xs text-[#F7F5F0]/30">赛前预测回顾</div>
                <div className="mt-2 text-sm">
                  {pred.recommendation === 'home' ? d.homeTeam.teamName :
                   pred.recommendation === 'away' ? d.awayTeam.teamName : '平局'}
                  {' '}胜
                  <span className="text-[#B08D57] ml-2">置信度 {(pred.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* 1. Win/Draw/Loss prediction */}
            <section>
              <h2 className="text-sm font-bold text-[#B08D57] mb-3 flex items-center gap-2">
                📊 胜平负预测
                {connected && isLive && (
                  <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded animate-pulse">
                    实时更新
                  </span>
                )}
              </h2>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-center">
                    <div className="text-xs text-[#F7F5F0]/40">主胜</div>
                    <div className="text-xl font-bold text-green-400">{(pred.homeWinProb * 100).toFixed(1)}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-[#F7F5F0]/40">平局</div>
                    <div className="text-xl font-bold text-yellow-400">{(pred.drawProb * 100).toFixed(1)}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-[#F7F5F0]/40">客胜</div>
                    <div className="text-xl font-bold text-red-400">{(pred.awayWinProb * 100).toFixed(1)}%</div>
                  </div>
                </div>
                <div className="flex h-7 rounded-full overflow-hidden text-xs font-bold mb-2">
                  <div className="bg-green-500/80 flex items-center justify-center text-white" style={{ width: `${pred.homeWinProb * 100}%` }}>
                    {pred.homeWinProb > 0.15 ? `${(pred.homeWinProb * 100).toFixed(1)}%` : ''}
                  </div>
                  <div className="bg-yellow-500/80 flex items-center justify-center text-black" style={{ width: `${pred.drawProb * 100}%` }}>
                    {pred.drawProb > 0.15 ? `${(pred.drawProb * 100).toFixed(1)}%` : ''}
                  </div>
                  <div className="bg-red-500/80 flex items-center justify-center text-white" style={{ width: `${pred.awayWinProb * 100}%` }}>
                    {pred.awayWinProb > 0.15 ? `${(pred.awayWinProb * 100).toFixed(1)}%` : ''}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-[#F7F5F0]/30 mb-2">
                  <span>主胜 {d.homeTeam.teamName}</span><span>平局</span><span>客胜 {d.awayTeam.teamName}</span>
                </div>
                <div className="text-center text-xs text-[#B08D57] mt-2">
                  💡 {pred.recommendation === 'home' ? `推荐: ${d.homeTeam.teamName}胜` :
                       pred.recommendation === 'away' ? `推荐: ${d.awayTeam.teamName}胜` : '推荐: 平局'}
                  {' '}· 置信度 {(pred.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </section>

            {/* 2. Top 5 score predictions */}
            <section>
              <h2 className="text-sm font-bold text-[#B08D57] mb-3">🎯 波胆预测 Top 5</h2>
              <div className="grid grid-cols-5 gap-2">
                {pred.scorePredictions.map((s: any, i: number) => (
                  <ScoreCard key={s.score} score={s.score} prob={s.probability} rank={i + 1} />
                ))}
              </div>
            </section>

            {/* 3. Goals prediction */}
            <section>
              <h2 className="text-sm font-bold text-[#B08D57] mb-3">⚽ 进球数预测</h2>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="grid grid-cols-3 gap-4 text-center mb-4">
                  <div>
                    <div className="text-xs text-[#F7F5F0]/40">主队期望</div>
                    <div className="text-xl font-bold text-green-400">{pred.expectedHomeGoals.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#F7F5F0]/40">总期望</div>
                    <div className="text-xl font-bold text-[#B08D57]">{pred.expectedTotalGoals.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#F7F5F0]/40">客队期望</div>
                    <div className="text-xl font-bold text-red-400">{pred.expectedAwayGoals.toFixed(2)}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                  <div className="text-center flex-1">
                    <div className="text-xs text-blue-400">大球 {pred.overUnderLine}</div>
                    <div className="text-lg font-bold text-blue-400">{(pred.overProb * 100).toFixed(1)}%</div>
                  </div>
                  <div className="w-px h-10 bg-white/10" />
                  <div className="text-center flex-1">
                    <div className="text-xs text-purple-400">小球 {pred.overUnderLine}</div>
                    <div className="text-lg font-bold text-purple-400">{(pred.underProb * 100).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. MSI 6-dimension */}
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

            {/* 5. Insights */}
            <section>
              <h2 className="text-sm font-bold text-[#B08D57] mb-3">💡 AI分析洞察</h2>
              <div className="space-y-2">
                {pred.insight && (
                  <div className="bg-[#B08D57]/8 border border-[#B08D57]/15 rounded-lg p-3 text-xs text-[#F7F5F0]/70">
                    <span className="text-[#B08D57] font-bold">洞察</span> {pred.insight}
                  </div>
                )}
                {pred.risk && (
                  <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-3 text-xs text-[#F7F5F0]/70">
                    <span className="text-red-400 font-bold">风险</span> {pred.risk}
                  </div>
                )}
                {pred.opportunity && (
                  <div className="bg-green-500/5 border border-green-500/15 rounded-lg p-3 text-xs text-[#F7F5F0]/70">
                    <span className="text-green-400 font-bold">机会</span> {pred.opportunity}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      <div className="text-center text-[#F7F5F0]/10 text-xs pb-8">
        仅供参考 · 请理性对待
      </div>
    </div>
  )
}
