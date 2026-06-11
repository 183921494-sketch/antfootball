import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 初始化Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/auth/register - 用户注册
 */
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
    
    if (!body.password) {
      return NextResponse.json(
        { error: "密码为必填项" },
        { status: 400 }
      );
    }
    
    if (!body.user_type) {
      return NextResponse.json(
        { error: "用户类型(user_type)为必填项" },
        { status: 400 }
      );
    }
    
    // 检查用户是否已存在
    if (body.email) {
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", body.email)
        .single();
      
      if (existingUser) {
        return NextResponse.json(
          { error: "该邮箱已被注册" },
          { status: 400 }
        );
      }
    }
    
    if (body.phone) {
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("phone", body.phone)
        .single();
      
      if (existingUser) {
        return NextResponse.json(
          { error: "该手机号已被注册" },
          { status: 400 }
        );
      }
    }
    
    // 密码加密（实际项目中应使用bcrypt等）
    const passwordHash = `hashed_${body.password}`; // 简化处理
    
    // 创建用户
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
      message: "注册成功，请等待审核",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/login - 用户登录
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证必填字段
    if (!body.email && !body.phone) {
      return NextResponse.json(
        { error: "邮箱或手机号至少提供一个" },
        { status: 400 }
      );
    }
    
    if (!body.password) {
      return NextResponse.json(
        { error: "密码为必填项" },
        { status: 400 }
      );
    }
    
    // 查找用户
    let query = supabase
      .from("users")
      .select("*");
    
    if (body.email) {
      query = query.eq("email", body.email);
    } else {
      query = query.eq("phone", body.phone);
    }
    
    const { data: user, error } = await query.single();
    
    if (error || !user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      );
    }
    
    // 验证密码（实际项目中应使用bcrypt等）
    const inputPasswordHash = `hashed_${body.password}`;
    if (user.password_hash !== inputPasswordHash) {
      return NextResponse.json(
        { error: "密码错误" },
        { status: 401 }
      );
    }
    
    // 检查账号状态
    if (!user.is_active) {
      return NextResponse.json(
        { error: "账号已被停用，请联系管理员" },
        { status: 403 }
      );
    }
    
    // 更新最后登录时间
    await supabase
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.id);
    
    // 生成token（实际项目中应使用JWT）
    const token = `mock_token_${user.id}_${Date.now()}`;
    
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          user_type: user.user_type,
          company_name: user.company_name,
          contact_person: user.contact_person,
          is_verified: user.is_verified,
          is_active: user.is_active,
        },
        token,
      },
      message: "登录成功",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
