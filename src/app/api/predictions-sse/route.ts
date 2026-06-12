import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { fetchMatches, parseMatchStatus } from '@/lib/espn-api'
import { predictMatch, getTeamRating } from '@/lib/prediction-engine'

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

          const matchDate = new Date(match.date)
          const dateStr = matchDate.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric' })

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
              homeTeam: prediction.homeTeam.teamName,
              awayTeam: prediction.awayTeam.teamName,
              keyInsights: prediction.keyInsights,
              riskFactors: prediction.riskFactors,
              opportunityFactors: prediction.opportunityFactors,
              methodNote: prediction.methodNote,
              valueAnalysis: prediction.valueAnalysis,
            },
            homeScore,
            awayScore,
            status: normalizedStatus,
            period,
            clock,
            startTime: match.date,
            date: dateStr,
            group: '',
            homeTeam: homeTeamName,
            awayTeam: awayTeamName,
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
