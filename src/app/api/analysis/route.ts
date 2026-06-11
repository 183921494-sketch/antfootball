import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  generateMatchAnalysisReport,
  type TeamSixDimensionalAnalysis,
} from "@/lib/analysis-model";

// 初始化Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AnalysisReportRequest {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  reportType?: "pre_match" | "live" | "post_match";
  isFinal?: boolean;
}

/**
 * GET /api/analysis - 获取分析报告列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get("matchId");
    const reportType = searchParams.get("reportType");
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("analysis_reports")
      .select(
        `
        *,
        match:matches(
          *,
          home_team:teams!matches_home_team_id_fkey(name, country),
          away_team:teams!matches_away_team_id_fkey(name, country)
        )
      `,
        { count: "exact" }
      )
      .order("generated_at", { ascending: false });

    // 筛选条件
    if (matchId) {
      query = query.eq("match_id", matchId);
    }
    if (reportType) {
      query = query.eq("report_type", reportType);
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

/**
 * POST /api/analysis - 生成新分析报告
 */
export async function POST(request: NextRequest) {
  try {
    const body: AnalysisReportRequest = await request.json();

    // 验证必填字段
    if (!body.matchId || !body.homeTeamId || !body.awayTeamId) {
      return NextResponse.json(
        { error: "缺少必填字段：matchId, homeTeamId, awayTeamId" },
        { status: 400 }
      );
    }

    // 生成六维分析报告
    const analysisResult = await generateMatchAnalysisReport(
      body.homeTeamId,
      body.awayTeamId
    );

    // 准备插入数据库的数据
    const reportData = {
      match_id: body.matchId,
      report_type: body.reportType || "pre_match",
      version: 1,
      home_team_msi: analysisResult.homeAnalysis.msiScore,
      away_team_msi: analysisResult.awayAnalysis.msiScore,
      home_win_probability: analysisResult.matchPrediction.homeWinProbability,
      draw_probability: analysisResult.matchPrediction.drawProbability,
      away_win_probability: analysisResult.matchPrediction.awayWinProbability,
      expected_goals: analysisResult.matchPrediction.expectedTotalGoals,
      confidence_level: analysisResult.matchPrediction.confidenceLevel,
      key_insights: analysisResult.keyInsights.join("\n"),
      risk_factors: [
        ...analysisResult.homeAnalysis.riskFactors,
        ...analysisResult.awayAnalysis.riskFactors,
      ].join("\n"),
      opportunity_factors: [
        ...analysisResult.homeAnalysis.opportunityFactors,
        ...analysisResult.awayAnalysis.opportunityFactors,
      ].join("\n"),
      is_final: body.isFinal || false,
    };

    // 插入数据库
    const { data, error } = await supabase
      .from("analysis_reports")
      .insert([reportData])
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
      analysisDetails: {
        homeAnalysis: analysisResult.homeAnalysis,
        awayAnalysis: analysisResult.awayAnalysis,
        matchPrediction: analysisResult.matchPrediction,
        keyInsights: analysisResult.keyInsights,
      },
      message: "分析报告生成成功",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/analysis/:id - 更新分析报告（用于临场修正）
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "缺少报告ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // 获取现有报告
    const { data: existingReport, error: fetchError } = await supabase
      .from("analysis_reports")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    // 更新报告（增加版本号）
    const updateData = {
      ...body,
      version: (existingReport.version || 1) + 1,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("analysis_reports")
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
      message: `报告更新成功，当前版本 v${updateData.version}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
