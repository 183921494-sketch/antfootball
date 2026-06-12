import { NextRequest, NextResponse } from "next/server";
import { fetchMatches, parseMatchStatus, type ESPNMatch } from "@/lib/espn-api";
import { getTeamRating, predictMatch, type MatchPrediction } from "@/lib/prediction-engine";
import { getMatchOdds, oddsToImpliedProb } from "@/lib/betting-odds";

// ============ 2026世界杯小组赛分组表 ============
const GROUP_MAP: Record<string, string> = {
  'ARG': 'A', 'PER': 'A', 'POL': 'A', 'SAU': 'A',
  'FRA': 'B', 'MEX': 'B', 'NZL': 'B', 'UZB': 'B',
  'ENG': 'C', 'IRN': 'C', 'JPN': 'C', 'USA': 'C',
  'BRA': 'D', 'CRC': 'D', 'GHA': 'D', 'SUI': 'D',
  'ESP': 'E', 'PAR': 'E', 'CMR': 'E', 'CZE': 'E',
  'GER': 'F', 'KEN': 'F', 'PAN': 'F', 'SWE': 'F',
  'ITA': 'G', 'IND': 'G', 'URU': 'G', 'VIE': 'G',
  'NED': 'H', 'EGY': 'H', 'IRQ': 'H', 'SEN': 'H',
  'POR': 'I', 'ANG': 'I', 'GUI': 'I', 'NGA': 'I',
  'BEL': 'J', 'UKR': 'J', 'QAT': 'J', 'TUN': 'J',
  'AUT': 'K', 'CUR': 'K', 'SRB': 'K', 'TUR': 'K',
  'CAN': 'L', 'CHI': 'L', 'MAR': 'L', 'RSA': 'L',
};

function resolveGroup(abbrev: string, teamName: string): string {
  if (GROUP_MAP[abbrev]) return GROUP_MAP[abbrev];
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
    'Wales': 'H', 'Mali': 'G', 'Albania': 'A', 'Greece': 'C',
    'Hungary': 'F', 'Romania': 'E', 'Finland': 'B', 'Slovakia': 'D',
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
    for (const match of filtered) {
      const item = buildMatchResponse(match);
      if (item) results.push(item);
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

  const matchDate = new Date(match.date);
  const dateStr = matchDate.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric' });

  const matchStatus = match.status;
  const period = matchStatus?.period?.toString() || '0';
  const clock = matchStatus?.displayClock || '';
  const venue = comp.venue?.fullName || '';
  const city = comp.venue?.address?.city || '';
  const group = resolveGroup(homeAbbrev, homeTeamName) || resolveGroup(awayAbbrev, awayTeamName) || '';

  return {
    // Flat match fields (no 'prediction' wrapper at top level)
    matchId: match.id,
    espnMatchId: match.id,
    homeTeam: homeTeamName,
    awayTeam: awayTeamName,
    homeTeamAbbrev: homeAbbrev,
    awayTeamAbbrev: awayAbbrev,
    venue,
    startTime: match.date,
    date: dateStr,
    status,
    period,
    clock,
    homeScore: parseInt(home.score || '0'),
    awayScore: parseInt(away.score || '0'),
    group,
    // Prediction as nested object (matching frontend MatchData interface)
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
  };
}
