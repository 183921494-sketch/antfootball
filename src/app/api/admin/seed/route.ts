import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =============================================
// 48支世界杯参赛球队数据（2026世界杯实际分组参考）
// =============================================
const TEAMS = [
  // A组
  { name: "美国", name_en: "United States", country: "美国", country_code: "US", group_letter: "A", msi_score: 7.20, fifa_ranking: 11, coach_name: "格雷格·贝哈尔特", tactical_formation: "4-3-3", world_cup_appearances: 11, best_world_cup_result: "八强" },
  { name: "加拿大", name_en: "Canada", country: "加拿大", country_code: "CA", group_letter: "A", msi_score: 6.85, fifa_ranking: 35, coach_name: "杰西·马什", tactical_formation: "4-4-2", world_cup_appearances: 2, best_world_cup_result: "小组赛" },
  { name: "墨西哥", name_en: "Mexico", country: "墨西哥", country_code: "MX", group_letter: "A", msi_score: 7.50, fifa_ranking: 12, coach_name: "赫拉多·马蒂诺", tactical_formation: "4-3-3", world_cup_appearances: 17, best_world_cup_result: "八强" },
  { name: "巴拿马", name_en: "Panama", country: "巴拿马", country_code: "PA", group_letter: "A", msi_score: 6.10, fifa_ranking: 37, coach_name: "托马斯·克里斯蒂安森", tactical_formation: "4-4-2", world_cup_appearances: 1, best_world_cup_result: "小组赛" },
  // B组
  { name: "英格兰", name_en: "England", country: "英格兰", country_code: "GB", group_letter: "B", msi_score: 8.75, fifa_ranking: 4, coach_name: "加雷斯·索斯盖特", tactical_formation: "3-4-2-1", world_cup_appearances: 16, best_world_cup_result: "四强" },
  { name: "荷兰", name_en: "Netherlands", country: "荷兰", country_code: "NL", group_letter: "B", msi_score: 8.10, fifa_ranking: 7, coach_name: "罗纳德·科曼", tactical_formation: "4-2-3-1", world_cup_appearances: 11, best_world_cup_result: "亚军" },
  { name: "威尔士", name_en: "Wales", country: "威尔士", country_code: "GBW", group_letter: "B", msi_score: 6.95, fifa_ranking: 26, coach_name: "罗伯特·佩奇", tactical_formation: "3-5-2", world_cup_appearances: 2, best_world_cup_result: "八强" },
  { name: "卡塔尔", name_en: "Qatar", country: "卡塔尔", country_code: "QA", group_letter: "B", msi_score: 6.05, fifa_ranking: 58, coach_name: "希尔贝特·菲利克斯", tactical_formation: "5-3-2", world_cup_appearances: 1, best_world_cup_result: "小组赛" },
  // C组
  { name: "法国", name_en: "France", country: "法国", country_code: "FR", group_letter: "C", msi_score: 8.90, fifa_ranking: 2, coach_name: "迪迪埃·德尚", tactical_formation: "4-3-1-2", world_cup_appearances: 16, best_world_cup_result: "冠军" },
  { name: "波兰", name_en: "Poland", country: "波兰", country_code: "PL", group_letter: "C", msi_score: 6.80, fifa_ranking: 25, coach_name: "米哈乌·普罗比尔兹", tactical_formation: "4-2-3-1", world_cup_appearances: 9, best_world_cup_result: "八强" },
  { name: "瑞士", name_en: "Switzerland", country: "瑞士", country_code: "CH", group_letter: "C", msi_score: 7.40, fifa_ranking: 12, coach_name: "穆拉特·雅金", tactical_formation: "4-2-3-1", world_cup_appearances: 12, best_world_cup_result: "八强" },
  { name: "秘鲁", name_en: "Peru", country: "秘鲁", country_code: "PE", group_letter: "C", msi_score: 6.55, fifa_ranking: 20, coach_name: "乔治·福尔萨", tactical_formation: "4-4-2", world_cup_appearances: 5, best_world_cup_result: "八强" },
  // D组
  { name: "巴西", name_en: "Brazil", country: "巴西", country_code: "BR", group_letter: "D", msi_score: 8.95, fifa_ranking: 3, coach_name: "多里瓦·儒尼奥尔", tactical_formation: "4-3-3", world_cup_appearances: 22, best_world_cup_result: "冠军" },
  { name: "哥伦比亚", name_en: "Colombia", country: "哥伦比亚", country_code: "CO", group_letter: "D", msi_score: 7.60, fifa_ranking: 15, coach_name: "内斯托尔·洛伦特", tactical_formation: "4-3-3", world_cup_appearances: 6, best_world_cup_result: "八强" },
  { name: "日本", name_en: "Japan", country: "日本", country_code: "JP", group_letter: "D", msi_score: 7.45, fifa_ranking: 18, coach_name: "森保一", tactical_formation: "4-2-3-1", world_cup_appearances: 7, best_world_cup_result: "十六强" },
  { name: "智利", name_en: "Chile", country: "智利", country_code: "CL", group_letter: "D", msi_score: 6.60, fifa_ranking: 42, coach_name: "加里卡·梅德尔", tactical_formation: "4-3-3", world_cup_appearances: 9, best_world_cup_result: "八强" },
  // E组
  { name: "阿根廷", name_en: "Argentina", country: "阿根廷", country_code: "AR", group_letter: "E", msi_score: 9.10, fifa_ranking: 1, coach_name: "利昂内尔·斯卡洛尼", tactical_formation: "4-3-1-2", world_cup_appearances: 18, best_world_cup_result: "冠军" },
  { name: "乌拉圭", name_en: "Uruguay", country: "乌拉圭", country_code: "UY", group_letter: "E", msi_score: 8.30, fifa_ranking: 14, coach_name: "迭戈·阿隆索", tactical_formation: "4-3-1-2", world_cup_appearances: 14, best_world_cup_result: "冠军" },
  { name: "韩国", name_en: "South Korea", country: "韩国", country_code: "KR", group_letter: "E", msi_score: 6.95, fifa_ranking: 24, coach_name: "尤尔根·克林斯曼", tactical_formation: "4-2-3-1", world_cup_appearances: 11, best_world_cup_result: "四强" },
  { name: "沙特阿拉伯", name_en: "Saudi Arabia", country: "沙特阿拉伯", country_code: "SA", group_letter: "E", msi_score: 6.25, fifa_ranking: 49, coach_name: "罗伯特·马丁内斯", tactical_formation: "4-1-4-1", world_cup_appearances: 6, best_world_cup_result: "十六强" },
  // F组
  { name: "德国", name_en: "Germany", country: "德国", country_code: "DE", group_letter: "F", msi_score: 8.45, fifa_ranking: 16, coach_name: "朱利安·纳格尔斯曼", tactical_formation: "4-2-3-1", world_cup_appearances: 20, best_world_cup_result: "冠军" },
  { name: "比利时", name_en: "Belgium", country: "比利时", country_code: "BE", group_letter: "F", msi_score: 7.75, fifa_ranking: 6, coach_name: "多米尼克·特德斯科", tactical_formation: "4-2-3-1", world_cup_appearances: 14, best_world_cup_result: "四强" },
  { name: "塞尔维亚", name_en: "Serbia", country: "塞尔维亚", country_code: "RS", group_letter: "F", msi_score: 7.15, fifa_ranking: 21, coach_name: "Dragan Stojković", tactical_formation: "3-4-1-2", world_cup_appearances: 4, best_world_cup_result: "小组赛" },
  { name: "尼日利亚", name_en: "Nigeria", country: "尼日利亚", country_code: "NG", group_letter: "F", msi_score: 6.50, fifa_ranking: 28, coach_name: "芬蒂·韦斯特", tactical_formation: "4-3-3", world_cup_appearances: 6, best_world_cup_result: "十六强" },
  // G组
  { name: "西班牙", name_en: "Spain", country: "西班牙", country_code: "ES", group_letter: "G", msi_score: 8.65, fifa_ranking: 8, coach_name: "路易斯·德拉富恩特", tactical_formation: "4-3-3", world_cup_appearances: 16, best_world_cup_result: "冠军" },
  { name: "葡萄牙", name_en: "Portugal", country: "葡萄牙", country_code: "PT", group_letter: "G", msi_score: 8.40, fifa_ranking: 9, coach_name: "罗伯托·马丁内斯", tactical_formation: "4-2-3-1", world_cup_appearances: 8, best_world_cup_result: "四强" },
  { name: "摩洛哥", name_en: "Morocco", country: "摩洛哥", country_code: "MA", group_letter: "G", msi_score: 7.55, fifa_ranking: 13, coach_name: "瓦利德·雷格拉吉", tactical_formation: "4-1-4-1", world_cup_appearances: 6, best_world_cup_result: "四强" },
  { name: "加纳", name_en: "Ghana", country: "加纳", country_code: "GH", group_letter: "G", msi_score: 6.30, fifa_ranking: 60, coach_name: "克雷蒂奇·希波什", tactical_formation: "4-2-3-1", world_cup_appearances: 4, best_world_cup_result: "八强" },
  // H组
  { name: "意大利", name_en: "Italy", country: "意大利", country_code: "IT", group_letter: "H", msi_score: 8.00, fifa_ranking: 10, coach_name: "卢西亚诺·斯帕莱蒂", tactical_formation: "3-5-2", world_cup_appearances: 18, best_world_cup_result: "冠军" },
  { name: "克罗地亚", name_en: "Croatia", country: "克罗地亚", country_code: "HR", group_letter: "H", msi_score: 7.70, fifa_ranking: 5, coach_name: "兹拉特科·达利奇", tactical_formation: "4-1-4-1", world_cup_appearances: 5, best_world_cup_result: "亚军" },
  { name: "丹麦", name_en: "Denmark", country: "丹麦", country_code: "DK", group_letter: "H", msi_score: 7.25, fifa_ranking: 19, coach_name: "卡斯帕·许尔勒曼", tactical_formation: "4-3-3", world_cup_appearances: 6, best_world_cup_result: "八强" },
  { name: "突尼斯", name_en: "Tunisia", country: "突尼斯", country_code: "TN", group_letter: "H", msi_score: 5.90, fifa_ranking: 41, coach_name: "卡里姆·霍扎尼", tactical_formation: "4-3-3", world_cup_appearances: 6, best_world_cup_result: "小组赛" },
  // I组（补充后16队）
  { name: "澳大利亚", name_en: "Australia", country: "澳大利亚", country_code: "AU", group_letter: "I", msi_score: 6.40, fifa_ranking: 23, coach_name: "格雷厄姆·阿诺德", tactical_formation: "4-4-2", world_cup_appearances: 6, best_world_cup_result: "十六强" },
  { name: "伊朗", name_en: "Iran", country: "伊朗", country_code: "IR", group_letter: "I", msi_score: 6.55, fifa_ranking: 21, coach_name: "阿米尔·加莱西", tactical_formation: "4-1-4-1", world_cup_appearances: 6, best_world_cup_result: "小组赛" },
  { name: "塞内加尔", name_en: "Senegal", country: "塞内加尔", country_code: "SN", group_letter: "I", msi_score: 7.00, fifa_ranking: 17, coach_name: "阿利乌·西塞", tactical_formation: "4-3-3", world_cup_appearances: 3, best_world_cup_result: "八强" },
  { name: "阿尔及利亚", name_en: "Algeria", country: "阿尔及利亚", country_code: "DZ", group_letter: "I", msi_score: 6.45, fifa_ranking: 32, coach_name: "弗拉基米尔·佩特科维奇", tactical_formation: "4-4-2", world_cup_appearances: 4, best_world_cup_result: "小组赛" },
  // J组
  { name: "厄瓜多尔", name_en: "Ecuador", country: "厄瓜多尔", country_code: "EC", group_letter: "J", msi_score: 6.70, fifa_ranking: 30, coach_name: "费利佩·桑布拉诺", tactical_formation: "4-4-2", world_cup_appearances: 4, best_world_cup_result: "小组赛" },
  { name: "瑞典", name_en: "Sweden", country: "瑞典", country_code: "SE", group_letter: "J", msi_score: 6.90, fifa_ranking: 22, coach_name: "雅恩·尼尔森", tactical_formation: "4-3-3", world_cup_appearances: 12, best_world_cup_result: "亚军" },
  { name: "喀麦隆", name_en: "Cameroon", country: "喀麦隆", country_code: "CM", group_letter: "J", msi_score: 6.20, fifa_ranking: 50, coach_name: "里戈伯特·宋", tactical_formation: "4-4-2", world_cup_appearances: 8, best_world_cup_result: "八强" },
  { name: "新西兰", name_en: "New Zealand", country: "新西兰", country_code: "NZ", group_letter: "J", msi_score: 5.50, fifa_ranking: 26, coach_name: "达里尔·巴泽尔", tactical_formation: "4-2-3-1", world_cup_appearances: 2, best_world_cup_result: "小组赛" },
  // K组
  { name: "哥斯达黎加", name_en: "Costa Rica", country: "哥斯达黎加", country_code: "CR", group_letter: "K", msi_score: 6.15, fifa_ranking: 52, coach_name: "沃尔特·本托", tactical_formation: "5-4-1", world_cup_appearances: 5, best_world_cup_result: "八强" },
  { name: "埃及", name_en: "Egypt", country: "埃及", country_code: "EG", group_letter: "K", msi_score: 6.65, fifa_ranking: 36, coach_name: "鲁伊·维多利亚", tactical_formation: "4-2-3-1", world_cup_appearances: 3, best_world_cup_result: "小组赛" },
  { name: "摩纳哥", name_en: "Monaco", country: "牙买加", country_code: "JM", group_letter: "K", msi_score: 5.80, fifa_ranking: 63, coach_name: "黑利·贾勒特", tactical_formation: "4-4-2", world_cup_appearances: 1, best_world_cup_result: "小组赛" },
  { name: "洪都拉斯", name_en: "Honduras", country: "洪都拉斯", country_code: "HN", group_letter: "K", msi_score: 5.65, fifa_ranking: 74, coach_name: "赫拉多·埃斯帕兰萨", tactical_formation: "4-4-2", world_cup_appearances: 3, best_world_cup_result: "小组赛" },
  // L组
  { name: "土耳其", name_en: "Turkey", country: "土耳其", country_code: "TR", group_letter: "L", msi_score: 7.30, fifa_ranking: 15, coach_name: "文森特·阿布西亚尔", tactical_formation: "4-2-3-1", world_cup_appearances: 5, best_world_cup_result: "四强" },
  { name: "奥地利", name_en: "Austria", country: "奥地利", country_code: "AT", group_letter: "L", msi_score: 6.75, fifa_ranking: 27, coach_name: "拉尔夫·朗尼克", tactical_formation: "4-2-3-1", world_cup_appearances: 7, best_world_cup_result: "小组赛" },
  { name: "苏格兰", name_en: "Scotland", country: "苏格兰", country_code: "SCT", group_letter: "L", msi_score: 6.35, fifa_ranking: 33, coach_name: "史蒂夫·克拉克", tactical_formation: "3-5-2", world_cup_appearances: 8, best_world_cup_result: "小组赛" },
  { name: "匈牙利", name_en: "Hungary", country: "匈牙利", country_code: "HU", group_letter: "L", msi_score: 6.45, fifa_ranking: 26, coach_name: "马尔科·罗西", tactical_formation: "3-4-3", world_cup_appearances: 9, best_world_cup_result: "亚军" },
];

// =============================================
// 生成小组赛赛程（72场，每组6场）
// =============================================
function generateGroupMatches(
  teamIds: string[],
  groupLetter: string,
  baseDate: Date
): Array<{
  match_date: string;
  world_cup_stage: string;
  group_letter: string;
  home_team_id: string;
  away_team_id: string;
  stadium: string;
  city: string;
  status: string;
}> {
  const matches: Array<{
    match_date: string;
    world_cup_stage: string;
    group_letter: string;
    home_team_id: string;
    away_team_id: string;
    stadium: string;
    city: string;
    status: string;
  }> = [];

  // 每组4队，共6场比赛（每队对其他3队各一场）
  const combinations = [
    [0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2],
  ];

  const stadiums = [
    "卢赛尔体育场", "974体育场", "阿图玛玛体育场",
    "教育城体育场", "海湾体育场", "阿尔贝特体育场",
  ];
  const cities = [
    "卢赛尔", "多哈", "阿尔科尔",
    "阿尔赖扬", "阿尔瓦克拉", "豪尔",
  ];

  combinations.forEach(([a, b], i) => {
    const matchDate = new Date(baseDate);
    matchDate.setDate(matchDate.getDate() + Math.floor(i / 3));
    matchDate.setHours(18 + (i % 3) * 3, 0, 0, 0);

    matches.push({
      match_date: matchDate.toISOString(),
      world_cup_stage: "group_stage",
      group_letter: groupLetter,
      home_team_id: teamIds[a],
      away_team_id: teamIds[b],
      stadium: stadiums[i % stadiums.length],
      city: cities[i % cities.length],
      status: "scheduled",
    });
  });

  return matches;
}

// =============================================
// 生成淘汰赛赛程（32场）
// =============================================
function generateKnockoutMatches(
  teamIdsByGroup: Record<string, string[]>,
  baseDate: Date
): Array<{
  match_date: string;
  world_cup_stage: string;
  group_letter: null;
  home_team_id: string;
  away_team_id: string;
  stadium: string;
  city: string;
  status: string;
}> {
  const matches: Array<{
    match_date: string;
    world_cup_stage: string;
    group_letter: null;
    home_team_id: string;
    away_team_id: string;
    stadium: string;
    city: string;
    status: string;
  }> = [];

  // 16场1/8决赛（以各组第1名vs另组第2名为例）
  const roundOf16Stages = [
    { home: "A1", away: "B2", stage: "round_of_16" },
    { home: "C1", away: "D2", stage: "round_of_16" },
    { home: "E1", away: "F2", stage: "round_of_16" },
    { home: "G1", away: "H2", stage: "round_of_16" },
    { home: "B1", away: "A2", stage: "round_of_16" },
    { home: "D1", away: "C2", stage: "round_of_16" },
    { home: "F1", away: "E2", stage: "round_of_16" },
    { home: "H1", away: "G2", stage: "round_of_16" },
    { home: "I1", away: "J2", stage: "round_of_16" },
    { home: "K1", away: "L2", stage: "round_of_16" },
    { home: "J1", away: "I2", stage: "round_of_16" },
    { home: "L1", away: "K2", stage: "round_of_16" },
  ];

  const groupOrder = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

  roundOf16Stages.forEach((match, i) => {
    const matchDate = new Date(baseDate);
    matchDate.setDate(matchDate.getDate() + i);
    matchDate.setHours(18, 0, 0, 0);

    const homeGroup = match.home[0];
    const awayGroup = match.away[0];
    const homePos = parseInt(match.home[1]) - 1;
    const awayPos = parseInt(match.away[1]) - 1;

    const homeIds = teamIdsByGroup[homeGroup] || [];
    const awayIds = teamIdsByGroup[awayGroup] || [];

    matches.push({
      match_date: matchDate.toISOString(),
      world_cup_stage: match.stage,
      group_letter: null,
      home_team_id: homeIds[homePos] || homeIds[0] || "",
      away_team_id: awayIds[awayPos] || awayIds[0] || "",
      stadium: "卢赛尔体育场",
      city: "卢赛尔",
      status: "scheduled",
    });
  });

  // 8场1/4决赛
  for (let i = 0; i < 8; i++) {
    const matchDate = new Date(baseDate);
    matchDate.setDate(matchDate.getDate() + 12 + i);
    matchDate.setHours(18, 0, 0, 0);
    matches.push({
      match_date: matchDate.toISOString(),
      world_cup_stage: "quarter_final",
      group_letter: null,
      home_team_id: null as unknown as string,
      away_team_id: null as unknown as string,
      stadium: "卢赛尔体育场",
      city: "卢赛尔",
      status: "scheduled",
    });
  }

  // 4场半决赛
  for (let i = 0; i < 4; i++) {
    const matchDate = new Date(baseDate);
    matchDate.setDate(matchDate.getDate() + 20 + i);
    matchDate.setHours(20, 0, 0, 0);
    matches.push({
      match_date: matchDate.toISOString(),
      world_cup_stage: "semi_final",
      group_letter: null,
      home_team_id: null as unknown as string,
      away_team_id: null as unknown as string,
      stadium: "卢赛尔体育场",
      city: "卢赛尔",
      status: "scheduled",
    });
  }

  // 2场三四名决赛
  const thirdDate = new Date(baseDate);
  thirdDate.setDate(thirdDate.getDate() + 24);
  matches.push({
    match_date: thirdDate.toISOString(),
    world_cup_stage: "third_place",
    group_letter: null,
    home_team_id: null as unknown as string,
    away_team_id: null as unknown as string,
    stadium: "阿图玛玛体育场",
    city: "多哈",
    status: "scheduled",
  });

  // 1场决赛
  const finalDate = new Date(baseDate);
  finalDate.setDate(finalDate.getDate() + 25);
  finalDate.setHours(20, 0, 0, 0);
  matches.push({
    match_date: finalDate.toISOString(),
    world_cup_stage: "final",
    group_letter: null,
    home_team_id: null as unknown as string,
    away_team_id: null as unknown as string,
    stadium: "卢赛尔体育场",
    city: "卢赛尔",
    status: "scheduled",
  });

  return matches;
}

// =============================================
// 管理员种子数据
// =============================================
const ADMINS = [
  { email: "admin@antfootball.com", password_hash: "hashed_NF2026admin", name: "超级管理员", role: "admin" },
  { email: "operator@antfootball.com", password_hash: "hashed_NF2026op", name: "运营人员", role: "operator" },
];

// =============================================
// 合作方种子数据
// =============================================
const PARTNERS = [
  // 彩票店
  { phone: "13800138001", password_hash: "hashed_380001", company_name: "北京朝阳彩票站", contact_person: "张伟", partner_type: "lottery_shop", city: "北京", province: "北京", is_verified: true },
  { phone: "13800138002", password_hash: "hashed_380002", company_name: "上海浦东体育彩票", contact_person: "李娜", partner_type: "lottery_shop", city: "上海", province: "上海", is_verified: true },
  { phone: "13800138003", password_hash: "hashed_380003", company_name: "广州天河足球彩票店", contact_person: "王强", partner_type: "lottery_shop", city: "广州", province: "广东", is_verified: true },
  { phone: "13800138004", password_hash: "hashed_380004", company_name: "深圳福田体育彩票", contact_person: "陈静", partner_type: "lottery_shop", city: "深圳", province: "广东", is_verified: true },
  { phone: "13800138005", password_hash: "hashed_380005", company_name: "成都武侯彩票中心", contact_person: "刘洋", partner_type: "lottery_shop", city: "成都", province: "四川", is_verified: true },
  // 线上平台
  { phone: "13900139001", password_hash: "hashed_390001", company_name: "竞猜赢家体育", contact_person: "赵磊", partner_type: "platform", city: "杭州", province: "浙江", is_verified: true },
  { phone: "13900139002", password_hash: "hashed_390002", company_name: "足球大数据平台", contact_person: "周婷", partner_type: "platform", city: "深圳", province: "广东", is_verified: true },
  { phone: "13900139003", password_hash: "hashed_390003", company_name: "预测专家网", contact_person: "吴昊", partner_type: "platform", city: "南京", province: "江苏", is_verified: true },
  { phone: "13900139004", password_hash: "hashed_390004", company_name: "赛事分析云", contact_person: "郑丽", partner_type: "platform", city: "成都", province: "四川", is_verified: true },
  { phone: "13900139005", password_hash: "hashed_390005", company_name: "智能体育预测", contact_person: "孙鹏", partner_type: "platform", city: "武汉", province: "湖北", is_verified: true },
];

// =============================================
// 系统配置种子数据
// =============================================
const SYSTEM_CONFIGS = [
  { config_key: "commission_rate_lottery_low", config_value: "0.10", description: "彩票店低档佣金比例（1万以内）" },
  { config_key: "commission_rate_lottery_mid", config_value: "0.08", description: "彩票店中档佣金比例（1-3万）" },
  { config_key: "commission_rate_lottery_high", config_value: "0.06", description: "彩票店高档佣金比例（3万以上）" },
  { config_key: "commission_rate_platform_low", config_value: "0.15", description: "平台低档佣金比例（5万以内）" },
  { config_key: "commission_rate_platform_mid", config_value: "0.12", description: "平台中档佣金比例（5-15万）" },
  { config_key: "commission_rate_platform_high", config_value: "0.10", description: "平台高档佣金比例（15万以上）" },
  { config_key: "msi_weight_roster_depth", config_value: "0.25", description: "MSI阵容深度权重" },
  { config_key: "msi_weight_tactical_system", config_value: "0.25", description: "MSI战术体系权重" },
  { config_key: "msi_weight_key_player", config_value: "0.20", description: "MSI关键球员权重" },
  { config_key: "msi_weight_coach_decision", config_value: "0.15", description: "MSI教练决策权重" },
  { config_key: "msi_weight_matchup_data", config_value: "0.10", description: "MSI对阵数据权重" },
  { config_key: "msi_weight_mental_resilience", config_value: "0.05", description: "MSI心理意志权重" },
];

export async function POST() {
  try {
    // 1. 插入球队数据
    const { data: insertedTeams, error: teamsError } = await supabase
      .from("teams")
      .insert(TEAMS)
      .select("id, group_letter");

    if (teamsError) {
      return NextResponse.json(
        { success: false, error: "球队插入失败", details: teamsError.message },
        { status: 500 }
      );
    }

    // 按组别整理球队ID
    const teamIdsByGroup: Record<string, string[]> = {};
    for (const team of insertedTeams!) {
      if (!teamIdsByGroup[team.group_letter]) {
        teamIdsByGroup[team.group_letter] = [];
      }
      teamIdsByGroup[team.group_letter].push(team.id);
    }

    // 2. 生成并插入小组赛（12组 × 6场 = 72场）
    const groupMatches: Array<{
      match_date: string;
      world_cup_stage: string;
      group_letter: string;
      home_team_id: string;
      away_team_id: string;
      stadium: string;
      city: string;
      status: string;
    }> = [];

    const baseDate = new Date("2026-06-11T12:00:00Z");

    for (const groupLetter of Object.keys(teamIdsByGroup)) {
      const teamIds = teamIdsByGroup[groupLetter];
      if (teamIds.length === 4) {
        const groupMatchesList = generateGroupMatches(teamIds, groupLetter, baseDate);
        groupMatches.push(...groupMatchesList);
      }
    }

    const { error: groupMatchError } = await supabase
      .from("matches")
      .insert(groupMatches);

    if (groupMatchError) {
      return NextResponse.json(
        { success: false, error: "小组赛插入失败", details: groupMatchError.message },
        { status: 500 }
      );
    }

    // 3. 生成并插入淘汰赛（25场）
    const knockoutMatches = generateKnockoutMatches(teamIdsByGroup, baseDate);

    const { error: knockoutError } = await supabase
      .from("matches")
      .insert(knockoutMatches);

    if (knockoutError) {
      return NextResponse.json(
        { success: false, error: "淘汰赛插入失败", details: knockoutError.message },
        { status: 500 }
      );
    }

    // 4. 插入管理员
    const { error: adminError } = await supabase
      .from("admins")
      .insert(ADMINS);

    if (adminError) {
      console.warn("管理员插入失败（可能已存在）:", adminError.message);
    }

    // 5. 插入合作方
    const { error: partnerError } = await supabase
      .from("partners")
      .insert(PARTNERS);

    if (partnerError) {
      console.warn("合作方插入失败（可能已存在）:", partnerError.message);
    }

    // 6. 插入系统配置
    const { error: configError } = await supabase
      .from("system_config")
      .insert(SYSTEM_CONFIGS);

    if (configError) {
      console.warn("系统配置插入失败（可能已存在）:", configError.message);
    }

    return NextResponse.json({
      success: true,
      message: "种子数据插入完成",
      summary: {
        teams: insertedTeams?.length || 0,
        groupMatches: groupMatches.length,
        knockoutMatches: knockoutMatches.length,
        admins: ADMINS.length,
        partners: PARTNERS.length,
        configs: SYSTEM_CONFIGS.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "种子数据插入失败", details: error.message },
      { status: 500 }
    );
  }
}