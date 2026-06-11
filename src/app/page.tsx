import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Trophy, TrendingUp, Users, ShieldCheck, BarChart3, FileText, Handshake, ChevronRight } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 px-4 md:px-6 text-center bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 md:px-4 py-1.5 text-xs md:text-sm text-primary mb-4 md:mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            2026世界杯 · 专业数据分析平台
          </div>

          <h1 className="text-4xl md:text-7xl font-bold tracking-tight mb-3 md:mb-4">
            🐜 蚂蚁足球
          </h1>
          <p className="text-lg md:text-2xl text-muted-foreground mb-3 md:mb-4">
            小身体，大能量
          </p>
          <p className="text-sm md:text-lg text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto leading-relaxed">
            专注2026世界杯专业赛事分析，为线下彩票店和线上预测平台提供
            <strong className="text-foreground">MSI六维分析模型</strong>赋能，后置分佣模式，无收益不收费。
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Link href="/admin/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto touch-target">
                管理员登录 <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/partner/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto touch-target">
                合作方登录 <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/reports" className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto touch-target">
                查看分析报告 <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="w-full bg-primary text-primary-foreground py-6 md:py-8">
        <div className="max-w-5xl mx-auto px-4 md:px-6 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-center">
          <div>
            <div className="text-2xl md:text-4xl font-bold">48</div>
            <div className="text-xs md:text-sm opacity-80 mt-1">支球队</div>
          </div>
          <div>
            <div className="text-2xl md:text-4xl font-bold">104</div>
            <div className="text-xs md:text-sm opacity-80 mt-1">场比赛</div>
          </div>
          <div>
            <div className="text-2xl md:text-4xl font-bold">17</div>
            <div className="text-xs md:text-sm opacity-80 mt-1">份研究报告</div>
          </div>
          <div>
            <div className="text-2xl md:text-4xl font-bold">0%</div>
            <div className="text-xs md:text-sm opacity-80 mt-1">预付费用</div>
          </div>
        </div>
      </section>

      {/* Features - responsive: 1 col on mobile, 3 on desktop */}
      <section className="w-full py-12 md:py-20 px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">三大核心服务</h2>
            <p className="text-sm md:text-base text-muted-foreground">为B端合作伙伴提供全链路数据分析解决方案</p>
          </div>

          <div className="grid gap-6 md:gap-8 md:grid-cols-3">
            <Card>
              <CardHeader>
                <BarChart3 className="w-8 h-8 md:w-10 md:h-10 text-primary mb-2 md:mb-3" />
                <CardTitle className="text-lg">MSI数据分析</CardTitle>
                <CardDescription>六维分析模型 · 量化球队实力</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  基于阵容深度、战术体系、关键球员等六大维度，综合计算MSI评分，
                  量化呈现球队真实实力对比。
                </p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {["阵容深度分析", "战术体系评估", "关键球员影响", "教练决策能力", "对阵历史数据", "心理意志评估"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="text-primary text-xs">✓</span> {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="w-8 h-8 md:w-10 md:h-10 text-primary mb-2 md:mb-3" />
                <CardTitle className="text-lg">报告服务</CardTitle>
                <CardDescription>赛前/临场/赛后 · 全周期覆盖</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  提供赛前预测报告、临场修正分析、赛后复盘报告，
                  配套胜平负概率、期望进球、置信度等量化指标。
                </p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {["胜平负概率预测", "期望进球数", "风险与机会因素", "关键洞察分析", "PDF下载导出", "支持临场修正"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="text-primary text-xs">✓</span> {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Handshake className="w-8 h-8 md:w-10 md:h-10 text-primary mb-2 md:mb-3" />
                <CardTitle className="text-lg">B端合作</CardTitle>
                <CardDescription>彩票店 + 预测平台 · 双终端赋能</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  针对线下彩票店和线上预测平台两类B端场景，
                  定制差异化服务与后置分佣体系。
                </p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {["专属B端管理后台", "报告实时推送", "佣金结算管理", "10%-15%后置分佣", "无预付零风险", "增量收益分佣"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="text-primary text-xs">✓</span> {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* MSI Model Overview - 2 cols on mobile, 6 on desktop */}
      <section className="w-full py-12 md:py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="text-center mb-8 md:mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">MSI六维分析模型</h2>
            <p className="text-sm md:text-base text-muted-foreground">科学量化球队实力，输出客观量化分析结论</p>
          </div>

          <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "阵容深度", weight: "25%", icon: Users },
              { label: "战术体系", weight: "25%", icon: Trophy },
              { label: "关键球员", weight: "20%", icon: ShieldCheck },
              { label: "教练决策", weight: "15%", icon: TrendingUp },
              { label: "对阵数据", weight: "10%", icon: BarChart3 },
              { label: "心理意志", weight: "5%", icon: ShieldCheck },
            ].map(({ label, weight, icon: Icon }) => (
              <Card key={label} className="text-center">
                <CardContent className="pt-4 md:pt-6 p-3 md:p-6">
                  <Icon className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1.5 md:mb-2 text-primary" />
                  <div className="font-bold text-sm md:text-base">{label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 md:mt-1">权重 {weight}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="w-full py-12 md:py-20 px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 md:mb-12">合作用户指南</h2>
          <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-3">
            {[
              { step: "01", title: "申请合作", desc: "联系平台申请成为合作方，提交资质审核" },
              { step: "02", title: "获取报告", desc: "通过B端后台接收专属比赛分析报告" },
              { step: "03", title: "收益分成", desc: "根据实际增量收益，后置结算佣金" },
            ].map(({ step, title, desc }) => (
              <div key={step} className="space-y-2 md:space-y-3">
                <div className="text-4xl md:text-5xl font-bold text-muted/30">{step}</div>
                <div className="font-bold text-lg">{title}</div>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full py-12 md:py-16 bg-primary text-primary-foreground text-center px-4 md:px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">立即开始合作</h2>
          <p className="text-sm md:text-base text-primary-foreground/80 mb-5 md:mb-6">
            无预付费用、无保底任务、无亏损分摊，仅从增量收益中分佣
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Link href="/admin/login" className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto touch-target">
                管理员入口 <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/partner/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 touch-target">
                合作方入口 <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-6 md:py-8 text-center text-xs md:text-sm text-muted-foreground border-t">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <p>蚂蚁足球 · 2026世界杯专业赛事分析平台</p>
          <p className="mt-1">© 2026 蚂蚁足球 mysh.tech · 小身体，大能量</p>
        </div>
      </footer>
    </main>
  );
}
