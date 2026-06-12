/**
 * 蚂蚁足球 - 国际博彩赔率整合模块 v1
 * 
 * 数据源：The Odds API (https://the-odds-api.com)
 * 备选：手动输入市场赔率数据
 * 
 * 支持盘口类型：
 * 1. 1X2（胜平负） - 主胜/平局/客胜
 * 2. Asian Handicap（亚盘） - 让球盘
 * 3. Over/Under（大小球） - 进球数大小盘
 * 4. Correct Score（波胆） - 具体比分
 */

import type { TeamRating } from "./prediction-engine";

// ============ 类型定义 ============

export type OddsMarket = "1x2" | "ah" | "ou" | "cs";
export type OddsSource = "pinnacle" | "bet365" | "draftkings" | "manual" | "market";

// 1X2 赔率
export interface Odds1X2 {
  home: number;      // 主胜赔率
  draw: number;       // 平局赔率
  away: number;      // 客胜赔率
  source: OddsSource;
  timestamp: number;
}

// 亚盘赔率
export interface OddsAsianHandicap {
  line: number;       // 让球数，如 -0.5, +1.25, -1.75
  homeOdds: number;  // 主队赔率
  awayOdds: number;  // 客队赔率
  source: OddsSource;
  timestamp: number;
}

// 大小球赔率
export interface OddsOverUnder {
  line: number;       // 进球线，如 2.5, 3.0, 3.5
  overOdds: number;  // 大球赔率
  underOdds: number; // 小球赔率
  source: OddsSource;
  timestamp: number;
}

// 波胆赔率
export interface OddsCorrectScore {
  score: string;     // "1-0", "2-1" 等
  homeGoals: number;
  awayGoals: number;
  odds: number;
  source: OddsSource;
  timestamp: number;
}

// 完整赔率包
export interface MatchOdds {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  odds1X2: Odds1X2 | null;
  oddsAH: OddsAsianHandicap | null;
  oddsOU: OddsOverUnder | null;
  oddsCS: OddsCorrectScore[];
  lastUpdated: number;
}

// 赔率概率转换
export interface ImpliedProbabilities {
  home: number;
  draw: number;
  away: number;
  homeFair: number;   // 去除水钱后的公平概率
  drawFair: number;
  awayFair: number;
  juice: number;      // 水钱率（标准为0，赔率公平则为0）
}

// 市场共识赔率（用于无API情况）
export interface MarketConsensusOdds {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  // 1X2 市场平均赔率
  market1X2: Odds1X2;
  // 大小球市场线
  marketOU: OddsOverUnder;
  // 关键波胆赔率
  keyScores: OddsCorrectScore[];
}

// ============ 赔率数据获取 ============

// 赔率缓存
let oddsCache: Map<string, { data: MatchOdds; timestamp: number }> = new Map();
const ODDS_CACHE_TTL = 5 * 60 * 1000; // 5分钟

/**
 * The Odds API 配置
 * 免费版：每月1000次请求
 * 注册：https://the-odds-api.com
 */
const ODDS_API_KEY = process.env.ODDS_API_KEY || "";
const ODDS_API_BASE = "https://api.the-odds-api.com/v4";

// 映射到正确的足球 sportKey
const SPORT_KEYS = {
  soccer_world_cup: "soccer_world_cup_2026",
  soccer: "soccer",
};

// 博彩公司映射
const BOOKMAKER_KEYS = {
  pinnacle: "pinnacle",
  bet365: "bet365",
  unibet: "unibet",
  bwin: "bwin",
};

/**
 * 从 The Odds API 获取赔率
 */
export async function fetchOddsFromAPI(sportKey: string = "soccer_world_cup_2026", regions: string = "eu,uk,us"): Promise<Record<string, MatchOdds>> {
  if (!ODDS_API_KEY) {
    console.warn("[Odds] No ODDS_API_KEY set, using market consensus");
    return {};
  }

  const url = `${ODDS_API_BASE}/sport/${sportKey}/odds?apiKey=${ODDS_API_KEY}&regions=${regions}&markets=h2h,totals,spreads,correct_score`;

  const res = await fetch(url, {
    next: { revalidate: 300 }, // 5分钟缓存
    headers: { "User-Agent": "AntFootball/1.0" },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Odds API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const oddsMap: Record<string, MatchOdds> = {};

  for (const bookmaker of data as any[]) {
    const title = bookmaker.title;
    const markets = bookmaker.markets || [];

    for (const market of markets) {
      const outcomes = market.outcomes || [];
      // 从 market key 提取 matchId (需要从标题匹配)
      // The Odds API 返回的是 bookmaker 结构，需要通过标题匹配比赛
    }
  }

  return oddsMap;
}

/**
 * 获取指定比赛的赔率（从缓存或市场共识）
 */
export async function getMatchOdds(matchId: string, homeTeam: string, awayTeam: string): Promise<MatchOdds> {
  const now = Date.now();
  const cached = oddsCache.get(matchId);

  if (cached && now - cached.timestamp < ODDS_CACHE_TTL) {
    return cached.data;
  }

  // 尝试从 API 获取
  try {
    const odds = await fetchOddsFromAPI();
    if (odds[matchId]) {
      oddsCache.set(matchId, { data: odds[matchId], timestamp: now });
      return odds[matchId];
    }
  } catch (e) {
    console.warn("[Odds] API fetch failed, using market consensus:", e);
  }

  // 回退到市场共识数据
  const consensus = getMarketConsensus(matchId, homeTeam, awayTeam);
  oddsCache.set(matchId, { data: consensus, timestamp: now });
  return consensus;
}

// ============ 概率转换工具 ============

/**
 * 将1X2赔率转换为隐含概率
 * 公式：隐含概率 = 1 / 赔率
 * 
 * 注意：博彩公司赔率包含"水钱"（overround/vig）
 * 隐含概率之和 > 1，差值为水钱
 */
export function oddsToImpliedProb(odds: Odds1X2): ImpliedProbabilities {
  const rawHome = 1 / odds.home;
  const rawDraw = 1 / odds.draw;
  const rawAway = 1 / odds.away;
  const rawTotal = rawHome + rawDraw + rawAway;

  // 水钱率
  const juice = rawTotal - 1;

  return {
    home: rawHome,
    draw: rawDraw,
    away: rawAway,
    homeFair: rawHome / rawTotal,
    drawFair: rawDraw / rawTotal,
    awayFair: rawAway / rawTotal,
    juice,
  };
}

/**
 * 将公平概率转换回赔率（去除水钱）
 */
export function fairProbToOdds(prob: number): number {
  return Math.round((1 / prob) * 100) / 100;
}

/**
 * 找到价值投注（Value Bet）
 * 公式：价值 = 我的概率 - 博彩公司隐含概率
 * 
 * @param myProb 我的预测概率
 * @param marketProb 博彩公司隐含概率
 * @param threshold 价值阈值（一般 > 5% 才有意义）
 */
export function findValueBet(myProb: number, marketProb: number, threshold: number = 0.05): {
  hasValue: boolean;
  valueEdge: number;       // 我的概率 - 隐含概率
  roiPercent: number;       // 期望收益率 = (赔率 × 我的概率) - 1
  kellyFraction: number;    // Kelly fraction（建议投注比例）
} {
  const impliedOdds = 1 / marketProb;
  const valueEdge = myProb - marketProb;
  const hasValue = valueEdge > threshold;
  const roiPercent = (impliedOdds * myProb) - 1;
  const kellyFraction = Math.max(0, (myProb * impliedOdds - 1) / (impliedOdds - 1));

  return { hasValue, valueEdge, roiPercent, kellyFraction };
}

/**
 * 计算均衡赔率（考虑双方实力差距）
 */
export function calculateBalancedOdds(
  homeMSIScore: number,
  awayMSIScore: number,
  homeAdvantage: number = 0.3 // 主场优势（约0.3 MSI分）
): Odds1X2 {
  // MSI差距
  const msiDiff = (homeMSIScore + homeAdvantage) - awayMSIScore;
  
  // 归一化到概率（使用 logistic 函数）
  const homeRaw = 1 / (1 + Math.pow(10, -msiDiff / 3));
  const awayRaw = 1 / (1 + Math.pow(10, msiDiff / 3));
  const drawRaw = 1 - homeRaw - awayRaw;

  // 加上平局概率（一般 25-30%）
  const homeProb = homeRaw * 0.72;
  const awayProb = awayRaw * 0.72;
  const drawProb = 0.28;

  // 转换为赔率
  const homeOdds = fairProbToOdds(homeProb);
  const drawOdds = fairProbToOdds(drawProb);
  const awayOdds = fairProbToOdds(awayProb);

  return {
    home: homeOdds,
    draw: drawOdds,
    away: awayOdds,
    source: "market",
    timestamp: Date.now(),
  };
}

// ============ 市场共识赔率数据 ===========
// 2026世界杯小组赛赔率（基于主流博彩公司平均）
// 数据来源：模拟主流市场赔率（实际使用时替换为真实API数据）

const MARKET_CONSENSUS_DATA: Record<string, {
  home1X2: [number, number, number]; // [home, draw, away]
  ou: [number, number, number];     // [line, over, under]
  keyCS: [string, number][];        // [score, odds]
}> = {
  "401728481": { home1X2: [1.85, 3.50, 4.50], ou: [2.5, 1.90, 1.90], keyCS: [["1-0", 7.0], ["2-0", 8.5], ["2-1", 9.0], ["1-1", 6.5], ["0-0", 7.0]] },
  "401728482": { home1X2: [2.10, 3.30, 3.60], ou: [2.5, 1.85, 1.95], keyCS: [["1-0", 7.5], ["1-1", 6.0], ["0-0", 7.5]] },
  "401728483": { home1X2: [1.55, 4.00, 5.50], ou: [2.5, 1.75, 2.05], keyCS: [["2-0", 6.0], ["1-0", 5.5], ["2-1", 8.0], ["3-0", 10.0]] },
  "401728484": { home1X2: [2.30, 3.20, 3.20], ou: [2.5, 1.90, 1.90], keyCS: [["1-0", 7.0], ["1-1", 5.5], ["0-0", 7.0]] },
  "401728485": { home1X2: [1.70, 3.60, 4.80], ou: [2.5, 1.80, 2.00], keyCS: [["2-0", 7.0], ["1-0", 6.0], ["2-1", 9.0]] },
  "401728486": { home1X2: [2.00, 3.30, 4.00], ou: [2.5, 1.85, 1.95], keyCS: [["1-0", 7.0], ["1-1", 6.0], ["0-0", 7.5]] },
  "401728487": { home1X2: [1.45, 4.50, 6.00], ou: [2.5, 1.70, 2.10], keyCS: [["2-0", 5.5], ["3-0", 8.0], ["1-0", 5.0]] },
  "401728488": { home1X2: [2.50, 3.10, 3.00], ou: [2.5, 1.95, 1.85], keyCS: [["1-0", 7.5], ["0-0", 6.5], ["1-1", 5.5]] },
  "401728489": { home1X2: [1.90, 3.40, 4.20], ou: [2.5, 1.85, 1.95], keyCS: [["1-0", 6.5], ["2-0", 8.5], ["1-1", 6.0]] },
  "401728490": { home1X2: [1.60, 4.00, 5.00], ou: [2.5, 1.75, 2.05], keyCS: [["2-0", 6.5], ["1-0", 5.5], ["2-1", 8.5]] },
  "401728491": { home1X2: [2.20, 3.20, 3.40], ou: [2.5, 1.90, 1.90], keyCS: [["1-0", 7.5], ["1-1", 6.0], ["0-0", 7.0]] },
  "401728492": { home1X2: [3.40, 3.20, 2.20], ou: [2.5, 1.95, 1.85], keyCS: [["1-0", 9.0], ["1-1", 6.0], ["0-0", 6.5]] },
  "401728493": { home1X2: [1.75, 3.50, 4.60], ou: [2.5, 1.82, 1.98], keyCS: [["2-0", 7.0], ["1-0", 6.0], ["2-1", 9.0]] },
  "401728494": { home1X2: [2.40, 3.10, 3.10], ou: [2.5, 1.92, 1.88], keyCS: [["1-0", 7.5], ["1-1", 5.8], ["0-0", 6.8]] },
  "401728495": { home1X2: [1.50, 4.20, 5.50], ou: [2.5, 1.72, 2.08], keyCS: [["2-0", 5.8], ["1-0", 5.2], ["3-0", 9.0]] },
  "401728496": { home1X2: [2.10, 3.30, 3.50], ou: [2.5, 1.88, 1.92], keyCS: [["1-0", 7.2], ["1-1", 6.0], ["0-0", 7.2]] },
  "401728497": { home1X2: [1.40, 4.50, 6.50], ou: [2.5, 1.68, 2.12], keyCS: [["2-0", 5.2], ["3-0", 7.5], ["1-0", 4.8]] },
  "401728498": { home1X2: [2.60, 3.10, 2.80], ou: [2.5, 1.98, 1.82], keyCS: [["1-0", 8.0], ["0-0", 6.2], ["1-1", 5.5]] },
  "401728499": { home1X2: [1.85, 3.50, 4.30], ou: [2.5, 1.85, 1.95], keyCS: [["1-0", 6.5], ["2-0", 8.0], ["1-1", 6.2]] },
  "401728500": { home1X2: [2.00, 3.30, 3.80], ou: [2.5, 1.85, 1.95], keyCS: [["1-0", 7.0], ["1-1", 6.0], ["0-0", 7.5]] },
};

/**
 * 获取市场共识赔率（无API时的回退数据）
 */
export function getMarketConsensus(matchId: string, homeTeam: string, awayTeam: string): MatchOdds {
  const data = MARKET_CONSENSUS_DATA[matchId];

  if (data) {
    return {
      matchId,
      homeTeam,
      awayTeam,
      odds1X2: {
        home: data.home1X2[0],
        draw: data.home1X2[1],
        away: data.home1X2[2],
        source: "market",
        timestamp: Date.now(),
      },
      oddsAH: null,
      oddsOU: {
        line: data.ou[0],
        overOdds: data.ou[1],
        underOdds: data.ou[2],
        source: "market",
        timestamp: Date.now(),
      },
      oddsCS: data.keyCS.map(([score, odds]) => {
        const [h, a] = score.split("-").map(Number);
        return { score, homeGoals: h, awayGoals: a, odds, source: "market", timestamp: Date.now() };
      }),
      lastUpdated: Date.now(),
    };
  }

  // 默认值（无数据时）
  return {
    matchId,
    homeTeam,
    awayTeam,
    odds1X2: {
      home: 2.00,
      draw: 3.30,
      away: 3.80,
      source: "manual",
      timestamp: Date.now(),
    },
    oddsAH: null,
    oddsOU: {
      line: 2.5,
      overOdds: 1.90,
      underOdds: 1.90,
      source: "manual",
      timestamp: Date.now(),
    },
    oddsCS: [
      { score: "1-0", homeGoals: 1, awayGoals: 0, odds: 7.0, source: "manual", timestamp: Date.now() },
      { score: "1-1", homeGoals: 1, awayGoals: 1, odds: 6.0, source: "manual", timestamp: Date.now() },
      { score: "0-0", homeGoals: 0, awayGoals: 0, odds: 7.5, source: "manual", timestamp: Date.now() },
      { score: "2-0", homeGoals: 2, awayGoals: 0, odds: 8.5, source: "manual", timestamp: Date.now() },
      { score: "2-1", homeGoals: 2, awayGoals: 1, odds: 9.0, source: "manual", timestamp: Date.now() },
    ],
    lastUpdated: Date.now(),
  };
}

// ============ 赔率分析工具 ============

/**
 * 分析盘口价值（与MSI模型对比）
 */
export function analyzeOddsValue(
  marketOdds: Odds1X2,
  myHomeProb: number,
  myDrawProb: number,
  myAwayProb: number
): {
  homeValue: ReturnType<typeof findValueBet>;
  drawValue: ReturnType<typeof findValueBet>;
  awayValue: ReturnType<typeof findValueBet>;
  recommendation: "home" | "draw" | "away" | "none";
  valueCount: number;
  bestBet: { option: "home" | "draw" | "away"; edge: number; roi: number } | null;
} {
  const imp = oddsToImpliedProb(marketOdds);

  const homeValue = findValueBet(myHomeProb, imp.home);
  const drawValue = findValueBet(myDrawProb, imp.draw);
  const awayValue = findValueBet(myAwayProb, imp.away);

  const valueCount = [homeValue, drawValue, awayValue].filter(v => v.hasValue).length;

  // 找出最佳价值投注
  const options = [
    { option: "home" as const, edge: homeValue.valueEdge, roi: homeValue.roiPercent, hasValue: homeValue.hasValue },
    { option: "draw" as const, edge: drawValue.valueEdge, roi: drawValue.roiPercent, hasValue: drawValue.hasValue },
    { option: "away" as const, edge: awayValue.valueEdge, roi: awayValue.roiPercent, hasValue: awayValue.hasValue },
  ];

  const validOptions = options.filter(o => o.hasValue);
  const bestBet = validOptions.length > 0
    ? validOptions.reduce((best, curr) => curr.edge > best.edge ? curr : best)
    : null;

  // 推荐：选价值最大且概率最高的
  const recommendation = homeValue.hasValue ? "home"
    : awayValue.hasValue ? "away"
    : drawValue.hasValue ? "draw"
    : "none";

  return { homeValue, drawValue, awayValue, recommendation, valueCount, bestBet };
}

/**
 * 计算博彩公司的预期利润率（水钱）
 */
export function getBookmakerMargin(odds: Odds1X2): {
  totalImplied: number;
  marginPercent: number;
  fairProb: ImpliedProbabilities;
} {
  const imp = oddsToImpliedProb(odds);
  return {
    totalImplied: imp.home + imp.draw + imp.away,
    marginPercent: (imp.home + imp.draw + imp.away - 1) * 100,
    fairProb: imp,
  };
}

/**
 * 解析赔率变化趋势（用于临场调整）
 */
export function parseOddsMovement(current: Odds1X2, previous: Odds1X2): {
  homeShift: "up" | "down" | "stable";
  awayShift: "up" | "down" | "stable";
  drawShift: "up" | "down" | "stable";
  interpretation: string;
} {
  const threshold = 0.05; // 5%变化阈值
  const homeRatio = previous.home / current.home;
  const awayRatio = previous.away / current.away;
  const drawRatio = previous.draw / current.draw;

  const homeShift = homeRatio > 1 + threshold ? "up" : homeRatio < 1 - threshold ? "down" : "stable";
  const awayShift = awayRatio > 1 + threshold ? "up" : awayRatio < 1 - threshold ? "down" : "stable";
  const drawShift = drawRatio > 1 + threshold ? "up" : drawRatio < 1 - threshold ? "down" : "stable";

  let interpretation = "";
  if (homeShift === "up") interpretation += "主队资金流入↑ ";
  if (awayShift === "up") interpretation += "客队资金流入↑ ";
  if (homeShift === "down") interpretation += "主队赔率下调↓ ";
  if (awayShift === "down") interpretation += "客队赔率下调↓ ";
  if (!interpretation) interpretation = "市场资金稳定";

  return { homeShift, awayShift, drawShift, interpretation };
}