import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partnerType = searchParams.get("userType");
    const isVerified = searchParams.get("isVerified");
    const isActive = searchParams.get("isActive");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("partners")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (partnerType) query = query.eq("partner_type", partnerType);
    if (isVerified !== null) query = query.eq("is_verified", isVerified === "true");
    if (isActive !== null) query = query.eq("is_active", isActive === "true");

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.phone || !body.partner_type) {
      return NextResponse.json(
        { success: false, error: "手机号和合作方类型为必填项" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("partners")
      .insert([
        {
          phone: body.phone,
          password_hash: body.password ? `hashed_${body.password}` : `hashed_${body.phone.slice(-6)}`,
          company_name: body.company_name,
          contact_person: body.contact_person,
          partner_type: body.partner_type,
          city: body.city,
          province: body.province,
          is_verified: false,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, message: "合作方创建成功" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "缺少合作方ID" }, { status: 400 });
    }

    const body = await request.json();
    delete body.id;
    delete body.created_at;

    const { data, error } = await supabase
      .from("partners")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, message: "合作方信息更新成功" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}