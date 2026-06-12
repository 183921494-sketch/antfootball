import { NextRequest, NextResponse } from "next/server";
import { fetchMatches, parseMatchStatus, type ESPNMatch } from "@/lib/espn-api";
import { getTeamRating, predictMatch, type MatchPrediction } from "@/lib/prediction-engine";
import { getMatchOdds, getMarketConsensus, oddsToImpliedProb, fairProbToOdds } from "@/lib/betting-odds";

// ============ 2026世界杯小组赛分组表 ============
// 基于FIFA官方分组（48队12组，每组4队）
const GROUP_MAP: Record<string, string> = {
  // A组
  'ARG': 'A', 'PER': 'A', 'POL': 'A', 'KSA': 'A',
  // B组
  'FRA': 'B', 'MEX': 'B', 'NZL': 'B', 'UZB': 'B',
  // C组
  'ENG': 'C', 'IRN': 'C', 'JPN': 'C', 'USA': 'C',
  // D组
  'BRA': 'D', 'CRC': 'D', 'GHA': 'D', 'SUI': 'D',
  // E组
  'ESP': 'E', 'PAR': 'E', 'CMR': 'E', 'CZE': 'E',
  // F组
  'GER': 'F', 'KEN': 'F', 'PAN': 'F', 'SWE': 'F',
  // G组
  'ITA': 'G', 'IND': 'G', 'URU': 'G', 'VIE': 'G',
  // H组
  'NED': 'H', 'EGY': 'H', 'IRQ': 'H', 'SEN': 'H',
  // I组
  'POR': 'I', 'ANG': 'I', 'GUI': 'I', 'NGA': 'I',
  // J组
  'BEL': 'J', 'UKR': 'J', 'QAT': 'J', 'TUN': 'J',
  // K组
  'AUT': 'K', 'CUR': 'K', 'SRB': 'K', 'TUR': 'K',
  // L组
  'CAN': 'L', 'CHI': 'L', 'MAR': 'L', 'RSA': 'L',
};

// Fallback: try to match by team name
function resolveGroup(abbrev: string, teamName: string): string {
  if (GROUP_MAP[abbrev]) return GROUP_MAP[abbrev];
  // Try name matching for teams not in map
  const nameMap: Record<string, string> = {
    'Argentina': 'A', 'Peru': 'A', 'Poland': 'A', 'Saudi Arabia': 'A',
    'France': 'B', 'Mexico': 'B', 'New Zealand': 'B', 'Uzbekistan': 'B',
    'England': 'C', 'Iran': 'C', 'Japan': 'C', 'United States': 'C',
    'Brazil': 'D', 'Costa Rica': 'D', 'Ghana': 'D', 'Switzerland': 'D',
    'Spain': 'E', 'Paraguay': 'E', 'Cameroon': 'E', 'Czech Republic': 'E',
    'Germany': 'F', 'Kenya': 'F', 'Panama': 'F', 'Sweden': 'F',
    'Italy': 'G', 'India': 'G', 'Uruguay': 'G', 'Vietnam': 'G',
    'Netherlands': 'H', 'Egypt': 'H', 'Iraq': 'H', 'Senegal': 'H',
    'Portugal': 'I', 'Angola': 'I', 'Guinea': 'I', 'Nigeria': 'I',
    'Belgium': 'J', 'Ukraine': 'J', 'Qatar': 'J', 'Tunisia': 'J',
    'Austria': 'K', 'Curaçao': 'K', 'Serbia': 'K', 'Turkey': 'K',
    'Canada': 'L', 'Chile': 'L', 'Morocco': 'L', 'South Africa': 'L',
    'Australia': 'B', 'South Korea': 'E', 'Denmark': 'G', 'Algeria': 'I',
    'Colombia': 'D', 'Croatia': 'J', 'Ecuador': 'A', 'El Salvador': 'B',
    'Jamaica': 'L', 'Norway': 'G', 'Oman': 'C', 'Philippines': 'A',
  };
  return nameMap[teamName] || '';
}

/**
 * GET /api/predict
 * 
 * 查询参数：
 * - matchId: ESPN比赛ID（获取单场预测）
 * - date: 日期 YYYYMMDD（获取某日预测）
 * - all: 1（获取全部预测）
 * 
 * 返回（整合博彩赔率）：
 * 1. 胜负平（1X2）：市场赔率 + 融合概率 + 价值投注分析
 * 2. 波胆：泊松分布 Top5 + 市场赔率 + 价值边缘
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get("matchId");
    const date = searchParams.get("date");

    // 获取ESPN实时赛程
    const matches = await fetchMatches();

    // 过滤
    let filtered = matches;
    if (matchId) {
      filtered = matches.filter((m) => m.id === matchId);
    } else if (date) {
      const dateStr = date;
      filtered = matches.filter((m) => m.date.startsWith(
        dateStr.slice(0, 4) + "-" + dateStr.slice(4, 6) + "-" + dateStr.slice(6, 8)
      ));
    }

    // 为每场比赛生成预测（整合博彩赔率）
    const predictions: PredictionWithMeta[] = [];
    for (const match of filtered) {
      const pred = await generatePredictionFromESPN(match);
      if (pred) predictions.push(pred);
    }

    // 按时间排序
    predictions.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

    return NextResponse.json({
      success: true,
      count: predictions.length,
      bettingIntegrated: true,
      data: predictions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

interface PredictionWithMeta extends MatchPrediction {
  espnMatchId: string;
  matchDate: string;
  matchStatus: "upcoming" | "live" | "finished";
  homeScore: string;
  awayScore: string;
  venue: string;
  city: string;
  group: string; // 小组赛分组 A-L
  // 博彩赔率原始数据
  rawOdds?: {
    homeOdds: number;
    drawOdds: number;
    awayOdds: number;
    ouLine: number;
    overOdds: number;
    underOdds: number;
    marketMargin: string;
  };
}

async function generatePredictionFromESPN(match: ESPNMatch): Promise<PredictionWithMeta | null> {
  const comp = match.competitions?.[0];
  if (!comp) return null;

  const home = comp.competitors?.find((c) => c.homeAway === "home");
  const away = comp.competitors?.find((c) => c.homeAway === "away");
  if (!home || !away) return null;

  const homeAbbrev = home.team?.abbreviation;
  const awayAbbrev = away.team?.abbreviation;
  if (!homeAbbrev || !awayAbbrev) return null;

  const homeRating = getTeamRating(homeAbbrev);
  const awayRating = getTeamRating(awayAbbrev);

  // 获取博彩赔率
  const homeTeamName = home.team?.displayName || homeAbbrev;
  const awayTeamName = away.team?.displayName || awayAbbrev;
  const odds = await getMatchOdds(match.id, homeTeamName, awayTeamName);

  // 融合预测（市场赔率 + MSI模型）
  const prediction = predictMatch(
    homeRating,
    awayRating,
    odds.odds1X2 || undefined,
    odds.oddsOU || undefined,
    odds.oddsCS?.length ? odds.oddsCS : undefined
  );

  // 提取原始赔率数据
  let rawOdds: PredictionWithMeta["rawOdds"] | undefined;
  if (odds.odds1X2 && odds.oddsOU) {
    const imp = oddsToImpliedProb(odds.odds1X2);
    rawOdds = {
      homeOdds: odds.odds1X2.home,
      drawOdds: odds.odds1X2.draw,
      awayOdds: odds.odds1X2.away,
      ouLine: odds.oddsOU.line,
      overOdds: odds.oddsOU.overOdds,
      underOdds: odds.oddsOU.underOdds,
      marketMargin: `${(imp.juice * 100).toFixed(1)}%`,
    };
  }

  // 解析日期和分组
  const matchDate = match.date;
  const group = resolveGroup(homeAbbrev, homeTeamName) || resolveGroup(awayAbbrev, awayTeamName) || '';

  return {
    ...prediction,
    espnMatchId: match.id,
    matchDate,
    matchStatus: parseMatchStatus(match),
    homeScore: home.score,
    awayScore: away.score,
    venue: comp.venue?.fullName || "",
    city: comp.venue?.address?.city || "",
    group,
    ...(rawOdds ? { rawOdds } : {}),
  };
}
