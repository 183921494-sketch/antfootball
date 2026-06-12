# 蚂蚁足球 - 报告保存图片功能

## 需求
1. 进入比赛详情页 → 自动展示完整分析报告（移除"已结束隐藏报告"逻辑）
2. 报告一键保存为图片 → 保存到手机相册

## 实现

### 1. 依赖
- 安装 `html-to-image` (npm) — 纯前端 HTML → PNG，不依赖服务端

### 2. 功能逻辑
- `handleSaveImage` async 函数：
  1. 用 `html-to-image` 的 `toPng()` 将报告 DOM 区域截图
  2. 生成 PNG blob
  3. **移动端**：调用 `navigator.share({ files: [...] })` 触发系统分享栏（iOS "保存图片" / Android "保存到相册"）
  4. **PC 端**：创建下载链接，触发浏览器下载

### 3. 关键代码（`match/[matchId]/page.tsx`）
```typescript
import { toPng } from 'html-to-image'

const reportRef = useRef<HTMLDivElement>(null)
const [saving, setSaving] = useState(false)

const handleSaveImage = async () => {
  const el = reportRef.current
  if (!el) return
  setSaving(true)
  try {
    const dataUrl = await toPng(el, { quality: 0.92, pixelRatio: window.devicePixelRatio || 2, backgroundColor: '#0a0a0a' })
    const blob = await (await fetch(dataUrl)).blob()
    const fileName = `蚂蚁足球_${d?.homeTeam?.teamName}_vs_${d?.awayTeam?.teamName}_${Date.now()}.png`
    const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    if (mobile && navigator.canShare?.({ files: [new File([], fileName)] })) {
      const file = new File([blob], fileName, { type: 'image/png' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: '蚂蚁足球分析报告' })
      } else { /* fallback */ }
    } else {
      const a = document.createElement('a'); a.href = dataUrl; a.download = fileName; a.click()
    }
  } finally { setSaving(false) }
}
```

### 4. UI 改造
- **移除**"已结束比赛隐藏报告"逻辑 → 所有状态（未开始/进行中/已结束）都展示完整报告
- Header 新增 **"📥 保存报告"** 按钮（disabled 状态 → loading 状态）
- 报告区域加 `ref={reportRef}`，确保截图干净
- 截图底部加暗水印：`蚂蚁足球 · antfootball.mysh.tech`

### 5. 移动端行为
| 平台 | 行为 |
|------|------|
| iOS Safari | 触发系统分享栏 → "保存图片" 到 Photos |
| Android Chrome | 触发系统分享栏 → "保存到相册" |
| PC 浏览器 | 直接下载 PNG 文件 |

## 部署
- `npm install html-to-image` ✅
- 构建 15/15 路由通过 ✅
- Vercel 部署成功 ✅ (commit 51cd042 → mysh.tech)
