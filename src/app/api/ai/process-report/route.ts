import { DocumentEngine } from "@/lib/document-engine";
import { analyzeMedicalReport } from "@/lib/ai/openai";
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

const engineFile = new File(
  [pdfBuffer],
  report.file_name,
  {
    type: pdfFile.type,
  }
);

const parsedDocument =
  await documentEngine.process(engineFile);

  const renderedPages = documentEngine.getRenderedPages();

const extractedText = parsedDocument.text;

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

const aiResult = await analyzeMedicalReport(
  extractedText,
  renderedPages
);

const labResults = Array.isArray(aiResult.lab_results)
  ? aiResult.lab_results
  : [];

if (labResults.length > 0) {
  const observations = labResults
    .filter((result: any) => result.test_name)
    .map((result: any) => ({
      user_id: report.user_id,
      medical_report_id: report.id,
      observation_date: result.observation_date || aiResult.report_date || null,
      test_name: result.test_name,
      normalized_name: result.normalized_name || null,
      value:
        result.value !== null &&
        result.value !== undefined &&
        result.value !== ""
          ? Number(result.value)
          : null,
      unit: result.unit || null,
      reference_range: result.reference_range || null,
      abnormal_flag: result.abnormal_flag || null,
    }));

  if (observations.length > 0) {
    const { error: observationsError } = await supabaseAdmin
      .from("medical_observations")
      .insert(observations);

    if (observationsError) {
      console.error(
        "Failed to save medical observations:",
        observationsError
      );
    } else {
      console.log(
        `Saved ${observations.length} medical observation(s).`
      );
    }
  }
}

const { error: reportTypeError } = await supabaseAdmin
  .from("medical_reports")
  .update({
    report_type: aiResult.report_type ?? "Other",
    report_date: aiResult.report_date || null,
  })
  .eq("id", report.id);

if (reportTypeError) {
  console.error("Failed to save report type:", reportTypeError);
} else {
  console.log("Report type saved:", aiResult.report_type);
}

const { error: analysisError } = await supabaseAdmin
  .from("report_analysis")
  .update({
    ai_summary: aiResult.summary,
    ai_response: aiResult,
    extracted_data: aiResult,
    status: "completed",
    processed_at: new Date().toISOString(),
  })
  .eq("report_id", report.id);

if (analysisError) {
  console.error("Failed to save AI analysis:", analysisError);
} else {
  console.log("AI analysis saved successfully.");
}

if (Array.isArray(aiResult.medications) && aiResult.medications.length > 0) {

 console.log("MEDICATION SAVE REPORT ID:", report.id);
 console.log("MEDICATION SAVE USER ID:", report.user_id);

 const medicationRows = aiResult.medications.map((med: any) => ({
  report_id: report.id,
  user_id: report.user_id,
  medicine_name: med.name ?? "",
  dosage: med.dosage ?? null,
  frequency: med.frequency ?? null,
  notes: med.instructions ?? null,
  source: "ai",
  confidence: aiResult.confidence ?? null,
}));

  const { error: medicationError } = await supabaseAdmin
    .from("medications")
    .insert(medicationRows);

  if (medicationError) {
    console.error("Failed to save medications:", medicationError);
  } else {
    console.log(
      `Saved ${medicationRows.length} medication(s).`
    );
  }
}

console.log("AI RESULT TYPE:", typeof aiResult);
console.log("AI RESULT:", aiResult);
console.log("SUMMARY:", aiResult.summary);
console.log("MEDICATIONS:", aiResult.medications);

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