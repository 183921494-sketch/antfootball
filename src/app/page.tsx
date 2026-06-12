import { fetchMatches, parseMatchStatus, formatMatchDate, getStageLabel, type ESPNMatch } from "@/lib/espn-api";
import { getTeamRating, predictMatch, type MatchPrediction } from "@/lib/prediction-engine";
import Link from "next/link";

interface PredictionWithMeta extends MatchPrediction {
  espnMatchId: string;
  matchDate: string;
  matchStatus: "upcoming" | "live" | "finished";
  homeScore: string;
  awayScore: string;
  homeAbbrev: string;
  awayAbbrev: string;
  venue: string;
  city: string;
}

async function getPredictions(): Promise<PredictionWithMeta[]> {
  const matches = await fetchMatches();
  const results: PredictionWithMeta[] = [];

  for (const match of matches) {
    const comp = match.competitions?.[0];
    if (!comp) continue;
    const home = comp.competitors?.find((c) => c.homeAway === "home");
    const away = comp.competitors?.find((c) => c.homeAway === "away");
    if (!home || !away) continue;

    const homeAbbrev = home.team?.abbreviation;
    const awayAbbrev = away.team?.abbreviation;
    if (!homeAbbrev || !awayAbbrev) continue;

    const homeRating = getTeamRating(homeAbbrev);
    const awayRating = getTeamRating(awayAbbrev);
    if (!homeRating || !awayRating) continue;

    const isHostNation = ["Mexico", "United States", "Canada"].includes(home.team?.name);

    const prediction = predictMatch(homeRating, awayRating, {
      neutralVenue: !isHostNation,
      homeAdvantage: isHostNation ? 0.10 : 0,
    });

    results.push({
      ...prediction,
      espnMatchId: match.id,
      matchDate: match.date,
      matchStatus: parseMatchStatus(match),
      homeScore: home.score,
      awayScore: away.score,
      homeAbbrev,
      awayAbbrev,
      venue: comp.venue?.fullName || "",
      city: comp.venue?.address?.city || "",
    });
  }

  return results.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
}

function StatusBadge({ status }: { status: string }) {
  if (status === "finished") return <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded">完场</span>;
  if (status === "live") return <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded animate-pulse">直播中</span>;
  return <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">未开</span>;
}

function ConfidenceBadge({ level, label }: { level: number; label: string }) {
  const color = level >= 0.80 ? "text-green-400 bg-green-500/20"
    : level >= 0.65 ? "text-blue-400 bg-blue-500/20"
    : level >= 0.50 ? "text-yellow-400 bg-yellow-500/20"
    : "text-red-400 bg-red-500/20";
  return <span className={`text-xs px-2 py-0.5 rounded ${color}`}>置信度{label}</span>;
}

function PredictionRow({ pred }: { pred: PredictionWithMeta }) {
  const { date, time } = formatMatchDate(pred.matchDate);
  const isFinished = pred.matchStatus === "finished";
  const recLabel = pred.recommendation === "home" ? pred.homeTeam.teamName
    : pred.recommendation === "away" ? pred.awayTeam.teamName : "平局";
  const recColor = pred.recommendation === "home" ? "text-green-400"
    : pred.recommendation === "away" ? "text-red-400" : "text-yellow-400";

  return (
    <Link href={`/match/${pred.espnMatchId}`} className="block">
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:border-[#B08D57]/30 hover:bg-white/[0.05] transition-all active:scale-[0.99] cursor-pointer">
        {/* 日期行 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#B08D57]">{date}</span>
            <span className="text-xs text-[#F7F5F0]/60">{time}</span>
            <StatusBadge status={pred.matchStatus} />
          </div>
          <ConfidenceBadge level={pred.confidenceLevel} label={pred.confidenceLabel} />
        </div>

        {/* 对阵 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 text-right">
            <div className="text-base font-bold text-[#F7F5F0]">{pred.homeTeam.teamName}</div>
            <div className="text-xs text-[#F7F5F0]/40">MSI {pred.homeTeam.msiScore.toFixed(1)}</div>
          </div>
          <div className="px-4 text-center min-w-[80px]">
            {isFinished ? (
              <div className="text-2xl font-bold text-[#F7F5F0]">
                {pred.homeScore}<span className="text-[#B08D57] mx-1">:</span>{pred.awayScore}
              </div>
            ) : (
              <div className="text-lg font-bold text-[#B08D57]">VS</div>
            )}
          </div>
          <div className="flex-1 text-left">
            <div className="text-base font-bold text-[#F7F5F0]">{pred.awayTeam.teamName}</div>
            <div className="text-xs text-[#F7F5F0]/40">MSI {pred.awayTeam.msiScore.toFixed(1)}</div>
          </div>
        </div>

        {/* 预测行 */}
        <div className="flex items-center gap-2">
          {/* 概率条 */}
          <div className="flex-1 flex h-5 rounded-full overflow-hidden text-xs font-bold">
            <div className="bg-green-500/80 flex items-center justify-center text-white" style={{ width: `${pred.homeWinProb * 100}%` }}>
              {(pred.homeWinProb * 100).toFixed(0)}%
            </div>
            <div className="bg-yellow-500/80 flex items-center justify-center text-black" style={{ width: `${pred.drawProb * 100}%` }}>
              {(pred.drawProb * 100).toFixed(0)}%
            </div>
            <div className="bg-red-500/80 flex items-center justify-center text-white" style={{ width: `${pred.awayWinProb * 100}%` }}>
              {(pred.awayWinProb * 100).toFixed(0)}%
            </div>
          </div>
          {/* 推荐标签 */}
          <div className={`text-xs font-bold ${recColor} shrink-0`}>
            → {recLabel}
          </div>
        </div>

        {/* 比分+进球 */}
        <div className="flex items-center justify-between mt-2 text-xs text-[#F7F5F0]/40">
          <span>预测比分 {pred.mostLikelyScore}</span>
          <span>进球 {pred.expectedTotalGoals.toFixed(1)} {pred.overProb > 0.5 ? "大" : "小"}{pred.overUnderLine}</span>
        </div>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const predictions = await getPredictions();

  // 按状态分组
  const finished = predictions.filter((p) => p.matchStatus === "finished");
  const upcoming = predictions.filter((p) => p.matchStatus === "upcoming");
  const live = predictions.filter((p) => p.matchStatus === "live");

  // 统计
  const totalMatches = predictions.length;
  const predicted = upcoming.length;
  const avgConfidence = upcoming.length > 0
    ? upcoming.reduce((s, p) => s + p.confidenceLevel, 0) / upcoming.length
    : 0;

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1a1209] to-[#0a0a0a] py-8 md:py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl md:text-5xl font-bold text-[#F7F5F0]">🐜 蚂蚁足球</h1>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
          </div>
          <p className="text-sm md:text-base text-[#B08D57] mb-4">高精度预测 · 胜平负 / 比分 / 进球数</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/[0.04] rounded-lg p-3 text-center">
              <div className="text-xl md:text-2xl font-bold text-[#B08D57]">{totalMatches}</div>
              <div className="text-[10px] md:text-xs text-[#F7F5F0]/40">总场次</div>
            </div>
            <div className="bg-white/[0.04] rounded-lg p-3 text-center">
              <div className="text-xl md:text-2xl font-bold text-blue-400">{predicted}</div>
              <div className="text-[10px] md:text-xs text-[#F7F5F0]/40">待预测</div>
            </div>
            <div className="bg-white/[0.04] rounded-lg p-3 text-center">
              <div className="text-xl md:text-2xl font-bold text-green-400">{(avgConfidence * 100).toFixed(0)}%</div>
              <div className="text-[10px] md:text-xs text-[#F7F5F0]/40">平均置信度</div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Matches */}
      {live.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 py-4">
          <h2 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            正在直播 ({live.length})
          </h2>
          <div className="space-y-3">
            {live.map((p) => <PredictionRow key={p.espnMatchId} pred={p} />)}
          </div>
        </section>
      )}

      {/* Upcoming Matches */}
      {upcoming.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 py-4">
          <h2 className="text-sm font-bold text-blue-400 mb-3">⏳ 即将开赛 ({upcoming.length})</h2>
          <div className="space-y-3">
            {upcoming.map((p) => <PredictionRow key={p.espnMatchId} pred={p} />)}
          </div>
        </section>
      )}

      {/* Finished Matches */}
      {finished.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 py-4">
          <h2 className="text-sm font-bold text-gray-400 mb-3">✅ 已完场 ({finished.length})</h2>
          <div className="space-y-3">
            {finished.map((p) => <PredictionRow key={p.espnMatchId} pred={p} />)}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-8 mt-8 border-t border-white/5 text-center">
        <p className="text-xs text-[#F7F5F0]/30">🐜 蚂蚁足球 · 2026世界杯高精度预测 · 数据来源 ESPN</p>
      </footer>
    </main>
  );
}
