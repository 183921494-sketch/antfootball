import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const partnerId = request.headers.get("x-partner-id");
    if (!partnerId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("partner_reports")
      .select(`
        *,
        report:analysis_reports(
          *,
          match:matches(
            match_date,
            home_team:teams!matches_home_team_id_fkey(name),
            away_team:teams!matches_away_team_id_fkey(name)
          )
        )
      `, { count: "exact" })
      .eq("partner_id", partnerId)
      .order("sent_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, pagination: { total: data?.length || 0 } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}