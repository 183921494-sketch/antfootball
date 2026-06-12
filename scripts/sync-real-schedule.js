// 蚂蚁足球 - 真实赛程同步脚本
// 从 ESPN API 获取真实赛程并更新 Supabase 数据库

const https = require('https');

const SUPABASE_URL = 'https://bnxizdwaumgdcxvcdotl.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJueGl6ZHdhdW1nZGN4dmNkb3RsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTUxMTkyNywiZXhwIjoyMDk1MDg3OTI3fQ.Yfy_XDeqIas9i8oz1hnDHu5o3_3EZaa4SYjrqGB6LNo';

// ===== 球队映射表（ESPN缩写 → 中文名）=====
const TEAM_MAP = {
  'MEX': { name: '墨西哥', name_en: 'Mexico', country_code: 'MX', group: 'B' },
  'RSA': { name: '南非', name_en: 'South Africa', country_code: 'ZA', group: 'B' },
  'KOR': { name: '韩国', name_en: 'South Korea', country_code: 'KR', group: 'E' },
  'CZE': { name: '捷克', name_en: 'Czechia', country_code: 'CZ', group: 'E' },
  'CAN': { name: '加拿大', name_en: 'Canada', country_code: 'CA', group: 'A' },
  'BIH': { name: '波斯尼亚', name_en: 'Bosnia-Herzegovina', country_code: 'BA', group: 'A' },
  'USA': { name: '美国', name_en: 'United States', country_code: 'US', group: 'C' },
  'PAR': { name: '巴拉圭', name_en: 'Paraguay', country_code: 'PY', group: 'C' },
  'QAT': { name: '卡塔尔', name_en: 'Qatar', country_code: 'QA', group: 'D' },
  'SUI': { name: '瑞士', name_en: 'Switzerland', country_code: 'CH', group: 'D' },
  'BRA': { name: '巴西', name_en: 'Brazil', country_code: 'BR', group: 'D' },
  'MAR': { name: '摩洛哥', name_en: 'Morocco', country_code: 'MA', group: 'D' },
  'HAI': { name: '海地', name_en: 'Haiti', country_code: 'HT', group: 'C' },
  'SCO': { name: '苏格兰', name_en: 'Scotland', country_code: 'GB-SCT', group: 'C' },
  'AUS': { name: '澳大利亚', name_en: 'Australia', country_code: 'AU', group: 'B' },
  'TUR': { name: '土耳其', name_en: 'Türkiye', country_code: 'TR', group: 'B' },
  'GER': { name: '德国', name_en: 'Germany', country_code: 'DE', group: 'A' },
  'CUW': { name: '库拉索岛', name_en: 'Curaçao', country_code: 'CW', group: 'A' },
  'NED': { name: '荷兰', name_en: 'Netherlands', country_code: 'NL', group: 'A' },
  'JPN': { name: '日本', name_en: 'Japan', country_code: 'JP', group: 'A' },
  'CIV': { name: '科特迪瓦', name_en: 'Ivory Coast', country_code: 'CI', group: 'F' },
  'ECU': { name: '厄瓜多尔', name_en: 'Ecuador', country_code: 'EC', group: 'F' },
  'SWE': { name: '瑞典', name_en: 'Sweden', country_code: 'SE', group: 'F' },
  'TUN': { name: '突尼斯', name_en: 'Tunisia', country_code: 'TN', group: 'F' },
  'ESP': { name: '西班牙', name_en: 'Spain', country_code: 'ES', group: 'H' },
  'CPV': { name: '佛得角', name_en: 'Cape Verde', country_code: 'CV', group: 'H' },
  'BEL': { name: '比利时', name_en: 'Belgium', country_code: 'BE', group: 'H' },
  'EGY': { name: '埃及', name_en: 'Egypt', country_code: 'EG', group: 'H' },
  'KSA': { name: '沙特阿拉伯', name_en: 'Saudi Arabia', country_code: 'SA', group: 'H' },
  'URU': { name: '乌拉圭', name_en: 'Uruguay', country_code: 'UY', group: 'H' },
  'IRN': { name: '伊朗', name_en: 'Iran', country_code: 'IR', group: 'G' },
  'NZL': { name: '新西兰', name_en: 'New Zealand', country_code: 'NZ', group: 'G' },
  'FRA': { name: '法国', name_en: 'France', country_code: 'FR', group: 'G' },
  'SEN': { name: '塞内加尔', name_en: 'Senegal', country_code: 'SN', group: 'G' },
  'IRQ': { name: '伊拉克', name_en: 'Iraq', country_code: 'IQ', group: 'G' },
  'NOR': { name: '挪威', name_en: 'Norway', country_code: 'NO', group: 'G' },
  'ARG': { name: '阿根廷', name_en: 'Argentina', country_code: 'AR', group: 'I' },
  'ALG': { name: '阿尔及利亚', name_en: 'Algeria', country_code: 'DZ', group: 'I' },
  'AUT': { name: '奥地利', name_en: 'Austria', country_code: 'AT', group: 'I' },
  'JOR': { name: '约旦', name_en: 'Jordan', country_code: 'JO', group: 'I' },
  'POR': { name: '葡萄牙', name_en: 'Portugal', country_code: 'PT', group: 'J' },
  'COD': { name: '刚果民主共和国', name_en: 'Congo DR', country_code: 'CD', group: 'J' },
  'ENG': { name: '英格兰', name_en: 'England', country_code: 'GB-ENG', group: 'J' },
  'GHA': { name: '加纳', name_en: 'Ghana', country_code: 'GH', group: 'J' },
  'PAN': { name: '巴拿马', name_en: 'Panama', country_code: 'PA', group: 'J' },
  'CRO': { name: '克罗地亚', name_en: 'Croatia', country_code: 'HR', group: 'J' },
  'UZB': { name: '乌兹别克斯坦', name_en: 'Uzbekistan', country_code: 'UZ', group: 'K' },
  'COL': { name: '哥伦比亚', name_en: 'Colombia', country_code: 'CO', group: 'K' },
  'CHI': { name: '智利', name_en: 'Chile', country_code: 'CL', group: 'K' },
  'PER': { name: '秘鲁', name_en: 'Peru', country_code: 'PE', group: 'K' },
  'BOL': { name: '玻利维亚', name_en: 'Bolivia', country_code: 'BO', group: 'K' },
  'VEN': { name: '委内瑞拉', name_en: 'Venezuela', country_code: 'VE', group: 'K' },
};

// 小组分组映射
const GROUP_LETTERS = {
  'MEX': 'B', 'RSA': 'B', 'KOR': 'E', 'CZE': 'E',
  'CAN': 'A', 'BIH': 'A', 'USA': 'C', 'PAR': 'C',
  'QAT': 'D', 'SUI': 'D', 'BRA': 'D', 'MAR': 'D',
  'HAI': 'C', 'SCO': 'C', 'AUS': 'B', 'TUR': 'B',
  'GER': 'A', 'CUW': 'A', 'NED': 'A', 'JPN': 'A',
  'CIV': 'F', 'ECU': 'F', 'SWE': 'F', 'TUN': 'F',
  'ESP': 'H', 'CPV': 'H', 'BEL': 'H', 'EGY': 'H',
  'KSA': 'H', 'URU': 'H', 'IRN': 'G', 'NZL': 'G',
  'FRA': 'G', 'SEN': 'G', 'IRQ': 'G', 'NOR': 'G',
  'ARG': 'I', 'ALG': 'I', 'AUT': 'I', 'JOR': 'I',
  'POR': 'J', 'COD': 'J', 'ENG': 'J', 'GHA': 'J',
  'PAN': 'J', 'CRO': 'J', 'UZB': 'K', 'COL': 'K',
};

// 阶段映射
function getStage(dateStr) {
  const date = new Date(dateStr);
  if (date < new Date('2026-06-29')) return 'group';
  if (date < new Date('2026-07-04')) return 'round16';
  if (date < new Date('2026-07-07')) return 'quarter';
  if (date < new Date('2026-07-11')) return 'semi';
  return 'final';
}

// 状态映射
function getStatus(statusName, dateStr) {
  if (statusName === 'STATUS_FULL_TIME' || statusName === 'STATUS_FINAL') return 'finished';
  if (statusName === 'STATUS_IN_PROGRESS') return 'inprogress';
  return 'pre';
}

function apiFetch(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Content-Type': 'application/json',
        ...(body ? { 'Prefer': 'return=representation' } : {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('=== 蚂蚁足球 - 真实赛程同步 ===\n');

  // Step 1: 从 ESPN 获取赛程
  console.log('1. 从 ESPN 获取赛程数据...');
  const espnData = await new Promise((resolve, reject) => {
    https.get('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260707', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const events = espnData.events || [];
  console.log(`   ESPN 返回 ${events.length} 场比赛\n`);

  // Step 2: 清理旧数据
  console.log('2. 清理旧的 teams 和 matches 数据...');
  await apiFetch('/rest/v1/matches?select=id', 'DELETE');
  await apiFetch('/rest/v1/teams?select=id', 'DELETE');
  console.log('   已删除旧数据\n');

  // Step 3: 插入真实球队（48队）
  console.log('3. 插入48支真实球队...');
  const teamAbbreviations = Object.keys(TEAM_MAP);
  const teamIds = {};
  for (const abbr of teamAbbreviations) {
    const info = TEAM_MAP[abbr];
    const teamData = {
      name: info.name,
      name_en: info.name_en,
      country_code: abbr,
      msi_score: 7.0 + Math.random() * 2,
      group_letter: info.group,
    };
    const result = await apiFetch('/rest/v1/teams', 'POST', teamData);
    if (result && result[0] && result[0].id) {
      teamIds[abbr] = result[0].id;
    }
  }
  console.log(`   已插入 ${Object.keys(teamIds).length} 支球队\n`);

  // Step 4: 插入真实比赛
  console.log('4. 插入真实比赛赛程...');
  let inserted = 0;
  for (const ev of events) {
    const comp = ev.competitions[0];
    if (!comp) continue;
    const h = comp.competitors?.find(c => c.homeAway === 'home');
    const a = comp.competitors?.find(c => c.homeAway === 'away');
    if (!h || !a) continue;

    const hAbbr = h.team?.abbreviation;
    const aAbbr = a.team?.abbreviation;
    const hId = teamIds[hAbbr];
    const aId = teamIds[aAbbr];
    if (!hId || !aId) {
      console.log(`   跳过: ${hAbbr} vs ${aAbbr} (球队ID不存在)`);
      continue;
    }

    const statusName = comp.status?.type?.name || 'STATUS_SCHEDULED';
    const isFinished = statusName === 'STATUS_FULL_TIME' || statusName === 'STATUS_FINAL';

    const matchData = {
      home_team_id: hId,
      away_team_id: aId,
      match_date: new Date(ev.date).toISOString(),
      status: getStatus(statusName, ev.date),
      home_score: isFinished ? parseInt(h.score) || 0 : null,
      away_score: isFinished ? parseInt(a.score) || 0 : null,
      group_letter: GROUP_LETTERS[hAbbr] || null,
      world_cup_stage: getStage(ev.date),
      stadium: comp.venue?.fullName || '',
      city: comp.venue?.address?.city || '',
    };

    await apiFetch('/rest/v1/matches', 'POST', matchData);
    inserted++;
  }
  console.log(`   已插入 ${inserted} 场比赛\n`);

  // Step 5: 验证
  console.log('5. 验证数据...');
  const matches = await apiFetch('/rest/v1/matches?select=id,match_date,status,home_score,away_score&order=match_date&limit=10');
  const teams = await apiFetch('/rest/v1/teams?select=id,name,country_code&limit=50');
  console.log(`   数据库现有 ${matches.length} 场比赛 (显示前10场)`);
  console.log(`   数据库现有 ${teams.length} 支球队`);

  const statusCounts = {};
  for (const m of matches) {
    statusCounts[m.status] = (statusCounts[m.status] || 0) + 1;
  }
  console.log('   状态分布:', JSON.stringify(statusCounts));

  const finishedMatches = matches.filter(m => m.status === 'finished');
  if (finishedMatches.length > 0) {
    console.log('\n   已完赛比赛:');
    for (const fm of finishedMatches) {
      console.log(`     ${fm.match_date}: ${fm.home_score}-${fm.away_score}`);
    }
  }

  console.log('\n=== 同步完成 ===');
}

main().catch(console.error);