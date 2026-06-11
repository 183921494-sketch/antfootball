import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 初始化Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/users - 获取用户/合作方列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userType = searchParams.get("userType"); // lottery_shop/platform/admin
    const isVerified = searchParams.get("isVerified"); // true/false
    const isActive = searchParams.get("isActive"); // true/false
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from("users")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });
    
    // 筛选条件
    if (userType) {
      query = query.eq("user_type", userType);
    }
    if (isVerified !== null) {
      query = query.eq("is_verified", isVerified === "true");
    }
    if (isActive !== null) {
      query = query.eq("is_active", isActive === "true");
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

// POST /api/users - 创建新用户/合作方
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证必填字段
    if (!body.email && !body.phone) {
      return NextResponse.json(
        { error: "邮箱或手机号至少提供一个" },
        { status: 400 }
      );
    }
    
    if (!body.user_type) {
      return NextResponse.json(
        { error: "用户类型(user_type)为必填项" },
        { status: 400 }
      );
    }
    
    // 密码加密（实际项目中应使用bcrypt等）
    const passwordHash = body.password ? `hashed_${body.password}` : null; // 简化处理
    
    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          email: body.email,
          phone: body.phone,
          password_hash: passwordHash,
          user_type: body.user_type,
          company_name: body.company_name,
          contact_person: body.contact_person,
          business_license: body.business_license,
          address: body.address,
          city: body.city,
          province: body.province,
          is_verified: false,
          is_active: true,
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
      message: "用户创建成功",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/users/:id - 更新用户信息
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "缺少用户ID" },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // 不允许更新的字段
    delete body.id;
    delete body.created_at;
    
    const { data, error } = await supabase
      .from("users")
      .update({
        ...body,
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
      message: "用户信息更新成功",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/users/:id - 删除用户（软删除，设置is_active=false）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "缺少用户ID" },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from("users")
      .update({
        is_active: false,
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
      message: "用户已停用",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
