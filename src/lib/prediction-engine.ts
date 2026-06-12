/**
 * 蚂蚁足球 - 高精度预测引擎 v2
 * 
 * 预测维度：
 * 1. 胜平负概率
 * 2. 比分预测（Top 5 最可能比分）
 * 3. 进球数预测（大/小球）
 * 4. 置信度评分
 * 
 * 模型基础：MSI六维 + 泊松分布 + 历史修正
 */

// ============ 权重配置 ============
const DIMENSION_WEIGHTS = {
  rosterDepth: 0.25,
  tacticalSystem: 0.25,
  keyPlayerImpact: 0.20,
  coachDecision: 0.15,
  matchupData: 0.10,
  mentalResilience: 0.05,
};

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
  attackRating: number;  // 进攻指数 (0-10)
  defenseRating: number; // 防守指数 (0-10)
}

export interface ScorePrediction {
  score: string;       // "2-0"
  probability: number; // 0-1
}

export interface MatchPrediction {
  // 基础信息
  homeTeam: TeamRating;
  awayTeam: TeamRating;
  
  // 1. 胜平负
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  recommendation: "home" | "draw" | "away";
  
  // 2. 比分预测 Top 5
  scorePredictions: ScorePrediction[];
  mostLikelyScore: string;
  
  // 3. 进球数
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  expectedTotalGoals: number;
  overUnderLine: number;       // 大小球分界线
  overProb: number;            // 大球概率
  underProb: number;           // 小球概率
  
  // 4. 置信度
  confidenceLevel: number;     // 0-1
  confidenceLabel: "低" | "中" | "高" | "极高";
  
  // 5. 分析要点
  keyInsights: string[];
  riskFactors: string[];
  opportunityFactors: string[];
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

/**
 * 计算球队进攻/防守指数
 * 基于MSI各维度的不同权重组合
 */
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
 * 基于：进攻指数 vs 对手防守指数 + 世界杯平均进球率修正
 */
function expectedGoals(attack: number, opponentDefense: number): number {
  // 世界杯平均进球率约2.64球/场，单队约1.32
  const baseline = 1.32;
  // 攻防差异修正
  const advRatio = (attack - opponentDefense) / 10;
  const lambda = baseline * (1 + advRatio * 0.8);
  return Math.max(0.3, Math.min(4.5, lambda));
}

/**
 * 生成比分概率矩阵
 * 使用泊松分布计算所有可能比分的概率
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
  homeWin: number; draw: number; awayWin: number;
} {
  let homeWin = 0, draw = 0, awayWin = 0;
  for (const s of scoreMatrix) {
    if (s.home > s.away) homeWin += s.prob;
    else if (s.home === s.away) draw += s.prob;
    else awayWin += s.prob;
  }
  return { homeWin, draw, awayWin };
}

/**
 * 生成完整比赛预测
 */
export function predictMatch(
  homeTeam: TeamRating,
  awayTeam: TeamRating,
  context?: {
    homeAdvantage?: number;  // 主场优势修正 (0-0.5, 默认0.15)
    neutralVenue?: boolean;  // 是否中立场地
    weather?: string;        // 天气
    injuries?: string[];     // 伤病信息
  }
): MatchPrediction {
  // 主场优势
  const homeAdv = context?.neutralVenue ? 0 : (context?.homeAdvantage || 0.15);
  
  // 攻防指数
  const homeAD = deriveAttackDefense(homeTeam);
  const awayAD = deriveAttackDefense(awayTeam);
  homeTeam.attackRating = homeAD.attack;
  homeTeam.defenseRating = homeAD.defense;
  awayTeam.attackRating = awayAD.attack;
  awayTeam.defenseRating = awayAD.defense;
  
  // 期望进球
  const homeLambda = expectedGoals(homeAD.attack + homeAdv, awayAD.defense);
  const awayLambda = expectedGoals(awayAD.attack, awayAD.defense - homeAdv * 0.3);
  
  // 比分矩阵
  const scoreMatrix = generateScoreMatrix(homeLambda, awayLambda);
  
  // 胜平负
  const wdl = extractWDL(scoreMatrix);
  
  // MSI差异修正（微调）
  const msiDiff = homeTeam.msiScore - awayTeam.msiScore;
  const msiAdj = msiDiff * 0.02; // 微调2% per MSI point
  
  let homeWinProb = Math.max(0.05, Math.min(0.90, wdl.homeWin + msiAdj));
  let awayWinProb = Math.max(0.05, Math.min(0.90, wdl.awayWin - msiAdj));
  let drawProb = Math.max(0.10, Math.min(0.35, wdl.draw));
  
  // 归一化
  const total = homeWinProb + drawProb + awayWinProb;
  homeWinProb /= total;
  drawProb /= total;
  awayWinProb /= total;
  
  // 推荐
  const recommendation = homeWinProb > drawProb && homeWinProb > awayWinProb
    ? "home"
    : awayWinProb > drawProb ? "away" : "draw";
  
  // Top 5 比分预测
  const scorePredictions: ScorePrediction[] = scoreMatrix.slice(0, 5).map((s) => ({
    score: `${s.home}-${s.away}`,
    probability: s.prob,
  }));
  
  // 大小球（分界线 = 期望总进球最近0.5整数）
  const expectedTotal = homeLambda + awayLambda;
  const overUnderLine = Math.round(expectedTotal * 2) / 2; // 取最近的0.5
  let overProb = 0;
  for (const s of scoreMatrix) {
    if (s.home + s.away > overUnderLine) overProb += s.prob;
  }
  
  // 置信度
  const confidenceLevel = Math.min(0.95, 0.45 + Math.abs(msiDiff) * 0.08 + Math.abs(homeWinProb - awayWinProb) * 0.3);
  const confidenceLabel: MatchPrediction["confidenceLabel"] =
    confidenceLevel >= 0.80 ? "极高" :
    confidenceLevel >= 0.65 ? "高" :
    confidenceLevel >= 0.50 ? "中" : "低";
  
  // 关键洞察
  const keyInsights = generateInsights(homeTeam, awayTeam, homeWinProb, drawProb, awayWinProb, msiDiff, homeLambda, awayLambda);
  const riskFactors = generateRisks(homeTeam, awayTeam, context);
  const opportunityFactors = generateOpportunities(homeTeam, awayTeam, msiDiff);
  
  return {
    homeTeam,
    awayTeam,
    homeWinProb,
    drawProb,
    awayWinProb,
    recommendation,
    scorePredictions,
    mostLikelyScore: scorePredictions[0]?.score || "1-1",
    expectedHomeGoals: Math.round(homeLambda * 10) / 10,
    expectedAwayGoals: Math.round(awayLambda * 10) / 10,
    expectedTotalGoals: Math.round(expectedTotal * 10) / 10,
    overUnderLine,
    overProb,
    underProb: 1 - overProb,
    confidenceLevel,
    confidenceLabel,
    keyInsights,
    riskFactors,
    opportunityFactors,
  };
}

// ============ 洞察生成 ============

function generateInsights(
  home: TeamRating, away: TeamRating,
  homeWin: number, draw: number, awayWin: number,
  msiDiff: number, homeLambda: number, awayLambda: number
): string[] {
  const insights: string[] = [];
  
  // MSI分析
  if (Math.abs(msiDiff) >= 2) {
    const stronger = msiDiff > 0 ? home.teamName : away.teamName;
    insights.push(`${stronger}综合实力明显占优（MSI差${Math.abs(msiDiff).toFixed(1)}）`);
  } else if (Math.abs(msiDiff) >= 1) {
    const stronger = msiDiff > 0 ? home.teamName : away.teamName;
    insights.push(`${stronger}综合实力略优（MSI差${Math.abs(msiDiff).toFixed(1)}）`);
  } else {
    insights.push("双方综合实力接近，胜负取决于临场发挥");
  }
  
  // 进球预测
  if (homeLambda + awayLambda >= 3.0) {
    insights.push("预期进球数较高，比赛可能较为开放");
  } else if (homeLambda + awayLambda < 2.0) {
    insights.push("预期进球数偏低，可能为防守型对决");
  }
  
  // 关键球员
  if (home.keyPlayerImpact >= 9.0) {
    insights.push(`${home.teamName}关键球员影响力突出（${home.keyPlayerImpact.toFixed(1)}）`);
  }
  if (away.keyPlayerImpact >= 9.0) {
    insights.push(`${away.teamName}关键球员影响力突出（${away.keyPlayerImpact.toFixed(1)}）`);
  }
  
  // 战术对比
  if (Math.abs(home.tacticalSystem - away.tacticalSystem) >= 2) {
    const better = home.tacticalSystem > away.tacticalSystem ? home.teamName : away.teamName;
    insights.push(`${better}战术体系明显更成熟`);
  }
  
  return insights;
}

function generateRisks(home: TeamRating, away: TeamRating, context?: { injuries?: string[] }): string[] {
  const risks: string[] = [];
  if (home.defenseRating < 6.0) risks.push(`${home.teamName}防守薄弱，可能被反击打穿`);
  if (away.defenseRating < 6.0) risks.push(`${away.teamName}防守薄弱，可能被反击打穿`);
  if (home.mentalResilience < 5.0) risks.push(`${home.teamName}心理素质欠佳，逆风局风险大`);
  if (away.mentalResilience < 5.0) risks.push(`${away.teamName}心理素质欠佳，逆风局风险大`);
  if (context?.injuries?.length) risks.push(`伤病影响：${context.injuries.join("、")}`);
  if (Math.abs(home.msiScore - away.msiScore) < 0.5) risks.push("实力过于接近，预测不确定性高");
  return risks;
}

function generateOpportunities(home: TeamRating, away: TeamRating, msiDiff: number): string[] {
  const opps: string[] = [];
  if (home.attackRating >= 8.0 && away.defenseRating < 6.5) {
    opps.push(`${home.teamName}进攻强 vs ${away.teamName}防守弱 → 可能大比分`);
  }
  if (away.attackRating >= 8.0 && home.defenseRating < 6.5) {
    opps.push(`${away.teamName}进攻强 vs ${home.teamName}防守弱 → 可能大比分`);
  }
  if (home.coachDecision >= 8.5) {
    opps.push(`${home.teamName}教练临场调度能力强，换人可能改变局势`);
  }
  if (away.coachDecision >= 8.5) {
    opps.push(`${away.teamName}教练临场调度能力强，换人可能改变局势`);
  }
  return opps;
}

// ============ 预设球队评级 ============
// 基于FIFA排名、历史战绩、阵容评估，后续可由用户手动调整

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
  SWE: { teamId: "swe", teamName: "瑞典", abbreviation: "SWE", rosterDepth: 6.5, tacticalSystem: 7.0, keyPlayerImpact: 6.0, coachDecision: 7.0, matchupData: 6.5, mentalResilience: 7.5 },
  AUT: { teamId: "aut", teamName: "奥地利", abbreviation: "AUT", rosterDepth: 7.0, tacticalSystem: 7.0, keyPlayerImpact: 6.5, coachDecision: 7.0, matchupData: 6.5, mentalResilience: 7.0 },
  CIV: { teamId: "civ", teamName: "科特迪瓦", abbreviation: "CIV", rosterDepth: 6.5, tacticalSystem: 6.5, keyPlayerImpact: 7.0, coachDecision: 6.0, matchupData: 6.0, mentalResilience: 6.5 },
  GHA: { teamId: "gha", teamName: "加纳", abbreviation: "GHA", rosterDepth: 6.5, tacticalSystem: 6.5, keyPlayerImpact: 6.5, coachDecision: 6.0, matchupData: 6.0, mentalResilience: 6.5 },
  MAR: { teamId: "mar", teamName: "摩洛哥", abbreviation: "MAR", rosterDepth: 7.0, tacticalSystem: 7.5, keyPlayerImpact: 7.0, coachDecision: 7.5, matchupData: 7.0, mentalResilience: 8.0 },
  CAN: { teamId: "can", teamName: "加拿大", abbreviation: "CAN", rosterDepth: 6.5, tacticalSystem: 6.0, keyPlayerImpact: 6.0, coachDecision: 6.5, matchupData: 5.5, mentalResilience: 6.5 },
  JPN: { teamId: "jpn", teamName: "日本", abbreviation: "JPN", rosterDepth: 6.5, tacticalSystem: 7.5, keyPlayerImpact: 6.5, coachDecision: 7.0, matchupData: 7.0, mentalResilience: 7.5 },
  KOR: { teamId: "kor", teamName: "韩国", abbreviation: "KOR", rosterDepth: 6.0, tacticalSystem: 6.5, keyPlayerImpact: 7.0, coachDecision: 6.5, matchupData: 6.0, mentalResilience: 7.0 },
  AUS: { teamId: "aus", teamName: "澳大利亚", abbreviation: "AUS", rosterDepth: 6.0, tacticalSystem: 6.0, keyPlayerImpact: 5.5, coachDecision: 6.5, matchupData: 5.5, mentalResilience: 7.0 },
  TUN: { teamId: "tun", teamName: "突尼斯", abbreviation: "TUN", rosterDepth: 6.0, tacticalSystem: 6.0, keyPlayerImpact: 5.5, coachDecision: 6.0, matchupData: 5.5, mentalResilience: 6.5 },
  ECU: { teamId: "ecu", teamName: "厄瓜多尔", abbreviation: "ECU", rosterDepth: 6.0, tacticalSystem: 6.0, keyPlayerImpact: 6.0, coachDecision: 6.0, matchupData: 5.5, mentalResilience: 7.0 },
  PAR: { teamId: "par", teamName: "巴拉圭", abbreviation: "PAR", rosterDepth: 5.5, tacticalSystem: 6.0, keyPlayerImpact: 5.5, coachDecision: 6.0, matchupData: 5.5, mentalResilience: 7.0 },
  COL: { teamId: "col", teamName: "哥伦比亚", abbreviation: "COL", rosterDepth: 6.5, tacticalSystem: 6.5, keyPlayerImpact: 6.5, coachDecision: 6.0, matchupData: 6.0, mentalResilience: 6.5 },
  SEN: { teamId: "sen", teamName: "塞内加尔", abbreviation: "SEN", rosterDepth: 6.5, tacticalSystem: 6.0, keyPlayerImpact: 6.5, coachDecision: 6.0, matchupData: 6.0, mentalResilience: 6.5 },
  NOR: { teamId: "nor", teamName: "挪威", abbreviation: "NOR", rosterDepth: 6.5, tacticalSystem: 6.5, keyPlayerImpact: 7.5, coachDecision: 6.5, matchupData: 6.0, mentalResilience: 7.0 },
  CZE: { teamId: "cze", teamName: "捷克", abbreviation: "CZE", rosterDepth: 6.5, tacticalSystem: 6.5, keyPlayerImpact: 6.0, coachDecision: 6.5, matchupData: 6.0, mentalResilience: 6.5 },
  // 较弱球队
  QAT: { teamId: "qat", teamName: "卡塔尔", abbreviation: "QAT", rosterDepth: 5.0, tacticalSystem: 5.5, keyPlayerImpact: 4.5, coachDecision: 5.5, matchupData: 4.5, mentalResilience: 5.0 },
  RSA: { teamId: "rsa", teamName: "南非", abbreviation: "RSA", rosterDepth: 4.5, tacticalSystem: 4.5, keyPlayerImpact: 4.5, coachDecision: 4.5, matchupData: 4.0, mentalResilience: 5.5 },
  BIH: { teamId: "bih", teamName: "波黑", abbreviation: "BIH", rosterDepth: 5.0, tacticalSystem: 5.0, keyPlayerImpact: 5.0, coachDecision: 5.0, matchupData: 4.5, mentalResilience: 5.0 },
  HAI: { teamId: "hai", teamName: "海地", abbreviation: "HAI", rosterDepth: 4.0, tacticalSystem: 4.0, keyPlayerImpact: 4.0, coachDecision: 4.0, matchupData: 3.5, mentalResilience: 5.0 },
  CUW: { teamId: "cuw", teamName: "库拉索", abbreviation: "CUW", rosterDepth: 4.0, tacticalSystem: 4.0, keyPlayerImpact: 3.5, coachDecision: 4.0, matchupData: 3.5, mentalResilience: 5.0 },
  CPV: { teamId: "cpv", teamName: "佛得角", abbreviation: "CPV", rosterDepth: 4.5, tacticalSystem: 4.5, keyPlayerImpact: 4.0, coachDecision: 4.5, matchupData: 4.0, mentalResilience: 5.5 },
  KSA: { teamId: "ksa", teamName: "沙特", abbreviation: "KSA", rosterDepth: 5.0, tacticalSystem: 5.0, keyPlayerImpact: 4.5, coachDecision: 5.0, matchupData: 4.5, mentalResilience: 5.0 },
  IRN: { teamId: "irn", teamName: "伊朗", abbreviation: "IRN", rosterDepth: 5.5, tacticalSystem: 5.5, keyPlayerImpact: 5.0, coachDecision: 5.5, matchupData: 5.0, mentalResilience: 6.0 },
  IRQ: { teamId: "irq", teamName: "伊拉克", abbreviation: "IRQ", rosterDepth: 5.0, tacticalSystem: 5.0, keyPlayerImpact: 4.5, coachDecision: 5.0, matchupData: 4.5, mentalResilience: 5.5 },
  EGY: { teamId: "egy", teamName: "埃及", abbreviation: "EGY", rosterDepth: 5.5, tacticalSystem: 5.0, keyPlayerImpact: 5.5, coachDecision: 5.0, matchupData: 5.0, mentalResilience: 5.5 },
  NZL: { teamId: "nzl", teamName: "新西兰", abbreviation: "NZL", rosterDepth: 4.5, tacticalSystem: 4.5, keyPlayerImpact: 4.0, coachDecision: 4.5, matchupData: 4.0, mentalResilience: 6.0 },
  ALG: { teamId: "alg", teamName: "阿尔及利亚", abbreviation: "ALG", rosterDepth: 5.5, tacticalSystem: 5.0, keyPlayerImpact: 5.5, coachDecision: 5.0, matchupData: 5.0, mentalResilience: 5.5 },
  JOR: { teamId: "jor", teamName: "约旦", abbreviation: "JOR", rosterDepth: 4.5, tacticalSystem: 4.5, keyPlayerImpact: 4.0, coachDecision: 4.5, matchupData: 4.0, mentalResilience: 5.5 },
  UZB: { teamId: "uzb", teamName: "乌兹别克斯坦", abbreviation: "UZB", rosterDepth: 5.0, tacticalSystem: 5.0, keyPlayerImpact: 4.5, coachDecision: 5.0, matchupData: 4.5, mentalResilience: 5.5 },
  PAN: { teamId: "pan", teamName: "巴拿马", abbreviation: "PAN", rosterDepth: 4.0, tacticalSystem: 4.0, keyPlayerImpact: 3.5, coachDecision: 4.0, matchupData: 3.5, mentalResilience: 5.0 },
  COD: { teamId: "cod", teamName: "刚果民主共和国", abbreviation: "COD", rosterDepth: 5.0, tacticalSystem: 4.5, keyPlayerImpact: 5.0, coachDecision: 4.5, matchupData: 4.5, mentalResilience: 5.0 },
  TUR: { teamId: "tur", teamName: "土耳其", abbreviation: "TUR", rosterDepth: 6.5, tacticalSystem: 6.0, keyPlayerImpact: 6.5, coachDecision: 6.0, matchupData: 5.5, mentalResilience: 6.5 },
  SCO: { teamId: "sco", teamName: "苏格兰", abbreviation: "SCO", rosterDepth: 5.5, tacticalSystem: 5.5, keyPlayerImpact: 5.0, coachDecision: 5.5, matchupData: 5.0, mentalResilience: 6.0 },
};

/**
 * 获取球队完整评级（含MSI计算）
 */
export function getTeamRating(abbreviation: string): TeamRating | null {
  const preset = PRESET_RATINGS[abbreviation];
  if (!preset) return null;
  
  const rating: TeamRating = {
    ...preset,
    msiScore: 0,
    attackRating: 0,
    defenseRating: 0,
  };
  rating.msiScore = calculateMSI(rating);
  return rating;
}
