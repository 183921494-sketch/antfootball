/**
 * ESPN API 客户端 - 2026世界杯实时数据
 * 
 * 数据源：site.api.espn.com (免费、无需认证)
 * 刷新策略：服务端缓存60秒，客户端每次访问刷新
 */

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";

export interface ESPNTeam {
  id: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  name: string;
  color: string;
  alternateColor: string;
  logo: string;
  isActive: boolean;
}

export interface ESPNTeamStat {
  name: string;
  abbreviation: string;
  displayValue: string;
}

export interface ESPNCompetitor {
  id: string;
  homeAway: "home" | "away";
  winner: boolean;
  score: string;
  form: string;
  team: ESPNTeam;
  statistics: ESPNTeamStat[];
  records: { name: string; type: string; summary: string }[];
}

export interface ESPNMatch {
  id: string;
  uid: string;
  date: string;
  name: string;
  shortName: string;
  status: {
    clock: number;
    displayClock: string;
    period: number;
    type: {
      id: string;
      name: string;
      state: string;
      completed: boolean;
      description: string;
      detail: string;
    };
  };
  competitions: {
    id: string;
    date: string;
    attendance: number;
    venue: {
      id: string;
      fullName: string;
      address: { city: string; country: string };
    };
    competitors: ESPNCompetitor[];
    broadcast: string;
    odds?: any;
    playByPlayAvailable?: boolean;
    playByPlayAthletes?: any;
    situation?: any;
    details?: any[];
  }[];
  season: {
    year: number;
    type: number;
    slug: string;
  };
}

export interface ESPNGroupStageInfo {
  id: string;
  name: string;
  abbreviation: string;
  season: {
    year: number;
    type: {
      id: string;
      name: string;
      abbreviation: string;
    };
  };
}

// 缓存层
let cachedMatches: { data: ESPNMatch[]; timestamp: number } | null = null;
const CACHE_TTL = 60_000; // 60秒

/**
 * 获取比赛列表（带缓存）
 */
export async function fetchMatches(dateRange?: string): Promise<ESPNMatch[]> {
  const now = Date.now();
  if (cachedMatches && now - cachedMatches.timestamp < CACHE_TTL) {
    return cachedMatches.data;
  }

  const range = dateRange || "20260611-20260801";
  const url = `${ESPN_BASE}/scoreboard?dates=${range}`;

  const res = await fetch(url, {
    next: { revalidate: 60 },
    headers: { "User-Agent": "AntFootball/1.0" },
  });

  if (!res.ok) {
    throw new Error(`ESPN API error: ${res.status}`);
  }

  const data = await res.json();
  const matches: ESPNMatch[] = data.events || [];

  cachedMatches = { data: matches, timestamp: now };
  return matches;
}

/**
 * 获取单场比赛详情
 */
export async function fetchMatchDetail(matchId: string): Promise<ESPNMatch | null> {
  const matches = await fetchMatches();
  return matches.find((m) => m.id === matchId) || null;
}

/**
 * 获取今日比赛
 */
export async function fetchTodayMatches(): Promise<ESPNMatch[]> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const url = `${ESPN_BASE}/scoreboard?dates=${dateStr}`;

  const res = await fetch(url, {
    next: { revalidate: 30 },
    headers: { "User-Agent": "AntFootball/1.0" },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.events || [];
}

/**
 * 解析比赛状态
 */
export function parseMatchStatus(match: ESPNMatch): "upcoming" | "live" | "finished" {
  const state = match.status?.type?.state;
  if (state === "pre") return "upcoming";
  if (state === "in") return "live";
  if (state === "post") return "finished";
  return "upcoming";
}

/**
 * 解析比分
 */
export function parseScore(match: ESPNMatch): {
  home: string;
  away: string;
  homeTeam: string;
  awayTeam: string;
  homeAbbrev: string;
  awayAbbrev: string;
} {
  const comp = match.competitions?.[0];
  const home = comp?.competitors?.find((c) => c.homeAway === "home");
  const away = comp?.competitors?.find((c) => c.homeAway === "away");

  return {
    home: home?.score || "0",
    away: away?.score || "0",
    homeTeam: home?.team?.displayName || "TBD",
    awayTeam: away?.team?.displayName || "TBD",
    homeAbbrev: home?.team?.abbreviation || "TBD",
    awayAbbrev: away?.team?.abbreviation || "TBD",
  };
}

/**
 * 解析技术统计
 */
export function parseTeamStats(competitor: ESPNCompetitor): Record<string, string> {
  const stats: Record<string, string> = {};
  if (competitor.statistics) {
    for (const s of competitor.statistics) {
      stats[s.abbreviation] = s.displayValue;
    }
  }
  return stats;
}

/**
 * 格式化比赛时间
 */
export function formatMatchDate(dateStr: string, timezone: string = "Asia/Shanghai"): {
  date: string;
  time: string;
  full: string;
} {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("zh-CN", { timeZone: timezone, month: "numeric", day: "numeric" });
  const time = d.toLocaleTimeString("zh-CN", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false });
  return { date, time, full: `${date} ${time}` };
}

/**
 * 获取赛事阶段中文名
 */
export function getStageLabel(slug: string): string {
  const labels: Record<string, string> = {
    "group-stage": "小组赛",
    "round-of-32": "32强",
    "round-of-16": "16强",
    "quarterfinals": "1/4决赛",
    "semifinals": "半决赛",
    "3rd-place-match": "季军赛",
    "final": "决赛",
  };
  return labels[slug] || slug;
}
