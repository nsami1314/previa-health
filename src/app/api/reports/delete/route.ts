import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const { reportId, userId } = await req.json();

    console.log("=== DELETE REPORT ===");
    console.log("Report ID:", reportId);
    console.log("User ID:", userId);

    if (!reportId || !userId) {
      return NextResponse.json(
        { error: "Missing reportId or userId" },
        { status: 400 }
      );
    }

    // Find the report and verify ownership
    const { data: report, error: reportError } = await supabaseAdmin
      .from("medical_reports")
      .select("*")
      .eq("id", reportId)
      .eq("user_id", userId)
      .single();

    if (reportError || !report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    // Delete the original file from Supabase Storage
    if (report.file_name) {
      const { error: storageError } = await supabaseAdmin.storage
        .from("medical-reports")
        .remove([report.file_name]);

      if (storageError) {
        console.error("Storage deletion failed:", storageError);

        return NextResponse.json(
          { error: "Failed to delete original report file" },
          { status: 500 }
        );
      }
    }

    // Delete medications linked to this report
    const { error: medicationError } = await supabaseAdmin
      .from("medications")
      .delete()
      .eq("report_id", reportId)
      .eq("user_id", userId);

    if (medicationError) {
      console.error("Medication deletion failed:", medicationError);

      return NextResponse.json(
        { error: "Failed to delete associated medications" },
        { status: 500 }
      );
    }

    // Delete medical report
    // report_analysis will be deleted automatically because
    // report_id has ON DELETE CASCADE.
    const { error: deleteError } = await supabaseAdmin
      .from("medical_reports")
      .delete()
      .eq("id", reportId)
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Report deletion failed:", deleteError);

      return NextResponse.json(
        { error: "Failed to delete report" },
        { status: 500 }
      );
    }

    console.log("Report deleted successfully.");

    return NextResponse.json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    console.error("Delete report error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}