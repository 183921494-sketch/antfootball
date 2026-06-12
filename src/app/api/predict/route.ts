import { NextRequest, NextResponse } from "next/server";
import { getTeamRating, predictMatch } from "@/lib/prediction-engine";
import { getMatchOdds } from "@/lib/betting-odds";
import { verifyToken, getTokenFromCookies } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

// ===== 预测缓存（60秒TTL）=====
const predCache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 60_000;

function getCached(key: string): any | null {
  const e = predCache.get(key);
  if (e && Date.now() - e.ts < CACHE_TTL) return e.data;
  predCache.delete(key);
  return null;
}
function setCached(key: string, data: any) {
  predCache.set(key, { data, ts: Date.now() });
}

// ===== 波胆Top5深度分析 =====
function buildTop5Analysis(top5: any[], homeName: string, awayName: string) {
  return top5.map((s, i) => {
    const [h, a] = s.score.split('-').map(Number);
    const reasons: string[] = [];
    if (h > a) reasons.push(`${homeName}进攻占优，主场压制`);
    if (a > h) reasons.push(`${awayName}反击效率高，客场抢分`);
    if (h === a) reasons.push(`双方势均力敌，平局压力大`);
    if (h >= 2) reasons.push(`${homeName}进攻火力强（期望${h}球）`);
    if (a >= 2) reasons.push(`${awayName}得分能力强（期望${a}球）`);
    if (i === 0) reasons.push('泊松模型预测概率最高比分');
    if (s.marketOdds) {
      const probVal = s.probability ?? s.prob ?? 0;
      const edge = probVal - 1 / s.marketOdds;
      if (edge > 0.05) reasons.push(`📈正向价值边缘+${(edge * 100).toFixed(1)}%（庄家赔率被高估）`);
      if (edge < -0.05) reasons.push(`📉负向价值边缘${(edge * 100).toFixed(1)}%（庄家赔率合理或被低估）`);
    }
    const probVal = s.probability ?? s.prob ?? 0;
    const probLabel = probVal > 0.15 ? '高概率' : probVal > 0.08 ? '中概率' : '低概率';
    return {
      ...s,
      rank: i + 1,
      probLabel,
      reason: reasons.join('；'),
    };
  });
}

// 转换为北京时间 YYYY-MM-DD
function toShangHaiDate(utcDateStr: string): string {
  const d = new Date(utcDateStr);
  return d.toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).replace(/\//g, '-');
}

/**
 * 根据比赛时间判断状态
 * - 比赛时间 + 105分钟 < 当前时间 → finished（足球比赛约105分钟含补时）
 * - 比赛时间 ≤ 当前时间 ≤ 比赛时间 + 105分钟 → inprogress
 * - 当前时间 < 比赛时间 → pre
 */
function inferStatus(matchDate: string, dbStatus: string): string {
  const now = Date.now();
  const matchTime = new Date(matchDate).getTime();
  const matchEndEstimate = matchTime + 105 * 60 * 1000; // 105 minutes

  if (now > matchEndEstimate) return 'finished';
  if (now >= matchTime) return 'inprogress';
  return 'pre';
}

// ===== ESPN 已完赛比分缓存 =====
let espnResultsCache: { data: Map<string, { homeScore: number; awayScore: number }>; ts: number } | null = null;
const ESPN_CACHE_TTL = 120_000; // 2 minutes

async function getESPNResults(): Promise<Map<string, { homeScore: number; awayScore: number }>> {
  if (espnResultsCache && Date.now() - espnResultsCache.ts < ESPN_CACHE_TTL) {
    return espnResultsCache.data;
  }

  const results = new Map<string, { homeScore: number; awayScore: number }>();
  try {
    const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260620', {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      for (const ev of data.events || []) {
        const comp = ev.competitions?.[0];
        if (!comp) continue;
        const h = comp.competitors?.find((c: any) => c.homeAway === 'home');
        const a = comp.competitors?.find((c: any) => c.homeAway === 'away');
        if (h && a && comp.status?.type?.name === 'STATUS_FULL_TIME') {
          const key = `${h.team?.shortDisplayName}-${a.team?.shortDisplayName}`;
          results.set(key, {
            homeScore: parseInt(h.score) || 0,
            awayScore: parseInt(a.score) || 0,
          });
        }
      }
    }
  } catch (e) {
    console.error('[predict] ESPN fetch error:', e);
  }

  espnResultsCache = { data: results, ts: Date.now() };
  return results;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get("matchId");

    // ===== 认证检查 =====
    let userTier: 'vip' | 'svip' | 'super_admin' = 'vip';
    let isAuthenticated = false;

    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const token = getTokenFromCookies(cookieHeader);
      if (token) {
        const payload = verifyToken(token);
        if (payload) {
          isAuthenticated = true;
          userTier = payload.role === 'super_admin' ? 'super_admin' : (payload.tier || 'vip');
        }
      }
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: '请先登录', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 从 Supabase 读取比赛数据
    let query = supabase
      .from('matches')
      .select(`
        id,
        match_date,
        world_cup_stage,
        group_letter,
        home_score,
        away_score,
        status,
        stadium,
        city,
        home_team:teams!matches_home_team_id_fkey (*),
        away_team:teams!matches_away_team_id_fkey (*)
      `)
      .order('match_date', { ascending: true });

    if (matchId) {
      query = query.eq('id', matchId);
    }

    const { data: matches, error: dbError } = await query.limit(300);
    if (dbError) {
      console.error('[predict] DB error:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({ success: true, count: 0, matches: [] });
    }

    // 获取 ESPN 真实赛果
    const espnResults = await getESPNResults();

    // VIP 限制：未开始赛事只清晰显示 2 场，其他模糊
    let blurredMatchIds: Set<string> | null = null;
    if (userTier === 'vip') {
      // 先判断每场比赛的实际状态
      const matchStatuses = matches.map((m: any) => ({
        id: m.id,
        inferredStatus: inferStatus(m.match_date, m.status),
      }));
      const upcoming = matchStatuses
        .filter(ms => ms.inferredStatus === 'pre')
        .slice(0, 2)
        .map(ms => ms.id);
      blurredMatchIds = new Set(
        matchStatuses
          .filter(ms => ms.inferredStatus === 'pre' && !upcoming.includes(ms.id))
          .map(ms => ms.id)
      );
    }

    // 构建预测结果
    const results: any[] = [];
    for (const match of matches) {
      try {
        const prediction = await buildMatchPrediction(match, espnResults);
        if (prediction) {
          // VIP 模糊：只模糊未开始的比赛，已完赛/进行中不模糊
          prediction.blurred = blurredMatchIds ? blurredMatchIds.has(match.id) : false;
          results.push(prediction);
        }
      } catch (e: any) {
        console.error('[predict] Error for match', match.id, ':', e.message);
      }
    }

    results.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return NextResponse.json({
      success: true,
      count: results.length,
      matches: results,
    });
  } catch (error: any) {
    console.error('[predict] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function buildMatchPrediction(match: any, espnResults: Map<string, { homeScore: number; awayScore: number }>) {
  // 缓存命中
  const cached = getCached(match.id);
  if (cached) return cached;

  const homeTeam = match.home_team;
  const awayTeam = match.away_team;
  if (!homeTeam || !awayTeam) return null;

  // 获取球队评分
  const homeRating = getTeamRating(homeTeam.name_en || homeTeam.name);
  const awayRating = getTeamRating(awayTeam.name_en || awayTeam.name);

  // 推断比赛状态
  const status = inferStatus(match.match_date, match.status);

  // 尝试从 ESPN 获取真实比分
  let homeScore: number | null = match.home_score;
  let awayScore: number | null = match.away_score;

  if (status === 'finished' && (homeScore === null || awayScore === null)) {
    // 尝试从 ESPN 匹配
    const espnKey1 = `${homeTeam.name_en}-${awayTeam.name_en}`;
    const espnKey2 = `${awayTeam.name_en}-${homeTeam.name_en}`;
    const espnResult = espnResults.get(espnKey1) || espnResults.get(espnKey2);
    if (espnResult) {
      homeScore = espnResult.homeScore;
      awayScore = espnResult.awayScore;
      // 异步更新数据库（不阻塞响应）
      updateMatchResult(match.id, homeScore, awayScore);
    } else {
      // 没有真实比分，用预测引擎生成模拟比分
      const odds = await getMatchOdds(match.id, homeTeam.name, awayTeam.name);
      const prediction = predictMatch(homeRating, awayRating, odds.odds1X2 || undefined, odds.oddsOU || undefined, odds.oddsCS?.length ? odds.oddsCS : undefined);
      if (prediction?.mostLikelyScore) {
        const [h, a] = prediction.mostLikelyScore.split('-').map(Number);
        homeScore = h;
        awayScore = a;
      }
    }
  }

  // 获取赔率（模拟）
  const odds = await getMatchOdds(match.id, homeTeam.name, awayTeam.name);

  // 生成预测（已完赛也生成，作为"回溯预测"）
  const prediction = predictMatch(
    homeRating,
    awayRating,
    odds.odds1X2 || undefined,
    odds.oddsOU || undefined,
    odds.oddsCS?.length ? odds.oddsCS : undefined
  );

  const result = {
    matchId: match.id,
    homeTeam: {
      abbr: homeTeam.country_code || homeTeam.name_en?.slice(0, 3).toUpperCase(),
      teamName: homeTeam.name,
      logo: '',
      msiScore: homeTeam.msi_score || homeRating.msiScore,
    },
    awayTeam: {
      abbr: awayTeam.country_code || awayTeam.name_en?.slice(0, 3).toUpperCase(),
      teamName: awayTeam.name,
      logo: '',
      msiScore: awayTeam.msi_score || awayRating.msiScore,
    },
    homeTeamAbbrev: homeTeam.country_code || homeTeam.name_en?.slice(0, 3).toUpperCase(),
    awayTeamAbbrev: awayTeam.country_code || awayTeam.name_en?.slice(0, 3).toUpperCase(),
    venue: match.stadium || '',
    startTime: match.match_date,
    date: toShangHaiDate(match.match_date),
    status,
    group: match.group_letter || '',
    homeScore,
    awayScore,
    prediction: prediction ? {
      homeWinProb: prediction.homeWinProb,
      drawProb: prediction.drawProb,
      awayWinProb: prediction.awayWinProb,
      expectedHomeGoals: prediction.expectedHomeGoals,
      expectedAwayGoals: prediction.expectedAwayGoals,
      recommendation: prediction.recommendation,
      scorePredictions: prediction.scorePredictions?.slice(0, 5),
      top5Analysis: prediction.scorePredictions?.slice(0, 5)
        ? buildTop5Analysis(prediction.scorePredictions.slice(0, 5), homeTeam.name, awayTeam.name)
        : undefined,
    } : null,
  };

  setCached(match.id, result);
  return result;
}

// 异步更新数据库中的比赛结果（不阻塞响应）
function updateMatchResult(matchId: string, homeScore: number, awayScore: number) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  supabase
    .from('matches')
    .update({ status: 'finished', home_score: homeScore, away_score: awayScore })
    .eq('id', matchId)
    .then(({ error }) => {
      if (error) console.error('[predict] DB update error:', error);
      else console.log(`[predict] Updated match ${matchId}: ${homeScore}-${awayScore}`);
    });
}
