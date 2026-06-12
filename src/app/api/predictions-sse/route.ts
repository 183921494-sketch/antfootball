import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { fetchMatches, parseMatchStatus } from '@/lib/espn-api'
import { predictMatch, getTeamRating } from '@/lib/prediction-engine'

// Global cache: matchId → latest prediction + score
let cache: Map<string, {
  prediction: any
  homeScore: number
  awayScore: number
  status: string
  period: string
  clock: string
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
        const homeRating = getTeamRating(homeAbbrev)
        const awayRating = getTeamRating(awayAbbrev)

        const prediction = predictMatch(
          homeRating,
          awayRating
        )

        if (prediction) {
          cache.set(match.id, {
            prediction,
            homeScore,
            awayScore,
            status,
            period,
            clock,
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
