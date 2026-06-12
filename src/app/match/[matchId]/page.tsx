import { fetchMatches, parseMatchStatus, formatMatchDate, parseTeamStats, type ESPNMatch, type ESPNCompetitor } from "@/lib/espn-api";
import { getTeamRating, predictMatch, type MatchPrediction, type TeamRating } from "@/lib/prediction-engine";
import { getMatchOdds } from "@/lib/betting-odds";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PredictionDetail extends MatchPrediction {
  espnMatchId: string;
  matchDate: string;
  matchStatus: "upcoming" | "live" | "finished";
  homeScore: string;
  awayScore: string;
  homeAbbrev: string;
  awayAbbrev: string;
  homeLogo: string;
  awayLogo: string;
  venue: string;
  city: string;
  attendance: number;
  homeStats: Record<string, string>;
  awayStats: Record<string, string>;
  homeForm: string;
  awayForm: string;
  rawOdds?: {
    homeOdds: number; drawOdds: number; awayOdds: number;
    ouLine: number; overOdds: number; underOdds: number;
    marketMargin: string;
  };
}

async function getMatchDetail(matchId: string): Promise<PredictionDetail | null> {
  const matches = await fetchMatches();
  const match = matches.find((m) => m.id === matchId);
  if (!match) return null;

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

  const homeTeamName = home.team?.displayName || homeAbbrev;
  const awayTeamName = away.team?.displayName || awayAbbrev;
  const odds = await getMatchOdds(match.id, homeTeamName, awayTeamName);
  const prediction = predictMatch(
    homeRating,
    awayRating,
    odds.odds1X2 || undefined,
    odds.oddsOU || undefined,
    odds.oddsCS?.length ? odds.oddsCS : undefined
  );

  return {
    ...prediction,
    espnMatchId: match.id,
    matchDate: match.date,
    matchStatus: parseMatchStatus(match),
    homeScore: home.score,
    awayScore: away.score,
    homeAbbrev,
    awayAbbrev,
    homeLogo: home.team?.logo || "",
    awayLogo: away.team?.logo || "",
    ...(odds.odds1X2 && odds.oddsOU ? {
      rawOdds: {
        homeOdds: odds.odds1X2.home,
        drawOdds: odds.odds1X2.draw,
        awayOdds: odds.odds1X2.away,
        ouLine: odds.oddsOU.line,
        overOdds: odds.oddsOU.overOdds,
        underOdds: odds.oddsOU.underOdds,
        marketMargin: `${((1/odds.odds1X2.home + 1/odds.odds1X2.draw + 1/odds.odds1X2.away - 1) * 100).toFixed(1)}%`,
      }
    } : {}),
    venue: comp.venue?.fullName || "",
    city: comp.venue?.address?.city || "",
    attendance: comp.attendance || 0,
    homeStats: parseTeamStats(home),
    awayStats: parseTeamStats(away),
    homeForm: home.form || "",
    awayForm: away.form || "",
  };
}

function DimensionBar({ label, home, away, weight }: { label: string; home: number; away: number; weight: string }) {
  const maxVal = Math.max(home, away, 0.1);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-green-400 font-bold">{home.toFixed(1)}</span>
        <span className="text-[#F7F5F0]/50">{label} <span className="text-[#B08D57]">({weight})</span></span>
        <span className="text-red-400 font-bold">{away.toFixed(1)}</span>
      </div>
      <div className="flex gap-1 h-2">
        <div className="flex-1 flex justify-end">
          <div className="bg-green-500/70 rounded-l-full" style={{ width: `${(home / 10) * 100}%` }} />
        </div>
        <div className="flex-1">
          <div className="bg-red-500/70 rounded-r-full" style={{ width: `${(away / 10) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ score, prob, rank }: { score: string; prob: number; rank: number }) {
  return (
    <div className="bg-white/[0.04] rounded-lg p-2 text-center">
      <div className="text-[10px] text-[#B08D57] mb-1">#{rank}</div>
      <div className="text-lg font-bold text-[#F7F5F0]">{score}</div>
      <div className="text-xs text-[#F7F5F0]/50">{(prob * 100).toFixed(1)}%</div>
    </div>
  );
}

export default async function MatchDetailPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const detail = await getMatchDetail(matchId);

  if (!detail) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center text-[#F7F5F0]/50">
          <div className="text-4xl mb-4">🔍</div>
          <p>比赛未找到</p>
          <Link href="/" className="text-[#B08D57] hover:underline mt-4 block text-sm">← 返回首页</Link>
        </div>
      </div>
    );
  }

  const { date, time } = formatMatchDate(detail.matchDate);
  const isFinished = detail.matchStatus === "finished";
  const recLabel = detail.recommendation === "home" ? detail.homeTeam.teamName
    : detail.recommendation === "away" ? detail.awayTeam.teamName : "平局";

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#1a1209] to-[#0a0a0a] py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1 text-[#B08D57] hover:underline text-xs mb-4">
            <ArrowLeft className="w-3 h-3" /> 返回赛程
          </Link>

          {/* 对阵双方 */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex-1 text-center">
              {detail.homeLogo && <img src={detail.homeLogo} alt="" className="w-12 h-12 mx-auto mb-2" />}
              <div className="text-lg font-bold text-[#F7F5F0]">{detail.homeTeam.teamName}</div>
              <div className="text-xs text-[#B08D57]">MSI {detail.homeTeam.msiScore.toFixed(2)}</div>
            </div>
            <div className="px-6 text-center">
              {isFinished ? (
                <div className="text-4xl font-bold text-[#F7F5F0]">
                  {detail.homeScore}<span className="text-[#B08D57] mx-2">:</span>{detail.awayScore}
                </div>
              ) : (
                <div className="text-2xl font-bold text-[#B08D57]">VS</div>
              )}
              <div className="text-xs text-[#F7F5F0]/40 mt-1">{date} {time}</div>
              {detail.venue && <div className="text-xs text-[#F7F5F0]/30 mt-0.5">{detail.venue}</div>}
            </div>
            <div className="flex-1 text-center">
              {detail.awayLogo && <img src={detail.awayLogo} alt="" className="w-12 h-12 mx-auto mb-2" />}
              <div className="text-lg font-bold text-[#F7F5F0]">{detail.awayTeam.teamName}</div>
              <div className="text-xs text-[#B08D57]">MSI {detail.awayTeam.msiScore.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* 1. 胜平负预测 */}
        <section>
          <h2 className="text-sm font-bold text-[#B08D57] mb-3">📊 胜平负预测</h2>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            {/* 推荐结果 */}
            <div className="text-center mb-4 p-3 bg-[#B08D57]/10 rounded-lg border border-[#B08D57]/20">
              <div className="text-xs text-[#F7F5F0]/50 mb-1">推荐结果</div>
              <div className="text-xl font-bold text-[#B08D57]">{recLabel}</div>
            </div>

            {/* 概率条 */}
            <div className="flex h-8 rounded-full overflow-hidden text-sm font-bold mb-2">
              <div className="bg-green-500/80 flex items-center justify-center text-white" style={{ width: `${detail.homeWinProb * 100}%` }}>
                {(detail.homeWinProb * 100).toFixed(1)}%
              </div>
              <div className="bg-yellow-500/80 flex items-center justify-center text-black" style={{ width: `${detail.drawProb * 100}%` }}>
                {(detail.drawProb * 100).toFixed(1)}%
              </div>
              <div className="bg-red-500/80 flex items-center justify-center text-white" style={{ width: `${detail.awayWinProb * 100}%` }}>
                {(detail.awayWinProb * 100).toFixed(1)}%
              </div>
            </div>
            <div className="flex justify-between text-xs text-[#F7F5F0]/40">
              <span>主胜 {detail.homeTeam.teamName}</span>
              <span>平局</span>
              <span>客胜 {detail.awayTeam.teamName}</span>
            </div>
          </div>
        </section>

        {/* 2. 比分预测 Top5 */}
        <section>
          <h2 className="text-sm font-bold text-[#B08D57] mb-3">🎯 比分预测 Top 5</h2>
          <div className="grid grid-cols-5 gap-2">
            {detail.scorePredictions.map((s, i) => (
              <ScoreCard key={s.score} score={s.score} prob={s.probability} rank={i + 1} />
            ))}
          </div>
        </section>

        {/* 3. 进球数预测 */}
        <section>
          <h2 className="text-sm font-bold text-[#B08D57] mb-3">⚽ 进球数预测</h2>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div>
                <div className="text-xs text-[#F7F5F0]/40">主队期望</div>
                <div className="text-xl font-bold text-green-400">{detail.expectedHomeGoals}</div>
              </div>
              <div>
                <div className="text-xs text-[#F7F5F0]/40">总期望</div>
                <div className="text-xl font-bold text-[#B08D57]">{detail.expectedTotalGoals}</div>
              </div>
              <div>
                <div className="text-xs text-[#F7F5F0]/40">客队期望</div>
                <div className="text-xl font-bold text-red-400">{detail.expectedAwayGoals}</div>
              </div>
            </div>

            {/* 大小球 */}
            <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
              <div className="text-center flex-1">
                <div className="text-xs text-blue-400">大球 {detail.overUnderLine}</div>
                <div className="text-lg font-bold text-blue-400">{(detail.overProb * 100).toFixed(1)}%</div>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div className="text-center flex-1">
                <div className="text-xs text-purple-400">小球 {detail.overUnderLine}</div>
                <div className="text-lg font-bold text-purple-400">{(detail.underProb * 100).toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. MSI六维对比 */}
        <section>
          <h2 className="text-sm font-bold text-[#B08D57] mb-3">📐 MSI 六维对比</h2>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
            <DimensionBar label="阵容深度" home={detail.homeTeam.rosterDepth} away={detail.awayTeam.rosterDepth} weight="25%" />
            <DimensionBar label="战术体系" home={detail.homeTeam.tacticalSystem} away={detail.awayTeam.tacticalSystem} weight="25%" />
            <DimensionBar label="关键球员" home={detail.homeTeam.keyPlayerImpact} away={detail.awayTeam.keyPlayerImpact} weight="20%" />
            <DimensionBar label="教练决策" home={detail.homeTeam.coachDecision} away={detail.awayTeam.coachDecision} weight="15%" />
            <DimensionBar label="对阵数据" home={detail.homeTeam.matchupData} away={detail.awayTeam.matchupData} weight="10%" />
            <DimensionBar label="心理意志" home={detail.homeTeam.mentalResilience} away={detail.awayTeam.mentalResilience} weight="5%" />

            <div className="pt-3 mt-3 border-t border-white/10 text-center">
              <div className="flex items-center justify-center gap-4">
                <span className="text-green-400 font-bold text-lg">{detail.homeTeam.msiScore.toFixed(2)}</span>
                <span className="text-[#B08D57]">MSI总分</span>
                <span className="text-red-400 font-bold text-lg">{detail.awayTeam.msiScore.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. 洞察/风险/机会 */}
        {detail.keyInsights.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-[#B08D57] mb-3">💡 关键洞察</h2>
            <div className="space-y-2">
              {detail.keyInsights.map((insight, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-sm text-[#F7F5F0]/70">
                  {insight}
                </div>
              ))}
            </div>
          </section>
        )}

        {detail.riskFactors.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-red-400 mb-3">⚠️ 风险因素</h2>
            <div className="space-y-2">
              {detail.riskFactors.map((risk, i) => (
                <div key={i} className="bg-red-500/[0.05] border border-red-500/10 rounded-lg p-3 text-sm text-red-300/70">
                  {risk}
                </div>
              ))}
            </div>
          </section>
        )}

        {detail.opportunityFactors.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-green-400 mb-3">✅ 机会因素</h2>
            <div className="space-y-2">
              {detail.opportunityFactors.map((opp, i) => (
                <div key={i} className="bg-green-500/[0.05] border border-green-500/10 rounded-lg p-3 text-sm text-green-300/70">
                  {opp}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 已完场：实际技术统计 */}
        {isFinished && Object.keys(detail.homeStats).length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-[#B08D57] mb-3">📈 实际技术统计</h2>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
              {Object.entries(detail.homeStats).map(([key, homeVal]) => {
                const awayVal = detail.awayStats[key];
                if (!awayVal) return null;
                const hN = parseFloat(homeVal);
                const aN = parseFloat(awayVal);
                const hHighlight = !isNaN(hN) && !isNaN(aN) && hN > aN;
                const aHighlight = !isNaN(hN) && !isNaN(aN) && aN > hN;
                return (
                  <div key={key} className="flex items-center text-xs">
                    <span className={`flex-1 text-right ${hHighlight ? "text-green-400 font-bold" : "text-[#F7F5F0]/50"}`}>{homeVal}</span>
                    <span className="px-3 text-[#F7F5F0]/30">{key}</span>
                    <span className={`flex-1 text-left ${aHighlight ? "text-red-400 font-bold" : "text-[#F7F5F0]/50"}`}>{awayVal}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 置信度 */}
        <section className="text-center pb-8">
          <div className="inline-flex items-center gap-2 bg-white/[0.03] rounded-full px-4 py-2">
            <span className="text-xs text-[#F7F5F0]/40">预测置信度</span>
            <span className="text-sm font-bold text-[#B08D57]">{(detail.confidenceLevel * 100).toFixed(0)}% ({detail.confidenceLabel})</span>
          </div>
        </section>
      </div>
    </div>
  );
}
