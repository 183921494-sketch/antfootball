import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { fetchMatches, parseMatchStatus } from '@/lib/espn-api'
import { predictMatch, getTeamRating } from '@/lib/prediction-engine'

// 转换为北京时间 YYYY-MM-DD
function toShangHaiDate(utcDateStr: string): string {
  const d = new Date(utcDateStr);
  return d.toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).replace(/\//g, '-');
}

// 波胆Top3深度分析
function buildTop3Analysis(top3: any[], homeName: string, awayName: string) {
  return top3.map((s, i) => {
    const [h, a] = s.score.split('-').map(Number);
    const reasons: string[] = [];
    if (h > a) reasons.push(`${homeName}进攻占优，主场压制`);
    if (a > h) reasons.push(`${awayName}反击效率高，客场抢分`);
    if (h === a) reasons.push('双方势均力敌，平局压力大');
    if (h >= 2) reasons.push(`${homeName}进攻火力强（期望${h}球）`);
    if (a >= 2) reasons.push(`${awayName}得分能力强（期望${a}球）`);
    if (i === 0) reasons.push('泊松模型预测概率最高比分');
    if (s.marketOdds) {
      const edge = s.prob - 1 / s.marketOdds;
      if (edge > 0.05) reasons.push(`📈正向价值边缘+${(edge * 100).toFixed(1)}%`);
      if (edge < -0.05) reasons.push(`📉负向价值边缘${(edge * 100).toFixed(1)}%`);
    }
    const probLabel = s.prob > 0.15 ? '高概率' : s.prob > 0.08 ? '中概率' : '低概率';
    return { ...s, rank: i + 1, probLabel, reason: reasons.join('；') };
  });
}

// Global cache: matchId → latest prediction + score
let cache: Map<string, {
  prediction: any
  homeScore: number
  awayScore: number
  status: string // 'pre' | 'inprogress' | 'finished'
  period: string
  clock: string
  startTime: string
  date: string
  group: string
  homeTeam: any
  awayTeam: any
  homeTeamAbbrev?: string
  awayTeamAbbrev?: string
  venue: string
  updatedAt: number
}> = new Map()

let lastPoll = 0
const POLL_INTERVAL = 30_000 // 30s

async function pollAndUpdate() {
  try {
    const now = Date.now()
    if (now - lastPoll < POLL_INTERVAL) return
    lastPoll = now

    const matches = await fetchMatches()
    for (const match of matches) {
      const comp = match.competitions?.[0]
      if (!comp) continue
      const home = comp.competitors?.find((c: any) => c.homeAway === 'home')
      const away = comp.competitors?.find((c: any) => c.homeAway === 'away')
      if (!home?.team || !away?.team) continue

      const homeScore = parseInt(home.score || '0')
      const awayScore = parseInt(away.score || '0')
      const status: string = match.status?.type?.state || 'pre'
      const period: string = match.status?.period?.toString() || '0'
      const clock: string = match.status?.displayClock || ''

      // Only update predictions for live/upcoming matches
      const parsedStatus = parseMatchStatus(match)
      if (parsedStatus === 'finished') continue

      const existing = cache.get(match.id)
      const hasChanged = !existing ||
        existing.homeScore !== homeScore ||
        existing.awayScore !== awayScore ||
        existing.status !== status

      if (hasChanged || !existing) {
        const homeAbbrev = home.team.abbreviation || home.team.displayName?.slice(0, 3) || 'UNK'
        const awayAbbrev = away.team.abbreviation || away.team.displayName?.slice(0, 3) || 'UNK'
        const homeTeamName = home.team.displayName || homeAbbrev
        const awayTeamName = away.team.displayName || awayAbbrev
        const homeRating = getTeamRating(homeAbbrev)
        const awayRating = getTeamRating(awayAbbrev)

        const prediction = predictMatch(homeRating, awayRating)

        if (prediction) {
          // Map 'pre'/'inprogress'/'post' from ESPN state to our format
          const statusMap: Record<string, string> = {
            'pre': 'pre',
            'in': 'inprogress',
            'post': 'finished',
          };
          const normalizedStatus = statusMap[status] || status;

          cache.set(match.id, {
            prediction: {
              recommendation: prediction.recommendation,
              homeWinProb: prediction.homeWinProb,
              drawProb: prediction.drawProb,
              awayWinProb: prediction.awayWinProb,
              confidence: prediction.confidenceLevel,
              confidenceLevel: prediction.confidenceLevel,
              confidenceLabel: prediction.confidenceLabel,
              scorePredictions: prediction.scorePredictions,
              expectedHomeGoals: prediction.expectedHomeGoals,
              expectedAwayGoals: prediction.expectedAwayGoals,
              expectedTotalGoals: prediction.expectedTotalGoals,
              overProb: prediction.overProb,
              underProb: prediction.underProb,
              overUnderLine: prediction.overUnderLine,
              homeTeam: {
                abbr: homeAbbrev,
                teamName: homeRating.teamName,
                logo: '',
                msiScore: homeRating.msiScore,
                rosterDepth: homeRating.rosterDepth,
                tacticalSystem: homeRating.tacticalSystem,
                keyPlayerImpact: homeRating.keyPlayerImpact,
                coachDecision: homeRating.coachDecision,
                matchupData: homeRating.matchupData,
                mentalResilience: homeRating.mentalResilience,
              },
              awayTeam: {
                abbr: awayAbbrev,
                teamName: awayRating.teamName,
                logo: '',
                msiScore: awayRating.msiScore,
                rosterDepth: awayRating.rosterDepth,
                tacticalSystem: awayRating.tacticalSystem,
                keyPlayerImpact: awayRating.keyPlayerImpact,
                coachDecision: awayRating.coachDecision,
                matchupData: awayRating.matchupData,
                mentalResilience: awayRating.mentalResilience,
              },
              keyInsights: prediction.keyInsights,
              riskFactors: prediction.riskFactors,
              opportunityFactors: prediction.opportunityFactors,
              methodNote: prediction.methodNote,
              valueAnalysis: prediction.valueAnalysis,
              top3Analysis: buildTop3Analysis(
                (prediction.scorePredictions || []).slice(0, 3),
                homeRating.teamName,
                awayRating.teamName
              ),
            },
            homeScore,
            awayScore,
            status: normalizedStatus,
            period,
            clock,
            startTime: match.date,
            date: toShangHaiDate(match.date),
            group: '',
            homeTeam: {
              abbr: homeAbbrev,
              teamName: homeRating.teamName,
              logo: '',
              msiScore: homeRating.msiScore,
              rosterDepth: homeRating.rosterDepth,
              tacticalSystem: homeRating.tacticalSystem,
              keyPlayerImpact: homeRating.keyPlayerImpact,
              coachDecision: homeRating.coachDecision,
              matchupData: homeRating.matchupData,
              mentalResilience: homeRating.mentalResilience,
            },
            awayTeam: {
              abbr: awayAbbrev,
              teamName: awayRating.teamName,
              logo: '',
              msiScore: awayRating.msiScore,
              rosterDepth: awayRating.rosterDepth,
              tacticalSystem: awayRating.tacticalSystem,
              keyPlayerImpact: awayRating.keyPlayerImpact,
              coachDecision: awayRating.coachDecision,
              matchupData: awayRating.matchupData,
              mentalResilience: awayRating.mentalResilience,
            },
            homeTeamAbbrev: homeAbbrev,
            awayTeamAbbrev: awayAbbrev,
            venue: match.competitions?.[0]?.venue?.fullName || '',
            updatedAt: now
          })
        }
      }
    }
  } catch {
    // Silent fail - SSE client will retry
  }
}

export async function GET(req: NextRequest) {
  // Verify auth
  const token = req.cookies.get('auth_token')?.value
  const payload = token ? verifyToken(token) : null
  if (!payload) {
    return new Response('Unauthorized', { status: 401 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Initial poll
      await pollAndUpdate()

      function send(data: string) {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } catch { /* client disconnected */ }
      }

      // Send current state immediately
      const snapshot = Object.fromEntries(cache.entries())
      send(JSON.stringify({ type: 'init', matches: snapshot }))

      // SSE heartbeat + poll every 30s
      const interval = setInterval(async () => {
        await pollAndUpdate()
        const updates = Object.fromEntries(cache.entries())
        send(JSON.stringify({ type: 'update', matches: updates }))
      }, 30_000)

      // Keep alive
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          clearInterval(interval)
          clearInterval(keepAlive)
        }
      }, 20_000)

      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        clearInterval(keepAlive)
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}
