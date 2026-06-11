import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 初始化Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/matches - 获取比赛列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage"); // group_stage/round_of_16等
    const teamId = searchParams.get("teamId"); // 按球队筛选
    const status = searchParams.get("status"); // scheduled/ongoing/finished
    const limit = parseInt(searchParams.get("limit") || "104"); // 2026世界杯共104场
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from("matches")
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*)
      `, { count: "exact" })
      .order("match_date", { ascending: true });
    
    // 筛选条件
    if (stage) {
      query = query.eq("world_cup_stage", stage);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (teamId) {
      query = query.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
    }
    
    // 分页
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/matches - 创建新比赛（管理员功能）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { data, error } = await supabase
      .from("matches")
      .insert([
        {
          match_date: body.match_date,
          world_cup_stage: body.world_cup_stage,
          group_letter: body.group_letter,
          home_team_id: body.home_team_id,
          away_team_id: body.away_team_id,
          stadium: body.stadium,
          city: body.city,
          status: "scheduled",
        },
      ])
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data,
      message: "比赛创建成功",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/matches/:id - 更新比赛结果（管理员功能）
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "缺少比赛ID" },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    const { data, error } = await supabase
      .from("matches")
      .update({
        home_score: body.home_score,
        away_score: body.away_score,
        home_penalties: body.home_penalties,
        away_penalties: body.away_penalties,
        status: body.status || "finished",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data,
      message: "比赛结果更新成功",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
