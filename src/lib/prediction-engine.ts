/**
 * 蚂蚁足球 - 高精度预测引擎 v3（博彩赔率整合版）
 * 
 * 预测维度：
 * 1. 胜负平（1X2）— 博彩赔率 + MSI模型校准
 * 2. 波胆（Correct Score）— 泊松分布 + 博彩大小球线校正
 * 
 * 核心逻辑：
 * - 博彩赔率 = 市场集体智慧，是最重要的预测信号
 * - MSI模型 = 独立分析能力，用于发现价值投注
 * - 融合策略：市场概率为主，模型校准为辅
 */

import type { Odds1X2, OddsOverUnder, OddsCorrectScore, ImpliedProbabilities } from "./betting-odds";
import { oddsToImpliedProb, fairProbToOdds } from "./betting-odds";

// ============ 权重配置 ============
const DIMENSION_WEIGHTS = {
  rosterDepth: 0.25,
  tacticalSystem: 0.25,
  keyPlayerImpact: 0.20,
  coachDecision: 0.15,
  matchupData: 0.10,
  mentalResilience: 0.05,
};

// 融合权重：市场赔率 vs MSI模型
const MARKET_WEIGHT = 0.70;  // 市场赔率权重
const MODEL_WEIGHT = 0.30;   // MSI模型权重

// ============ 类型定义 ============

export interface TeamRating {
  teamId: string;
  teamName: string;
  abbreviation: string;
  
  // 六维评分 (0-10)
  rosterDepth: number;
  tacticalSystem: number;
  keyPlayerImpact: number;
  coachDecision: number;
  matchupData: number;
  mentalResilience: number;
  
  // 计算属性
  msiScore: number;
  attackRating: number;
  defenseRating: number;
}

export interface ScorePrediction {
  score: string;
  probability: number;
  marketOdds?: number;  // 博彩赔率（如果有）
  valueEdge?: number;   // 价值边缘
}

export interface MatchPrediction {
  // 基础信息
  homeTeam: TeamRating;
  awayTeam: TeamRating;
  
  // ===== 1. 胜负平（1X2）=====
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  recommendation: "home" | "draw" | "away";
  
  // 博彩赔率输入
  bettingOdds?: Odds1X2;
  marketProb?: ImpliedProbabilities;  // 市场隐含概率
  
  // 价值投注分析
  valueAnalysis?: {
    homeValue: number;      // >0 表示有价值
    drawValue: number;
    awayValue: number;
    bestBet: "home" | "draw" | "away" | null;
    kellyFraction: number;
  };
  
  // ===== 2. 波胆（Correct Score）=====
  scorePredictions: ScorePrediction[];  // Top 5 最可能比分
  mostLikelyScore: string;
  
  // 博彩波胆赔率
  marketScoreOdds?: OddsCorrectScore[];
  
  // ===== 进球数分析 =====
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  expectedTotalGoals: number;
  overUnderLine: number;
  overProb: number;
  underProb: number;
  
  // 博彩大小球输入
  bettingOU?: OddsOverUnder;
  
  // ===== 置信度 =====
  confidenceLevel: number;
  confidenceLabel: "低" | "中" | "高" | "极高";
  
  // ===== 分析要点 =====
  keyInsights: string[];
  riskFactors: string[];
  opportunityFactors: string[];
  
  // ===== 方法标识 =====
  methodNote: string;  // 说明预测方法
}

// ============ MSI 计算 ============

export function calculateMSI(scores: {
  rosterDepth: number;
  tacticalSystem: number;
  keyPlayerImpact: number;
  coachDecision: number;
  matchupData: number;
  mentalResilience: number;
}): number {
  const weightedSum =
    scores.rosterDepth * DIMENSION_WEIGHTS.rosterDepth +
    scores.tacticalSystem * DIMENSION_WEIGHTS.tacticalSystem +
    scores.keyPlayerImpact * DIMENSION_WEIGHTS.keyPlayerImpact +
    scores.coachDecision * DIMENSION_WEIGHTS.coachDecision +
    scores.matchupData * DIMENSION_WEIGHTS.matchupData +
    scores.mentalResilience * DIMENSION_WEIGHTS.mentalResilience;
  return Math.min(10, Math.max(0, weightedSum));
}

// ============ 泊松分布 ============

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function poissonProb(lambda: number, k: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

// ============ 核心预测引擎 ============

function deriveAttackDefense(rating: TeamRating): { attack: number; defense: number } {
  const attack = (
    rating.rosterDepth * 0.20 +
    rating.tacticalSystem * 0.25 +
    rating.keyPlayerImpact * 0.35 +
    rating.coachDecision * 0.10 +
    rating.matchupData * 0.05 +
    rating.mentalResilience * 0.05
  );
  const defense = (
    rating.rosterDepth * 0.30 +
    rating.tacticalSystem * 0.25 +
    rating.keyPlayerImpact * 0.10 +
    rating.coachDecision * 0.15 +
    rating.matchupData * 0.10 +
    rating.mentalResilience * 0.10
  );
  return {
    attack: Math.min(10, Math.max(0, attack)),
    defense: Math.min(10, Math.max(0, defense)),
  };
}

/**
 * 计算期望进球数（泊松lambda）
 */
function expectedGoals(attack: number, opponentDefense: number): number {
  const baseline = 1.32; // 世界杯单队平均进球
  const advRatio = (attack - opponentDefense) / 10;
  const lambda = baseline * (1 + advRatio * 0.8);
  return Math.max(0.3, Math.min(4.5, lambda));
}

/**
 * 生成比分概率矩阵（泊松分布）
 */
function generateScoreMatrix(
  homeLambda: number,
  awayLambda: number,
  maxGoals: number = 7
): { home: number; away: number; prob: number }[] {
  const results: { home: number; away: number; prob: number }[] = [];
  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const prob = poissonProb(homeLambda, h) * poissonProb(awayLambda, a);
      results.push({ home: h, away: a, prob });
    }
  }
  return results.sort((a, b) => b.prob - a.prob);
}

/**
 * 从比分矩阵提取胜平负概率
 */
function extractWDL(scoreMatrix: { home: number; away: number; prob: number }[]): {
  home: number; draw: number; away: number;
} {
  let homeWin = 0, draw = 0, awayWin = 0;
  for (const s of scoreMatrix) {
    if (s.home > s.away) homeWin += s.prob;
    else if (s.home === s.away) draw += s.prob;
    else awayWin += s.prob;
  }
  return { home: homeWin, draw, away: awayWin };
}

/**
 * 融合市场赔率与模型预测
 * 
 * 策略：
 * 1. 如果有博彩赔率：以市场概率为主（70%），模型为辅（30%）
 * 2. 如果无博彩赔率：纯用MSI模型（100%）
 * 
 * 融合公式：
 * finalProb = MARKET_WEIGHT × marketFairProb + MODEL_WEIGHT × modelProb
 */
function fuseProbabilities(
  marketProb: ImpliedProbabilities | null,
  modelProb: { home: number; draw: number; away: number },
  hasMarketData: boolean
): { home: number; draw: number; away: number } {
  if (!hasMarketData || !marketProb) {
    return modelProb;
  }

  // 归一化模型概率
  const modelTotal = modelProb.home + modelProb.draw + modelProb.away;
  const modelNorm = {
    home: modelProb.home / modelTotal,
    draw: modelProb.draw / modelTotal,
    away: modelProb.away / modelTotal,
  };

  // 融合
  const fused = {
    home: MARKET_WEIGHT * marketProb.homeFair + MODEL_WEIGHT * modelNorm.home,
    draw: MARKET_WEIGHT * marketProb.drawFair + MODEL_WEIGHT * modelNorm.draw,
    away: MARKET_WEIGHT * marketProb.awayFair + MODEL_WEIGHT * modelNorm.away,
  };

  // 再归一化
  const total = fused.home + fused.draw + fused.away;
  return {
    home: fused.home / total,
    draw: fused.draw / total,
    away: fused.away / total,
  };
}

/**
 * 校准泊松lambda（使用博彩大小球线）
 * 
 * 逻辑：
 * 1. 从模型计算期望总进球
 * 2. 从博彩OU线计算市场期望总进球
 * 3. 融合两者得到校准后的lambda
 */
function calibrateLambdas(
  homeAttack: number,
  awayDefense: number,
  awayAttack: number,
  homeDefense: number,
  bettingOU: OddsOverUnder | null,
  marketExpected: number  // 从赔率推断的市场期望进球
): { homeLambda: number; awayLambda: number } {
  // 模型lambda
  let homeLambda = expectedGoals(homeAttack, awayDefense);
  let awayLambda = expectedGoals(awayAttack, homeDefense);

  if (bettingOU) {
    // 市场期望进球 = O线 × 大球概率（简化）
    // 更准确：用OU赔率反推市场期望
    // 方法：overProb = overOdds / (overOdds + underOdds) → 估算期望
    const marketOU = (bettingOU.line * 0.6 + marketExpected * 0.4);
    
    // 调整homeLambda和awayLambda的比例，使其总和接近市场期望
    const modelTotal = homeLambda + awayLambda;
    const calibratedTotal = marketOU;
    
    // 保留比例但缩放到市场期望
    const ratio = calibratedTotal / modelTotal;
    homeLambda *= ratio;
    awayLambda *= ratio;
  }

  return {
    homeLambda: Math.max(0.3, Math.min(4.5, homeLambda)),
    awayLambda: Math.max(0.3, Math.min(4.5, awayLambda)),
  };
}

/**
 * 计算价值投注
 */
function calcValueBet(
  myProb: number,
  marketProb: number,
  odds: number
): { edge: number; roi: number; kelly: number } {
  const edge = myProb - marketProb;
  const roi = odds * myProb - 1;
  // Kelly fraction: f* = (bp - q) / b, where b = odds - 1, p = myProb, q = 1 - p
  const b = odds - 1;
  const q = 1 - myProb;
  const kelly = b > 0 ? Math.max(0, (b * myProb - q) / b) : 0;
  return { edge, roi, kelly };
}

/**
 * 生成完整比赛预测（博彩赔率整合版）
 * 
 * @param homeTeam 主队评级
 * @param awayTeam 客队评级
 * @param bettingOdds 博彩1X2赔率（可选）
 * @param bettingOU 博彩大小球赔率（可选）
 * @param marketCS 博彩波胆赔率（可选）
 */
export function predictMatch(
  homeTeam: TeamRating,
  awayTeam: TeamRating,
  bettingOdds?: Odds1X2 | null,
  bettingOU?: OddsOverUnder | null,
  marketCS?: OddsCorrectScore[] | null
): MatchPrediction {
  const hasMarketData = !!bettingOdds;

  // ===== 1. 计算MSI模型的攻防指数 =====
  const homeAD = deriveAttackDefense(homeTeam);
  const awayAD = deriveAttackDefense(awayTeam);
  homeTeam.attackRating = homeAD.attack;
  homeTeam.defenseRating = homeAD.defense;
  awayTeam.attackRating = awayAD.attack;
  awayTeam.defenseRating = awayAD.defense;

  // ===== 2. 模型层面的胜平负（纯MSI）=====
  const homeLambda0 = expectedGoals(homeAD.attack, awayAD.defense);
  const awayLambda0 = expectedGoals(awayAD.attack, homeAD.defense);
  const scoreMatrix0 = generateScoreMatrix(homeLambda0, awayLambda0);
  const modelWDL = extractWDL(scoreMatrix0);

  // ===== 3. 融合市场赔率与模型 =====
  const marketProb = hasMarketData ? oddsToImpliedProb(bettingOdds!) : null;
  const fusedProb = fuseProbabilities(marketProb, modelWDL, hasMarketData);

  // ===== 4. 校准泊松lambda =====
  let marketExpected = 2.64; // 默认世界杯均值
  if (bettingOU) {
    // 从OU赔率推断市场期望进球
    // 假设over line附近概率约50%，反推期望
    const impliedOver = 1 / (bettingOU.overOdds + 0.5);
    const impliedUnder = 1 / (bettingOU.underOdds + 0.5);
    marketExpected = (impliedOver * bettingOU.line + (1 - impliedOver) * (bettingOU.line * 0.6)) / (impliedOver + impliedUnder) * 2;
    // 更简单：用 O线 × (overProb隐含权重)
    const overWeight = bettingOU.overOdds / (bettingOU.overOdds + bettingOU.underOdds);
    marketExpected = bettingOU.line * (0.5 + overWeight * 0.5);
  }

  const { homeLambda, awayLambda } = calibrateLambdas(
    homeAD.attack, awayAD.defense,
    awayAD.attack, homeAD.defense,
    bettingOU || null,
    marketExpected
  );

  // ===== 5. 生成校准后的比分矩阵 =====
  const scoreMatrix = generateScoreMatrix(homeLambda, awayLambda);
  
  // ===== 6. 生成波胆预测（结合市场赔率）=====
  const scorePredictions: ScorePrediction[] = scoreMatrix.slice(0, 5).map((s) => {
    const scoreStr = `${s.home}-${s.away}`;
    const marketScore = marketCS?.find(cs => cs.score === scoreStr);
    
    return {
      score: scoreStr,
      probability: s.prob,
      marketOdds: marketScore?.odds,
      valueEdge: marketScore ? s.prob - (1 / marketScore.odds) : undefined,
    };
  });

  // ===== 7. 价值投注分析 =====
  let valueAnalysis: MatchPrediction["valueAnalysis"] | undefined;
  if (hasMarketData && bettingOdds) {
    const homeEdge = calcValueBet(fusedProb.home, marketProb!.homeFair, bettingOdds.home);
    const drawEdge = calcValueBet(fusedProb.draw, marketProb!.drawFair, bettingOdds.draw);
    const awayEdge = calcValueBet(fusedProb.away, marketProb!.awayFair, bettingOdds.away);

    const options = [
      { option: "home" as const, edge: homeEdge.edge, kelly: homeEdge.kelly },
      { option: "draw" as const, edge: drawEdge.edge, kelly: drawEdge.kelly },
      { option: "away" as const, edge: awayEdge.edge, kelly: awayEdge.kelly },
    ];
    const bestOption = options.filter(o => o.edge > 0.03).sort((a, b) => b.edge - a.edge)[0];

    valueAnalysis = {
      homeValue: homeEdge.edge,
      drawValue: drawEdge.edge,
      awayValue: awayEdge.edge,
      bestBet: bestOption?.option || null,
      kellyFraction: bestOption?.kelly || 0,
    };
  }

  // ===== 8. 大小球 =====
  const expectedTotal = homeLambda + awayLambda;
  const overUnderLine = bettingOU ? bettingOU.line : Math.round(expectedTotal * 2) / 2;
  let overProb = 0;
  for (const s of scoreMatrix) {
    if (s.home + s.away > overUnderLine) overProb += s.prob;
  }
  if (bettingOU) {
    // 用市场赔率校正
    const marketOverProb = 1 / (bettingOU.overOdds + 1);
    overProb = overProb * (1 - MARKET_WEIGHT) + marketOverProb * MARKET_WEIGHT;
  }

  // ===== 9. 推荐 =====
  const recommendation = fusedProb.home > fusedProb.draw && fusedProb.home > fusedProb.away
    ? "home"
    : fusedProb.away > fusedProb.draw ? "away" : "draw";

  // ===== 10. 置信度 =====
  const msiDiff = homeTeam.msiScore - awayTeam.msiScore;
  const confBase = hasMarketData ? 0.60 : 0.45; // 有市场数据时基准更高
  const confidenceLevel = Math.min(0.95, confBase + Math.abs(msiDiff) * 0.07 + Math.abs(fusedProb.home - fusedProb.away) * 0.25);
  const confidenceLabel: MatchPrediction["confidenceLabel"] =
    confidenceLevel >= 0.80 ? "极高" :
    confidenceLevel >= 0.65 ? "高" :
    confidenceLevel >= 0.50 ? "中" : "低";

  // ===== 11. 洞察生成 =====
  const keyInsights: string[] = [];
  const riskFactors: string[] = [];
  const opportunityFactors: string[] = [];

  // 市场数据影响
  if (hasMarketData) {
    keyInsights.push("【博彩市场信号】赔率数据已整合，市场共识概率权重70%");
    const imp = marketProb!;
    const favHome = imp.homeFair > 0.5 ? homeTeam.teamName : null;
    const favAway = imp.awayFair > 0.5 ? awayTeam.teamName : null;
    if (favHome) keyInsights.push(`市场明显倾向${favHome}（隐含概率${(imp.homeFair * 100).toFixed(0)}%）`);
    if (favAway) keyInsights.push(`市场明显倾向${favAway}（隐含概率${(imp.awayFair * 100).toFixed(0)}%）`);
  } else {
    keyInsights.push("【纯模型预测】暂无市场赔率数据，MSI模型权重100%");
  }

  // MSI分析
  if (Math.abs(msiDiff) >= 2) {
    const stronger = msiDiff > 0 ? homeTeam.teamName : awayTeam.teamName;
    keyInsights.push(`${stronger}综合实力明显占优（MSI差${Math.abs(msiDiff).toFixed(1)}）`);
  } else if (Math.abs(msiDiff) < 1) {
    keyInsights.push("双方综合实力接近，胜负取决于临场发挥");
  }

  // 进球预测
  if (expectedTotal >= 3.2) keyInsights.push(`预期总进球${expectedTotal.toFixed(1)}，比赛可能较为开放`);
  else if (expectedTotal < 2.2) keyInsights.push(`预期总进球${expectedTotal.toFixed(1)}，可能为防守型对决`);

  // 价值投注
  if (valueAnalysis?.bestBet) {
    const pct = (valueAnalysis[`${valueAnalysis.bestBet}Value` as keyof typeof valueAnalysis] as number) * 100;
    opportunityFactors.push(`【价值投注】${valueAnalysis.bestBet}选项价值${pct.toFixed(1)}%（Kelly建议投注${(valueAnalysis.kellyFraction * 100).toFixed(1)}%）`);
  }

  // 风险
  if (homeTeam.defenseRating < 6.0) riskFactors.push(`${homeTeam.teamName}防守薄弱`);
  if (awayTeam.defenseRating < 6.0) riskFactors.push(`${awayTeam.teamName}防守薄弱`);
  if (hasMarketData && marketProb!.juice > 0.10) riskFactors.push(`市场水钱偏高（${(marketProb!.juice * 100).toFixed(1)}%），部分选项可能存在套利空间`);

  return {
    homeTeam,
    awayTeam,
    homeWinProb: Math.round(fusedProb.home * 1000) / 1000,
    drawProb: Math.round(fusedProb.draw * 1000) / 1000,
    awayWinProb: Math.round(fusedProb.away * 1000) / 1000,
    recommendation,
    scorePredictions,
    mostLikelyScore: scorePredictions[0]?.score || "1-1",
    expectedHomeGoals: Math.round(homeLambda * 10) / 10,
    expectedAwayGoals: Math.round(awayLambda * 10) / 10,
    expectedTotalGoals: Math.round(expectedTotal * 10) / 10,
    overUnderLine,
    overProb: Math.round(overProb * 1000) / 1000,
    underProb: Math.round((1 - overProb) * 1000) / 1000,
    confidenceLevel: Math.round(confidenceLevel * 1000) / 1000,
    confidenceLabel,
    keyInsights,
    riskFactors,
    opportunityFactors,
    methodNote: hasMarketData
      ? "融合预测：市场赔率(70%) + MSI模型(30%)"
      : "纯模型预测：MSI六维 + 泊松分布",
    ...(hasMarketData && bettingOdds ? { bettingOdds } : {}),
    ...(hasMarketData && marketProb ? { marketProb } : {}),
    ...(valueAnalysis ? { valueAnalysis } : {}),
    ...(bettingOU ? { bettingOU } : {}),
    ...(marketCS?.length ? { marketScoreOdds: marketCS } : {}),
  };
}

// ============ 预设球队评级 ============

export const PRESET_RATINGS: Record<string, Omit<TeamRating, "msiScore" | "attackRating" | "defenseRating">> = {
  ARG: { teamId: "arg", teamName: "阿根廷", abbreviation: "ARG", rosterDepth: 9.0, tacticalSystem: 9.0, keyPlayerImpact: 9.5, coachDecision: 8.5, matchupData: 8.5, mentalResilience: 9.0 },
  FRA: { teamId: "fra", teamName: "法国", abbreviation: "FRA", rosterDepth: 9.5, tacticalSystem: 8.5, keyPlayerImpact: 9.0, coachDecision: 7.5, matchupData: 8.0, mentalResilience: 8.0 },
  BRA: { teamId: "bra", teamName: "巴西", abbreviation: "BRA", rosterDepth: 9.0, tacticalSystem: 8.0, keyPlayerImpact: 9.0, coachDecision: 7.0, matchupData: 8.5, mentalResilience: 7.5 },
  ENG: { teamId: "eng", teamName: "英格兰", abbreviation: "ENG", rosterDepth: 8.5, tacticalSystem: 8.5, keyPlayerImpact: 8.5, coachDecision: 8.0, matchupData: 7.5, mentalResilience: 7.5 },
  ESP: { teamId: "esp", teamName: "西班牙", abbreviation: "ESP", rosterDepth: 8.5, tacticalSystem: 9.0, keyPlayerImpact: 8.0, coachDecision: 8.0, matchupData: 8.0, mentalResilience: 7.5 },
  GER: { teamId: "ger", teamName: "德国", abbreviation: "GER", rosterDepth: 8.5, tacticalSystem: 8.5, keyPlayerImpact: 8.0, coachDecision: 8.5, matchupData: 8.0, mentalResilience: 8.5 },
  POR: { teamId: "por", teamName: "葡萄牙", abbreviation: "POR", rosterDepth: 8.0, tacticalSystem: 8.0, keyPlayerImpact: 8.5, coachDecision: 7.5, matchupData: 7.5, mentalResilience: 7.5 },
  NED: { teamId: "ned", teamName: "荷兰", abbreviation: "NED", rosterDepth: 8.0, tacticalSystem: 8.5, keyPlayerImpact: 7.5, coachDecision: 8.5, matchupData: 8.0, mentalResilience: 8.0 },
  MEX: { teamId: "mex", teamName: "墨西哥", abbreviation: "MEX", rosterDepth: 7.0, tacticalSystem: 7.5, keyPlayerImpact: 7.0, coachDecision: 7.5, matchupData: 7.0, mentalResilience: 8.0 },
  USA: { teamId: "usa", teamName: "美国", abbreviation: "USA", rosterDepth: 7.5, tacticalSystem: 7.0, keyPlayerImpact: 7.0, coachDecision: 7.0, matchupData: 6.5, mentalResilience: 7.5 },
  URU: { teamId: "uru", teamName: "乌拉圭", abbreviation: "URU", rosterDepth: 7.5, tacticalSystem: 7.5, keyPlayerImpact: 7.5, coachDecision: 7.5, matchupData: 7.5, mentalResilience: 8.0 },
  CRO: { teamId: "cro", teamName: "克罗地亚", abbreviation: "CRO", rosterDepth: 7.0, tacticalSystem: 8.0, keyPlayerImpact: 7.0, coachDecision: 8.0, matchupData: 7.5, mentalResilience: 9.0 },
  BEL: { teamId: "bel", teamName: "比利时", abbreviation: "BEL", rosterDepth: 7.5, tacticalSystem: 7.5, keyPlayerImpact: 7.0, coachDecision: 7.0, matchupData: 7.0, mentalResilience: 7.0 },
  SUI: { teamId: "sui", teamName: "瑞士", abbreviation: "SUI", rosterDepth: 7.0, tacticalSystem: 7.5, keyPlayerImpact: 6.5, coachDecision: 7.5, matchupData: 7.0, mentalResilience: 7.5 },
  JPN: { teamId: "jpn", teamName: "日本", abbreviation: "JPN", rosterDepth: 6.5, tacticalSystem: 7.5, keyPlayerImpact: 6.5, coachDecision: 7.0, matchupData: 7.0, mentalResilience: 7.5 },
  KOR: { teamId: "kor", teamName: "韩国", abbreviation: "KOR", rosterDepth: 6.0, tacticalSystem: 6.5, keyPlayerImpact: 7.0, coachDecision: 6.5, matchupData: 6.0, mentalResilience: 7.0 },
  AUS: { teamId: "aus", teamName: "澳大利亚", abbreviation: "AUS", rosterDepth: 6.0, tacticalSystem: 6.0, keyPlayerImpact: 5.5, coachDecision: 6.5, matchupData: 5.5, mentalResilience: 7.0 },
  MAR: { teamId: "mar", teamName: "摩洛哥", abbreviation: "MAR", rosterDepth: 7.0, tacticalSystem: 7.5, keyPlayerImpact: 7.0, coachDecision: 7.5, matchupData: 7.0, mentalResilience: 8.0 },
  ECU: { teamId: "ecu", teamName: "厄瓜多尔", abbreviation: "ECU", rosterDepth: 6.0, tacticalSystem: 6.0, keyPlayerImpact: 6.0, coachDecision: 6.0, matchupData: 5.5, mentalResilience: 7.0 },
  SEN: { teamId: "sen", teamName: "塞内加尔", abbreviation: "SEN", rosterDepth: 6.5, tacticalSystem: 6.0, keyPlayerImpact: 6.5, coachDecision: 6.0, matchupData: 6.0, mentalResilience: 6.5 },
  COL: { teamId: "col", teamName: "哥伦比亚", abbreviation: "COL", rosterDepth: 6.5, tacticalSystem: 6.5, keyPlayerImpact: 6.5, coachDecision: 6.0, matchupData: 6.0, mentalResilience: 6.5 },
  QAT: { teamId: "qat", teamName: "卡塔尔", abbreviation: "QAT", rosterDepth: 5.0, tacticalSystem: 5.5, keyPlayerImpact: 4.5, coachDecision: 5.5, matchupData: 4.5, mentalResilience: 5.0 },
  RSA: { teamId: "rsa", teamName: "南非", abbreviation: "RSA", rosterDepth: 4.5, tacticalSystem: 4.5, keyPlayerImpact: 4.5, coachDecision: 4.5, matchupData: 4.0, mentalResilience: 5.5 },
  IRN: { teamId: "irn", teamName: "伊朗", abbreviation: "IRN", rosterDepth: 5.5, tacticalSystem: 5.5, keyPlayerImpact: 5.0, coachDecision: 5.5, matchupData: 5.0, mentalResilience: 6.0 },
  KSA: { teamId: "ksa", teamName: "沙特", abbreviation: "KSA", rosterDepth: 5.0, tacticalSystem: 5.0, keyPlayerImpact: 4.5, coachDecision: 5.0, matchupData: 4.5, mentalResilience: 5.0 },
  EGY: { teamId: "egy", teamName: "埃及", abbreviation: "EGY", rosterDepth: 5.5, tacticalSystem: 5.0, keyPlayerImpact: 5.5, coachDecision: 5.0, matchupData: 5.0, mentalResilience: 5.5 },
  NZL: { teamId: "nzl", teamName: "新西兰", abbreviation: "NZL", rosterDepth: 4.5, tacticalSystem: 4.5, keyPlayerImpact: 4.0, coachDecision: 4.5, matchupData: 4.0, mentalResilience: 6.0 },
  TUR: { teamId: "tur", teamName: "土耳其", abbreviation: "TUR", rosterDepth: 6.5, tacticalSystem: 6.0, keyPlayerImpact: 6.5, coachDecision: 6.0, matchupData: 5.5, mentalResilience: 6.5 },
  CZE: { teamId: "cze", teamName: "捷克", abbreviation: "CZE", rosterDepth: 6.5, tacticalSystem: 6.5, keyPlayerImpact: 6.0, coachDecision: 6.5, matchupData: 6.0, mentalResilience: 6.5 },
  NOR: { teamId: "nor", teamName: "挪威", abbreviation: "NOR", rosterDepth: 6.5, tacticalSystem: 6.5, keyPlayerImpact: 7.5, coachDecision: 6.5, matchupData: 6.0, mentalResilience: 7.0 },
  SWE: { teamId: "swe", teamName: "瑞典", abbreviation: "SWE", rosterDepth: 6.5, tacticalSystem: 7.0, keyPlayerImpact: 6.0, coachDecision: 7.0, matchupData: 6.5, mentalResilience: 7.5 },
  UKR: { teamId: "ukr", teamName: "乌克兰", abbreviation: "UKR", rosterDepth: 6.0, tacticalSystem: 6.0, keyPlayerImpact: 6.5, coachDecision: 6.0, matchupData: 5.5, mentalResilience: 6.5 },
  GHA: { teamId: "gha", teamName: "加纳", abbreviation: "GHA", rosterDepth: 6.5, tacticalSystem: 6.5, keyPlayerImpact: 6.5, coachDecision: 6.0, matchupData: 6.0, mentalResilience: 6.5 },
  CMR: { teamId: "cmr", teamName: "喀麦隆", abbreviation: "CMR", rosterDepth: 6.0, tacticalSystem: 6.0, keyPlayerImpact: 6.0, coachDecision: 6.0, matchupData: 5.5, mentalResilience: 6.5 },
  PAN: { teamId: "pan", teamName: "巴拿马", abbreviation: "PAN", rosterDepth: 4.0, tacticalSystem: 4.0, keyPlayerImpact: 3.5, coachDecision: 4.0, matchupData: 3.5, mentalResilience: 5.0 },
  CUR: { teamId: "cur", teamName: "库拉索", abbreviation: "CUR", rosterDepth: 4.0, tacticalSystem: 4.0, keyPlayerImpact: 3.5, coachDecision: 4.0, matchupData: 3.5, mentalResilience: 5.0 },
  UZB: { teamId: "uzb", teamName: "乌兹别克斯坦", abbreviation: "UZB", rosterDepth: 5.0, tacticalSystem: 5.0, keyPlayerImpact: 4.5, coachDecision: 5.0, matchupData: 4.5, mentalResilience: 5.5 },
  HAI: { teamId: "hai", teamName: "海地", abbreviation: "HAI", rosterDepth: 4.0, tacticalSystem: 4.0, keyPlayerImpact: 4.0, coachDecision: 4.0, matchupData: 3.5, mentalResilience: 5.0 },
  // ===== 新增：补全48队 =====
  CAN: { teamId: "can", teamName: "加拿大", abbreviation: "CAN", rosterDepth: 6.0, tacticalSystem: 6.0, keyPlayerImpact: 5.5, coachDecision: 6.0, matchupData: 5.5, mentalResilience: 6.5 },
  ITA: { teamId: "ita", teamName: "意大利", abbreviation: "ITA", rosterDepth: 7.5, tacticalSystem: 7.5, keyPlayerImpact: 7.0, coachDecision: 7.0, matchupData: 7.0, mentalResilience: 7.0 },
  DEN: { teamId: "den", teamName: "丹麦", abbreviation: "DEN", rosterDepth: 6.5, tacticalSystem: 6.5, keyPlayerImpact: 6.0, coachDecision: 6.5, matchupData: 6.0, mentalResilience: 6.5 },
  POL: { teamId: "pol", teamName: "波兰", abbreviation: "POL", rosterDepth: 6.0, tacticalSystem: 6.0, keyPlayerImpact: 6.5, coachDecision: 5.5, matchupData: 5.5, mentalResilience: 6.0 },
  AUT: { teamId: "aut", teamName: "奥地利", abbreviation: "AUT", rosterDepth: 6.0, tacticalSystem: 6.5, keyPlayerImpact: 6.0, coachDecision: 6.5, matchupData: 6.0, mentalResilience: 6.5 },
  SRB: { teamId: "srb", teamName: "塞尔维亚", abbreviation: "SRB", rosterDepth: 6.5, tacticalSystem: 6.0, keyPlayerImpact: 7.0, coachDecision: 6.0, matchupData: 6.0, mentalResilience: 6.5 },
  NGA: { teamId: "nga", teamName: "尼日利亚", abbreviation: "NGA", rosterDepth: 6.0, tacticalSystem: 6.0, keyPlayerImpact: 6.5, coachDecision: 5.5, matchupData: 5.5, mentalResilience: 6.0 },
  ALG: { teamId: "alg", teamName: "阿尔及利亚", abbreviation: "ALG", rosterDepth: 5.5, tacticalSystem: 5.5, keyPlayerImpact: 5.5, coachDecision: 5.5, matchupData: 5.0, mentalResilience: 5.5 },
  TUN: { teamId: "tun", teamName: "突尼斯", abbreviation: "TUN", rosterDepth: 5.0, tacticalSystem: 5.0, keyPlayerImpact: 4.5, coachDecision: 5.0, matchupData: 4.5, mentalResilience: 5.5 },
  IRQ: { teamId: "irq", teamName: "伊拉克", abbreviation: "IRQ", rosterDepth: 5.0, tacticalSystem: 5.0, keyPlayerImpact: 4.5, coachDecision: 5.0, matchupData: 4.5, mentalResilience: 5.0 },
  UAE: { teamId: "uae", teamName: "阿联酋", abbreviation: "UAE", rosterDepth: 4.5, tacticalSystem: 4.5, keyPlayerImpact: 4.0, coachDecision: 4.5, matchupData: 4.0, mentalResilience: 4.5 },
  CRC: { teamId: "crc", teamName: "哥斯达黎加", abbreviation: "CRC", rosterDepth: 5.5, tacticalSystem: 5.5, keyPlayerImpact: 5.0, coachDecision: 5.5, matchupData: 5.0, mentalResilience: 6.0 },
  JAM: { teamId: "jam", teamName: "牙买加", abbreviation: "JAM", rosterDepth: 5.0, tacticalSystem: 5.0, keyPlayerImpact: 5.5, coachDecision: 5.0, matchupData: 4.5, mentalResilience: 5.5 },
  PER: { teamId: "per", teamName: "秘鲁", abbreviation: "PER", rosterDepth: 5.5, tacticalSystem: 5.5, keyPlayerImpact: 5.0, coachDecision: 5.5, matchupData: 5.0, mentalResilience: 6.0 },
  VEN: { teamId: "ven", teamName: "委内瑞拉", abbreviation: "VEN", rosterDepth: 5.5, tacticalSystem: 5.5, keyPlayerImpact: 5.5, coachDecision: 5.5, matchupData: 5.0, mentalResilience: 6.0 },
  CHI: { teamId: "chi", teamName: "智利", abbreviation: "CHI", rosterDepth: 5.5, tacticalSystem: 5.5, keyPlayerImpact: 5.5, coachDecision: 5.0, matchupData: 5.0, mentalResilience: 5.5 },
};

// 未知球队默认评分（用于覆盖48队所有球队）
const DEFAULT_RATING = { rosterDepth: 5.0, tacticalSystem: 5.0, keyPlayerImpact: 5.0, coachDecision: 5.0, matchupData: 5.0, mentalResilience: 5.0 };

// 英文缩写→中文名备用映射（用于未预设的球队）
const ABBREV_CN_MAP: Record<string, string> = {
  CHN: '中国', TWN: '中国台北', HKG: '中国香港', PRK: '朝鲜',
  RUS: '俄罗斯', ISL: '冰岛', WAL: '威尔士', SCO: '苏格兰',
  IRL: '爱尔兰', NIR: '北爱尔兰', ISR: '以色列',
  CIV: '科特迪瓦', CGO: '刚果(布)', COD: '刚果(金)',
  BEN: '贝宁', GUI: '几内亚', GAB: '加蓬', TOG: '多哥',
  BFA: '布基纳法索', MLT: '马耳他', GEO: '格鲁吉亚', ARM: '亚美尼亚',
  AZE: '阿塞拜疆', KAZ: '哈萨克斯坦', KGZ: '吉尔吉斯斯坦',
  UGA: '乌干达', ZAM: '赞比亚', MWI: '马拉维', MOZ: '莫桑比克',
  NAM: '纳米比亚', BOT: '博茨瓦纳', MAD: '马达加斯加',
  MTN: '毛里塔尼亚', SSD: '南苏丹', TLS: '东帝汶',
  GUM: '关岛', TAH: '塔希提', FJI: '斐济', LCA: '圣卢西亚',
};

export function getTeamRating(abbreviation: string): TeamRating {
  const preset = PRESET_RATINGS[abbreviation];
  const src = preset ?? DEFAULT_RATING;
  const cnName = preset?.teamName ?? ABBREV_CN_MAP[abbreviation] ?? abbreviation;
  const rating: TeamRating = { ...src, teamId: abbreviation.toLowerCase(), teamName: cnName, abbreviation, msiScore: 0, attackRating: 0, defenseRating: 0 };
  rating.msiScore = calculateMSI(rating);
  return rating;
}