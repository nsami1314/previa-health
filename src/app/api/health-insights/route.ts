import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const [
      healthStateResult,
      observationsResult,
      reportsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("health_ai_state")
        .select(
          "summary, key_changes, patterns, doctor_questions, state, last_processed_report_id, updated_at"
        )
        .eq("user_id", userId)
        .maybeSingle(),

      supabaseAdmin
        .from("medical_observations")
        .select(
          "id, medical_report_id, observation_date, test_name, normalized_name, value, unit, reference_range, abnormal_flag"
        )
        .eq("user_id", userId)
        .order("observation_date", {
          ascending: true,
          nullsFirst: false,
        }),

      supabaseAdmin
        .from("medical_reports")
        .select("id, report_date, report_type")
        .eq("user_id", userId)
        .order("report_date", {
          ascending: true,
          nullsFirst: false,
        }),
    ]);

    if (healthStateResult.error) {
      console.error(
        "Health AI state error:",
        healthStateResult.error
      );

      return NextResponse.json(
        { error: "Failed to load health AI state" },
        { status: 500 }
      );
    }

    if (observationsResult.error) {
      console.error(
        "Health observations error:",
        observationsResult.error
      );

      return NextResponse.json(
        { error: "Failed to load health observations" },
        { status: 500 }
      );
    }

    if (reportsResult.error) {
      console.error(
        "Health reports error:",
        reportsResult.error
      );

      return NextResponse.json(
        { error: "Failed to load medical reports" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      healthState: healthStateResult.data ?? null,
      observations: observationsResult.data ?? [],
      reports: reportsResult.data ?? [],
    });
  } catch (error) {
    console.error(
      "Health insights API error:",
      error
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}