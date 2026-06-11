import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 初始化Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/teams - 获取球队列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country");
    const group = searchParams.get("group");
    const limit = parseInt(searchParams.get("limit") || "48");
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from("teams")
      .select("*", { count: "exact" })
      .order("msi_score", { ascending: false });
    
    // 筛选条件
    if (country) {
      query = query.eq("country", country);
    }
    if (group) {
      query = query.eq("group_letter", group);
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

// POST /api/teams - 创建新球队（管理员功能）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { data, error } = await supabase
      .from("teams")
      .insert([
        {
          name: body.name,
          name_en: body.name_en,
          country: body.country,
          country_code: body.country_code,
          group_letter: body.group_letter,
          msi_score: body.msi_score,
          fifa_ranking: body.fifa_ranking,
          coach_name: body.coach_name,
          tactical_formation: body.tactical_formation,
          world_cup_appearances: body.world_cup_appearances,
          best_world_cup_result: body.best_world_cup_result,
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
      message: "球队创建成功",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
