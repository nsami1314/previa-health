import { extractTextFromPDF } from "@/lib/ai/parser";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    console.log("=== AI ROUTE HIT ===");

    const { reportId } = await req.json();

    console.log("Report ID:", reportId);

    if (!reportId) {
      return NextResponse.json(
        { error: "Missing reportId" },
        { status: 400 }
      );
    }

    const { data: report, error } = await supabaseAdmin
      .from("medical_reports")
      .select("*")
      .eq("id", reportId)
      .single();

    console.log("Report:", report);
    console.log("Database Error:", error);

    if (error || !report) {
      return NextResponse.json(
        {
          error: error?.message ?? "Report not found",
        },
        { status: 404 }
      );
    }
    const { data: pdfFile, error: downloadError } =
  await supabaseAdmin.storage
    .from("medical-reports")
    .download(report.file_name);

console.log("Downloaded File:", pdfFile);
console.log("Download Error:", downloadError);

if (downloadError || !pdfFile) {
  return NextResponse.json(
    {
      error: "Unable to download PDF",
    },
    { status: 500 }
  );
}

console.log("PDF Size:", pdfFile.size);
const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());

const extractedText = await extractTextFromPDF(pdfBuffer);

console.log("====================================");
console.log("PDF TEXT PREVIEW");
console.log("====================================");
console.log(extractedText.substring(0, 1500));
console.log("====================================");

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}