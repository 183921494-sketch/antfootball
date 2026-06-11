# 🐜 蚂蚁足球 — 2026世界杯B2B双终端分析平台

## 项目定位
为线下彩票店和线上足球预测平台提供专业赛事数据分析服务，采用后置分佣模式（无收益不收费）。

## 技术栈（确认）
- **前端**：Next.js 16 + TypeScript + TailwindCSS + Shadcn UI
- **后端**：Next.js API Routes + Supabase PostgreSQL
- **数据库**：Supabase (PostgreSQL + Auth + RLS)
- **部署**：Vercel + Cloudflare CDN
- **AI**：OpenAI SDK + 已完成的六维分析模型

## 数据库设计（9表，已完成）
1. `teams` - 球队基础信息
2. `players` - 球员数据
3. `matches` - 赛程与赛果
4. `odds` - 博彩赔率
5. `analysis_reports` - 分析报告
6. `intelligence` - 情报数据
7. `users` - 用户/合作方
8. `subscriptions` - 订阅与佣金记录
9. `system_config` - 系统配置

## MVP功能清单（30天冲刺）

### Phase 1（Week 1-2）：核心数据+报告系统
- [ ] 数据库搭建与种子数据导入
- [ ] 后台管理登录系统
- [ ] 标准化报告生成系统
- [ ] B端合作方管理后台

### Phase 2（Week 3-4）：B端服务交付
- [ ] 彩票店专属后台（日报推送+海报生成）
- [ ] 预测平台API接口（内容输出）
- [ ] 临场修正系统（赛前12h + 2h）
- [ ] 佣金结算系统

## 项目目录结构
```
antfootball/
├── src/
│   ├── app/
│   │   ├── api/              # API路由
│   │   │   ├── auth/        # 登录注册
│   │   │   ├── reports/     # 报告生成与推送
│   │   │   ├── intelligence/# 情报数据
│   │   │   ├── commission/  # 佣金结算
│   │   │   └── ...
│   │   ├── admin/           # 后台管理
│   │   ├── lottery/         # 彩票店后台
│   │   ├── platform/        # 预测平台后台
│   │   └── ...
│   ├── components/          # 共享组件
│   ├── lib/                 # 工具库
│   │   ├── supabase.ts
│   │   ├── analysis-model.ts # 六维分析模型
│   │   └── ...
│   └── types/
├── public/
│   ├── logo.png            # 蚂蚁足球LOGO
│   └── ...
├── .env.example
├── README.md
└── ...
```

## 开发环境
- Node.js v22.16.0
- npm 10.9.2
- Git仓库：`github.com/183921494-sketch/antfootball`

## 下一步行动
1. 创建Next.js 16项目骨架
2. 配置Supabase数据库连接
3. 导入9表数据库结构
4. 开发后台管理登录系统
5. 实现报告生成MVP

---
**创建时间**：2026-06-11 16:15 GMT+8
**目标上线**：2026-07-11（30天后）
**开发模式**：敏捷开发，2周一个Sprint
