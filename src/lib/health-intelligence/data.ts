/**
 * Previa Health Intelligence
 *
 * Data access layer.
 *
 * This module:
 * - Reads the existing Previa Supabase tables.
 * - Converts database rows into Health Intelligence domain objects.
 * - Performs no AI calls.
 * - Performs no database writes.
 * - Does not create or modify database schema.
 *
 * Health Intelligence consumes stored evidence.
 * It does not generate new medical-report analysis.
 */

import { supabaseAdmin } from "@/lib/supabase-admin";

import type {
  HealthIntelligenceCondition,
  HealthIntelligenceGoal,
  HealthIntelligenceMedication,
  HealthIntelligenceObservation,
  HealthIntelligenceProfile,
  HealthIntelligenceRecord,
  HealthIntelligenceReport,
  HealthIntelligenceReportAnalysis,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Generic helpers                                                            */
/* -------------------------------------------------------------------------- */

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object"
    ? (value as AnyRecord)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Returns the first usable textual value.
 *
 * Multiple candidate fields are intentionally supported because stored
 * report-analysis JSON can contain slightly different field names.
 */
function stringValue(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return String(value);
    }
  }

  return null;
}

function numberValue(value: unknown): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
}

function dateValue(...values: unknown[]): string | null {
  const raw = stringValue(...values);

  if (!raw) {
    return null;
  }

  const dateOnly = raw.match(
    /^(\d{4}-\d{2}-\d{2})/,
  );

  if (dateOnly) {
    return dateOnly[1];
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function uniqueStrings(
  values: string[],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const cleaned = value.trim();

    if (!cleaned) {
      continue;
    }

    const key = cleaned.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(cleaned);
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* Report-analysis helpers                                                    */
/* -------------------------------------------------------------------------- */

function stringArray(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueStrings(
    value
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }

        if (item && typeof item === "object") {
          const record = asRecord(item);

          return (
            stringValue(
              record.text,
              record.finding,
              record.description,
              record.statement,
              record.title,
              record.name,
              record.value,
            ) ?? ""
          );
        }

        return "";
      })
      .filter(Boolean),
  );
}

function medicationReferences(
  value: unknown,
): HealthIntelligenceReportAnalysis["medications"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);

      const name =
        stringValue(
          record.name,
          record.medicine_name,
          record.medicineName,
        ) ?? "";

      return {
        name,

        dosage:
          stringValue(
            record.dosage,
            record.dose,
          ),

        frequency:
          stringValue(
            record.frequency,
            record.schedule,
          ),

        instructions:
          stringValue(
            record.instructions,
            record.notes,
          ),
      };
    })
    .filter(
      (item) => Boolean(item.name),
    );
}

/**
 * Existing report_analysis records store the AI-generated extraction.
 *
 * Health Intelligence reads this stored result.
 * It does not call OpenAI again.
 */
function extractAnalysisPayload(
  row: AnyRecord,
): Record<string, unknown> {
  const aiResponse =
    asRecord(row.ai_response);

  if (
    Object.keys(aiResponse).length > 0
  ) {
    return aiResponse;
  }

  const extractedData =
    asRecord(row.extracted_data);

  if (
    Object.keys(extractedData).length > 0
  ) {
    return extractedData;
  }

  return {};
}

function convertReportAnalysis(
  row: AnyRecord,
  reportId: string,
): HealthIntelligenceReportAnalysis {
  const payload =
    extractAnalysisPayload(row);

  return {
    id:
      stringValue(row.id) ??
      undefined,

    reportId,

    summary:
      stringValue(
        row.ai_summary,
        payload.summary,
      ),

    diagnoses:
      stringArray(
        payload.diagnoses ??
          payload.diagnosis ??
          payload.conditions,
      ),

    abnormalFindings:
      stringArray(
        payload.abnormal_findings ??
          payload.abnormalFindings ??
          payload.findings,
      ),

    normalFindings:
      stringArray(
        payload.normal_findings ??
          payload.normalFindings,
      ),

    possibleConditions:
      stringArray(
        payload.possible_conditions ??
          payload.possibleConditions,
      ),

    doctorQuestions:
      stringArray(
        payload.doctor_questions ??
          payload.doctorQuestions,
      ),

    followUpTests:
      stringArray(
        payload.follow_up_tests ??
          payload.followUpTests ??
          payload.followup_tests,
      ),

    recommendations:
      stringArray(
        payload.recommendations ??
          payload.recommendation,
      ),

    medications:
      medicationReferences(
        payload.medications,
      ),

    raw: payload,
  };
}

/* -------------------------------------------------------------------------- */
/* Medical reports                                                            */
/* -------------------------------------------------------------------------- */

function convertReport(
  row: AnyRecord,
  analysisByReport: Map<
    string,
    HealthIntelligenceReportAnalysis
  >,
): HealthIntelligenceReport | null {
  const id =
    stringValue(row.id);

  if (!id) {
    return null;
  }

  const analysis =
    analysisByReport.get(id) ??
    null;

  return {
    id,

    userId:
      stringValue(row.user_id) ?? "",

    fileName:
      stringValue(
        row.original_file_name,
        row.file_name,
        row.filename,
      ) ??
      "Medical report",

    reportType:
      stringValue(
        row.report_type,
      ) ??
      "Medical report",

    reportDate:
      dateValue(
        row.report_date,
        row.uploaded_at,
      ),

    uploadedAt:
      dateValue(
        row.uploaded_at,
      ),

    hasAnalysis:
      Boolean(analysis),

    analysis,
  };
}

/* -------------------------------------------------------------------------- */
/* Medical observations                                                       */
/* -------------------------------------------------------------------------- */

function convertObservation(
  row: AnyRecord,
): HealthIntelligenceObservation | null {
  const id =
    stringValue(row.id);

  const userId =
    stringValue(row.user_id);

  const testName =
    stringValue(
      row.test_name,
      row.normalized_name,
    );

  if (
    !id ||
    !userId ||
    !testName
  ) {
    return null;
  }

  return {
    id,

    userId,

    medicalReportId:
      stringValue(
        row.medical_report_id,
      ),

    observationDate:
      dateValue(
        row.observation_date,
      ),

    testName,

    normalizedName:
      stringValue(
        row.normalized_name,
      ),

    value:
      numberValue(
        row.value,
      ),

    unit:
      stringValue(
        row.unit,
      ),

    referenceRange:
      stringValue(
        row.reference_range,
      ),

    abnormalFlag:
      stringValue(
        row.abnormal_flag,
      ),
  };
}

/* -------------------------------------------------------------------------- */
/* Medications                                                                */
/* -------------------------------------------------------------------------- */

function convertMedication(
  row: AnyRecord,
): HealthIntelligenceMedication | null {
  const id =
    stringValue(row.id);

  const userId =
    stringValue(row.user_id);

  const medicineName =
    stringValue(
      row.medicine_name,
    );

  if (
    !id ||
    !userId ||
    !medicineName
  ) {
    return null;
  }

  return {
    id,

    userId,

    reportId:
      stringValue(
        row.report_id,
      ),

    medicineName,

    dosage:
      stringValue(
        row.dosage,
      ),

    frequency:
      stringValue(
        row.frequency,
      ),

    startDate:
      dateValue(
        row.start_date,
      ),

    endDate:
      dateValue(
        row.end_date,
      ),

    status:
      stringValue(
        row.status,
      ),

    notes:
      stringValue(
        row.notes,
      ),

    source:
      stringValue(
        row.source,
      ),

    confidence:
      numberValue(
        row.confidence,
      ),

    createdAt:
      dateValue(
        row.created_at,
      ),

    updatedAt:
      dateValue(
        row.updated_at,
      ),
  };
}

/* -------------------------------------------------------------------------- */
/* Health conditions                                                          */
/* -------------------------------------------------------------------------- */

function convertCondition(
  row: AnyRecord,
): HealthIntelligenceCondition | null {
  const id =
    stringValue(row.id);

  const userId =
    stringValue(row.user_id);

  const conditionName =
    stringValue(
      row.condition_name,
    );

  if (
    !id ||
    !userId ||
    !conditionName
  ) {
    return null;
  }

  return {
    id,

    userId,

    conditionName,

    status:
      stringValue(
        row.status,
      ),

    diagnosedDate:
      dateValue(
        row.diagnosed_date,
      ),

    notes:
      stringValue(
        row.notes,
      ),

    createdAt:
      dateValue(
        row.created_at,
      ),
  };
}

/* -------------------------------------------------------------------------- */
/* Health profile                                                             */
/* -------------------------------------------------------------------------- */

function convertProfile(
  row: AnyRecord | null,
): HealthIntelligenceProfile | null {
  if (!row) {
    return null;
  }

  return {
    id:
      stringValue(row.id) ??
      undefined,

    userId:
      stringValue(row.user_id) ??
      undefined,

    fullName:
      stringValue(
        row.full_name,
      ),

    dateOfBirth:
      dateValue(
        row.date_of_birth,
      ),

    gender:
      stringValue(
        row.biological_sex,
        row.gender,
      ),

    bloodGroup:
      stringValue(
        row.blood_group,
      ),

    allergies:
      stringValue(
        row.allergies,
      ),

    currentMedications:
      stringValue(
        row.current_medications,
      ),

    medicalConditions:
      stringValue(
        row.medical_conditions,
      ),

    familyHistory:
      stringValue(
        row.family_medical_history,
        row.family_history,
      ),

    lifestyle:
      stringValue(
        row.exercise_frequency,
        row.diet_preference,
        row.smoking_status,
        row.alcohol_consumption,
        row.sleep_duration,
      ),

    notes:
      stringValue(
        row.past_surgeries,
        row.notes,
      ),
  };
}

/* -------------------------------------------------------------------------- */
/* Health goals                                                               */
/* -------------------------------------------------------------------------- */

function convertGoal(
  row: AnyRecord,
): HealthIntelligenceGoal | null {
  const id =
    stringValue(row.id);

  const userId =
    stringValue(row.user_id);

  if (
    !id ||
    !userId
  ) {
    return null;
  }

  return {
    id,

    userId,

    title:
      stringValue(
        row.title,
      ),

    goalName:
      stringValue(
        row.title,
      ),

    description:
      stringValue(
        row.notes,
        row.description,
      ),

    status:
      stringValue(
        row.status,
      ),

    targetDate:
      dateValue(
        row.target_date,
      ),

    createdAt:
      dateValue(
        row.created_at,
      ),
  };
}

/* -------------------------------------------------------------------------- */
/* Main record loader                                                         */
/* -------------------------------------------------------------------------- */

export async function loadHealthIntelligenceRecord(
  userId: string,
): Promise<HealthIntelligenceRecord> {
  if (!userId) {
    throw new Error(
      "User ID is required.",
    );
  }

  /*
   * Medical reports are the anchor records.
   *
   * report_analysis is loaded separately using report IDs because the
   * existing Previa schema associates analysis with report_id.
   */
  const reportsResult =
    await supabaseAdmin
      .from("medical_reports")
      .select(
        [
          "id",
          "user_id",
          "original_file_name",
          "report_type",
          "report_date",
          "uploaded_at",
        ].join(", "),
      )
      .eq(
        "user_id",
        userId,
      )
      .order(
        "report_date",
        {
          ascending: true,
          nullsFirst: false,
        },
      );

  if (reportsResult.error) {
    console.error(
      "Health Intelligence medical reports error:",
      reportsResult.error,
    );

    throw new Error(
      "Unable to load medical reports for Health Intelligence.",
    );
  }

  const rawReports =
    asArray(
      reportsResult.data,
    );

  const reportIds =
    rawReports
      .map((row) =>
        stringValue(
          asRecord(row).id,
        ),
      )
      .filter(
        (
          id,
        ): id is string =>
          Boolean(id),
      );

  /* ---------------------------------------------------------------------- */
  /* Load remaining record sources                                          */
  /* ---------------------------------------------------------------------- */

  const [
    analysesResult,
    observationsResult,
    medicationsResult,
    conditionsResult,
    profileResult,
    goalsResult,
  ] = await Promise.all([
    reportIds.length > 0
      ? supabaseAdmin
          .from("report_analysis")
          .select("*")
          .in(
            "report_id",
            reportIds,
          )
      : Promise.resolve({
          data: [],
          error: null,
        }),

    supabaseAdmin
      .from("medical_observations")
      .select(
        [
          "id",
          "user_id",
          "medical_report_id",
          "observation_date",
          "test_name",
          "normalized_name",
          "value",
          "unit",
          "reference_range",
          "abnormal_flag",
        ].join(", "),
      )
      .eq(
        "user_id",
        userId,
      )
      .order(
        "observation_date",
        {
          ascending: true,
          nullsFirst: false,
        },
      ),

    supabaseAdmin
      .from("medications")
      .select("*")
      .eq(
        "user_id",
        userId,
      )
      .order(
        "created_at",
        {
          ascending: true,
          nullsFirst: false,
        },
      ),

    supabaseAdmin
      .from("health_conditions")
      .select("*")
      .eq(
        "user_id",
        userId,
      )
      .order(
        "created_at",
        {
          ascending: true,
          nullsFirst: false,
        },
      ),

    supabaseAdmin
      .from("health_profiles")
      .select("*")
      .eq(
        "user_id",
        userId,
      )
      .maybeSingle(),

    supabaseAdmin
      .from("health_goals")
      .select("*")
      .eq(
        "user_id",
        userId,
      )
      .order(
        "created_at",
        {
          ascending: true,
          nullsFirst: false,
        },
      ),
  ]);

  /* ---------------------------------------------------------------------- */
  /* Error handling                                                         */
  /* ---------------------------------------------------------------------- */

  if (analysesResult.error) {
    console.error(
      "Health Intelligence report analysis error:",
      analysesResult.error,
    );

    throw new Error(
      "Unable to load report analyses for Health Intelligence.",
    );
  }

  if (observationsResult.error) {
    console.error(
      "Health Intelligence observations error:",
      observationsResult.error,
    );

    throw new Error(
      "Unable to load medical observations for Health Intelligence.",
    );
  }

  if (medicationsResult.error) {
    console.error(
      "Health Intelligence medications error:",
      medicationsResult.error,
    );

    throw new Error(
      "Unable to load medications for Health Intelligence.",
    );
  }

  if (conditionsResult.error) {
    console.error(
      "Health Intelligence conditions error:",
      conditionsResult.error,
    );

    throw new Error(
      "Unable to load health conditions for Health Intelligence.",
    );
  }

  if (
    profileResult.error &&
    profileResult.error.code !== "PGRST116"
  ) {
    console.error(
      "Health Intelligence profile error:",
      profileResult.error,
    );

    throw new Error(
      "Unable to load health profile for Health Intelligence.",
    );
  }

  if (goalsResult.error) {
    console.error(
      "Health Intelligence goals error:",
      goalsResult.error,
    );

    throw new Error(
      "Unable to load health goals for Health Intelligence.",
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Convert report analyses                                                */
  /* ---------------------------------------------------------------------- */

  const analysisByReport =
    new Map<
      string,
      HealthIntelligenceReportAnalysis
    >();

  for (
    const rawAnalysis of asArray(
      analysesResult.data,
    )
  ) {
    const row =
      asRecord(rawAnalysis);

    const reportId =
      stringValue(
        row.report_id,
      );

    if (!reportId) {
      continue;
    }

    analysisByReport.set(
      reportId,
      convertReportAnalysis(
        row,
        reportId,
      ),
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Convert reports                                                        */
  /* ---------------------------------------------------------------------- */

  const reports =
    rawReports
      .map((row) =>
        convertReport(
          asRecord(row),
          analysisByReport,
        ),
      )
      .filter(
        (
          report,
        ): report is HealthIntelligenceReport =>
          report !== null,
      );

  /* ---------------------------------------------------------------------- */
  /* Convert observations                                                   */
  /* ---------------------------------------------------------------------- */

  const observations =
    asArray(
      observationsResult.data,
    )
      .map((row) =>
        convertObservation(
          asRecord(row),
        ),
      )
      .filter(
        (
          observation,
        ): observation is HealthIntelligenceObservation =>
          observation !== null,
      )
      // Defense in depth: the database query is already scoped by user_id,
      // but the service-role loader must never admit a mismatched row into
      // longitudinal reasoning if the returned data is malformed.
      .filter(
        (observation) =>
          observation.userId === userId,
      );

  /* ---------------------------------------------------------------------- */
  /* Convert medications                                                    */
  /* ---------------------------------------------------------------------- */

  const medications =
    asArray(
      medicationsResult.data,
    )
      .map((row) =>
        convertMedication(
          asRecord(row),
        ),
      )
      .filter(
        (
          medication,
        ): medication is HealthIntelligenceMedication =>
          medication !== null,
      );

  /* ---------------------------------------------------------------------- */
  /* Convert conditions                                                     */
  /* ---------------------------------------------------------------------- */

  const conditions =
    asArray(
      conditionsResult.data,
    )
      .map((row) =>
        convertCondition(
          asRecord(row),
        ),
      )
      .filter(
        (
          condition,
        ): condition is HealthIntelligenceCondition =>
          condition !== null,
      );

  /* ---------------------------------------------------------------------- */
  /* Convert profile                                                        */
  /* ---------------------------------------------------------------------- */

  const profile =
    convertProfile(
      profileResult.data
        ? asRecord(
            profileResult.data,
          )
        : null,
    );

  /* ---------------------------------------------------------------------- */
  /* Convert goals                                                          */
  /* ---------------------------------------------------------------------- */

  const goals =
    asArray(
      goalsResult.data,
    )
      .map((row) =>
        convertGoal(
          asRecord(row),
        ),
      )
      .filter(
        (
          goal,
        ): goal is HealthIntelligenceGoal =>
          goal !== null,
      );

  /* ---------------------------------------------------------------------- */
  /* Deterministic ordering                                                 */
  /* ---------------------------------------------------------------------- */

  reports.sort(
    (a, b) =>
      (
        a.reportDate ??
        "9999-12-31"
      ).localeCompare(
        b.reportDate ??
          "9999-12-31",
      ),
  );

  observations.sort(
    (a, b) =>
      (
        a.observationDate ??
        "9999-12-31"
      ).localeCompare(
        b.observationDate ??
          "9999-12-31",
      ),
  );

  medications.sort(
    (a, b) =>
      (
        a.startDate ??
        a.createdAt ??
        "9999-12-31"
      ).localeCompare(
        b.startDate ??
          b.createdAt ??
          "9999-12-31",
      ),
  );

  conditions.sort(
    (a, b) =>
      (
        a.diagnosedDate ??
        a.createdAt ??
        "9999-12-31"
      ).localeCompare(
        b.diagnosedDate ??
          b.createdAt ??
          "9999-12-31",
      ),
  );

  goals.sort(
    (a, b) =>
      (
        a.targetDate ??
        a.createdAt ??
        "9999-12-31"
      ).localeCompare(
        b.targetDate ??
          b.createdAt ??
          "9999-12-31",
      ),
  );

  return {
    reports,

    observations,

    medications,

    conditions,

    profile,

    goals,
  };
}

/* -------------------------------------------------------------------------- */
/* Record counts                                                              */
/* -------------------------------------------------------------------------- */

export function getHealthIntelligenceRecordCounts(
  record: HealthIntelligenceRecord,
) {
  return {
    reports:
      record.reports.length,

    analyzedReports:
      record.reports.filter(
        (report) =>
          report.hasAnalysis,
      ).length,

    observations:
      record.observations.length,

    medications:
      record.medications.length,

    conditions:
      record.conditions.length,

    goals:
      record.goals.length,
  };
}
