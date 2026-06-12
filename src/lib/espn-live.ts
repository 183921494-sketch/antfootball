/**
 * ESPN 实时轮询服务 - 比分 + 滚球盘口
 * 
 * 数据源：site.api.espn.com/scoreboard（免费，每30s轮询）
 * 滚球盘口：scoreboard响应中的 odds 字段（DraftKings实时赔率）
 */

import { fetchMatches, parseScore, parseMatchStatus, type ESPNMatch } from "./espn-api";
import { getTeamRating, predictMatch, type MatchPrediction } from "./prediction-engine";
import { getMatchOdds, type Odds1X2, type OddsOverUnder } from "./betting-odds";

// ============ 类型定义 ============

export interface LiveScoreUpdate {
  type: "score_update";
  matchId: string;
  homeScore: string;
  awayScore: string;
  status: string;
  clock: string;
  period: number;
  lastEvent?: string;  // 最近事件描述
  timestamp: number;
}

export interface LiveOddsUpdate {
  type: "odds_update";
  matchId: string;
  odds1X2: Odds1X2 | null;
  oddsOU: OddsOverUnder | null;
  source: string;
  timestamp: number;
}

export interface LivePredictionUpdate {
  type: "prediction_update";
  matchId: string;
  prediction: MatchPrediction;
  timestamp: number;
}

export interface LiveCommentary {
  type: "commentary";
  matchId: string;
  message: string;
  eventType: "goal" | "card" | "substitution" | "var" | "halftime" | "odds_shift" | "prediction_tip" | "info";
  timestamp: number;
}

export interface LiveConnection {
  type: "connected" | "heartbeat";
  message: string;
  activeMatches: number;
  liveMatches: number;
  timestamp: number;
}

export type LiveEvent = LiveScoreUpdate | LiveOddsUpdate | LivePredictionUpdate | LiveCommentary | LiveConnection;

// ============ 状态追踪 ============

interface MatchState {
  homeScore: string;
  awayScore: string;
  status: string;
  clock: string;
  period: number;
  odds1X2: Odds1X2 | null;
  oddsOU: OddsOverUnder | null;
  predictedFirst: boolean;
}

const matchStates = new Map<string, MatchState>();

function getState(matchId: string): MatchState {
  if (!matchStates.has(matchId)) {
    matchStates.set(matchId, {
      homeScore: "0",
      awayScore: "0",
      status: "pre",
      clock: "",
      period: 0,
      odds1X2: null,
      oddsOU: null,
      predictedFirst: false,
    });
  }
  return matchStates.get(matchId)!;
}

// ============ ESPN 滚球数据提取 ============

interface ESPNLiveOdds {
  provider: string;
  homeMoneyLine: number;
  awayMoneyLine: number;
  drawMoneyLine: number;
  overUnderLine: number;
  overOdds: number;
  underOdds: number;
  spreadHome: number;
  spreadAway: number;
}

/**
 * 从ESPN赛事中提取实时赔率
 * ESPN返回的odds字段包含DraftKings等博彩公司的滚球数据
 */
export function extractLiveOdds(match: ESPNMatch): ESPNLiveOdds | null {
  const comp = match.competitions?.[0];
  if (!comp?.odds) return null;

  try {
    const oddsData = comp.odds;
    // ESPN odds结构因版本不同有差异，做兼容处理
    const provider = (oddsData as any)?.provider?.name || (oddsData as any)?.[0]?.provider?.name || "unknown";
    const details = (oddsData as any)?.details || "";

    let homeML = 0, awayML = 0, drawML = 0, ouLine = 2.5, overOdds = 1.9, underOdds = 1.9;
    let spreadHome = 0, spreadAway = 0;

    // 尝试从details字符串解析（如 "KOR +160"）
    // 完整解析需要检查moneyline/spread等字段
    if ((oddsData as any)?.moneyline) {
      const ml = (oddsData as any).moneyline;
      if (ml.home?.odds) homeML = ml.home.odds;
      if (ml.away?.odds) awayML = ml.away.odds;
      if (ml.draw?.odds) drawML = ml.draw.odds;
    }

    // Over/Under
    if ((oddsData as any)?.overUnder) {
      ouLine = parseFloat((oddsData as any).overUnder) || 2.5;
    }

    if ((oddsData as any)?.total) {
      const t = (oddsData as any).total;
      if (t.over?.odds) overOdds = t.over.odds;
      if (t.under?.odds) underOdds = t.under.odds;
    }

    // Point Spread
    if ((oddsData as any)?.pointSpread) {
      const ps = (oddsData as any).pointSpread;
      if (ps.home?.odds) spreadHome = ps.home.odds;
      if (ps.away?.odds) spreadAway = ps.away.odds;
    }

    // 如果details有内容但字段为空，从details解析
    if (details && !homeML) {
      const parts = typeof details === "string" ? details.split(" ") : [];
      // "KOR +160" → 赔率3.60
    }

    return {
      provider,
      homeMoneyLine: homeML,
      awayMoneyLine: awayML,
      drawMoneyLine: drawML,
      overUnderLine: ouLine,
      overOdds,
      underOdds,
      spreadHome,
      spreadAway,
    };
  } catch {
    return null;
  }
}

/**
 * 将美国赔率（moneyline）转换为十进制赔率
 */
export function moneylineToDecimal(ml: number): number {
  if (ml > 0) return 1 + ml / 100;   // +160 → 2.60
  if (ml < 0) return 1 - 100 / ml;   // -150 → 1.67
  return 2.0;  // even
}

/**
 * 从ESPN实时数据构建Odds1X2
 */
function buildOdds1X2(espnOdds: ESPNLiveOdds): Odds1X2 | null {
  const h = moneylineToDecimal(espnOdds.homeMoneyLine);
  const a = moneylineToDecimal(espnOdds.awayMoneyLine);
  const d = moneylineToDecimal(espnOdds.drawMoneyLine);

  // 如果数据为默认值（都是even），则无实际数据
  if (h === 2.0 && a === 2.0 && d === 2.0) return null;

  return {
    home: h,
    draw: d > 1.0 ? d : 3.3,  // draw moneyline 可能缺失，给个合理默认值
    away: a,
    source: "draftkings",
    timestamp: Date.now(),
  };
}

function buildOddsOU(espnOdds: ESPNLiveOdds): OddsOverUnder | null {
  if (espnOdds.overOdds === 1.9 && espnOdds.underOdds === 1.9 && espnOdds.overUnderLine === 2.5) {
    return null; // 默认值，无实际数据
  }
  return {
    line: espnOdds.overUnderLine,
    overOdds: espnOdds.overOdds,
    underOdds: espnOdds.underOdds,
    source: "draftkings",
    timestamp: Date.now(),
  };
}

// ============ 核心轮询循环 ============

/**
 * 单次轮询 - 获取所有比赛的最新状态并生成事件
 */
export async function pollAllMatches(): Promise<LiveEvent[]> {
  const events: LiveEvent[] = [];
  const now = Date.now();

  try {
    const matches = await fetchMatches();

    for (const match of matches) {
      const matchId = match.id;
      const prevState = getState(matchId);
      const status = parseMatchStatus(match);
      const score = parseScore(match);
      const comp = match.competitions?.[0];

      // ===== 1. 比分变化检测 =====
      if (score.home !== prevState.homeScore || score.away !== prevState.awayScore) {
        const clockDisplay = match.status?.displayClock || "";
        const period = match.status?.period || 0;

        // 检测是什么事件
        const prevHome = parseInt(prevState.homeScore) || 0;
        const prevAway = parseInt(prevState.awayScore) || 0;
        const currHome = parseInt(score.home) || 0;
        const currAway = parseInt(score.away) || 0;

        let lastEvent = "";
        let commentaryEventType: LiveCommentary["eventType"] = "info";

        if (currHome > prevHome) {
          lastEvent = `${clockDisplay}′ ${score.homeTeam}进球！`;
          commentaryEventType = "goal";
        } else if (currAway > prevAway) {
          lastEvent = `${clockDisplay}′ ${score.awayTeam}进球！`;
          commentaryEventType = "goal";
        } else if (status === "live") {
          lastEvent = `比赛开始`;
        }

        // 比分事件
        events.push({
          type: "score_update",
          matchId,
          homeScore: score.home,
          awayScore: score.away,
          status,
          clock: clockDisplay,
          period,
          lastEvent: lastEvent || undefined,
          timestamp: now,
        });

        // 进球时生成AI解说
        if (commentaryEventType === "goal") {
          const comentary = generateGoalCommentary(
            score.homeTeam,
            score.awayTeam,
            score.home,
            score.away,
            clockDisplay,
            currHome > prevHome ? "home" : "away"
          );
          events.push({
            type: "commentary",
            matchId,
            message: comentary,
            eventType: "goal",
            timestamp: now,
          });
        }

        // 更新状态
        prevState.homeScore = score.home;
        prevState.awayScore = score.away;
        prevState.clock = clockDisplay;
        prevState.period = period;
        prevState.status = status;
        prevState.predictedFirst = false;  // 重新计算预测
      }

      // 时钟更新（仅用于进行中的比赛）
      if (status === "live" && match.status?.displayClock !== prevState.clock) {
        prevState.clock = match.status?.displayClock || "";
        prevState.period = match.status?.period || 0;
        prevState.status = status;
        // 发送轻量级更新（不触发预测重算）
        events.push({
          type: "score_update",
          matchId,
          homeScore: score.home,
          awayScore: score.away,
          status,
          clock: prevState.clock,
          period: prevState.period,
          timestamp: now,
        });
      }

      // ===== 2. 实时赔率提取 =====
      const espnOdds = extractLiveOdds(match);
      if (espnOdds) {
        const newOdds1X2 = buildOdds1X2(espnOdds);
        const newOddsOU = buildOddsOU(espnOdds);

        const prevOdds = prevState.odds1X2;
        const hasOddsChange = !prevOdds || !newOdds1X2 || 
          Math.abs((prevOdds.home || 2.0) - (newOdds1X2?.home || 2.0)) > 0.05 ||
          Math.abs((prevOdds.away || 3.8) - (newOdds1X2?.away || 3.8)) > 0.05;

        if (newOdds1X2 && hasOddsChange) {
          prevState.odds1X2 = newOdds1X2;
          prevState.oddsOU = newOddsOU;
          prevState.predictedFirst = false;

          events.push({
            type: "odds_update",
            matchId,
            odds1X2: newOdds1X2,
            oddsOU: newOddsOU,
            source: espnOdds.provider,
            timestamp: now,
          });

          // 赔率大变动时生成提示
          if (prevOdds && prevOdds.home > 0) {
            const homeShift = (newOdds1X2.home - prevOdds.home) / prevOdds.home;
            if (Math.abs(homeShift) > 0.1) {
              events.push({
                type: "commentary",
                matchId,
                message: generateOddsShiftCommentary(
                  score.homeTeam,
                  score.awayTeam,
                  prevOdds.home,
                  newOdds1X2.home
                ),
                eventType: "odds_shift",
                timestamp: now,
              });
            }
          }
        } else if (newOdds1X2 && !prevState.odds1X2) {
          // 首次获取赔率
          prevState.odds1X2 = newOdds1X2;
          prevState.oddsOU = newOddsOU;
        }
      }

      // ===== 3. 预测更新 =====
      // 只在状态变化后重新计算第一次
      if (!prevState.predictedFirst && (status === "upcoming" || status === "live")) {
        const homeAbbrev = score.homeAbbrev;
        const awayAbbrev = score.awayAbbrev;
        if (homeAbbrev !== "TBD" && awayAbbrev !== "TBD") {
          const homeRating = getTeamRating(homeAbbrev);
          const awayRating = getTeamRating(awayAbbrev);
          if (homeRating && awayRating) {
            // 优先用ESPN实时赔率，没有则回退市场共识
            const odds = prevState.odds1X2
              ? { odds1X2: prevState.odds1X2, oddsOU: prevState.oddsOU, oddsCS: null }
              : await getMatchOdds(matchId, score.homeTeam, score.awayTeam);

            const prediction = predictMatch(
              homeRating,
              awayRating,
              odds.odds1X2 || undefined,
              odds.oddsOU || undefined,
              odds.oddsCS?.length ? odds.oddsCS : undefined
            );

            events.push({
              type: "prediction_update",
              matchId,
              prediction,
              timestamp: now,
            });

            prevState.predictedFirst = true;
          }
        }
      }
    }
  } catch (err) {
    console.error("[ESPN Live Poll] Poll error:", err);
  }

  return events;
}

// ============ AI 解说生成 ============

const GOAL_PHRASES = [
  "漂亮的进球！{scorer}在{clock}分钟破门得分！",
  "球进了！！{scorer}在第{clock}分钟打破了场上的平衡！",
  "关键一击！{scorer}在{clock}分钟的进球改变了比赛的走向！",
  "{clock}′ GOAL！{scorer}打入一记精彩的进球！",
  "精彩！{scorer}在第{clock}分钟完成破门，{team}取得领先！",
  "这球有了！{scorer}的射门穿过人墙直入网窝！",
];

const ODDS_SHIFT_PHRASES = [
  "赔率波动：{home}'s odds shifted from {prev} to {curr}，市场重新评估了双方实力。",
  "滚球盘口调整：{home}赔率从{prev}变为{curr}，资金面出现了新的信号。",
  "盘口异动：{home}赔率{dir}，场内外因素正在影响市场判断。",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateGoalCommentary(
  homeTeam: string,
  awayTeam: string,
  homeScore: string,
  awayScore: string,
  clock: string,
  scorer: "home" | "away"
): string {
  const team = scorer === "home" ? homeTeam : awayTeam;
  const phrase = pickRandom(GOAL_PHRASES)
    .replace("{scorer}", team)
    .replace("{team}", team)
    .replace("{clock}", clock);
  return `${phrase} 【比分 ${homeScore}-${awayScore}】`;
}

function generateOddsShiftCommentary(
  homeTeam: string,
  awayTeam: string,
  prevOdds: number,
  currOdds: number
): string {
  const dir = currOdds > prevOdds ? "上调↑" : "下调↓";
  const phrase = pickRandom(ODDS_SHIFT_PHRASES)
    .replace("{home}", homeTeam)
    .replace("{prev}", prevOdds.toFixed(2))
    .replace("{curr}", currOdds.toFixed(2))
    .replace("{dir}", dir);
  return phrase;
}

/**
 * 生成赛前解说
 */
export function generatePreMatchCommentary(
  homeTeam: string,
  awayTeam: string,
  homeRating: number,
  awayRating: number,
  recommendation: string
): string {
  const msidiff = (homeRating - awayRating).toFixed(1);
  let analysis = "";
  if (homeRating > awayRating) {
    analysis = `${homeTeam}（MSI ${homeRating.toFixed(2)}）在模型评分上领先${awayTeam}（MSI ${awayRating.toFixed(2)}）${msidiff}分，占据明显优势。`;
  } else {
    analysis = `双方MSI评分接近，${homeTeam} ${homeRating.toFixed(2)} vs ${awayTeam} ${awayRating.toFixed(2)}，将是一场势均力敌的较量。`;
  }
  return `【赛前分析】${analysis} 推荐方向：${recommendation}。赔率数据将持续更新。`;
}
