import { DocumentEngine } from "@/lib/document-engine";
import {
  analyzeMedicalReport,
  updateHealthOverviewIncrementally,
} from "@/lib/ai/openai";
import { detectMeaningfulChanges } from "@/lib/health/change-engine";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import crypto from "crypto";

function buildObservationFingerprint(observations: any[]) {
  return observations
    .map((observation) => ({
      observation_date: observation.observation_date ?? null,
      test_name: observation.test_name ?? "",
      normalized_name: observation.normalized_name ?? null,
      value: observation.value ?? null,
      unit: observation.unit ?? null,
      reference_range: observation.reference_range ?? null,
      abnormal_flag: observation.abnormal_flag ?? null,
    }))
    .sort((a, b) => {
      const aKey = JSON.stringify(a);
      const bKey = JSON.stringify(b);
      return aKey.localeCompare(bKey);
    });
}

function areObservationsIdentical(
  first: any[],
  second: any[]
): boolean {
  if (first.length !== second.length) {
    return false;
  }

  return (
    JSON.stringify(buildObservationFingerprint(first)) ===
    JSON.stringify(buildObservationFingerprint(second))
  );
}

async function claimHealthAIProcessing(
  userId: string,
  reportId: string
) {
  // Make sure the user's AI state row exists.
  const { error: ensureStateError } = await supabaseAdmin
    .from("health_ai_state")
    .upsert(
      {
        user_id: userId,
      },
      {
        onConflict: "user_id",
        ignoreDuplicates: true,
      }
    );

  if (ensureStateError) {
    throw ensureStateError;
  }

  const { data: state, error: stateError } =
    await supabaseAdmin
      .from("health_ai_state")
      .select(
        "summary, key_changes, patterns, doctor_questions, state, last_processed_report_id, processing_report_id, processing_started_at"
      )
      .eq("user_id", userId)
      .maybeSingle();

  if (stateError) {
    throw stateError;
  }

  // This exact report has already completed.
  if (state?.last_processed_report_id === reportId) {
    return {
      claimed: false,
      reason: "already_processed",
      state,
    };
  }

  // This exact report is already being processed.
  if (state?.processing_report_id === reportId) {
    return {
      claimed: false,
      reason: "already_processing",
      state,
    };
  }

  const processingStartedAt =
    state?.processing_started_at
      ? new Date(state.processing_started_at).getTime()
      : null;

  const staleProcessing =
    processingStartedAt !== null &&
    Date.now() - processingStartedAt > 10 * 60 * 1000;

  /*
   * Atomic claim:
   *
   * Only one request can successfully change
   * processing_report_id from NULL to this report.
   */
  let claimQuery = supabaseAdmin
    .from("health_ai_state")
    .update({
      processing_report_id: reportId,
      processing_started_at:
        new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (state?.processing_report_id && staleProcessing) {
    claimQuery = claimQuery
      .eq(
        "processing_report_id",
        state.processing_report_id
      )
      .eq(
        "processing_started_at",
        state.processing_started_at
      );
  } else {
    claimQuery = claimQuery.is(
      "processing_report_id",
      null
    );
  }

  const { data: claimedRows, error: claimError } =
    await claimQuery
      .select("id")
      .limit(1);

  if (claimError) {
    throw claimError;
  }

  if (!claimedRows || claimedRows.length === 0) {
    return {
      claimed: false,
      reason: "another_process_claimed",
      state,
    };
  }

  return {
    claimed: true,
    reason: "claimed",
    state,
  };
}

async function releaseHealthAIProcessing(
  userId: string,
  reportId: string
) {
  const { error } = await supabaseAdmin
    .from("health_ai_state")
    .update({
      processing_report_id: null,
      processing_started_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("processing_report_id", reportId);

  if (error) {
    console.error(
      "Failed to release health AI processing:",
      error
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

if (!userId) {
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 }
  );
}
    const documentEngine = new DocumentEngine();
    console.log("=== PROCESS REPORT API CALLED ===");

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
  .eq("user_id", userId)
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

/*
 * EXACT PDF DUPLICATE PROTECTION
 *
 * Hash the raw PDF bytes before DocumentEngine extraction
 * and before report-analysis OpenAI processing.
 *
 * This prevents an exact re-upload of an already completed
 * report from causing another report-analysis AI call.
 */
const documentFingerprint = crypto
  .createHash("sha256")
  .update(pdfBuffer)
  .digest("hex");

const { error: fingerprintError } = await supabaseAdmin
  .from("medical_reports")
  .update({
    document_fingerprint: documentFingerprint,
  })
  .eq("id", report.id)
  .eq("user_id", userId);

if (fingerprintError) {
  console.error(
    "Failed to save document fingerprint:",
    fingerprintError
  );
}

/*
 * Only reuse a previous report when its report_analysis row
 * is actually completed. Failed/incomplete processing must
 * continue through the normal pipeline.
 */
const { data: duplicateReports, error: duplicateLookupError } =
  await supabaseAdmin
    .from("medical_reports")
    .select(
      "id, report_type, report_date, uploaded_at"
    )
    .eq("user_id", userId)
    .eq("document_fingerprint", documentFingerprint)
    .neq("id", report.id)
    .order("uploaded_at", {
      ascending: false,
      nullsFirst: false,
    })
    .limit(10);

if (duplicateLookupError) {
  console.error(
    "Failed to check for duplicate medical report:",
    duplicateLookupError
  );
}

if (!duplicateLookupError && duplicateReports?.length) {
  for (const duplicateReport of duplicateReports) {
    const { data: existingAnalysis, error: existingAnalysisError } =
      await supabaseAdmin
        .from("report_analysis")
        .select(
          "extracted_text, ai_summary, ai_response, extracted_data, status, processed_at"
        )
        .eq("report_id", duplicateReport.id)
        .eq("status", "completed")
        .maybeSingle();

    if (existingAnalysisError) {
      console.error(
        "Failed to load duplicate report analysis:",
        existingAnalysisError
      );
      continue;
    }

    if (!existingAnalysis) {
      continue;
    }

    console.log(
      "Exact duplicate medical report detected. Reusing completed processing:",
      duplicateReport.id
    );

    /*
     * Reuse the completed report-analysis result.
     */
    const { error: reuseAnalysisError } = await supabaseAdmin
      .from("report_analysis")
      .update({
        extracted_text: existingAnalysis.extracted_text,
        ai_summary: existingAnalysis.ai_summary,
        ai_response: existingAnalysis.ai_response,
        extracted_data: existingAnalysis.extracted_data,
        status: "completed",
        processed_at: new Date().toISOString(),
      })
      .eq("report_id", report.id);

    if (reuseAnalysisError) {
      throw reuseAnalysisError;
    }

    /*
     * Reuse report metadata produced by report analysis.
     */
    const { error: reuseReportError } = await supabaseAdmin
      .from("medical_reports")
      .update({
        document_fingerprint: documentFingerprint,
        report_type: duplicateReport.report_type,
        report_date: duplicateReport.report_date,
      })
      .eq("id", report.id)
      .eq("user_id", userId);

    if (reuseReportError) {
      throw reuseReportError;
    }

    /*
     * Copy the existing observations to the new report.
     * Keep the new medical_report_id so the new upload remains
     * independently addressable without changing health_ai_state.
     */
    const { data: existingObservations, error: existingObservationsError } =
      await supabaseAdmin
        .from("medical_observations")
        .select(
          "user_id, observation_date, test_name, normalized_name, value, unit, reference_range, abnormal_flag"
        )
        .eq("medical_report_id", duplicateReport.id);

    if (existingObservationsError) {
      throw existingObservationsError;
    }

    if (existingObservations?.length) {
      const reusedObservations = existingObservations.map(
        (observation: any) => ({
          user_id: observation.user_id ?? userId,
          medical_report_id: report.id,
          observation_date: observation.observation_date ?? null,
          test_name: observation.test_name,
          normalized_name: observation.normalized_name ?? null,
          value: observation.value ?? null,
          unit: observation.unit ?? null,
          reference_range: observation.reference_range ?? null,
          abnormal_flag: observation.abnormal_flag ?? null,
        })
      );

      const { error: reuseObservationsError } =
        await supabaseAdmin
          .from("medical_observations")
          .insert(reusedObservations);

      if (reuseObservationsError) {
        throw reuseObservationsError;
      }
    }

    /*
     * Copy medications associated with the completed source report.
     */
    const { data: existingMedications, error: existingMedicationsError } =
      await supabaseAdmin
        .from("medications")
        .select(
          "user_id, medicine_name, dosage, frequency, notes, source, confidence"
        )
        .eq("report_id", duplicateReport.id);

    if (existingMedicationsError) {
      throw existingMedicationsError;
    }

    if (existingMedications?.length) {
      const reusedMedications = existingMedications.map(
        (medication: any) => ({
          report_id: report.id,
          user_id: medication.user_id ?? userId,
          medicine_name: medication.medicine_name ?? "",
          dosage: medication.dosage ?? null,
          frequency: medication.frequency ?? null,
          notes: medication.notes ?? null,
          source: medication.source ?? "ai",
          confidence: medication.confidence ?? null,
        })
      );

      const { error: reuseMedicationsError } =
        await supabaseAdmin
          .from("medications")
          .insert(reusedMedications);

      if (reuseMedicationsError) {
        throw reuseMedicationsError;
      }
    }

    console.log(
      "Duplicate processing reused successfully. No report-analysis or incremental Health AI call made."
    );

    return NextResponse.json({
      success: true,
      duplicate: true,
      reusedFromReportId: duplicateReport.id,
      report: {
        ...report,
        document_fingerprint: documentFingerprint,
        report_type: duplicateReport.report_type,
        report_date: duplicateReport.report_date,
      },
      aiResult: existingAnalysis.ai_response,
    });
  }
}

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
      /*
       * Find the immediately previous medical report
       * for this user based on report date.
       *
       * We compare the current report against one
       * previous report instead of mixing observations
       * from the user's entire history.
       */
      const currentReportDate =
        aiResult.report_date || report.report_date || null;

      let previousObservations: any[] = [];

      if (currentReportDate) {
        const {
          data: previousReports,
          error: previousReportsError,
        } = await supabaseAdmin
          .from("medical_reports")
          .select("id, report_date, uploaded_at")
.eq("user_id", report.user_id)
.neq("id", report.id)
.or(
  `report_date.lt.${currentReportDate},and(report_date.eq.${currentReportDate},uploaded_at.lt.${report.uploaded_at})`
)
.order("report_date", {
  ascending: false,
  nullsFirst: false,
})
.order("uploaded_at", {
  ascending: false,
  nullsFirst: false,
})
          .limit(1);

        if (previousReportsError) {
          console.error(
            "Failed to load previous medical report:",
            previousReportsError
          );
        }

        const previousReport = previousReports?.[0];

        if (previousReport) {
          console.log(
            "Previous medical report:",
            previousReport.id
          );

          console.log(
            "Previous report date:",
            previousReport.report_date
          );

          const {
            data: previousReportObservations,
            error: previousObservationsError,
          } = await supabaseAdmin
            .from("medical_observations")
            .select(
              `
                id,
                medical_report_id,
                observation_date,
                test_name,
                normalized_name,
                value,
                unit,
                reference_range,
                abnormal_flag
              `
            )
            .eq(
              "medical_report_id",
              previousReport.id
            );

          if (previousObservationsError) {
            console.error(
              "Failed to load previous report observations:",
              previousObservationsError
            );
          } else {
            previousObservations =
              previousReportObservations || [];
          }
        } else {
          console.log(
            "No previous medical report found."
          );
        }
      } else {
        console.log(
          "Current report has no report date. Skipping historical comparison."
        );
      }

      /*
       * Save the new observations.
       */
      const { error: observationsError } =
        await supabaseAdmin
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

        /*
         * LOCAL HEALTH CHANGE ENGINE
         *
         * No OpenAI call happens here.
         */

        const isDuplicateReport =
  previousObservations.length > 0 &&
  observations.length > 0 &&
  areObservationsIdentical(
    previousObservations,
    observations
  );

if (isDuplicateReport) {
  console.log(
    "Duplicate medical report detected. Skipping incremental Health AI."
  );
}
        const meaningfulChanges =
          detectMeaningfulChanges(
            previousObservations,
            observations
          );

        console.log(
          "===================================="
        );
        console.log(
          "LOCAL HEALTH CHANGE ENGINE"
        );
        console.log(
          "===================================="
        );

        console.log(
          "Previous observations:",
          previousObservations.length
        );

        console.log(
          "New observations:",
          observations.length
        );

        console.log(
          "Meaningful changes:",
          meaningfulChanges.length
        );

        if (
          meaningfulChanges.length > 0 &&
          !isDuplicateReport
        ) {
          console.log(
            "Meaningful health changes detected:",
            meaningfulChanges
          );
        
          /*
 * INCREMENTAL HEALTH AI
 *
 * First acquire an atomic processing claim.
 * This prevents duplicate OpenAI calls when
 * the same report is processed concurrently.
 */

const healthAIClaim =
await claimHealthAIProcessing(
  report.user_id,
  report.id
);

if (!healthAIClaim.claimed) {
console.log(
  "Health AI processing skipped:",
  healthAIClaim.reason
);
} else {
try {
  console.log(
    "Calling incremental Health AI..."
  );

  /*
   * Only send medically relevant observation
   * fields to OpenAI.
   *
   * Internal database identifiers such as
   * user_id and medical_report_id are removed.
   */
  const newObservationsForAI =
    observations.map((observation: any) => ({
      observation_date:
        observation.observation_date ?? null,
      test_name:
        observation.test_name ?? "",
      normalized_name:
        observation.normalized_name ?? null,
      value:
        observation.value ?? null,
      unit:
        observation.unit ?? null,
      reference_range:
        observation.reference_range ?? null,
      abnormal_flag:
        observation.abnormal_flag ?? null,
    }));

    const existingState = (healthAIClaim.state ?? {}) as {
      summary?: string;
      key_changes?: unknown[];
      patterns?: unknown[];
      doctor_questions?: unknown[];
    };

  const existingHealthStateForAI = {
    summary:
      existingState.summary ?? "",
    key_changes:
      Array.isArray(existingState.key_changes)
        ? existingState.key_changes
        : [],
    patterns:
      Array.isArray(existingState.patterns)
        ? existingState.patterns
        : [],
    doctor_questions:
      Array.isArray(
        existingState.doctor_questions
      )
        ? existingState.doctor_questions
        : [],
  };

  const incrementalResult =
    await updateHealthOverviewIncrementally(
      existingHealthStateForAI,
      meaningfulChanges,
      newObservationsForAI
    );

  if (
    !incrementalResult ||
    typeof incrementalResult !== "object"
  ) {
    throw new Error(
      "Invalid incremental Health AI response."
    );
  }

  const summary =
    typeof incrementalResult.summary === "string"
      ? incrementalResult.summary
      : existingHealthStateForAI.summary;

  const keyChanges =
    Array.isArray(
      incrementalResult.key_changes
    )
      ? incrementalResult.key_changes
      : existingHealthStateForAI.key_changes;

  const patterns =
    Array.isArray(
      incrementalResult.patterns
    )
      ? incrementalResult.patterns
      : existingHealthStateForAI.patterns;

  const doctorQuestions =
    Array.isArray(
      incrementalResult.doctor_questions
    )
      ? incrementalResult.doctor_questions
      : existingHealthStateForAI.doctor_questions;

  const confidence =
    typeof incrementalResult.confidence ===
    "number"
      ? incrementalResult.confidence
      : null;

  /*
   * Save the updated longitudinal AI state.
   */
  const { error: healthStateSaveError } =
    await supabaseAdmin
      .from("health_ai_state")
      .update({
        summary,
        key_changes: keyChanges,
        patterns,
        doctor_questions: doctorQuestions,
        state: {
          confidence,
        },
        last_processed_report_id:
          report.id,
        processing_report_id: null,
        processing_started_at: null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("user_id", report.user_id)
      .eq(
        "processing_report_id",
        report.id
      );

  if (healthStateSaveError) {
    throw healthStateSaveError;
  }

  console.log(
    "Incremental Health AI state saved successfully."
  );
} catch (healthAiError) {
  console.error(
    "Incremental Health AI error:",
    healthAiError
  );

  await releaseHealthAIProcessing(
    report.user_id,
    report.id
  );
}
}

console.log(
  "===================================="
);

}
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

console.log("====================================");
console.log("REPORT PROCESSING COMPLETE");
console.log("Report ID:", report.id);
console.log("AI report type:", aiResult.report_type);
console.log("AI report date:", aiResult.report_date);
console.log(
  "AI lab results:",
  Array.isArray(aiResult.lab_results)
    ? aiResult.lab_results.length
    : 0
);
console.log(
  "AI medications:",
  Array.isArray(aiResult.medications)
    ? aiResult.medications.length
    : 0
);
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