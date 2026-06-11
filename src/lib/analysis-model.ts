import { Database } from "@/lib/supabase";

// 六维分析模型接口定义
export interface TeamSixDimensionalAnalysis {
  teamId: string;
  teamName: string;
  
  // 六维评分（0-10分）
  rosterDepth: number;      // 阵容深度
  tacticalSystem: number;    // 战术体系
  keyPlayerImpact: number;  // 关键球员
  coachDecision: number;     // 教练决策
  matchupData: number;       // 对阵数据
  mentalResilience: number;   // 心理意志
  
  // 综合评分
  msiScore: number;          // 综合评分（加权平均）
  
  // 详细分析
  analysisDetails: {
    rosterDepthDetails: string;
    tacticalSystemDetails: string;
    keyPlayerDetails: string;
    coachDecisionDetails: string;
    matchupDetails: string;
    mentalDetails: string;
  };
  
  // 预测结论
  prediction: {
    winProbability: number;
    drawProbability: number;
    loseProbability: number;
    expectedGoals: number;
    confidenceLevel: number; // 修复：驼峰命名
  };
  
  // 风险因素
  riskFactors: string[];
  
  // 机会因素
  opportunityFactors: string[];
}

// 权重配置（可根据不同赛事调整）
const DIMENSION_WEIGHTS = {
  rosterDepth: 0.25,        // 阵容深度 25%
  tacticalSystem: 0.25,      // 战术体系 25%
  keyPlayerImpact: 0.20,    // 关键球员 20%
  coachDecision: 0.15,       // 教练决策 15%
  matchupData: 0.10,         // 对阵数据 10%
  mentalResilience: 0.05,    // 心理意志 5%
};

/**
 * 计算MSI综合评分
 * @param scores 六维评分对象
 * @returns MSI综合评分（0-10分）
 */
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
  
  // 确保结果在0-10范围内
  return Math.min(10, Math.max(0, weightedSum));
}

/**
 * 生成比赛预测
 * @param homeTeamMSI 主队MSI评分
 * @param awayTeamMSI 客队MSI评分
 * @param contextFactors 上下文因素（主场优势、伤病情况等）
 * @returns 预测结果
 */
export function generateMatchPrediction(
  homeTeamMSI: number,
  awayTeamMSI: number,
  contextFactors?: {
    homeAdvantage?: number;    // 主场优势（0-1）
    injuries?: boolean;         // 是否有关键球员伤病
    weather?: string;          // 天气情况
    venueCondition?: string;    // 场地条件
  }
): {
  winProbability: number;
  drawProbability: number;
  loseProbability: number;
  expectedGoals: number;
  confidenceLevel: number; // 修复：驼峰命名
} {
  // 基础概率计算（基于MSI差异）
  const msiDifference = homeTeamMSI - awayTeamMSI;
  
  // 主场优势调整
  const homeAdvantageAdj = contextFactors?.homeAdvantage || 0.1;
  const adjustedDifference = msiDifference + homeAdvantageAdj;
  
  // 使用逻辑函数计算胜率
  const winProb = 1 / (1 + Math.exp(-adjustedDifference));
  const loseProb = 1 / (1 + Math.exp(adjustedDifference));
  const drawProb = 1 - winProb - loseProb;
  
  // 期望进球数（基于MSI平均值）
  const avgMSI = (homeTeamMSI + awayTeamMSI) / 2;
  const expectedGoals = Math.max(0.5, avgMSI * 0.8);
  
  // 置信度（基于MSI差异绝对值）
  const confidenceLevel = Math.min(0.95, 0.5 + Math.abs(msiDifference) * 0.1);
  
  return {
    winProbability: Math.max(0.05, winProb),
    drawProbability: Math.max(0.05, drawProb),
    loseProbability: Math.max(0.05, loseProb),
    expectedGoals,
    confidenceLevel, // 修复：驼峰命名
  };
}

/**
 * 生成六维分析报告
 * @param teamId 球队ID
 * @param matchId 比赛ID（可选）
 * @returns 完整分析报告
 */
export async function generateSixDimensionalAnalysis(
  teamId: string,
  matchId?: string
): Promise<TeamSixDimensionalAnalysis> {
  // 这里是模拟数据，实际应该从数据库获取
  const mockAnalysis: TeamSixDimensionalAnalysis = {
    teamId,
    teamName: "示例球队",
    rosterDepth: 8.5,
    tacticalSystem: 8.0,
    keyPlayerImpact: 9.0,
    coachDecision: 7.5,
    matchupData: 7.0,
    mentalResilience: 8.0,
    msiScore: 0,
    analysisDetails: {
      rosterDepthDetails: "阵容深度分析详情...",
      tacticalSystemDetails: "战术体系分析详情...",
      keyPlayerDetails: "关键球员分析详情...",
      coachDecisionDetails: "教练决策分析详情...",
      matchupDetails: "对阵数据分析详情...",
      mentalDetails: "心理意志分析详情...",
    },
    prediction: {
      winProbability: 0.65,
      drawProbability: 0.20,
      loseProbability: 0.15,
      expectedGoals: 2.1,
      confidenceLevel: 0.75, // 修复：驼峰命名
    },
    riskFactors: ["关键球员伤病风险", "体能下降风险"],
    opportunityFactors: ["主场优势", "对手防守漏洞"],
  };
  
  // 计算MSI综合评分
  mockAnalysis.msiScore = calculateMSI({
    rosterDepth: mockAnalysis.rosterDepth,
    tacticalSystem: mockAnalysis.tacticalSystem,
    keyPlayerImpact: mockAnalysis.keyPlayerImpact,
    coachDecision: mockAnalysis.coachDecision,
    matchupData: mockAnalysis.matchupData,
    mentalResilience: mockAnalysis.mentalResilience,
  });
  
  return mockAnalysis;
}

/**
 * 批量生成球队MSI评分
 * @param teamIds 球队ID列表
 * @returns 球队MSI评分映射
 */
export async function batchCalculateMSI(
  teamIds: string[]
): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  
  for (const teamId of teamIds) {
    const analysis = await generateSixDimensionalAnalysis(teamId);
    results[teamId] = analysis.msiScore;
  }
  
  return results;
}

/**
 * 生成比赛分析报告（包含对阵双方）
 * @param homeTeamId 主队ID
 * @param awayTeamId 客队ID
 * @returns 比赛分析报告
 */
export async function generateMatchAnalysisReport(
  homeTeamId: string,
  awayTeamId: string
): Promise<{
  homeAnalysis: TeamSixDimensionalAnalysis;
  awayAnalysis: TeamSixDimensionalAnalysis;
  matchPrediction: {
    homeWinProbability: number;
    drawProbability: number;
    awayWinProbability: number;
    expectedTotalGoals: number;
    confidenceLevel: number; // 修复：驼峰命名
  };
  keyInsights: string[];
}> {
  const [homeAnalysis, awayAnalysis] = await Promise.all([
    generateSixDimensionalAnalysis(homeTeamId),
    generateSixDimensionalAnalysis(awayTeamId),
  ]);
  
  const matchPrediction = generateMatchPrediction(
    homeAnalysis.msiScore,
    awayAnalysis.msiScore
  );
  
  return {
    homeAnalysis,
    awayAnalysis,
    matchPrediction: {
      homeWinProbability: matchPrediction.winProbability,
      drawProbability: matchPrediction.drawProbability,
      awayWinProbability: matchPrediction.loseProbability,
      expectedTotalGoals: matchPrediction.expectedGoals * 2,
      confidenceLevel: matchPrediction.confidenceLevel, // 修复：驼峰命名
    },
    keyInsights: [
      `主队${homeAnalysis.teamName} MSI评分：${homeAnalysis.msiScore.toFixed(2)}`,
      `客队${awayAnalysis.teamName} MSI评分：${awayAnalysis.msiScore.toFixed(2)}`,
      `预测置信度：${(matchPrediction.confidenceLevel * 100).toFixed(1)}%`,
    ],
  };
}
