import { DocumentEngine } from "@/lib/document-engine";
import { analyzeMedicalReport } from "@/lib/ai/openai";
import { extractTextFromPDF } from "@/lib/ai/parser";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const documentEngine = new DocumentEngine();
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

const engineFile = new File(
  [pdfBuffer],
  report.file_name,
  {
    type: "application/pdf",
  }
);

const parsedDocument =
  await documentEngine.process(engineFile);

console.log("====================================");
console.log("DOCUMENT ENGINE OUTPUT");
console.log("====================================");
console.log(parsedDocument.text.substring(0, 1500));
console.log("====================================");

console.log("====================================");
console.log("PDF TEXT PREVIEW");
console.log("====================================");
console.log(extractedText.substring(0, 1500));
console.log("====================================");
const { error: saveTextError } = await supabaseAdmin
  .from("report_analysis")
  .update({
    extracted_text: extractedText,
    status: "text_extracted",
  })
  .eq("report_id", report.id);

if (saveTextError) {
  console.error("Failed to save extracted text:", saveTextError);
} else {
  console.log("Extracted text saved successfully.");
}
console.log("Sending report to OpenAI...");

const aiResult = await analyzeMedicalReport(extractedText);

console.log("====================================");
console.log("AI RESPONSE");
console.log("====================================");
console.log(aiResult);
console.log("====================================");

return NextResponse.json({
  success: true,
  report,
  aiResult,
});
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}