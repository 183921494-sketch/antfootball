import { NextRequest, NextResponse } from "next/server";
import { fetchMatches, parseMatchStatus, type ESPNMatch } from "@/lib/espn-api";
import { getTeamRating, predictMatch } from "@/lib/prediction-engine";
import { getMatchOdds } from "@/lib/betting-odds";

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

// ===== 波胆Top3深度分析 =====
function buildTop3Analysis(top3: any[], homeName: string, awayName: string) {
  return top3.map((s, i) => {
    const [h, a] = s.score.split('-').map(Number);
    const reasons: string[] = [];
    if (h > a) reasons.push(`${homeName}进攻占优，主场压制`);
    if (a > h) reasons.push(`${awayName}反击效率高，客场抢分`);
    if (h === a) reasons.push(`双方势均力敌，平局压力大`);
    if (h >= 2) reasons.push(`${homeName}进攻火力强（期望${h}球）`);
    if (a >= 2) reasons.push(`${awayName}得分能力强（期望${a}球）`);
    if (i === 0) reasons.push('泊松模型预测概率最高比分');
    if (s.marketOdds) {
      const edge = s.prob - 1 / s.marketOdds;
      if (edge > 0.05) reasons.push(`📈正向价值边缘+${(edge * 100).toFixed(1)}%（庄家赔率被高估）`);
      if (edge < -0.05) reasons.push(`📉负向价值边缘${(edge * 100).toFixed(1)}%（庄家赔率合理或被低估）`);
    }
    const probLabel = s.prob > 0.15 ? '高概率' : s.prob > 0.08 ? '中概率' : '低概率';
    return {
      ...s,
      rank: i + 1,
      probLabel,
      reason: reasons.join('；'),
    };
  });
}

// ============ 2026世界杯小组赛分组表 ============
const GROUP_MAP: Record<string, string> = {
  'ARG': 'A', 'ECU': 'A', 'POL': 'A', 'SAU': 'A',
  'FRA': 'B', 'MEX': 'B', 'NZL': 'B', 'UZB': 'B',
  'ENG': 'C', 'IRN': 'C', 'JPN': 'C', 'USA': 'C',
  'BRA': 'D', 'CRC': 'D', 'GHA': 'D', 'SUI': 'D',
  'ESP': 'E', 'PAR': 'E', 'CMR': 'E', 'CZE': 'E',
  'GER': 'F', 'KEN': 'F', 'PAN': 'F', 'SWE': 'F',
  'ITA': 'G', 'AUS': 'G', 'URU': 'G', 'VIE': 'G',
  'NED': 'H', 'EGY': 'H', 'IRQ': 'H', 'SEN': 'H',
  'POR': 'I', 'ANG': 'I', 'GUI': 'I', 'NGA': 'I',
  'BEL': 'J', 'UKR': 'J', 'QAT': 'J', 'TUN': 'J',
  'AUT': 'K', 'CUR': 'K', 'SRB': 'K', 'TUR': 'K',
  'CAN': 'L', 'CHI': 'L', 'MAR': 'L', 'RSA': 'L',
};

// 转换为北京时间 YYYY-MM-DD（用于分组显示）
function toShangHaiDate(utcDateStr: string): string {
  const d = new Date(utcDateStr);
  return d.toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).replace(/\//g, '-');
}

function resolveGroup(abbrev: string, teamName: string): string {
  if (GROUP_MAP[abbrev]) return GROUP_MAP[abbrev];
  const nameMap: Record<string, string> = {
    'Argentina': 'A', 'Ecuador': 'A', 'Poland': 'A', 'Saudi Arabia': 'A',
    'France': 'B', 'Mexico': 'B', 'New Zealand': 'B', 'Uzbekistan': 'B',
    'England': 'C', 'Iran': 'C', 'Japan': 'C', 'United States': 'C',
    'Brazil': 'D', 'Costa Rica': 'D', 'Ghana': 'D', 'Switzerland': 'D',
    'Spain': 'E', 'Paraguay': 'E', 'Cameroon': 'E', 'Czech Republic': 'E',
    'Germany': 'F', 'Kenya': 'F', 'Panama': 'F', 'Sweden': 'F',
    'Italy': 'G', 'Australia': 'G', 'Uruguay': 'G', 'Vietnam': 'G',
    'Netherlands': 'H', 'Egypt': 'H', 'Iraq': 'H', 'Senegal': 'H',
    'Portugal': 'I', 'Angola': 'I', 'Guinea': 'I', 'Nigeria': 'I',
    'Belgium': 'J', 'Ukraine': 'J', 'Qatar': 'J', 'Tunisia': 'J',
    'Austria': 'K', 'Curaçao': 'K', 'Serbia': 'K', 'Turkey': 'K',
    'Canada': 'L', 'Chile': 'L', 'Morocco': 'L', 'South Africa': 'L',
    'Colombia': 'D', 'Croatia': 'J', 'El Salvador': 'B',
    'Jamaica': 'L', 'Norway': 'G', 'Oman': 'C', 'Wales': 'H',
    'Mali': 'G', 'Albania': 'A', 'Greece': 'C', 'Hungary': 'F',
    'Romania': 'E', 'Finland': 'B', 'Slovakia': 'D',
  };
  return nameMap[teamName] || '';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get("matchId");
    const date = searchParams.get("date");

    const matches = await fetchMatches();

    let filtered = matches;
    if (matchId) {
      filtered = matches.filter((m) => m.id === matchId);
    } else if (date) {
      filtered = matches.filter((m) => m.date.startsWith(
        date.slice(0, 4) + "-" + date.slice(4, 6) + "-" + date.slice(6, 8)
      ));
    }

    const results: any[] = [];
    // 并行处理所有比赛预测
    const batch = await Promise.allSettled(
      filtered.map(match => buildMatchResponse(match).catch((err: any) => {
        console.error('[predict] Error for match', match.id, ':', err.message);
        return null;
      }))
    );
    for (const r of batch) {
      if (r.status === 'fulfilled' && r.value) results.push(r.value);
    }

    results.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function buildMatchResponse(match: ESPNMatch) {
  // 缓存命中
  const cached = getCached(match.id);
  if (cached) return cached;

  const comp = match.competitions?.[0];
  if (!comp) return null;

  const home = comp.competitors?.find((c) => c.homeAway === "home");
  const away = comp.competitors?.find((c) => c.homeAway === "away");
  if (!home?.team || !away?.team) return null;

  const homeAbbrev = home.team.abbreviation;
  const awayAbbrev = away.team.abbreviation;
  if (!homeAbbrev || !awayAbbrev) return null;

  const homeRating = getTeamRating(homeAbbrev);
  const awayRating = getTeamRating(awayAbbrev);

  const homeTeamName = home.team.displayName || homeAbbrev;
  const awayTeamName = away.team.displayName || awayAbbrev;

  const odds = await getMatchOdds(match.id, homeTeamName, awayTeamName);
  const prediction = predictMatch(
    homeRating,
    awayRating,
    odds.odds1X2 || undefined,
    odds.oddsOU || undefined,
    odds.oddsCS?.length ? odds.oddsCS : undefined
  );

  // Normalize matchStatus to 'pre'/'inprogress'/'finished'
  const rawStatus = parseMatchStatus(match);
  const statusMap: Record<string, string> = {
    'upcoming': 'pre',
    'live': 'inprogress',
    'finished': 'finished',
  };
  const status = statusMap[rawStatus] || 'pre';

  const matchStatus = match.status;
  const period = matchStatus?.period?.toString() || '0';
  const clock = matchStatus?.displayClock || '';
  const venue = comp.venue?.fullName || '';
  const group = resolveGroup(homeAbbrev, homeTeamName) || resolveGroup(awayAbbrev, awayTeamName) || '';

  const result = {
    matchId: match.id,
    espnMatchId: match.id,
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
    venue,
    startTime: match.date,
    date: toShangHaiDate(match.date),
    status,
    period,
    clock,
    homeScore: parseInt(home.score || '0'),
    awayScore: parseInt(away.score || '0'),
    group,
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
      insight: prediction.keyInsights?.join('；'),
      risk: prediction.riskFactors?.join('；'),
      opportunityFactors: prediction.opportunityFactors,
      opportunity: prediction.opportunityFactors?.join('；'),
      methodNote: prediction.methodNote,
      valueAnalysis: prediction.valueAnalysis,
      // 波胆Top3深度分析
      top3Analysis: buildTop3Analysis(
        prediction.scorePredictions.slice(0, 3),
        homeRating.teamName,
        awayRating.teamName
      ),
      updatedAt: match.date,
    },
  };

  setCached(match.id, result);
  return result;
}
