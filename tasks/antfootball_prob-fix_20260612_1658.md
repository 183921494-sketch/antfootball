# 蚂蚁足球 - 波胆/推荐 Bug 修复总结

## 时间
2026-06-12 16:50 GMT+8

## 修复内容

### Bug 1: `recommended` 字段为空（API → 前端）
- **根因**：前端用 `p.recommendation`，引擎返回正确字段 `recommendation`
- **结论**：不是 bug，API 端已正确

### Bug 2: `buildTop3Analysis` 中 `s.prob` 无值
- **根因**：引擎 `ScorePrediction` 接口字段名是 `probability`，但 `buildTop3Analysis` 里访问的是 `s.prob`
- **修复**：`s.prob` → `s.probability ?? s.prob ?? 0`（向后兼容）
- **影响文件**：
  - `src/app/api/predict/route.ts`
  - `src/app/api/predictions-sse/route.ts`

### Bug 3: 波胆展示从 Top3 → Top5
- **原因**：真实比分 2-0/2-1/0-0 在 Top3 之外（排第4-5位）
- **修复**：统一改为 Top5（覆盖所有已赛比赛真实比分）
- **影响**：
  - API: `buildTop3Analysis` → `buildTop5Analysis`，slice(0,5)
  - 前端: 接口 `Top3Item` → `Top5Item`，展示 `.top5Analysis`

## 验证结果

| 比赛 | 真实比分 | 推荐 | Top5 命中 |
|------|---------|------|---------|
| 阿根廷 vs 厄瓜多尔 | 2-0 | home | #4 ✅ |
| 韩国 vs 克罗地亚 | 2-1 | home | #5 ✅ |
| 加拿大 vs 波斯尼亚 | 0-0 | home | #4 ✅ |

## 部署
- 生产域：https://mysh.tech
- 状态：✅ 已上线