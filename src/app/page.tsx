import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, Users, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
            蚂蚁足球
          </h1>
          <p className="mt-4 text-lg text-muted-foreground md:text-xl">
            2026世界杯专业赛事分析 · B2B双终端赋能平台
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button size="lg">了解详情</Button>
            <Button size="lg" variant="outline">
              合作咨询
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <Trophy className="w-8 h-8 mb-2 text-primary" />
              <CardTitle>专业分析</CardTitle>
              <CardDescription>
                六维分析模型 + MSI评分体系
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                整合球队战术、球员状态、赛场环境等全维度变量，输出客观量化分析。
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="w-8 h-8 mb-2 text-primary" />
              <CardTitle>后置分佣</CardTitle>
              <CardDescription>
                无收益不收费 · 零风险合作
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                仅从增量收益中分佣，无预付费用、无保底任务、无亏损分摊。
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="w-8 h-8 mb-2 text-primary" />
              <CardTitle>双终端赋能</CardTitle>
              <CardDescription>
                线下彩票店 + 线上预测平台
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                针对两类B端场景定制差异化服务与分佣体系。
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <ShieldCheck className="w-8 h-8 mb-2 text-primary" />
              <CardTitle>合规保障</CardTitle>
              <CardDescription>
                纯数据分析 · 不参与投注
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                对标全球成熟体育数据服务商，完全合规运营。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
