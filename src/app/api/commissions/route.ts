import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 初始化Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/commissions - 获取佣金结算记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status"); // pending/paid/disputed
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from("commissions")
      .select(`
        *,
        user:users(
          id,
          company_name,
          contact_person,
          user_type,
          phone,
          email
        )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });
    
    // 筛选条件
    if (userId) {
      query = query.eq("user_id", userId);
    }
    if (status) {
      query = query.eq("status", status);
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

// POST /api/commissions - 创建佣金结算记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证必填字段
    if (!body.user_id || !body.revenue_base || !body.commission_rate) {
      return NextResponse.json(
        { error: "缺少必填字段：user_id, revenue_base, commission_rate" },
        { status: 400 }
      );
    }
    
    // 计算佣金金额
    const commissionAmount = body.revenue_base * body.commission_rate;
    
    const { data, error } = await supabase
      .from("commissions")
      .insert([
        {
          user_id: body.user_id,
          settlement_period: body.settlement_period || "2026-世界杯",
          revenue_base: body.revenue_base,
          commission_rate: body.commission_rate,
          commission_amount: commissionAmount,
          status: "pending",
          notes: body.notes,
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
      message: "佣金结算记录创建成功",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/commissions/:id - 更新佣金结算状态
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "缺少佣金记录ID" },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // 如果状态改为paid，自动设置paid_at
    const updateData = {
      ...body,
      updated_at: new Date().toISOString(),
    };
    
    if (body.status === "paid" && !body.paid_at) {
      updateData.paid_at = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from("commissions")
      .update(updateData)
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
      message: "佣金结算状态更新成功",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// 辅助函数：根据增量收益自动计算佣金比例
function calculateCommissionRate(
  revenueBase: number,
  userType: "lottery" | "platform"
): number {
  if (userType === "lottery") {
    // 彩票店分佣规则
    if (revenueBase <= 10000) return 0.10;   // 1万以内 10%
    if (revenueBase <= 30000) return 0.08;   // 1-3万 8%
    return 0.06;                               // 3万以上 6%
  } else {
    // 线上平台分佣规则
    if (revenueBase <= 50000) return 0.15;   // 5万以内 15%
    if (revenueBase <= 150000) return 0.12;  // 5-15万 12%
    return 0.10;                              // 15万以上 10%
  }
}
