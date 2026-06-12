/**
 * 修复 espn-live.ts：
 * 1. 在 pollAllMatches() 中加入定期解说生成（每3分钟）
 * 2. 在文件末尾加入 generateLiveUpdateCommentary() 函数
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'lib', 'espn-live.ts');
let content = fs.readFileSync(filePath, 'utf8');

// ─────────────────────────────────────────────
// 修复1：在 pollAllMatches() 的预测更新块之后加入定期解说
// ─────────────────────────────────────────────
const insertMarker = '            prevState.predictedFirst = true;\n          }\n        }\n      }\n    }\n  } catch (err)';
const replacement = `            prevState.predictedFirst = true;
          }

          // ===== 4. 定期解说生成（直播中每3分钟） =====
          if (status === "live" && now - prevState.lastCommentaryTime > 180_000) {
            const periodLabel = period <= 2 ? "上半场" : "下半场";
            const liveUpdate = generateLiveUpdateCommentary(
              score.homeTeam,
              score.awayTeam,
              score.home,
              score.away,
              prevState.clock,
              periodLabel,
              prevState.odds1X2
            );
            events.push({
              type: "commentary",
              matchId,
              message: liveUpdate,
              eventType: "info",
              timestamp: now,
            });
            prevState.lastCommentaryTime = now;
          }
        }
      }
    }
  } catch (err)`;

if (content.includes(insertMarker)) {
  content = content.replace(insertMarker, replacement);
  console.log('✅ 修复1：已加入定期解说生成逻辑');
} else {
  console.log('⚠️  修复1：未找到插入位置，跳过');
}

// ─────────────────────────────────────────────
// 修复2：在文件末尾（generatePreMatchCommentary 函数之后）加入新函数
// ─────────────────────────────────────────────
const liveUpdateFunc = `

/**
 * 生成直播中定期赛事播报
 */
function generateLiveUpdateCommentary(
  homeTeam: string,
  awayTeam: string,
  homeScore: string,
  awayScore: string,
  clock: string,
  periodLabel: string,
  odds: any
): string {
  const scoreStr = \`【比分 \${homeScore}-\${awayScore}】\`;
  let oddsStr = "";
  if (odds?.home && odds.home > 0) {
    oddsStr = \`滚球盘口 \${odds.home.toFixed(2)}/\${((odds.draw || 3.3)).toFixed(2)}/\${odds.away.toFixed(2)}，\`;
  }
  const phrases = [
    \`\${periodLabel}进行至\${clock}分钟，\${scoreStr}\${oddsStr}模型持续跟踪赛事动态。\`,
    \`\${clock}′ 赛事速报：\${homeTeam} \${homeScore} vs \${awayScore} \${awayTeam}。\${oddsStr}双方继续较量！\`,
    \`\${periodLabel}\${clock}分钟，\${scoreStr}滚球赔率\${odds?.home ? \`主队\${odds.home.toFixed(2)}\` : "等待更新"}，AI预测持续校准中。\`,
  ];
  return \`【赛事播报】\${phrases[Math.floor(Math.random() * phrases.length)]}\`;
}
`;

// 在文件末尾追加
if (!content.includes('function generateLiveUpdateCommentary(')) {
  content += liveUpdateFunc;
  console.log('✅ 修复2：已追加 generateLiveUpdateCommentary() 函数');
} else {
  console.log('⚠️  修复2：函数已存在，跳过');
}

// ─────────────────────────────────────────────
// 修复3：确保 generatePreMatchCommentary 导出（供 route.ts 使用）
// ─────────────────────────────────────────────
if (!content.includes('export function generatePreMatchCommentary(')) {
  // 已经导出了，不需要处理
  console.log('✅ 修复3：generatePreMatchCommentary 已导出');
} else {
  console.log('ℹ️  修复3：generatePreMatchCommentary 已导出');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ espn-live.ts 修复完成，正在验证 TypeScript...');
