'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
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

interface Top5Item {
  score: string
  probability: number
  marketOdds?: number
  valueEdge?: number
  rank: number
  probLabel: string
  reason: string
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
  top5Analysis?: Top5Item[]
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
  updatedAt: string
}

interface MatchData {
  matchId: string
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  homeTeamAbbrev: string
  awayTeamAbbrev: string
  venue: string
  startTime: string
  date: string
  status: string
  group?: string
  homeScore?: number
  awayScore?: number
  prediction: Prediction | null
  blurred?: boolean  // VIP用户不可查看的比赛（未开始且超过2场）
}

type TabType = 'all' | 'live' | 'upcoming' | 'finished'
type GroupBy = 'date' | 'group'

// ============ Components ============

function ConnectionDot({ connected }: { connected: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
  )
}

function PredictionCard({ item, liveData, compact }: {
  item: MatchData
  liveData?: { homeScore: number; awayScore: number; status: string; clock: string; updatedAt: number }
  compact?: boolean
}) {
  const p = item.prediction
  const isLive = liveData?.status === 'inprogress' || item.status === 'inprogress'
  const isFinished = liveData?.status === 'finished' || item.status === 'finished'
  const isBlurred = item.blurred && !isFinished  // 已完赛不模糊

  const homeScore = liveData?.homeScore ?? item.homeScore ?? 0
  const awayScore = liveData?.awayScore ?? item.awayScore ?? 0
  const clock = liveData?.clock || ''

  // Format time
  const timeStr = new Date(item.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })

  // 模糊处理的卡片
  if (isBlurred) {
    return (
      <div className="relative bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 overflow-hidden">
        {/* 模糊内容 */}
        <div className="filter blur-[8px] pointer-events-none select-none">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#F7F5F0]/20 font-mono">{timeStr}</span>
            <span className="text-[10px] text-[#F7F5F0]/20">🔒 需升级</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm text-[#F7F5F0]/20">{item.homeTeam.teamName}</span>
            <span className="text-sm text-[#F7F5F0]/20">VS</span>
            <span className="font-bold text-sm text-[#F7F5F0]/20">{item.awayTeam.teamName}</span>
          </div>
          <div className="h-5 bg-white/5 rounded-full mb-1" />
        </div>
        
        {/* 升级提示覆盖层 */}
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/80 rounded-xl">
          <div className="text-center">
            <div className="text-3xl mb-2">🔒</div>
            <p className="text-sm font-bold text-[#B08D57] mb-1">VIP限制</p>
            <p className="text-xs text-[#F7F5F0]/50 mb-3">升级SVIP查看完整预测</p>
            <Link 
              href="/admin" 
              className="text-xs bg-[#B08D57] text-black px-3 py-1.5 rounded-full font-medium hover:bg-[#B08D57]/80 transition"
            >
              立即升级
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 正常卡片（清晰显示）
  if (!p) return null
  const conf = p.confidence || p.confidenceLevel || 0.5
  const confColor = conf >= 0.75 ? 'text-green-400' : conf >= 0.6 ? 'text-yellow-400' : 'text-[#F7F5F0]/40'
  const confBadge = conf >= 0.75 ? '🔥 高置信' : conf >= 0.6 ? '⚡ 中置信' : '📊 低置信'

  const recColor = p.recommendation === 'home' ? 'text-green-400' : p.recommendation === 'away' ? 'text-red-400' : 'text-yellow-400'
  const recText = p.recommendation === 'home'
    ? `${item.homeTeam.teamName}胜`
    : p.recommendation === 'away'
      ? `${item.awayTeam.teamName}胜`
      : '平局'

  return (
    <Link href={isBlurred ? '#' : `/match/${item.matchId}`} className={`block ${isBlurred ? 'cursor-default' : ''}`} onClick={isBlurred ? (e) => { e.preventDefault(); alert('VIP账号仅可查看2场未开始赛事\n升级SVIP解锁全部预测'); } : undefined}>
      <div className={`bg-white/[0.03] border rounded-xl hover:border-[#B08D57]/30 transition cursor-pointer ${isLive ? 'border-red-500/30' : 'border-white/[0.06]'} ${compact ? 'p-3' : 'p-4'}`}>
        {/* Status + Time row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isLive && <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded animate-pulse font-mono">{clock}'</span>}
            {isFinished && <span className="text-xs bg-white/10 text-[#F7F5F0]/50 px-1.5 py-0.5 rounded">完</span>}
            {!isLive && !isFinished && <span className="text-xs text-[#F7F5F0]/30 font-mono">{timeStr}</span>}
          </div>
          <span className={`text-[10px] ${confColor}`}>{confBadge}</span>
        </div>

        {/* Teams & Score */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {item.homeTeam.logo && <img src={item.homeTeam.logo} alt="" className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} object-contain flex-shrink-0`} />}
              <span className={`font-bold truncate ${compact ? 'text-sm' : 'text-sm'}`}>{item.homeTeam.teamName}</span>
              <span className="text-[10px] text-[#F7F5F0]/20">MSI{item.homeTeam.msiScore.toFixed(1)}</span>
            </div>
          </div>

          <div className="text-center px-3 min-w-[60px]">
            {isLive || isFinished ? (
              <div className={`font-bold tabular-nums ${compact ? 'text-lg' : 'text-xl'}`}>
                <span className={parseInt(String(homeScore)) > parseInt(String(awayScore)) ? 'text-green-400' : ''}>{homeScore}</span>
                <span className="text-[#B08D57] mx-1">:</span>
                <span className={parseInt(String(awayScore)) > parseInt(String(homeScore)) ? 'text-green-400' : ''}>{awayScore}</span>
              </div>
            ) : (
              <div className="text-sm text-[#F7F5F0]/30">VS</div>
            )}
          </div>

          <div className="flex-1 min-w-0 text-right">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-[10px] text-[#F7F5F0]/20">MSI{item.awayTeam.msiScore.toFixed(1)}</span>
              <span className={`font-bold truncate ${compact ? 'text-sm' : 'text-sm'}`}>{item.awayTeam.teamName}</span>
              {item.awayTeam.logo && <img src={item.awayTeam.logo} alt="" className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} object-contain flex-shrink-0`} />}
            </div>
          </div>
        </div>

        {/* Probability bars */}
        <div className="flex h-5 rounded-full overflow-hidden text-[10px] font-bold mb-1">
          <div className="bg-green-500/60 flex items-center justify-center text-white" style={{ width: `${p.homeWinProb * 100}%` }}>
            {p.homeWinProb > 0.12 ? `${(p.homeWinProb * 100).toFixed(0)}%` : ''}
          </div>
          <div className="bg-yellow-500/60 flex items-center justify-center text-black" style={{ width: `${p.drawProb * 100}%` }}>
            {p.drawProb > 0.12 ? `${(p.drawProb * 100).toFixed(0)}%` : ''}
          </div>
          <div className="bg-red-500/60 flex items-center justify-center text-white" style={{ width: `${p.awayWinProb * 100}%` }}>
            {p.awayWinProb > 0.12 ? `${(p.awayWinProb * 100).toFixed(0)}%` : ''}
          </div>
        </div>

        {/* Recommendation + Top3 波胆 */}
        <div className="flex items-center justify-between mt-1.5">
          <span className={`text-[10px] font-bold ${recColor}`}>📌 {recText}</span>
          {p.top5Analysis && p.top5Analysis.length > 0 && (
            <div className="flex items-center gap-1.5">
              {p.top5Analysis.slice(0, 5).map((s) => (
                <span key={s.score} className={`text-[10px] font-mono ${
                  s.rank === 1 ? 'text-[#B08D57] font-bold' : s.rank === 2 ? 'text-[#F7F5F0]/60' : 'text-[#F7F5F0]/35'
                }`}>
                  {s.score} {s.rank === 1 ? '🔥' : ''}{(s.probability * 100).toFixed(0)}%
                </span>
              ))}
            </div>
          )}
          {!p.top5Analysis && p.scorePredictions?.[0] && (
            <span className="text-[10px] text-[#B08D57]">
              波胆 {p.scorePredictions[0].score} ({(p.scorePredictions[0].probability * 100).toFixed(1)}%)
            </span>
          )}
        </div>

        {/* Group tag */}
        {item.group && (
          <div className="mt-1.5 pt-1.5 border-t border-white/[0.04]">
            <span className="text-[9px] text-[#F7F5F0]/15">第{item.group}组 · {item.venue || ''}</span>
          </div>
        )}
      </div>
    </Link>
  )
}

function TabButton({ active, label, count, onClick }: { active: boolean; label: string; count?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
        active
          ? 'bg-[#B08D57] text-black'
          : 'bg-white/5 text-[#F7F5F0]/50 hover:bg-white/10 hover:text-[#F7F5F0]'
      }`}
    >
      {label}{count !== undefined ? ` (${count})` : ''}
    </button>
  )
}

function GroupHeader({ type, value, count }: { type: GroupBy; value: string; count: number }) {
  if (type === 'group') {
    return (
      <div className="flex items-center gap-2 sticky top-[52px] z-10 bg-[#0a0a0a] py-2 -mx-1">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#B08D57]/20 text-[#B08D57] text-xs font-bold">G{value}</span>
        <span className="text-sm font-bold text-[#F7F5F0]">第{value}组</span>
        <span className="text-xs text-[#F7F5F0]/30">{count}场比赛</span>
      </div>
    )
  }
  return (
    <div className="sticky top-[52px] z-10 bg-[#0a0a0a] py-2 -mx-1">
      <span className="text-sm font-bold text-[#B08D57]">{value}</span>
      <span className="text-xs text-[#F7F5F0]/30 ml-2">{count}场</span>
    </div>
  )
}

// ============ Main Page ============

export default function HomePage() {
  const [data, setData] = useState<{ matches: MatchData[] } | null>(null)
  const [liveData, setLiveData] = useState<Record<string, any>>({})
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [auth, setAuth] = useState<{ authenticated: boolean; user?: any } | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [groupBy, setGroupBy] = useState<GroupBy>('date')
  const esRef = useRef<EventSource | null>(null)

  // Check auth
  useEffect(() => {
    fetch('/api/auth')
      .then(r => r.json())
      .then(j => {
        setAuth(j)
        // 认证状态确定后再加载数据
        if (j?.authenticated) {
          loadPredictions()
        } else {
          setLoading(false)
        }
      })
  }, [])

  async function loadPredictions() {
    try {
      const res = await fetch('/api/predict', { credentials: 'include' })
      const j = await res.json()
      if (j?.matches && Array.isArray(j.matches)) {
        setData({ matches: j.matches })
      } else {
        setData({ matches: [] })
      }
    } catch (e) {
      console.error('[predict] Error:', e)
      setData({ matches: [] })
    } finally {
      setLoading(false)
    }
  }

  // SSE real-time
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
      } catch { /* ignore */ }
    }
    return () => { es.close(); esRef.current = null }
  }, [])

  // ===== Filtered & grouped data =====
  const filteredMatches = useMemo(() => {
    const all = data?.matches || []
    switch (activeTab) {
      case 'live':
        return all.filter(m => liveData[m.matchId]?.status === 'inprogress' || m.status === 'inprogress')
      case 'upcoming':
        return all.filter(m => m.status === 'pre' && !(liveData[m.matchId]?.status === 'inprogress'))
      case 'finished':
        return all.filter(m => liveData[m.matchId]?.status === 'finished' || m.status === 'finished')
      default:
        return all
    }
  }, [data, activeTab, liveData])

  // Group matches
  const groupedMatches = useMemo(() => {
    const groups: Record<string, MatchData[]> = {}
    for (const m of filteredMatches) {
      let key: string
      if (groupBy === 'group') {
        key = m.group || '其他'
      } else {
        key = m.date ? new Date(m.date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }) : '未知日期'
      }
      if (!groups[key]) groups[key] = []
      groups[key].push(m)
    }
    // Sort keys: date ascending, group alphabetical
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (groupBy === 'group') {
        return a.localeCompare(b, 'zh-CN')
      }
      return a.localeCompare(b, 'zh-CN')
    })
    return sortedKeys.map(key => ({ key, items: groups[key] }))
  }, [filteredMatches, groupBy])

  // Counts per tab
  const tabCounts = useMemo(() => {
    const all = data?.matches || []
    return {
      all: all.length,
      live: all.filter(m => liveData[m.matchId]?.status === 'inprogress' || m.status === 'inprogress').length,
      upcoming: all.filter(m => m.status === 'pre').length,
      finished: all.filter(m => liveData[m.matchId]?.status === 'finished' || m.status === 'finished').length,
    }
  }, [data, liveData])

  // ===== Unauthenticated state =====
  if (!auth) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-[#F7F5F0]/30">加载中...</div>
    </div>
  )

  if (!auth.authenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center">
          <img src="/logo.png" alt="蚂蚁足球" className="w-24 h-24 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-[#B08D57] mb-2">蚂蚁足球</h1>
          <p className="text-[#F7F5F0]/40 mb-8 text-sm">世界杯让生活变得更美好</p>
          <Link href="/login" className="inline-block bg-[#B08D57] hover:bg-[#9a7a4a] text-black font-bold px-10 py-3 rounded-lg transition">
            登录查看预测
          </Link>
          <p className="text-[#F7F5F0]/20 text-xs mt-8 leading-relaxed">
            高精度世界杯预测系统<br />
            胜平负 · 波胆 · 进球数 · MSI六维分析
          </p>
        </div>
      </div>
    )
  }

  // ===== Authenticated main view =====
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#F7F5F0]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#111111]/95 backdrop-blur border-b border-white/5 px-4 py-2.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="蚂蚁足球" className="w-7 h-7" />
          <h1 className="text-base font-bold text-[#B08D57]">蚂蚁足球</h1>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#F7F5F0]/40 hidden sm:inline-flex items-center gap-1">
            <ConnectionDot connected={connected} />
            {connected ? '实时连接' : '重连中'}
          </span>
          <span className="text-xs text-[#F7F5F0]/50 max-w-[80px] truncate">{auth.user?.nickname}</span>
          {auth.user?.tier === 'vip' && (
            <span className="text-[10px] font-bold bg-amber-700/25 text-amber-400 px-2 py-0.5 rounded-full border border-amber-600/30">VIP</span>
          )}
          {auth.user?.tier === 'svip' && (
            <span className="text-[10px] font-bold bg-[#B08D57]/20 text-[#B08D57] px-2 py-0.5 rounded-full border border-[#B08D57]/30">SVIP</span>
          )}
          {auth.user?.role === 'super_admin' && (
            <Link href="/admin" className="text-xs text-[#B08D57]/70 hover:text-[#B08D57]">管理</Link>
          )}
          <button
            onClick={async () => {
              await fetch('/api/auth', { method: 'DELETE' })
              window.location.reload()
            }}
            className="text-xs text-[#F7F5F0]/40 hover:text-red-400 transition"
          >
            退出
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Hero — Logo + Brand */}
        <div className="text-center py-3">
          <img src="/logo.png" alt="蚂蚁足球" className="w-16 h-16 mx-auto mb-2" />
          <h2 className="text-xl font-bold text-[#B08D57]">蚂蚁足球</h2>
          <p className="text-[#F7F5F0]/30 text-xs mt-1">高精度世界杯预测 · 胜平负 | 波胆 | 进球数 | 六维分析</p>
        </div>

        {/* Tab bar - sticky under header */}
        <div className="sticky top-[52px] z-40 bg-[#0a0a0a] pb-1">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <TabButton active={activeTab === 'all'} label="全部" count={tabCounts.all} onClick={() => setActiveTab('all')} />
            <TabButton active={activeTab === 'live'} label="直播中" count={tabCounts.live} onClick={() => setActiveTab('live')} />
            <TabButton active={activeTab === 'upcoming'} label="未开始" count={tabCounts.upcoming} onClick={() => setActiveTab('upcoming')} />
            <TabButton active={activeTab === 'finished'} label="已结束" count={tabCounts.finished} onClick={() => setActiveTab('finished')} />
            <div className="flex-1" />
            {/* Group toggle */}
            <div className="flex items-center bg-white/5 rounded-full p-0.5 flex-shrink-0">
              <button
                onClick={() => setGroupBy('date')}
                className={`px-2.5 py-1 rounded-full text-[10px] transition ${groupBy === 'date' ? 'bg-[#B08D57] text-black font-medium' : 'text-[#F7F5F0]/50'}`}
              >
                按日期
              </button>
              <button
                onClick={() => setGroupBy('group')}
                className={`px-2.5 py-1 rounded-full text-[10px] transition ${groupBy === 'group' ? 'bg-[#B08D57] text-black font-medium' : 'text-[#F7F5F0]/50'}`}
              >
                按组别
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#F7F5F0]/30">
            <div className="animate-spin w-8 h-8 border-2 border-[#B08D57]/30 border-t-[#B08D57] rounded-full mx-auto mb-3" />
            <p>正在获取比赛数据与预测...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-20 text-[#F7F5F0]/25">
            <img src="/logo.png" alt="" className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-base font-medium text-[#F7F5F0]/40">暂无{activeTab === 'all' ? '' : activeTab === 'live' ? '直播中' : activeTab === 'upcoming' ? '即将开始' : '已结束'}比赛数据</p>
            <p className="text-xs text-[#F7F5F0]/15 mt-2">2026世界杯赛程数据实时更新中</p>
          </div>
        ) : (
          /* Grouped match list */
          <div className="space-y-6">
            {groupedMatches.map(({ key, items }) => (
              <section key={key}>
                <GroupHeader type={groupBy} value={key} count={items.length} />
                <div className="space-y-2.5 mt-2">
                  {items.map((m) => (
                    <PredictionCard
                      key={m.matchId}
                      item={m}
                      liveData={liveData[m.matchId]}
                      compact={filteredMatches.length > 8}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-[#F7F5F0]/10 text-xs pb-8 space-y-1">
          <p>蚂蚁足球 · 高精度世界杯预测 · 仅供参考</p>
          <p>MSI六维模型 + 博彩赔率融合 + 泊松分布</p>
        </div>
      </div>
    </div>
  )
}
