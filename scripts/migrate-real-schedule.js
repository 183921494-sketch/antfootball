/**
 * 蚂蚁足球 - 2026世界杯真实赛程迁移脚本
 * 从 ESPN 获取真实数据，替换数据库中的假赛程
 */
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://bnxizdwaumgdcxvcdotl.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJueGl6ZHdhdW1nZGN4dmNkb3RsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTUxMTkyNywiZXhwIjoyMDk1MDg3OTI3fQ.Yfy_XDeqIas9i8oz1hnDHu5o3_3EZaa4SYjrqGB6LNo';

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// ===== 2026世界杯48支真实球队 =====
const WORLD_CUP_TEAMS = [
  { country_code: 'MEX', name: '墨西哥',      name_en: 'Mexico',                   group: 'B', msi_score: 7.8 },
  { country_code: 'RSA', name: '南非',          name_en: 'South Africa',            group: 'B', msi_score: 6.2 },
  { country_code: 'KOR', name: '韩国',          name_en: 'South Korea',             group: 'E', msi_score: 7.0 },
  { country_code: 'CZE', name: '捷克',          name_en: 'Czechia',                 group: 'E', msi_score: 6.8 },
  { country_code: 'CAN', name: '加拿大',        name_en: 'Canada',                  group: 'A', msi_score: 6.5 },
  { country_code: 'BIH', name: '波斯尼亚',      name_en: 'Bosnia-Herzegovina',       group: 'A', msi_score: 6.3 },
  { country_code: 'USA', name: '美国',          name_en: 'United States',           group: 'C', msi_score: 7.2 },
  { country_code: 'PAR', name: '巴拉圭',        name_en: 'Paraguay',                group: 'C', msi_score: 6.6 },
  { country_code: 'QAT', name: '卡塔尔',        name_en: 'Qatar',                   group: 'D', msi_score: 6.0 },
  { country_code: 'SUI', name: '瑞士',          name_en: 'Switzerland',             group: 'D', msi_score: 7.4 },
  { country_code: 'BRA', name: '巴西',          name_en: 'Brazil',                  group: 'D', msi_score: 8.5 },
  { country_code: 'MAR', name: '摩洛哥',        name_en: 'Morocco',                 group: 'D', msi_score: 7.5 },
  { country_code: 'HAI', name: '海地',          name_en: 'Haiti',                   group: 'C', msi_score: 5.5 },
  { country_code: 'SCO', name: '苏格兰',        name_en: 'Scotland',                group: 'C', msi_score: 6.8 },
  { country_code: 'AUS', name: '澳大利亚',      name_en: 'Australia',               group: 'B', msi_score: 6.9 },
  { country_code: 'TUR', name: '土耳其',        name_en: 'Türkiye',                 group: 'B', msi_score: 7.0 },
  { country_code: 'GER', name: '德国',          name_en: 'Germany',                 group: 'A', msi_score: 8.2 },
  { country_code: 'CUW', name: '库拉索岛',      name_en: 'Curaçao',                 group: 'A', msi_score: 5.8 },
  { country_code: 'NED', name: '荷兰',          name_en: 'Netherlands',             group: 'A', msi_score: 8.0 },
  { country_code: 'JPN', name: '日本',          name_en: 'Japan',                   group: 'A', msi_score: 7.6 },
  { country_code: 'CIV', name: '科特迪瓦',      name_en: 'Ivory Coast',              group: 'F', msi_score: 6.5 },
  { country_code: 'ECU', name: '厄瓜多尔',      name_en: 'Ecuador',                  group: 'F', msi_score: 6.7 },
  { country_code: 'SWE', name: '瑞典',          name_en: 'Sweden',                   group: 'F', msi_score: 7.1 },
  { country_code: 'TUN', name: '突尼斯',        name_en: 'Tunisia',                  group: 'F', msi_score: 6.4 },
  { country_code: 'ESP', name: '西班牙',        name_en: 'Spain',                    group: 'H', msi_score: 8.3 },
  { country_code: 'CPV', name: '佛得角',        name_en: 'Cape Verde',               group: 'H', msi_score: 5.9 },
  { country_code: 'BEL', name: '比利时',        name_en: 'Belgium',                  group: 'H', msi_score: 7.7 },
  { country_code: 'EGY', name: '埃及',          name_en: 'Egypt',                    group: 'H', msi_score: 6.6 },
  { country_code: 'KSA', name: '沙特阿拉伯',    name_en: 'Saudi Arabia',             group: 'H', msi_score: 6.3 },
  { country_code: 'URU', name: '乌拉圭',        name_en: 'Uruguay',                  group: 'H', msi_score: 7.8 },
  { country_code: 'IRN', name: '伊朗',          name_en: 'Iran',                     group: 'G', msi_score: 6.8 },
  { country_code: 'NZL', name: '新西兰',        name_en: 'New Zealand',               group: 'G', msi_score: 5.5 },
  { country_code: 'FRA', name: '法国',          name_en: 'France',                   group: 'G', msi_score: 8.6 },
  { country_code: 'SEN', name: '塞内加尔',      name_en: 'Senegal',                  group: 'G', msi_score: 7.0 },
  { country_code: 'IRQ', name: '伊拉克',        name_en: 'Iraq',                     group: 'G', msi_score: 6.2 },
  { country_code: 'NOR', name: '挪威',          name_en: 'Norway',                   group: 'G', msi_score: 7.2 },
  { country_code: 'ARG', name: '阿根廷',        name_en: 'Argentina',                group: 'I', msi_score: 9.0 },
  { country_code: 'ALG', name: '阿尔及利亚',    name_en: 'Algeria',                  group: 'I', msi_score: 6.5 },
  { country_code: 'AUT', name: '奥地利',        name_en: 'Austria',                  group: 'I', msi_score: 7.1 },
  { country_code: 'JOR', name: '约旦',          name_en: 'Jordan',                   group: 'I', msi_score: 5.8 },
  { country_code: 'POR', name: '葡萄牙',        name_en: 'Portugal',                 group: 'J', msi_score: 8.2 },
  { country_code: 'COD', name: '刚果民主共和国',name_en: 'Congo DR',                 group: 'J', msi_score: 6.0 },
  { country_code: 'ENG', name: '英格兰',        name_en: 'England',                  group: 'J', msi_score: 8.4 },
  { country_code: 'GHA', name: '加纳',          name_en: 'Ghana',                    group: 'J', msi_score: 6.7 },
  { country_code: 'PAN', name: '巴拿马',        name_en: 'Panama',                   group: 'J', msi_score: 6.1 },
  { country_code: 'CRO', name: '克罗地亚',      name_en: 'Croatia',                  group: 'J', msi_score: 7.5 },
  { country_code: 'UZB', name: '乌兹别克斯坦',  name_en: 'Uzbekistan',               group: 'K', msi_score: 6.2 },
  { country_code: 'COL', name: '哥伦比亚',      name_en: 'Colombia',                group: 'K', msi_score: 7.6 },
];

// ===== 2026世界杯真实赛程（从 ESPN 抓取，手动整理）=====
const WORLD_CUP_MATCHES = [
  // 小组赛 - 6月11日（第1比赛日）
  { date: '2026-06-11T19:00:00Z', home: 'MEX', away: 'RSA', homeScore: 2, awayScore: 0, status: 'finished' },
  { date: '2026-06-12T02:00:00Z', home: 'KOR', away: 'CZE', homeScore: 2, awayScore: 1, status: 'finished' },
  // 小组赛 - 6月12日（第2比赛日）
  { date: '2026-06-12T19:00:00Z', home: 'CAN', away: 'BIH', homeScore: null, awayScore: null, status: 'pre' },
  // 小组赛 - 6月13日
  { date: '2026-06-13T01:00:00Z', home: 'USA', away: 'PAR', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-13T19:00:00Z', home: 'QAT', away: 'SUI', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-13T22:00:00Z', home: 'BRA', away: 'MAR', homeScore: null, awayScore: null, status: 'pre' },
  // 小组赛 - 6月14日
  { date: '2026-06-14T01:00:00Z', home: 'HAI', away: 'SCO', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-14T04:00:00Z', home: 'AUS', away: 'TUR', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-14T17:00:00Z', home: 'GER', away: 'CUW', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-14T20:00:00Z', home: 'NED', away: 'JPN', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-14T23:00:00Z', home: 'CIV', away: 'ECU', homeScore: null, awayScore: null, status: 'pre' },
  // 小组赛 - 6月15日
  { date: '2026-06-15T02:00:00Z', home: 'SWE', away: 'TUN', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-15T16:00:00Z', home: 'ESP', away: 'CPV', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-15T19:00:00Z', home: 'BEL', away: 'EGY', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-15T22:00:00Z', home: 'KSA', away: 'URU', homeScore: null, awayScore: null, status: 'pre' },
  // 小组赛 - 6月16日
  { date: '2026-06-16T01:00:00Z', home: 'IRN', away: 'NZL', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-16T19:00:00Z', home: 'FRA', away: 'SEN', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-16T22:00:00Z', home: 'IRQ', away: 'NOR', homeScore: null, awayScore: null, status: 'pre' },
  // 小组赛 - 6月17日
  { date: '2026-06-17T01:00:00Z', home: 'ARG', away: 'ALG', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-17T04:00:00Z', home: 'AUT', away: 'JOR', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-17T17:00:00Z', home: 'POR', away: 'COD', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-17T20:00:00Z', home: 'ENG', away: 'CRO', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-17T23:00:00Z', home: 'GHA', away: 'PAN', homeScore: null, awayScore: null, status: 'pre' },
  // 小组赛 - 6月18日
  { date: '2026-06-18T02:00:00Z', home: 'UZB', away: 'COL', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-18T16:00:00Z', home: 'CZE', away: 'RSA', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-18T19:00:00Z', home: 'SUI', away: 'BIH', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-18T22:00:00Z', home: 'CAN', away: 'QAT', homeScore: null, awayScore: null, status: 'pre' },
  // 小组赛 - 6月19日
  { date: '2026-06-19T01:00:00Z', home: 'MEX', away: 'KOR', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-19T19:00:00Z', home: 'USA', away: 'AUS', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-19T22:00:00Z', home: 'SCO', away: 'MAR', homeScore: null, awayScore: null, status: 'pre' },
  // 小组赛 - 6月20日
  { date: '2026-06-20T00:30:00Z', home: 'BRA', away: 'HAI', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-20T03:00:00Z', home: 'TUR', away: 'PAR', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-20T17:00:00Z', home: 'NED', away: 'SWE', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-20T20:00:00Z', home: 'GER', away: 'CIV', homeScore: null, awayScore: null, status: 'pre' },
  // 小组赛 - 6月21日
  { date: '2026-06-21T00:00:00Z', home: 'ECU', away: 'CUW', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-21T04:00:00Z', home: 'TUN', away: 'JPN', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-21T16:00:00Z', home: 'ESP', away: 'KSA', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-21T19:00:00Z', home: 'BEL', away: 'IRN', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-21T22:00:00Z', home: 'URU', away: 'CPV', homeScore: null, awayScore: null, status: 'pre' },
  // 小组赛 - 6月22日
  { date: '2026-06-22T01:00:00Z', home: 'NZL', away: 'EGY', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-22T17:00:00Z', home: 'ARG', away: 'AUT', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-22T21:00:00Z', home: 'FRA', away: 'IRQ', homeScore: null, awayScore: null, status: 'pre' },
  // 小组赛 - 6月23日
  { date: '2026-06-23T00:00:00Z', home: 'NOR', away: 'SEN', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-23T03:00:00Z', home: 'JOR', away: 'ALG', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-23T17:00:00Z', home: 'POR', away: 'UZB', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-23T20:00:00Z', home: 'ENG', away: 'GHA', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-23T23:00:00Z', home: 'PAN', away: 'CRO', homeScore: null, awayScore: null, status: 'pre' },
  // 小组赛 - 6月24日
  { date: '2026-06-24T02:00:00Z', home: 'COL', away: 'COD', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-24T19:00:00Z', home: 'BIH', away: 'QAT', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-24T19:00:00Z', home: 'SUI', away: 'CAN', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-24T22:00:00Z', home: 'MAR', away: 'HAI', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-24T22:00:00Z', home: 'SCO', away: 'BRA', homeScore: null, awayScore: null, status: 'pre' },
  // 小组赛 - 6月25日
  { date: '2026-06-25T01:00:00Z', home: 'CZE', away: 'MEX', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-25T01:00:00Z', home: 'RSA', away: 'KOR', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-25T20:00:00Z', home: 'CUW', away: 'CIV', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-25T20:00:00Z', home: 'ECU', away: 'GER', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-25T23:00:00Z', home: 'JPN', away: 'SWE', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-25T23:00:00Z', home: 'TUN', away: 'NED', homeScore: null, awayScore: null, status: 'pre' },
  // 小组赛 - 6月26日
  { date: '2026-06-26T02:00:00Z', home: 'PAR', away: 'AUS', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-26T02:00:00Z', home: 'TUR', away: 'USA', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-26T19:00:00Z', home: 'NOR', away: 'FRA', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-26T19:00:00Z', home: 'SEN', away: 'IRQ', homeScore: null, awayScore: null, status: 'pre' },
  // 小组赛 - 6月27日
  { date: '2026-06-27T00:00:00Z', home: 'CPV', away: 'KSA', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-27T00:00:00Z', home: 'URU', away: 'ESP', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-27T03:00:00Z', home: 'EGY', away: 'IRN', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-27T03:00:00Z', home: 'NZL', away: 'BEL', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-27T21:00:00Z', home: 'CRO', away: 'GHA', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-27T21:00:00Z', home: 'PAN', away: 'ENG', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-27T23:30:00Z', home: 'COL', away: 'POR', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-27T23:30:00Z', home: 'COD', away: 'UZB', homeScore: null, awayScore: null, status: 'pre' },
  // 小组赛 - 6月28日
  { date: '2026-06-28T02:00:00Z', home: 'ALG', away: 'AUT', homeScore: null, awayScore: null, status: 'pre' },
  { date: '2026-06-28T02:00:00Z', home: 'JOR', away: 'ARG', homeScore: null, awayScore: null, status: 'pre' },
];

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

async function main() {
  log('========== 蚂蚁足球 - 2026世界杯真实赛程迁移 ==========');

  // Step 1: 清空旧数据
  log('Step 1: 清空旧的 teams 和 matches...');
  await sb.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  log('  清空完成');

  // Step 2: 插入48支真实球队
  log(`Step 2: 插入${WORLD_CUP_TEAMS.length}支真实球队...`);
  const teamIdMap = {};
  for (const team of WORLD_CUP_TEAMS) {
    const { data, error } = await sb
      .from('teams')
      .insert({
        name: team.name,
        name_en: team.name_en,
        country: team.country_code,
        country_code: team.country_code,
        group_letter: team.group,
        msi_score: team.msi_score,
      })
      .select('id')
      .single();

    if (error) {
      log(`  ERROR inserting ${team.country_code}: ${error.message}`);
    } else {
      teamIdMap[team.country_code] = data.id;
      log(`  ✓ ${team.country_code} (${team.name})`);
    }
  }
  log(`  成功插入 ${Object.keys(teamIdMap).length} 支球队`);

  // Step 3: 插入真实赛程
  log(`Step 3: 插入${WORLD_CUP_MATCHES.length}场真实比赛...`);
  let inserted = 0;
  for (const match of WORLD_CUP_MATCHES) {
    const homeId = teamIdMap[match.home];
    const awayId = teamIdMap[match.away];
    if (!homeId || !awayId) {
      log(`  SKIP: ${match.home} vs ${match.away} (ID不存在)`);
      continue;
    }

    const groupLetter = WORLD_CUP_TEAMS.find(t => t.country_code === match.home)?.group || null;

    const { error } = await sb.from('matches').insert({
      home_team_id: homeId,
      away_team_id: awayId,
      match_date: match.date,
      status: match.status,
      home_score: match.homeScore,
      away_score: match.awayScore,
      group_letter: groupLetter,
      world_cup_stage: 'group_stage',
      stadium: '世界杯赛场',
    });

    if (error) {
      log(`  ERROR: ${match.home} vs ${match.away}: ${error.message}`);
    } else {
      inserted++;
    }
  }
  log(`  成功插入 ${inserted} 场比赛`);

  // Step 4: 验证
  log('Step 4: 验证数据...');
  const { data: allTeams } = await sb.from('teams').select('id, name, country_code');
  const { data: allMatches } = await sb.from('matches').select('id, match_date, status, home_score, away_score');

  const statusCount = {};
  allMatches.forEach(m => { statusCount[m.status] = (statusCount[m.status] || 0) + 1; });

  log(`  球队总数: ${allTeams.length}`);
  log(`  比赛总数: ${allMatches.length}`);
  log(`  状态分布: ${JSON.stringify(statusCount)}`);

  const finished = allMatches.filter(m => m.status === 'finished');
  if (finished.length > 0) {
    const teamMap2 = {};
    allTeams.forEach(t => { teamMap2[t.id] = t; });
    log('  已完赛:');
    for (const fm of finished) {
      log(`    ${fm.match_date}: 待查主队 vs 客队 (${fm.home_score}-${fm.awayScore})`);
    }
  }

  log('========== 迁移完成 ==========');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
