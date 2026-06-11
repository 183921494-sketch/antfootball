import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface PredictionSchemeProps {
  homeTeam: string;
  awayTeam: string;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  homeTeamMsi: number;
  awayTeamMsi: number;
  expectedGoals: number;
  confidenceLevel: number;
  keyInsights: string;
  riskFactors: string;
  opportunityFactors: string;
  isFinal: boolean;
  reportType: string;
  generatedAt: string;
}

export function PredictionScheme({
  homeTeam,
  awayTeam,
  homeWinProbability,
  drawProbability,
  awayWinProbability,
  homeTeamMsi,
  awayTeamMsi,
  expectedGoals,
  confidenceLevel,
  keyInsights,
  riskFactors,
  opportunityFactors,
  isFinal,
  reportType,
  generatedAt,
}: PredictionSchemeProps) {
  const maxProb = Math.max(homeWinProbability, drawProbability, awayWinProbability);
  const safeProb = (p: number) => (isNaN(p) ? 0 : Math.max(0, Math.min(1, p)));

  // Determine recommended outcome
  const probs = [
    { label: "主胜", value: homeWinProbability, color: "green" },
    { label: "平局", value: drawProbability, color: "yellow" },
    { label: "客胜", value: awayWinProbability, color: "red" },
  ];
  const recommended = probs.reduce((prev, curr) => prev.value > curr.value ? prev : curr);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">预测方案</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                {reportType === "pre_match" ? "赛前分析" : "临场修正"}
              </span>
              {isFinal && (
                <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded font-bold">
                  终版
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            生成时间：{new Date(generatedAt).toLocaleString()} | 置信度 {(confidenceLevel * 100).toFixed(0)}%
          </p>
        </CardHeader>
        <CardContent>
          <h2 className="text-center text-2xl font-bold mb-4">{homeTeam} vs {awayTeam}</h2>

          {/* MSI Comparison */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">MSI 六维评分对比</h3>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">{homeTeam}</div>
                <div className="text-3xl font-bold text-green-500">{homeTeamMsi.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">{awayTeam}</div>
                <div className="text-3xl font-bold text-red-500">{awayTeamMsi.toFixed(2)}</div>
              </div>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${(homeTeamMsi / 10) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              MSI分差：{(homeTeamMsi - awayTeamMsi).toFixed(2)} （{homeTeamMsi > awayTeamMsi ? homeTeam + "占优" : awayTeam + "占优"}）
            </p>
          </div>

          {/* Win/Draw/Loss Probabilities */}
          <div>
            <h3 className="text-sm font-medium mb-3">胜平负概率预测</h3>

            {/* Recommended outcome */}
            <div className="mb-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="text-xs text-muted-foreground mb-1">推荐结果</div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${
                  recommended.color === "green" ? "text-green-500" :
                  recommended.color === "yellow" ? "text-yellow-500" : "text-red-500"
                }`}>
                  {recommended.label}
                </span>
                <span className="text-sm text-muted-foreground">
                  （置信度 {(recommended.value * 100).toFixed(1)}%）
                </span>
              </div>
            </div>

            {/* Probability bars */}
            <div className="space-y-3">
              <ProbBar label="主胜" team={homeTeam} value={safeProb(homeWinProbability)} max={maxProb} color="green" />
              <ProbBar label="平局" value={safeProb(drawProbability)} max={maxProb} color="yellow" />
              <ProbBar label="客胜" team={awayTeam} value={safeProb(awayWinProbability)} max={maxProb} color="red" />
            </div>

            <div className="mt-3 text-center text-sm text-muted-foreground">
              预期进球：{expectedGoals.toFixed(1)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      {keyInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">💡 关键洞察</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{keyInsights}</div>
          </CardContent>
        </Card>
      )}

      {/* Risk Factors */}
      {riskFactors && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-red-500">⚠️ 风险因素</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{riskFactors}</div>
          </CardContent>
        </Card>
      )}

      {/* Opportunity Factors */}
      {opportunityFactors && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-green-500">✅ 机会因素</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{opportunityFactors}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ProbBar({ label, team, value, max, color }: {
  label: string;
  team?: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = (value * 100).toFixed(1);
  const barWidth = max > 0 ? (value / max) * 100 : 0;

  const colorClasses = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          {team && <span className="text-xs text-muted-foreground">[{team}]</span>}
        </div>
        <span className="text-sm font-bold">{pct}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClasses[color as keyof typeof colorClasses] || "bg-primary"}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}
