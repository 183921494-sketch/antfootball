import { NextRequest, NextResponse } from "next/server";
import { fetchMatches, parseMatchStatus, parseScore, type ESPNMatch } from "@/lib/espn-api";
import { getTeamRating, predictMatch, type MatchPrediction } from "@/lib/prediction-engine";

/**
 * GET /api/predict
 * 
 * 查询参数：
 * - matchId: ESPN比赛ID（获取单场预测）
 * - date: 日期 YYYYMMDD（获取某日预测）
 * - all: 1（获取全部预测）
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
      const dateStr = date; // YYYYMMDD
      filtered = matches.filter((m) => m.date.startsWith(dateStr.slice(0, 4) + "-" + dateStr.slice(4, 6) + "-" + dateStr.slice(6, 8)));
    }

    // 为每场比赛生成预测
    const predictions = [];
    for (const match of filtered) {
      const pred = generatePredictionFromESPN(match);
      if (pred) predictions.push(pred);
    }

    // 按时间排序
    predictions.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

    return NextResponse.json({
      success: true,
      count: predictions.length,
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
}

function generatePredictionFromESPN(match: ESPNMatch): PredictionWithMeta | null {
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
  if (!homeRating || !awayRating) return null;

  // 判断是否中立场地（世界杯小组赛一般非真正主场）
  const isNeutral = true; // 世界杯基本都是中立场地，除了揭幕战东道主
  const isHostNation = home.team?.name === "Mexico" || home.team?.name === "United States" || home.team?.name === "Canada";

  const prediction = predictMatch(homeRating, awayRating, {
    neutralVenue: isNeutral && !isHostNation,
    homeAdvantage: isHostNation ? 0.10 : 0, // 东道主有微弱优势
  });

  return {
    ...prediction,
    espnMatchId: match.id,
    matchDate: match.date,
    matchStatus: parseMatchStatus(match),
    homeScore: home.score,
    awayScore: away.score,
    venue: comp.venue?.fullName || "",
    city: comp.venue?.address?.city || "",
  };
}
