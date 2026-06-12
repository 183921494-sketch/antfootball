'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
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

function ConnectionDot({ connected }: { connected: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
  )
}

function PredictionCard({ item, liveData, onUpdate }: {
  item: MatchData
  liveData?: { homeScore: number; awayScore: number; status: string; clock: string; updatedAt: number }
  onUpdate?: (u: any) => void
}) {
  const p = item.prediction
  const isLive = liveData?.status === 'inprogress' || item.status === 'inprogress'
  const isFinished = liveData?.status === 'finished' || item.status === 'finished'

  const homeScore = liveData?.homeScore ?? item.homeScore ?? 0
  const awayScore = liveData?.awayScore ?? item.awayScore ?? 0
  const clock = liveData?.clock || item.clock || ''

  const conf = p.confidence
  const confColor = conf >= 0.75 ? 'text-green-400' : conf >= 0.6 ? 'text-yellow-400' : 'text-[#F7F5F0]/40'
  const confBadge = conf >= 0.75 ? '🔥 高置信' : conf >= 0.6 ? '⚡ 中置信' : '📊 低置信'

  const recColor = p.recommendation === 'home' ? 'text-green-400' : p.recommendation === 'away' ? 'text-red-400' : 'text-yellow-400'

  return (
    <Link href={`/match/${item.matchId}`} className="block">
      <div className={`bg-white/[0.03] border rounded-xl p-4 hover:border-[#B08D57]/30 transition cursor-pointer ${isLive ? 'border-red-500/30' : 'border-white/[0.06]'}`}>
        {/* Status bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isLive && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded animate-pulse">直播中</span>}
            {isFinished && <span className="text-xs bg-white/10 text-[#F7F5F0]/50 px-2 py-0.5 rounded">已结束</span>}
            {clock && isLive && <span className="text-xs text-red-400 font-mono">{clock}</span>}
          </div>
          <span className={`text-xs ${confColor}`}>{confBadge} {conf >= 0 ? (conf * 100).toFixed(0) + '%' : '--'}</span>
        </div>

        {/* Teams & Score */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-center flex-1">
            {item.homeTeam.logo && <img src={item.homeTeam.logo} alt="" className="w-10 h-10 mx-auto mb-1 object-contain" />}
            <div className="text-sm font-bold text-[#F7F5F0]">{item.homeTeam.teamName}</div>
            <div className="text-xs text-[#F7F5F0]/30">MSI {item.homeTeam.msiScore.toFixed(2)}</div>
          </div>
          <div className="text-center px-4">
            {isLive || isFinished ? (
              <div className="text-2xl font-bold text-[#F7F5F0] tabular-nums">
                <span className={parseInt(String(homeScore)) > parseInt(String(awayScore)) ? 'text-green-400' : ''}>{homeScore}</span>
                <span className="text-[#B08D57] mx-1">:</span>
                <span className={parseInt(String(awayScore)) > parseInt(String(homeScore)) ? 'text-green-400' : ''}>{awayScore}</span>
              </div>
            ) : (
              <div className="text-lg text-[#F7F5F0]/30">VS</div>
            )}
          </div>
          <div className="text-center flex-1">
            {item.awayTeam.logo && <img src={item.awayTeam.logo} alt="" className="w-10 h-10 mx-auto mb-1 object-contain" />}
            <div className="text-sm font-bold text-[#F7F5F0]">{item.awayTeam.teamName}</div>
            <div className="text-xs text-[#F7F5F0]/30">MSI {item.awayTeam.msiScore.toFixed(2)}</div>
          </div>
        </div>

        {/* Probability bars */}
        <div className="flex h-6 rounded-full overflow-hidden text-xs font-bold mb-1.5">
          <div className="bg-green-500/60 flex items-center justify-center text-white" style={{ width: `${p.homeWinProb * 100}%` }}>
            {p.homeWinProb > 0.15 ? `${(p.homeWinProb * 100).toFixed(0)}%` : ''}
          </div>
          <div className="bg-yellow-500/60 flex items-center justify-center text-black" style={{ width: `${p.drawProb * 100}%` }}>
            {p.drawProb > 0.15 ? `${(p.drawProb * 100).toFixed(0)}%` : ''}
          </div>
          <div className="bg-red-500/60 flex items-center justify-center text-white" style={{ width: `${p.awayWinProb * 100}%` }}>
            {p.awayWinProb > 0.15 ? `${(p.awayWinProb * 100).toFixed(0)}%` : ''}
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-[#F7F5F0]/30">
          <span className="text-green-400/60">主胜</span>
          <span className="text-yellow-400/60">平局</span>
          <span className="text-red-400/60">客胜</span>
        </div>

        {/* Top score */}
        {p.scorePredictions?.[0] && (
          <div className="mt-2 text-center text-xs text-[#B08D57]">
            波胆: {p.scorePredictions[0].score} ({(p.scorePredictions[0].probability * 100).toFixed(1)}%)
          </div>
        )}
      </div>
    </Link>
  )
}

export default function HomePage() {
  const [data, setData] = useState<{ matches: MatchData[] } | null>(null)
  const [liveData, setLiveData] = useState<Record<string, any>>({})
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [auth, setAuth] = useState<{ authenticated: boolean; user?: any } | null>(null)
  const esRef = useRef<EventSource | null>(null)

  // Check auth status
  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then(j => setAuth(j))
  }, [])

  // Fetch all predictions
  useEffect(() => {
    fetch('/api/predict?all=1')
      .then(r => r.json())
      .then(j => { setData(j); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Connect to real-time SSE
  useEffect(() => {
    const es = new EventSource('/api/predictions-sse')
    esRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'init' || msg.type === 'update') {
          setLiveData(msg.matches)
        }
      } catch { /* ignore parse errors */ }
    }

    return () => { es.close(); esRef.current = null }
  }, [])

  if (!auth) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-[#F7F5F0]/30">加载中...</div>
    </div>
  )

  if (!auth.authenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🐜</div>
          <h1 className="text-3xl font-bold text-[#B08D57] mb-2">蚂蚁足球</h1>
          <p className="text-[#F7F5F0]/40 mb-8 text-sm">高精度世界杯预测系统</p>
          <Link href="/login" className="inline-block bg-[#B08D57] hover:bg-[#9a7a4a] text-black font-bold px-8 py-3 rounded-lg transition">
            登录后查看预测
          </Link>
          <p className="text-[#F7F5F0]/20 text-xs mt-6">足球世界杯 · 精准预测 · 仅供参考</p>
        </div>
      </div>
    )
  }

  const matches = data?.matches || []
  const liveMatches = matches.filter((m: any) => liveData[m.matchId]?.status === 'inprogress' || m.status === 'inprogress')
  const upcomingMatches = matches.filter((m: any) => m.status === 'pre' && !liveData[m.matchId]?.status)
  const otherMatches = matches.filter((m: any) => {
    const ld = liveData[m.matchId]
    return m.status === 'pre' && ld?.status !== 'inprogress'
  })

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#F7F5F0]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#111111]/90 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#B08D57]">🐜 蚂蚁足球</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#F7F5F0]/40">
            <ConnectionDot connected={connected} />
            <span className="ml-1.5">{connected ? '实时连接' : '重连中'}</span>
          </span>
          <span className="text-xs text-[#F7F5F0]/50">{auth.user?.nickname}</span>
          {auth.user?.role === 'super_admin' && (
            <Link href="/admin" className="text-xs text-[#B08D57]/70 hover:text-[#B08D57]">管理</Link>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* Hero */}
        <div className="text-center py-4">
          <h2 className="text-2xl font-bold text-[#B08D57] mb-1">⚽ 高精度预测</h2>
          <p className="text-[#F7F5F0]/30 text-sm">结合博彩市场赔率 + MSI六维模型 · 实时动态更新</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#F7F5F0]/30">加载预测数据中...</div>
        ) : (
          <>
            {/* Live matches */}
            {liveMatches.length > 0 && (
              <section>
                <h3 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
                  <span className="animate-pulse">●</span> 正在直播 ({liveMatches.length})
                </h3>
                <div className="space-y-3">
                  {liveMatches.map((m: any) => (
                    <PredictionCard key={m.matchId} item={m} liveData={liveData[m.matchId]} />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming matches */}
            {matches.filter((m: any) => m.status === 'pre').length > 0 && (
              <section>
                <h3 className="text-sm font-bold text-[#F7F5F0]/50 mb-3">
                  📅 即将开始 ({matches.filter((m: any) => m.status === 'pre').length})
                </h3>
                <div className="space-y-3">
                  {matches.filter((m: any) => m.status === 'pre').map((m: any) => (
                    <PredictionCard key={m.matchId} item={m} liveData={liveData[m.matchId]} />
                  ))}
                </div>
              </section>
            )}

            {/* Finished — only show score, no prediction */}
            {matches.filter((m: any) => m.status === 'finished').length > 0 && (
              <section>
                <h3 className="text-sm font-bold text-[#F7F5F0]/20 mb-3">
                  ✓ 已结束 ({matches.filter((m: any) => m.status === 'finished').length})
                </h3>
                <div className="space-y-3">
                  {matches.filter((m: any) => m.status === 'finished').map((m: any) => (
                    <div key={m.matchId} className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-4 opacity-60">
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-center flex-1">
                          <div className="font-bold text-[#F7F5F0]/60">{m.homeTeam.teamName}</div>
                          <div className="text-xs text-[#F7F5F0]/30">MSI {m.homeTeam.msiScore.toFixed(2)}</div>
                        </div>
                        <div className="px-4 text-lg font-bold text-[#F7F5F0]/40">
                          {m.homeScore ?? 0} : {m.awayScore ?? 0}
                        </div>
                        <div className="text-center flex-1">
                          <div className="font-bold text-[#F7F5F0]/60">{m.awayTeam.teamName}</div>
                          <div className="text-xs text-[#F7F5F0]/30">MSI {m.awayTeam.msiScore.toFixed(2)}</div>
                        </div>
                      </div>
                      <div className="text-center text-xs text-[#F7F5F0]/20 mt-2">已结束 · 预测内容已隐藏</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {matches.length === 0 && (
              <div className="text-center py-20 text-[#F7F5F0]/30">
                <div className="text-4xl mb-4">⚽</div>
                <p>暂无比赛数据</p>
                <p className="text-xs mt-2">世界杯期间实时更新</p>
              </div>
            )}
          </>
        )}

        <div className="text-center text-[#F7F5F0]/15 text-xs pb-8">
          足球世界杯 · 精准预测 · 仅供参考 · 请理性对待
        </div>
      </div>
    </div>
  )
}
