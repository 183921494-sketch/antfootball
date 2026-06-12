export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#F7F5F0]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="蚂蚁足球" className="w-9 h-9" />
            <span className="font-bold text-[#B08D57] text-lg">蚂蚁足球</span>
          </div>
          <a
            href="/login"
            className="px-4 py-1.5 bg-[#B08D57] hover:bg-[#9a7a4a] text-black text-sm font-bold rounded-lg transition-colors"
          >
            立即体验
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-[#B08D57]/10 border border-[#B08D57]/20 rounded-full px-4 py-1 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B08D57] animate-pulse" />
          <span className="text-[#B08D57] text-sm">2026 世界杯 · 精准预测工具</span>
        </div>

        <img src="/logo.png" alt="蚂蚁足球" className="w-20 h-20 mx-auto mb-6" />
        <h1 className="text-4xl md:text-5xl font-bold text-[#F7F5F0] mb-4">
          蚂蚁足球
        </h1>
        <p className="text-xl md:text-2xl text-[#B08D57] font-medium mb-4">
          让世界杯预测更科学
        </p>
        <p className="text-[#F7F5F0]/50 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
          基于 MSI 六维评分模型与博彩市场赔率融合，为您提供高精度世界杯赛事预测分析，涵盖胜平负、比分、进球数等核心指标。
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <a
            href="/login"
            className="px-8 py-3.5 bg-[#B08D57] hover:bg-[#9a7a4a] text-black font-bold rounded-xl transition-colors text-base"
          >
            开始预测 →
          </a>
          <a
            href="#features"
            className="px-8 py-3.5 border border-white/15 hover:border-[#B08D57]/40 text-[#F7F5F0]/70 hover:text-[#F7F5F0] rounded-xl transition-colors text-base"
          >
            了解更多
          </a>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-6 max-w-sm mx-auto">
          {[
            { value: '48+', label: '参赛球队覆盖' },
            { value: '6维', label: 'MSI评分模型' },
            { value: '实时', label: 'SSE数据推送' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold text-[#B08D57]">{value}</div>
              <div className="text-xs text-[#F7F5F0]/40 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-6"><hr className="border-white/5" /></div>

      {/* Features */}
      <section id="features" className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">核心功能</h2>
        <p className="text-[#F7F5F0]/40 text-center mb-12">四大预测维度，覆盖世界杯赛事分析全场景</p>

        <div className="grid md:grid-cols-2 gap-5">
          {[
            {
              icon: '🎯',
              title: '胜平负精准预测',
              desc: '融合博彩市场赔率（70%权重）与 MSI 六维模型（30%权重），输出胜/平/负推荐及置信度评分，帮助您做出更有把握的选择。',
            },
            {
              icon: '⚽',
              title: '波胆精确分析',
              desc: '泊松分布概率模型结合市场赔率，计算最可能比分并提供 Top3 波胆推荐，每组比分附带概率标签与价值边缘检测。',
            },
            {
              icon: '📊',
              title: 'MSI 六维评分',
              desc: '从阵容深度、战术体系、关键球员、教练决策、交锋数据、心理韧性六大维度量化球队实力，输出综合 MSI 评分。',
            },
            {
              icon: '⚡',
              title: '实时数据驱动',
              desc: 'SSE 实时推送比赛状态变化，比分、盘口、预测概率自动更新，每 30 秒轮询 ESPN 实时数据，始终掌握最新赛况。',
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 hover:border-[#B08D57]/20 transition-colors">
              <div className="text-3xl mb-4">{icon}</div>
              <h3 className="font-bold text-[#F7F5F0] mb-2">{title}</h3>
              <p className="text-sm text-[#F7F5F0]/50 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-6"><hr className="border-white/5" /></div>

      {/* Methodology */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">预测方法论</h2>
        <p className="text-[#F7F5F0]/40 text-center mb-12">双重模型融合，确保预测结果既科学又贴合市场共识</p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* MSI Model */}
          <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-7">
            <div className="text-3xl mb-4">📐</div>
            <h3 className="font-bold text-[#B08D57] text-lg mb-4">MSI 六维评分模型</h3>
            <div className="space-y-3">
              {[
                { name: '阵容深度', desc: '球员整体实力与板凳厚度' },
                { name: '战术体系', desc: '球队打法成熟度与应变能力' },
                { name: '关键球员', desc: '核心球员对比赛的决定性影响' },
                { name: '教练决策', desc: '主教练战术素养与临场指挥' },
                { name: '交锋数据', desc: '两队历史对战记录与风格克制' },
                { name: '心理韧性', desc: '逆境中的抗压能力与大赛经验' },
              ].map(({ name, desc }) => (
                <div key={name} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#B08D57] mt-2 shrink-0" />
                  <div>
                    <span className="text-sm font-semibold text-[#F7F5F0]">{name}</span>
                    <span className="text-sm text-[#F7F5F0]/40 ml-1">— {desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fusion Model */}
          <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-7">
            <div className="text-3xl mb-4">⚖️</div>
            <h3 className="font-bold text-[#B08D57] text-lg mb-4">融合预测模型</h3>
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-28 shrink-0 text-right">
                  <span className="text-[#B08D57] font-bold text-lg">70%</span>
                </div>
                <div className="flex-1">
                  <div className="h-3 bg-[#B08D57]/20 rounded-full overflow-hidden">
                    <div className="h-full bg-[#B08D57] rounded-full" style={{ width: '70%' }} />
                  </div>
                  <div className="text-sm text-[#F7F5F0]/50 mt-1.5">博彩市场赔率</div>
                  <div className="text-xs text-[#F7F5F0]/30 mt-0.5">反映全球投注者的集体智慧</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-28 shrink-0 text-right">
                  <span className="text-[#B08D57] font-bold text-lg">30%</span>
                </div>
                <div className="flex-1">
                  <div className="h-3 bg-[#B08D57]/20 rounded-full overflow-hidden">
                    <div className="h-full bg-[#B08D57]/60 rounded-full" style={{ width: '30%' }} />
                  </div>
                  <div className="text-sm text-[#F7F5F0]/50 mt-1.5">MSI 六维模型</div>
                  <div className="text-xs text-[#F7F5F0]/30 mt-0.5">基于球队综合实力的科学评估</div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <div className="text-xs text-[#F7F5F0]/30 leading-relaxed">
                  融合预测 = 市场共识（赔率）× 0.7 + 科学评估（MSI）× 0.3，在贴合市场预期的同时保留独立数据分析的价值。
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional metrics */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '大小球', value: '2.5', note: '标准盘口线' },
            { label: 'Kelly 建议', value: '2.5%', note: '最优投注比例' },
            { label: '价值边缘', value: '>5%', note: '正向期望标志' },
            { label: '置信度', value: '85%+', note: '高置信度推荐' },
          ].map(({ label, value, note }) => (
            <div key={label} className="bg-white/[0.03] border border-white/8 rounded-xl p-4 text-center">
              <div className="text-[#B08D57] font-bold text-lg">{value}</div>
              <div className="text-sm text-[#F7F5F0] font-medium mt-1">{label}</div>
              <div className="text-xs text-[#F7F5F0]/30 mt-0.5">{note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-6"><hr className="border-white/5" /></div>

      {/* Privacy disclaimer */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-[#B08D57]/5 border border-[#B08D57]/15 rounded-2xl p-6 text-center">
          <div className="text-2xl mb-3">⚠️</div>
          <h3 className="font-bold text-[#F7F5F0] mb-2">风险提示与免责声明</h3>
          <p className="text-sm text-[#F7F5F0]/40 leading-relaxed max-w-xl mx-auto">
            本工具所有预测分析仅供参考娱乐，不构成任何投注建议。足球比赛结果具有不确定性，请理性对待，量力而行，切勿沉迷。
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-8">
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="蚂蚁足球" className="w-6 h-6" />
            <span className="text-[#F7F5F0]/30 text-sm">蚂蚁足球 · 2026世界杯</span>
          </div>
          <div className="text-[#F7F5F0]/20 text-sm">
            世界杯让生活变得更美好
          </div>
        </div>
      </footer>
    </div>
  )
}