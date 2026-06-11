import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { phone, password } = await request.json();

    if (!phone || !password) {
      return NextResponse.json(
        { success: false, error: "手机号和密码不能为空" },
        { status: 400 }
      );
    }

    const { data: partner, error } = await supabase
      .from("partners")
      .select("*")
      .eq("phone", phone)
      .single();

    if (error || !partner) {
      return NextResponse.json(
        { success: false, error: "合作方账号不存在" },
        { status: 404 }
      );
    }

    const inputHash = `hashed_${password}`;
    if (partner.password_hash !== inputHash) {
      return NextResponse.json(
        { success: false, error: "密码错误" },
        { status: 401 }
      );
    }

    if (!partner.is_active) {
      return NextResponse.json(
        { success: false, error: "账号已被停用，请联系管理员" },
        { status: 403 }
      );
    }

    await supabase
      .from("partners")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", partner.id);

    const token = `partner_${partner.id}_${Date.now()}`;

    return NextResponse.json({
      success: true,
      token,
      partner: {
        id: partner.id,
        phone: partner.phone,
        company_name: partner.company_name,
        contact_person: partner.contact_person,
        partner_type: partner.partner_type,
        is_verified: partner.is_verified,
      },
      message: "登录成功",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}