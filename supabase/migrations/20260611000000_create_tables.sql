-- 蚂蚁足球数据库Schema迁移
-- 创建时间：2026-06-11
-- 数据库：Supabase PostgreSQL

-- 1. 球队表
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  country VARCHAR(50) NOT NULL,
  country_code VARCHAR(3),
  group_letter CHAR(1), -- A-H组
  msi_score NUMERIC(3,1), -- MSI综合评分 0-10
  fifa_ranking INTEGER,
  coach_name VARCHAR(100),
  tactical_formation VARCHAR(20), -- 阵型 4-3-3等
  world_cup_appearances INTEGER DEFAULT 0,
  best_world_cup_result VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 球员表
CREATE TABLE IF NOT EXISTS public.players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  jersey_number INTEGER,
  position VARCHAR(20), -- GK/DF/MF/FW
  date_of_birth DATE,
  age INTEGER,
  height INTEGER, -- cm
  preferred_foot VARCHAR(5), -- left/right
  club VARCHAR(100), -- 所属俱乐部
  market_value NUMERIC(10,2), -- 市值（万欧元）
  is_key_player BOOLEAN DEFAULT FALSE,
  is_injured BOOLEAN DEFAULT FALSE,
  injury_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 比赛表
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_date TIMESTAMP WITH TIME ZONE NOT NULL,
  world_cup_stage VARCHAR(20) NOT NULL, -- group_stage/round_of_16/quarterfinal/semifinal/final
  group_letter CHAR(1), -- 小组赛才有
  home_team_id UUID REFERENCES public.teams(id),
  away_team_id UUID REFERENCES public.teams(id),
  home_score INTEGER,
  away_score INTEGER,
  home_penalties INTEGER,
  away_penalties INTEGER,
  stadium VARCHAR(100),
  city VARCHAR(50),
  attendance INTEGER,
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled/ongoing/finished
  weather VARCHAR(50),
  temperature NUMERIC(4,1), -- 摄氏度
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 赔率表
CREATE TABLE IF NOT EXISTS public.odds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  bookmaker VARCHAR(50) NOT NULL, -- 博彩公司名称
  home_win NUMERIC(6,2), -- 主胜赔率
  draw NUMERIC(6,2), -- 平局赔率
  away_win NUMERIC(6,2), -- 客胜赔率
  over_2_5 NUMERIC(6,2), -- 大2.5球赔率
  under_2_5 NUMERIC(6,2), -- 小2.5球赔率
  asian_handicap VARCHAR(10), -- 亚洲让球盘
  asian_handicap_odds NUMERIC(6,2),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 分析报告表
CREATE TABLE IF NOT EXISTS public.analysis_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  report_type VARCHAR(20) NOT NULL, -- pre_match/live/post_match
  version INTEGER DEFAULT 1, -- 版本号（用于临场修正）
  home_team_msi NUMERIC(3,1),
  away_team_msi NUMERIC(3,1),
  home_win_probability NUMERIC(4,2), -- 0-1
  draw_probability NUMERIC(4,2),
  away_win_probability NUMERIC(4,2),
  expected_goals NUMERIC(3,1),
  confidence_level NUMERIC(4,2), -- 0-1
  key_insights TEXT,
  risk_factors TEXT,
  opportunity_factors TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_final BOOLEAN DEFAULT FALSE, -- 是否为最终版本（赛前2h修正版）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 情报数据表
CREATE TABLE IF NOT EXISTS public.intelligence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  intelligence_type VARCHAR(20) NOT NULL, -- injury/suspension/tactical/psychological/other
  severity VARCHAR(10), -- low/medium/high
  title VARCHAR(200) NOT NULL,
  description TEXT,
  source VARCHAR(50), -- 情报来源
  is_verified BOOLEAN DEFAULT FALSE,
  impact_rating INTEGER, -- 1-5影响评级
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 用户/合作方表
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  password_hash VARCHAR(255),
  user_type VARCHAR(20) NOT NULL, -- lottery_shop/platform/admin
  company_name VARCHAR(200),
  contact_person VARCHAR(100),
  business_license VARCHAR(50), -- 营业执照号
  address TEXT,
  city VARCHAR(50),
  province VARCHAR(50),
  is_verified BOOLEAN DEFAULT FALSE,
  contract_start_date DATE,
  contract_end_date DATE,
  commission_rate NUMERIC(4,2), -- 当前佣金比例
  total_revenue NUMERIC(12,2) DEFAULT 0, -- 总收益
  total_commission_paid NUMERIC(12,2) DEFAULT 0, -- 已付佣金
  last_login_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 订阅与佣金记录表
CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  settlement_period VARCHAR(20) NOT NULL, -- 2026-06、2026-世界杯1等
  revenue_base NUMERIC(12,2) NOT NULL, -- 结算基数（增量收益）
  commission_rate NUMERIC(4,2) NOT NULL, -- 佣金比例
  commission_amount NUMERIC(12,2) NOT NULL, -- 佣金金额
  status VARCHAR(20) DEFAULT 'pending', -- pending/paid/disputed
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. 系统配置表
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key VARCHAR(50) UNIQUE NOT NULL,
  config_value TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认配置
INSERT INTO public.system_config (config_key, config_value, description) VALUES
('commission_rate_lottery_low', '0.10', '彩票店月增量1万以内分佣比例'),
('commission_rate_lottery_mid', '0.08', '彩票店月增量1-3万内分佣比例'),
('commission_rate_lottery_high', '0.06', '彩票店月增量3万以上分佣比例'),
('commission_rate_platform_low', '0.15', '平台月付费5万以内分佣比例'),
('commission_rate_platform_mid', '0.12', '平台月付费5-15万内分佣比例'),
('commission_rate_platform_high', '0.10', '平台月付费15万以上分佣比例'),
('analysis_model_version', '1.0', '六维分析模型版本'),
('msi_calculation_weights', '{"rosterDepth":0.25,"tacticalSystem":0.25,"keyPlayerImpact":0.20,"coachDecision":0.15,"matchupData":0.10,"mentalResilience":0.05}', 'MSI评分权重配置')
ON CONFLICT (config_key) DO NOTHING;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_teams_country ON public.teams(country);
CREATE INDEX IF NOT EXISTS idx_teams_group ON public.teams(group_letter);
CREATE INDEX IF NOT EXISTS idx_players_team ON public.players(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON public.matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_stage ON public.matches(world_cup_stage);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_match ON public.analysis_reports(match_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_team ON public.intelligence(team_id);
CREATE INDEX IF NOT EXISTS idx_commissions_user ON public.commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON public.commissions(status);

-- 启用Row Level Security (RLS)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- 创建公开读取策略（所有用户可读取基础数据）
CREATE POLICY "允许所有用户读取球队数据" ON public.teams FOR SELECT USING (true);
CREATE POLICY "允许所有用户读取球员数据" ON public.players FOR SELECT USING (true);
CREATE POLICY "允许所有用户读取比赛数据" ON public.matches FOR SELECT USING (true);
CREATE POLICY "允许所有用户读取赔率数据" ON public.odds FOR SELECT USING (true);
CREATE POLICY "允许所有用户读取分析报告" ON public.analysis_reports FOR SELECT USING (true);
CREATE POLICY "允许所有用户读取情报数据" ON public.intelligence FOR SELECT USING (true);
CREATE POLICY "允许所有用户读取系统配置" ON public.system_config FOR SELECT USING (true);

-- 只有认证用户可读取用户自身数据
CREATE POLICY "用户只能读取自己的数据" ON public.users FOR SELECT USING (auth.uid() = id);

-- 只有管理员可写入/修改数据
CREATE POLICY "只有管理员可修改球队数据" ON public.teams FOR ALL USING (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND user_type = 'admin'));

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要跟踪更新时间的表创建触发器
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_analysis_reports_updated_at BEFORE UPDATE ON public.analysis_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON public.commissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
