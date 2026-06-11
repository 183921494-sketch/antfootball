import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 通过Supabase REST API逐步创建表
 * 由于REST API不支持DDL，这里使用Supabase管理API
 * 需要设置SUPABASE_ACCESS_TOKEN环境变量
 */
export async function POST() {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  const projectRef = "bnxizdwaumgdcxvcdotl";

  if (!accessToken) {
    // 如果没有access token，返回完整的SQL脚本让用户手动在Supabase SQL Editor中执行
    return NextResponse.json({
      success: false,
      error: "SUPABASE_ACCESS_TOKEN 未设置",
      hint: "请在Supabase Dashboard (https://supabase.com/dashboard/project/bnxizdwaumgdcxvcdotl/sql) 的SQL Editor中执行以下SQL",
      sql: getMigrationSQL(),
    });
  }

  try {
    // 使用Supabase管理API执行SQL
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: getMigrationSQL() }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { success: false, error: "管理API执行失败", details: errText },
        { status: 500 }
      );
    }

    const result = await response.json();
    return NextResponse.json({
      success: true,
      message: "数据库迁移完成",
      result,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: "迁移执行失败", details: msg },
      { status: 500 }
    );
  }
}

function getMigrationSQL(): string {
  return `
-- =============================================
-- 蚂蚁足球 2026世界杯分析平台 数据库初始化
-- =============================================

-- 1. 管理员用户表
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 球队表
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  country TEXT NOT NULL,
  country_code TEXT,
  group_letter TEXT NOT NULL,
  msi_score DECIMAL(4,2) DEFAULT 5.00,
  fifa_ranking INTEGER,
  coach_name TEXT,
  tactical_formation TEXT,
  world_cup_appearances INTEGER DEFAULT 0,
  best_world_cup_result TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 比赛表
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_date TIMESTAMPTZ NOT NULL,
  world_cup_stage TEXT NOT NULL,
  group_letter TEXT,
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  home_score INTEGER,
  away_score INTEGER,
  home_penalties INTEGER,
  away_penalties INTEGER,
  stadium TEXT,
  city TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 分析报告表
CREATE TABLE IF NOT EXISTS analysis_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id),
  report_type TEXT NOT NULL DEFAULT 'pre_match',
  version INTEGER DEFAULT 1,
  home_team_msi DECIMAL(4,2),
  away_team_msi DECIMAL(4,2),
  home_win_probability DECIMAL(5,4),
  draw_probability DECIMAL(5,4),
  away_win_probability DECIMAL(5,4),
  expected_goals DECIMAL(4,2),
  confidence_level DECIMAL(4,3),
  key_insights TEXT,
  risk_factors TEXT,
  opportunity_factors TEXT,
  is_final BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. B端合作方表
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  company_name TEXT,
  contact_person TEXT,
  partner_type TEXT NOT NULL,
  business_license TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 合作方报告接收记录表
CREATE TABLE IF NOT EXISTS partner_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id),
  report_id UUID REFERENCES analysis_reports(id),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 佣金结算表
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id),
  settlement_period TEXT NOT NULL,
  revenue_base DECIMAL(12,2) DEFAULT 0,
  commission_rate DECIMAL(5,4) DEFAULT 0,
  commission_amount DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT,
  actor_type TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_teams_group ON teams(group_letter);
CREATE INDEX IF NOT EXISTS idx_teams_msi ON teams(msi_score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_stage ON matches(world_cup_stage);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_reports_match ON analysis_reports(match_id);
CREATE INDEX IF NOT EXISTS idx_partners_type ON partners(partner_type);
CREATE INDEX IF NOT EXISTS idx_commissions_partner ON commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- 触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS teams_updated_at ON teams;
CREATE TRIGGER teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS matches_updated_at ON matches;
CREATE TRIGGER matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS analysis_reports_updated_at ON analysis_reports;
CREATE TRIGGER analysis_reports_updated_at BEFORE UPDATE ON analysis_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS partners_updated_at ON partners;
CREATE TRIGGER partners_updated_at BEFORE UPDATE ON partners FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS commissions_updated_at ON commissions;
CREATE TRIGGER commissions_updated_at BEFORE UPDATE ON commissions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS admins_updated_at ON admins;
CREATE TRIGGER admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS system_config_updated_at ON system_config;
CREATE TRIGGER system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS策略
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Service role完全访问
CREATE POLICY "Service role full access on admins" ON admins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on teams" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on matches" ON matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on analysis_reports" ON analysis_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on partners" ON partners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on partner_reports" ON partner_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on commissions" ON commissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on system_config" ON system_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Anon只读球队和比赛
CREATE POLICY "Public read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Public read analysis_reports" ON analysis_reports FOR SELECT USING (true);
CREATE POLICY "Public read system_config" ON system_config FOR SELECT USING (true);

-- 初始管理员数据
INSERT INTO admins (email, password_hash, name, role) VALUES
  ('admin@antfootball.com', 'ant_admin_2026', '超级管理员', 'super_admin'),
  ('operator@antfootball.com', 'ant_op_2026', '运营管理员', 'operator')
ON CONFLICT (email) DO NOTHING;

-- 初始系统配置
INSERT INTO system_config (config_key, config_value, description) VALUES
  ('commission_lottery_low', '0.10', '彩票店低档佣金率'),
  ('commission_lottery_mid', '0.08', '彩票店中档佣金率'),
  ('commission_lottery_high', '0.06', '彩票店高档佣金率'),
  ('commission_platform_low', '0.15', '平台低档佣金率'),
  ('commission_platform_mid', '0.12', '平台中档佣金率'),
  ('commission_platform_high', '0.10', '平台高档佣金率'),
  ('msi_weight_squad_depth', '0.25', 'MSI权重-阵容深度'),
  ('msi_weight_tactical', '0.25', 'MSI权重-战术体系'),
  ('msi_weight_key_players', '0.25', 'MSI权重-关键球员'),
  ('msi_weight_coach', '0.15', 'MSI权重-教练决策'),
  ('msi_weight_mental', '0.10', 'MSI权重-心理意志'),
  ('default_confidence_level', '0.75', '默认置信度')
ON CONFLICT (config_key) DO NOTHING;
`;
}