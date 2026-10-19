/**
 * Previa Health Intelligence
 *
 * Deterministic longitudinal reasoning engine.
 *
 * Architectural boundary:
 *
 * Medical Reports
 * Medical Observations
 * Medications
 * Conditions
 * Health Profile
 * Health Goals
 *          ↓
 *      this engine
 *          ↓
 * Health Intelligence Result
 *
 * This engine:
 * - does NOT call OpenAI
 * - does NOT diagnose
 * - does NOT prescribe treatment
 * - does NOT create medical risk scores
 * - does NOT replace Health Trends
 *
 * Health Trends owns measurement trajectories.
 * Health Intelligence owns relationships across the record.
 */

import {
  canonicalizeMedicalEntity,
  createFindingKey,
  daysBetween,
  extractMedicalEntities,
  getMedicalEntityDisplayName,
  getMedicalEntityDomain,
  normalizeDate,
  normalizeFindingText,
  normalizeMedicationName,
  normalizeReportType,
} from "./normalize";

import type {
  HealthIntelligenceConfidence,
  HealthIntelligenceClinicianQuestion,
  HealthIntelligenceDomain,
  HealthIntelligenceEngineOptions,
  HealthIntelligenceEvidence,
  HealthIntelligenceGoal,
  HealthIntelligenceInsight,
  HealthIntelligenceInsightType,
  HealthIntelligencePriority,
  HealthIntelligenceRecord,
  HealthIntelligenceRecordIntegrity,
  HealthIntelligenceRecordSnapshot,
  HealthIntelligenceReport,
  HealthIntelligenceResult,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Internal types                                                             */
/* -------------------------------------------------------------------------- */

interface FindingOccurrence {
  key: string;
  display: string;
  report: HealthIntelligenceReport;
  detail: string;
  date: string | null;
}

interface DomainReportGroup {
  domain: HealthIntelligenceDomain;
  reports: HealthIntelligenceReport[];
}

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const DEFAULT_OPTIONS: Required<HealthIntelligenceEngineOptions> = {
  maxPerCategory: 8,
  maxEvidencePerInsight: 5,
  temporalAssociationDays: 90,
};

/* -------------------------------------------------------------------------- */
/* Basic helpers                                                              */
/* -------------------------------------------------------------------------- */

function uniqueStrings(values: string[]): string[] {
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

function sortByDate<T extends { date?: string | null }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) =>
    (a.date ?? "9999-12-31").localeCompare(
      b.date ?? "9999-12-31",
    ),
  );
}

function latestDate(
  dates: Array<string | null | undefined>,
): string | null {
  const valid = dates
    .filter(
      (date): date is string =>
        Boolean(date),
    )
    .sort();

  return valid.length > 0
    ? valid[valid.length - 1]
    : null;
}

function earliestDate(
  dates: Array<string | null | undefined>,
): string | null {
  const valid = dates
    .filter(
      (date): date is string =>
        Boolean(date),
    )
    .sort();

  return valid.length > 0
    ? valid[0]
    : null;
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.max(
    minimum,
    Math.min(maximum, value),
  );
}

function getFindingFamily(
  value: string,
): {
  key: string;
  label: string;
} | null {
  const text = value
    .trim()
    .toLowerCase();

  if (
    /\b(ldl|hdl|vldl|triglyceride|triglycerides|total cholesterol|cholesterol|non[-\s]?hdl)\b/.test(
      text,
    )
  ) {
    return {
      key: "lipid-profile",
      label: "lipid profile",
    };
  }

  if (
    /\b(hba1c|hemoglobin a1c|glycated hemoglobin|fasting glucose|fasting blood sugar|blood glucose|blood sugar)\b/.test(
      text,
    )
  ) {
    return {
      key: "glycemic-control",
      label: "glycemic control",
    };
  }

  if (
    /\b(creatinine|egfr|estimated gfr|bun|urea|uric acid)\b/.test(
      text,
    )
  ) {
    return {
      key: "kidney-function",
      label: "kidney function",
    };
  }

  if (
    /\b(alt|ast|alp|alkaline phosphatase|bilirubin|ggt|gamma[-\s]?gt|albumin|liver)\b/.test(
      text,
    )
  ) {
    return {
      key: "liver-function",
      label: "liver function",
    };
  }

  if (
    /\b(hemoglobin|haemoglobin|rbc|red blood cell|wbc|white blood cell|platelet|hematocrit|haematocrit|mcv|mch|mchc)\b/.test(
      text,
    )
  ) {
    return {
      key: "blood-count",
      label: "blood count",
    };
  }

  if (
    /\b(tsh|t3|t4|free t3|free t4|thyroid)\b/.test(
      text,
    )
  ) {
    return {
      key: "thyroid",
      label: "thyroid function",
    };
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Evidence                                                                   */
/* -------------------------------------------------------------------------- */

function reportEvidence(
  report: HealthIntelligenceReport,
  detail: string,
): HealthIntelligenceEvidence {
  return {
    sourceId: report.id,

    sourceType: "medical_report",

    title:
      report.fileName ||
      report.reportType ||
      "Medical report",

    date:
      report.reportDate,

    detail,

    reportId:
      report.id,
  };
}

function observationEvidence(
  observation: {
    id: string;
    medicalReportId: string | null;
    observationDate: string | null;
    testName: string;
    value: number | null;
    unit: string | null;
    abnormalFlag: string | null;
  },
): HealthIntelligenceEvidence {
  return {
    sourceId: observation.id,

    sourceType: "medical_observation",

    title:
      observation.testName,

    date:
      observation.observationDate,

    detail:
      [
        observation.testName,

        observation.value !== null
          ? String(observation.value)
          : null,

        observation.unit,

        observation.abnormalFlag,
      ]
        .filter(Boolean)
        .join(" "),

    reportId:
      observation.medicalReportId,
  };
}

function medicationEvidence(
  medication: {
    id: string;
    medicineName: string;
    dosage: string | null;
    frequency: string | null;
    startDate: string | null;
    endDate: string | null;
    status: string | null;
  },
): HealthIntelligenceEvidence {
  return {
    sourceId:
      medication.id,

    sourceType:
      "medication",

    title:
      medication.medicineName,

    date:
      medication.startDate,

    detail:
      [
        medication.medicineName,
        medication.dosage,
        medication.frequency,
        medication.status,
      ]
        .filter(Boolean)
        .join(" "),

    reportId:
      null,
  };
}

function conditionEvidence(
  condition: {
    id: string;
    conditionName: string;
    diagnosedDate: string | null;
    status: string | null;
    notes: string | null;
  },
): HealthIntelligenceEvidence {
  return {
    sourceId:
      condition.id,

    sourceType:
      "condition",

    title:
      condition.conditionName,

    date:
      condition.diagnosedDate,

    detail:
      [
        condition.conditionName,
        condition.status,
        condition.notes,
      ]
        .filter(Boolean)
        .join(" — "),

    reportId:
      null,
  };
}

/* -------------------------------------------------------------------------- */
/* Insight factory                                                            */
/* -------------------------------------------------------------------------- */

function makeInsight(
  input: {
    id: string;

    type: HealthIntelligenceInsightType;

    domain: HealthIntelligenceDomain;

    priority: HealthIntelligencePriority;

    confidence: HealthIntelligenceConfidence;

    title: string;

    statement: string;

    what: string;

    why: string;

    evidence: HealthIntelligenceEvidence[];

    limitation?: string;

    relatedEntities?: string[];

    ruleId: string;
  },
  options: Required<HealthIntelligenceEngineOptions>,
): HealthIntelligenceInsight {
  const evidence = input.evidence
    .slice(
      0,
      options.maxEvidencePerInsight,
    );

  return {
    id:
      input.id,

    type:
      input.type,

    domain:
      input.domain,

    priority:
      input.priority,

    confidence:
      input.confidence,

    title:
      input.title,

    statement:
      input.statement,

    what:
      input.what,

    why:
      input.why,

    evidence,

    limitation:
      input.limitation ??
      "This is a record-level observation based only on information currently available in Previa. It is not a diagnosis or treatment recommendation.",

    firstDate:
      earliestDate(
        evidence.map(
          (item) => item.date,
        ),
      ),

    lastDate:
      latestDate(
        evidence.map(
          (item) => item.date,
        ),
      ),

    relatedEntities:
      uniqueStrings(
        input.relatedEntities ??
          [],
      ),

    ruleId:
      input.ruleId,
  };
}

/* -------------------------------------------------------------------------- */
/* Report text                                                                */
/* -------------------------------------------------------------------------- */

function reportText(
  report: HealthIntelligenceReport,
): string {
  const analysis =
    report.analysis;

  if (!analysis) {
    return [
      report.fileName,
      report.reportType,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    report.fileName,

    report.reportType,

    analysis.summary,

    ...analysis.diagnoses,

    ...analysis.abnormalFindings,

    ...analysis.normalFindings,

    ...analysis.possibleConditions,

    ...analysis.recommendations,

    ...analysis.followUpTests,
  ]
    .filter(Boolean)
    .join(" ");
}

/* -------------------------------------------------------------------------- */
/* Domain detection                                                           */
/* -------------------------------------------------------------------------- */

function domainForEntity(
  entity: string,
): HealthIntelligenceDomain {
  return (
    getMedicalEntityDomain(
      entity,
    ) as HealthIntelligenceDomain | null
  ) ?? "general";
}

function domainsForReport(
  report: HealthIntelligenceReport,
): Set<HealthIntelligenceDomain> {
  const domains =
    new Set<HealthIntelligenceDomain>();

  const text =
    reportText(report);

  const entities =
    extractMedicalEntities(
      text,
    );

  for (const entity of entities) {
    domains.add(
      domainForEntity(
        entity.canonical,
      ),
    );
  }

  const normalizedType =
    normalizeReportType(
      report.reportType,
      report.fileName,
    );

  if (
    normalizedType ===
      "doppler" ||
    normalizedType ===
      "imaging"
  ) {
    if (
      /\b(carotid|artery|vascular|doppler|stenosis|plaque)\b/i.test(
        text,
      )
    ) {
      domains.add(
        "cardiovascular",
      );
    }

    if (
      /\b(brain|cerebral|intracranial|head)\b/i.test(
        text,
      )
    ) {
      domains.add(
        "neurological",
      );
    }
  }

  if (
    normalizedType ===
    "sonography"
  ) {
    if (
      /\b(thyroid)\b/i.test(
        text,
      )
    ) {
      domains.add(
        "thyroid",
      );
    }

    if (
      /\b(kidney|renal)\b/i.test(
        text,
      )
    ) {
      domains.add(
        "kidney",
      );
    }

    if (
      /\b(liver|hepatic)\b/i.test(
        text,
      )
    ) {
      domains.add(
        "liver",
      );
    }
  }

  return domains;
}

function isVascularImagingReport(
  report: HealthIntelligenceReport,
): boolean {
  const text = reportText(report);

  const reportType = normalizeReportType(
    report.reportType,
    report.fileName,
  );

  const imagingLike =
    reportType === "imaging" ||
    reportType === "doppler" ||
    /\b(ct angiogram|cta|doppler|ultrasound|angiography|mra|mri)\b/i.test(text);

  if (!imagingLike) {
    return false;
  }

  return /\b(carotid|vertebral|artery|arterial|stenosis|atherosclerosis|plaque|ischemic)\b/i.test(
    text,
  );
}

/* -------------------------------------------------------------------------- */
/* Record snapshot                                                            */
/* -------------------------------------------------------------------------- */

function buildRecordSnapshot(
  record: HealthIntelligenceRecord,
): HealthIntelligenceRecordSnapshot {
  const reportTypes = uniqueStrings(
    record.reports.map(
      (report) =>
        normalizeReportType(
          report.reportType,
          report.fileName,
        ),
    ),
  );

  const dates = [
    ...record.reports.map(
      (report) =>
        report.reportDate,
    ),

    ...record.observations.map(
      (observation) =>
        observation.observationDate,
    ),

    ...record.medications.map(
      (medication) =>
        medication.startDate,
    ),

    ...record.conditions.map(
      (condition) =>
        condition.diagnosedDate,
    ),
  ];

  const normalizedTypes =
    record.reports.map(
      (report) =>
        normalizeReportType(
          report.reportType,
          report.fileName,
        ),
    );

  return {
    reportCount:
      record.reports.length,

    analyzedReportCount:
      record.reports.filter(
        (report) =>
          report.hasAnalysis,
      ).length,

    observationCount:
      record.observations.length,

    medicationCount:
      record.medications.length,

    conditionCount:
      record.conditions.length,

    goalCount:
      record.goals.length,

    reportTypes,

    dateRange: {
      from:
        earliestDate(dates),

      to:
        latestDate(dates),
    },

    sourceCoverage: {
      laboratory:
        normalizedTypes.filter(
          (type) =>
            type ===
            "laboratory",
        ).length,

      imaging:
        normalizedTypes.filter(
          (type) =>
            type ===
            "imaging",
        ).length,

      sonography:
        normalizedTypes.filter(
          (type) =>
            type ===
            "sonography",
        ).length,

      doppler:
        normalizedTypes.filter(
          (type) =>
            type ===
            "doppler",
        ).length,

      consultation:
        normalizedTypes.filter(
          (type) =>
            type ===
            "consultation",
        ).length,

      prescription:
        normalizedTypes.filter(
          (type) =>
            type ===
            "prescription",
        ).length,

      discharge:
        normalizedTypes.filter(
          (type) =>
            type ===
            "discharge",
        ).length,

      other:
        normalizedTypes.filter(
          (type) =>
            ![
              "laboratory",
              "imaging",
              "sonography",
              "doppler",
              "consultation",
              "prescription",
              "discharge",
            ].includes(type),
        ).length,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Record integrity                                                           */
/* -------------------------------------------------------------------------- */

function buildRecordIntegrity(
  record: HealthIntelligenceRecord,
): HealthIntelligenceRecordIntegrity {
  const hasReports =
    record.reports.length > 0;

  const hasAnalyses =
    record.reports.some(
      (report) =>
        report.hasAnalysis,
    );

  const hasObservations =
    record.observations.length > 0;

  const hasMedications =
    record.medications.length > 0;

  const hasConditions =
    record.conditions.length > 0;

  const hasLongitudinalEvidence =
    record.observations.some(
      (observation) =>
        Boolean(
          observation.observationDate,
        ),
    ) ||
    record.reports.some(
      (report) =>
        Boolean(
          report.reportDate,
        ),
    );

  let score = 0;

  if (hasReports) {
    score += 20;
  }

  if (hasAnalyses) {
    score += 15;
  }

  if (hasObservations) {
    score += 20;
  }

  if (hasMedications) {
    score += 15;
  }

  if (hasConditions) {
    score += 15;
  }

  if (hasLongitudinalEvidence) {
    score += 15;
  }

  score = clamp(
    score,
    0,
    100,
  );

  let label:
    | "well_documented"
    | "partially_documented"
    | "limited_record";

  if (score >= 70) {
    label =
      "well_documented";
  } else if (score >= 40) {
    label =
      "partially_documented";
  } else {
    label =
      "limited_record";
  }

  const missing: string[] = [];

  if (!hasReports) {
    missing.push(
      "medical reports",
    );
  }

  if (!hasAnalyses) {
    missing.push(
      "stored report analysis",
    );
  }

  if (!hasObservations) {
    missing.push(
      "structured observations",
    );
  }

  if (!hasMedications) {
    missing.push(
      "medication records",
    );
  }

  if (!hasConditions) {
    missing.push(
      "condition records",
    );
  }

  if (!hasLongitudinalEvidence) {
    missing.push(
      "dated longitudinal evidence",
    );
  }

  const explanation =
    missing.length === 0
      ? "Previa has multiple categories of dated medical information available for longitudinal reasoning."
      : `The available record does not currently contain some categories of information: ${missing.join(", ")}.`;

  return {
    score,

    label,

    explanation,

    factors: {
      reports:
        hasReports,

      analyses:
        hasAnalyses,

      observations:
        hasObservations,

      medications:
        hasMedications,

      conditions:
        hasConditions,

      longitudinalEvidence:
        hasLongitudinalEvidence,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Persistent findings                                                        */
/* -------------------------------------------------------------------------- */

function buildVascularImagingFindings(
  record: HealthIntelligenceRecord,
  options: Required<HealthIntelligenceEngineOptions>,
): HealthIntelligenceInsight[] {
  const insights: HealthIntelligenceInsight[] = [];

  for (const report of record.reports) {
    const analysis = report.analysis;

    if (!analysis || !isVascularImagingReport(report)) {
      continue;
    }

    const findings = uniqueStrings(analysis.abnormalFindings);

    if (findings.length === 0) {
      continue;
    }

    const normalContext = uniqueStrings(analysis.normalFindings)
      .slice(0, 2)
      .join("; ");

    const relatedEntities = uniqueStrings(
      findings.flatMap((finding) =>
        extractMedicalEntities(finding).map((entity) => entity.canonical),
      ),
    );

    insights.push(
      makeInsight(
        {
          id: `vascular-imaging:${report.id}`,
          type: "new_finding",
          domain: "cardiovascular",
          priority: "medium",
          confidence: "strong",
          title:
            findings.length === 1
              ? "Documented vascular imaging finding"
              : "Documented vascular imaging findings",
          statement: `"${report.fileName}" documents ${findings.length} vascular imaging finding${findings.length === 1 ? "" : "s"}: ${findings.join("; ")}.`,
          what:
            "This insight preserves the saved abnormal findings from a vascular imaging report so they can be reviewed alongside the rest of the record.",
          why:
            "Narrative imaging findings may be clinically relevant even when the report has no linked numeric medical_observations.",
          evidence: [
            reportEvidence(
              report,
              normalContext
                ? `Documented findings: ${findings.join("; ")}. Saved normal context: ${normalContext}.`
                : `Documented findings: ${findings.join("; ")}.`,
            ),
          ],
          relatedEntities,
          limitation:
            "This reports the wording saved from the imaging analysis. It does not establish the current status of a finding, progression, risk, diagnosis, or treatment need.",
          ruleId: "VASCULAR-IMAGING-001",
        },
        options,
      ),
    );
  }

  return insights;
}

function buildPersistentFindings(
  record: HealthIntelligenceRecord,
  options: Required<HealthIntelligenceEngineOptions>,
): HealthIntelligenceInsight[] {
  const occurrences =
    new Map<
      string,
      FindingOccurrence[]
    >();

  for (const report of record.reports) {
    const analysis =
      report.analysis;

    if (!analysis) {
      continue;
    }

    const statements = uniqueStrings([
      ...analysis.abnormalFindings,
      ...analysis.diagnoses,
    ]);

    for (const statement of statements) {
      const key =
        createFindingKey(
          statement,
        );

      if (!key) {
        continue;
      }

      const family =
        getFindingFamily(
          statement,
        );

      const groupingKey =
        family?.key ??
        key;

      const list =
        occurrences.get(
          groupingKey,
        ) ?? [];

      list.push({
        key,
        display:
          normalizeFindingText(
            statement,
          ) ||
          statement,
        report,
        detail:
          statement,
        date:
          report.reportDate,
      });

      occurrences.set(
        groupingKey,
        list,
      );
    }
  }

  const insights: HealthIntelligenceInsight[] =
    [];

  for (
    const [
      groupingKey,
      items,
    ] of occurrences
  ) {
    const uniqueReports =
      new Map<
        string,
        FindingOccurrence
      >();

    for (const item of items) {
      if (
        !uniqueReports.has(
          item.report.id,
        )
      ) {
        uniqueReports.set(
          item.report.id,
          item,
        );
      }
    }

    if (
      uniqueReports.size <
      2
    ) {
      continue;
    }

    const sorted =
      sortByDate(
        Array.from(
          uniqueReports.values(),
        ).map(
          (item) => ({
            ...item,
            date: item.date,
          }),
        ),
      );

    const family =
      getFindingFamily(
        items
          .map(
            (item) =>
              item.display,
          )
          .join(" "),
      );

    const display =
      family?.label ??
      getMedicalEntityDisplayName(
        groupingKey,
      );

    const relatedEntities =
      uniqueStrings(
        items.map(
          (item) =>
            item.key,
        ),
      );

    const evidence =
      sorted
        .slice(
          0,
          options.maxEvidencePerInsight,
        )
        .map(
          (item) =>
            reportEvidence(
              item.report,
              item.detail,
            ),
        );

    const findingCount =
      relatedEntities.length;

    const statement =
      family
        ? `The ${display} pattern is documented across ${uniqueReports.size} separate medical reports, involving ${findingCount} related finding${findingCount === 1 ? "" : "s"}.`
        : `"${display}" appears in ${uniqueReports.size} separate medical reports.`;

    const what =
      family
        ? `Related ${display} findings recur across the available record rather than appearing as an isolated mention.`
        : `The same normalized finding is documented across ${uniqueReports.size} reports.`;

    insights.push(
      makeInsight(
        {
          id:
            `persistence:${groupingKey}`,

          type:
            "persistence",

          domain:
            family
              ? (
                  items.some(
                    (item) =>
                      domainForEntity(
                        item.key,
                      ) ===
                      "metabolic",
                  )
                    ? "metabolic"
                    : domainForEntity(
                        items[0]
                          .key,
                      )
                )
              : domainForEntity(
                  groupingKey,
                ),

          priority:
            "medium",

          confidence:
            uniqueReports.size >= 3
              ? "strong"
              : "moderate",

          title:
            family
              ? `Persistent ${display} pattern`
              : "Persistent documented finding",

          statement,

          what,

          why:
            "Repeated evidence across separate reports can reveal a longitudinal pattern that is less obvious when each document is reviewed separately.",

          evidence,

          relatedEntities,

          limitation:
            family
              ? "The engine groups closely related findings into one clinical story. It does not determine whether the individual measurements improved or worsened; Health Trends owns measurement trajectories."
              : undefined,

          ruleId:
            family
              ? "PERSISTENCE-002"
              : "PERSISTENCE-001",
        },
        options,
      ),
    );
  }

  return insights;
}

/* -------------------------------------------------------------------------- */
/* New findings                                                               */
/* -------------------------------------------------------------------------- */

function buildNewFindings(
  record: HealthIntelligenceRecord,
  options: Required<HealthIntelligenceEngineOptions>,
): HealthIntelligenceInsight[] {
  const datedReports =
    sortByDate(
      record.reports.map(
        (report) => ({
          report,
          date: report.reportDate,
        }),
      ),
    );

  if (datedReports.length === 0) {
    return [];
  }

  const latest =
    datedReports[
      datedReports.length - 1
    ].report;

  const previousReports =
    datedReports
      .slice(
        0,
        -1,
      )
      .map(
        (item) =>
          item.report,
      );

  if (
    previousReports.length === 0
  ) {
    return [];
  }

  const latestAnalysis =
    latest.analysis;

  if (
    !latestAnalysis ||
    isVascularImagingReport(latest)
  ) {
    return [];
  }

  const latestFindings =
    uniqueStrings([
      ...latestAnalysis.abnormalFindings,
      ...latestAnalysis.diagnoses,
    ]);

  if (
    latestFindings.length === 0
  ) {
    return [];
  }

  const previousText =
    previousReports
      .map(
        (report) =>
          reportText(
            report,
          ).toLowerCase(),
      )
      .join("\n");

  const groups =
    new Map<
      string,
      string[]
    >();

  for (
    const finding of latestFindings
  ) {
    const key =
      createFindingKey(
        finding,
      );

    if (!key) {
      continue;
    }

    /*
     * If the finding or one of its close textual representations already
     * exists in earlier evidence, it is not a genuinely new finding.
     */
    const normalized =
      normalizeFindingText(
        finding,
      ).toLowerCase();

    const family =
      getFindingFamily(
        finding,
      );

    const alreadyPresent =
      previousReports.some(
        (report) => {
          const text =
            reportText(
              report,
            ).toLowerCase();

          if (
            text.includes(
              normalized,
            )
          ) {
            return true;
          }

          const previousEntities =
            extractMedicalEntities(
              text,
            );

          return previousEntities.some(
            (entity) =>
              entity.canonical ===
              key,
          );
        },
      );

    if (alreadyPresent) {
      continue;
    }

    const groupingKey =
      family?.key ??
      key;

    const group =
      groups.get(
        groupingKey,
      ) ?? [];

    group.push(
      finding,
    );

    groups.set(
      groupingKey,
      group,
    );
  }

  const insights: HealthIntelligenceInsight[] =
    [];

  for (
    const [
      groupingKey,
      findings,
    ] of groups
  ) {
    const family =
      getFindingFamily(
        findings.join(" "),
      );

    const display =
      family?.label ??
      normalizeFindingText(
        findings[0],
      );

    const relatedEntities =
      uniqueStrings(
        findings.map(
          (finding) =>
            createFindingKey(
              finding,
            ),
        ),
      );

    const evidence =
      [
        reportEvidence(
          latest,
          findings.join(
            "; ",
          ),
        ),
      ];

    const findingCount =
      findings.length;

    const statement =
      family
        ? `The latest medical report introduces a new ${display} pattern involving ${findingCount} related finding${findingCount === 1 ? "" : "s"}.`
        : `The latest medical report introduces a finding that was not identified in the earlier available reports: ${display}.`;

    insights.push(
      makeInsight(
        {
          id:
            `new:${groupingKey}`,

          type:
            "new_finding",

          domain:
            family
              ? domainForEntity(
                  relatedEntities[0] ??
                    groupingKey,
                )
              : domainForEntity(
                  groupingKey,
                ),

          priority:
            "medium",

          confidence:
            "moderate",

          title:
            family
              ? `New ${display} finding`
              : "Newly documented finding",

          statement,

          what:
            family
              ? `The latest report contains several related findings that were not represented in the earlier available record.`
              : `This finding appears in the latest report without a matching earlier finding in the available record.`,

          why:
            "A newly documented finding can change the context in which the rest of the record is interpreted.",

          evidence,
          
          relatedEntities,

          limitation:
            "New means newly documented in the available record. It does not establish when the underlying medical change actually began.",

          ruleId:
            family
              ? "NEW-FINDING-002"
              : "NEW-FINDING-001",
        },
        options,
      ),
    );
  }

  return insights;
}

/* -------------------------------------------------------------------------- */
/* Cross-report connections                                                   */
/* -------------------------------------------------------------------------- */

function buildConnections(
  record: HealthIntelligenceRecord,
  options: Required<HealthIntelligenceEngineOptions>,
): HealthIntelligenceInsight[] {
  const entityReports =
    new Map<
      string,
      HealthIntelligenceReport[]
    >();

  for (const report of record.reports) {
    const entities =
      extractMedicalEntities(
        reportText(report),
      );

    for (const entity of entities) {
      const reports =
        entityReports.get(
          entity.canonical,
        ) ?? [];

      if (
        !reports.some(
          (item) =>
            item.id ===
            report.id,
        )
      ) {
        reports.push(
          report,
        );
      }

      entityReports.set(
        entity.canonical,
        reports,
      );
    }
  }

  const insights: HealthIntelligenceInsight[] =
    [];

  for (
    const [
      entity,
      reports,
    ] of entityReports
  ) {
    if (
      reports.length <
      2
    ) {
      continue;
    }

    const reportTypes =
      uniqueStrings(
        reports.map(
          (report) =>
            normalizeReportType(
              report.reportType,
              report.fileName,
            ),
        ),
      );

    /*
     * A connection requires genuinely different evidence contexts.
     *
     * Two laboratory reports repeating the same entity are persistence,
     * not a cross-source connection.
     */
    if (
      reportTypes.length <
      2
    ) {
      continue;
    }

    const family =
      getFindingFamily(
        entity,
      );

    const display =
      family?.label ??
      getMedicalEntityDisplayName(
        entity,
      );

    const evidence =
      reports
        .slice(
          0,
          options.maxEvidencePerInsight,
        )
        .map(
          (report) =>
            reportEvidence(
              report,
              `Related evidence involving ${display}.`,
            ),
        );

    insights.push(
      makeInsight(
        {
          id:
            `connection:entity:${entity}`,

          type:
            "connection",

          domain:
            domainForEntity(
              entity,
            ),

          priority:
            "medium",

          confidence:
            reports.length >= 3
              ? "strong"
              : "moderate",

          title:
            family
              ? `Connected ${display} evidence`
              : `Connected evidence for ${getMedicalEntityDisplayName(entity)}`,

          statement:
            `${display} appears across ${reportTypes.join(" and ")} evidence in the available record.`,

          what:
            `The same clinical entity is represented across different types of medical evidence rather than only within repeated reports of the same type.`,

          why:
            "Considering the evidence together can provide context that is not visible when each document or evidence type is reviewed in isolation.",

          evidence,

          relatedEntities:
            [entity],

          limitation:
            "The engine identifies an evidence relationship. It does not infer causation or determine that one finding caused another.",

          ruleId:
            "CONNECTION-002",
        },
        options,
      ),
    );
  }

  return insights;
}

/* -------------------------------------------------------------------------- */
/* Conflicting documented evidence                                            */
/* -------------------------------------------------------------------------- */

function buildConflicts(
  record: HealthIntelligenceRecord,
  options: Required<HealthIntelligenceEngineOptions>,
): HealthIntelligenceInsight[] {
  const insights: HealthIntelligenceInsight[] = [];

  /*
   * A structured-value conflict is meaningful only when:
   * - the same normalized observation is involved,
   * - the observations have the same date,
   * - there are multiple stored values,
   * - and the values are genuinely different.
   *
   * This is a documentation-integrity signal, not a medical interpretation.
   */
  const observationGroups =
    new Map<
      string,
      typeof record.observations
    >();

  for (const observation of record.observations) {
    const canonical =
      canonicalizeMedicalEntity(
        observation.normalizedName ??
          observation.testName,
      ) ??
      observation.normalizedName ??
      observation.testName
        .trim()
        .toLowerCase();

    const observationDate =
      observation.observationDate;

    if (!observationDate) {
      continue;
    }

    const key =
      `${canonical}|${observationDate}`;

    const list =
      observationGroups.get(
        key,
      ) ?? [];

    list.push(
      observation,
    );

    observationGroups.set(
      key,
      list,
    );
  }

  for (
    const [
      key,
      observations,
    ] of observationGroups
  ) {
    /*
     * Ignore observations from the same report.
     *
     * Duplicate rows inside one report are much more likely to represent
     * extraction/storage duplication than a true cross-source conflict.
     */
    const distinctSources =
new Set(
  observations.map(
    (observation) =>
      `${observation.observationDate}|${observation.testName}|${observation.unit ?? ""}`,
  ),
);

if (distinctSources.size < 2) {
continue;
}

    const numeric =
      observations.filter(
        (item) =>
          item.value !== null &&
          item.value !== undefined,
      );

    const distinctValues =
      new Set(
        numeric.map(
          (item) =>
            `${item.value}|${item.unit ?? ""}`,
        ),
      );

    if (
      numeric.length < 2 ||
      distinctValues.size < 2
    ) {
      continue;
    }

    const entity =
      key.split("|")[0];

    insights.push(
      makeInsight(
        {
          id:
            `conflict:observation:${key}`,

          type:
            "conflict",

          domain:
            domainForEntity(
              entity,
            ),

          priority:
            "high",

          confidence:
            "strong",

          title:
            "Conflicting recorded values",

          statement:
            `${getMedicalEntityDisplayName(entity)} has different structured values recorded for the same date across separate source records.`,

          what:
            "Two or more separate source records contain different values for the same normalized measurement and date.",

          why:
            "Conflicting source values can affect how confidently the longitudinal record can be interpreted.",

          evidence:
            numeric
              .slice(
                0,
                options.maxEvidencePerInsight,
              )
              .map(
                observationEvidence,
              ),

          relatedEntities:
            [entity],

          limitation:
            "Previa is identifying a documentation conflict. It cannot determine which recorded value is correct without additional source context.",

          ruleId:
            "CONFLICT-001",
        },
        options,
      ),
    );
  }

  /*
   * Do NOT treat normal/resolved vs abnormal findings as a conflict.
   *
   * That difference may represent:
   * - improvement,
   * - recurrence,
   * - different examination context,
   * - different anatomy,
   * - different modality,
   * - or ordinary documentation variation.
   *
   * These situations belong to longitudinal/change intelligence rather
   * than record-integrity conflicts.
   *
   * Therefore CONFLICT-002 is intentionally suppressed here.
   */

  return insights;
}

/* -------------------------------------------------------------------------- */
/* Care continuity / open loops                                               */
/* -------------------------------------------------------------------------- */

function buildCareLoops(
  record: HealthIntelligenceRecord,
  options: Required<HealthIntelligenceEngineOptions>,
): HealthIntelligenceInsight[] {
  const datedReports =
    record.reports
      .filter(
        (report) =>
          Boolean(report.reportDate),
      )
      .sort(
        (a, b) =>
          (
            a.reportDate ??
            ""
          ).localeCompare(
            b.reportDate ??
              "",
          ),
      );

  type OpenLoop = {
    key: string;
    followUps: string[];
    report: HealthIntelligenceReport;
    entities: string[];
  };

  const openLoops =
    new Map<
      string,
      OpenLoop
    >();

  for (const report of datedReports) {
    const analysis =
      report.analysis;

    if (!analysis) {
      continue;
    }

    for (
      const followUp of analysis.followUpTests
    ) {
      const normalizedFollowUp =
        normalizeFindingText(
          followUp,
        ).toLowerCase();

      if (!normalizedFollowUp) {
        continue;
      }

      const reportIndex =
        datedReports.findIndex(
          (item) =>
            item.id ===
            report.id,
        );

      const laterReports =
        datedReports.slice(
          reportIndex + 1,
        );

      const followUpEntities =
        extractMedicalEntities(
          followUp,
        );

      const laterEvidence =
        laterReports.filter(
          (laterReport) => {
            const text =
              normalizeFindingText(
                reportText(
                  laterReport,
                ),
              ).toLowerCase();

            return (
              text.includes(
                normalizedFollowUp,
              ) ||
              followUpEntities.some(
                (entity) =>
                  text.includes(
                    entity.displayName
                      .toLowerCase(),
                  ) ||
                  text.includes(
                    entity.canonical
                      .replace(
                        /_/g,
                        " ",
                      ),
                  ),
              )
            );
          },
        );

      if (
        laterEvidence.length >
        0
      ) {
        continue;
      }

      const latestLaterDate =
        latestDate(
          laterReports.map(
            (item) =>
              item.reportDate,
          ),
        );

      const days =
        daysBetween(
          report.reportDate,
          latestLaterDate,
        );

      if (
        laterReports.length > 0 &&
        (days === null ||
          days < 30)
      ) {
        continue;
      }

      /*
       * Group related follow-up requests into one open loop.
       *
       * Entity-based grouping is preferred. If the follow-up has no
       * extractable medical entity, its normalized wording becomes the key.
       */
      const entityKeys =
        uniqueStrings(
          followUpEntities.map(
            (entity) =>
              entity.canonical,
          ),
        );

      const family =
        getFindingFamily(
          followUp,
        );

      const groupingKey =
        family?.key ??
        entityKeys[0] ??
        normalizedFollowUp;

      const existing =
        openLoops.get(
          groupingKey,
        );

      if (existing) {
        existing.followUps.push(
          followUp,
        );

        existing.entities.push(
          ...entityKeys,
        );

        continue;
      }

      openLoops.set(
        groupingKey,
        {
          key:
            groupingKey,

          followUps: [
            followUp,
          ],

          report,

          entities:
            entityKeys,
        },
      );
    }
  }

  const insights: HealthIntelligenceInsight[] =
    [];

  for (
    const loop of openLoops.values()
  ) {
    const family =
      getFindingFamily(
        loop.followUps.join(
          " ",
        ),
      );

    const display =
      family?.label ??
      (
        loop.followUps.length === 1
          ? loop.followUps[0]
          : "related follow-up items"
      );

    const relatedEntities =
      uniqueStrings(
        loop.entities,
      );

    const followUpSummary =
      uniqueStrings(
        loop.followUps,
      )
        .slice(
          0,
          options.maxEvidencePerInsight,
        )
        .join(
          "; ",
        );

    const evidence = [
      reportEvidence(
        loop.report,
        `Documented follow-up: ${followUpSummary}`,
      ),
    ];

    insights.push(
      makeInsight(
        {
          id:
            `care-loop:${loop.key}`,

          type:
            "care_loop",

          domain:
            "care_continuity",

          priority:
            "medium",

          confidence:
            "moderate",

          title:
            family
              ? `Open ${display} follow-up`
              : "Open documented follow-up",

          statement:
            `The available record contains ${loop.followUps.length} related follow-up item${loop.followUps.length === 1 ? "" : "s"} without matching later documentation.`,

          what:
            `The record contains this documented follow-up: "${followUpSummary}".`,

          why:
            "Follow-up information can become difficult to track when it is distributed across separate medical records.",

          evidence,

          relatedEntities,

          limitation:
            "No matching documentation was found in the records available to Previa. This does not establish that the follow-up did not occur outside the available record.",

          ruleId:
            "CARE-LOOP-002",
        },
        options,
      ),
    );
  }

  return insights;
}

/* -------------------------------------------------------------------------- */
/* Medication intelligence                                                    */
/* -------------------------------------------------------------------------- */

function buildMedicationSignals(
  record: HealthIntelligenceRecord,
  options: Required<HealthIntelligenceEngineOptions>,
): HealthIntelligenceInsight[] {
  const insights: HealthIntelligenceInsight[] =
    [];

  /*
   * Duplicate medication records.
   *
   * We only compare the stored medication names. We do not infer whether two
   * different brand names contain the same active ingredient.
   */
  const medicationGroups =
    new Map<
      string,
      typeof record.medications
    >();

  for (const medication of record.medications) {
    const key =
      normalizeMedicationName(
        medication.medicineName,
      );

    if (!key) {
      continue;
    }

    const list =
      medicationGroups.get(
        key,
      ) ?? [];

    list.push(
      medication,
    );

    medicationGroups.set(
      key,
      list,
    );
  }

  for (
    const [
      medicationName,
      medications,
    ] of medicationGroups
  ) {
    if (
      medications.length <
      2
    ) {
      continue;
    }

    const activeLike =
      medications.filter(
        (medication) =>
          !medication.endDate &&
          medication.status !==
            "stopped" &&
          medication.status !==
            "inactive",
      );

    if (
      activeLike.length <
      2
    ) {
      continue;
    }

    insights.push(
      makeInsight(
        {
          id:
            `medication:duplicate:${medicationName}`,

          type:
            "medication",

          domain:
            "medication",

          priority:
            "high",

          confidence:
            "strong",

          title:
            "Repeated active medication record",

          statement:
            `${activeLike.length} active-looking records exist for "${medicationName}".`,

          what:
            "The same normalized medication name appears more than once among records that do not have a recorded end date or inactive status.",

          why:
            "Repeated medication records can make it harder to distinguish one ongoing prescription from duplicate documentation.",

          evidence:
            activeLike.map(
              medicationEvidence,
            ),

          relatedEntities:
            [medicationName],

          limitation:
            "This identifies duplicate records, not duplicate therapy. Different records may represent legitimate dose changes or renewed prescriptions.",

          ruleId:
            "MEDICATION-001",
        },
        options,
      ),
    );
  }

  /*
   * Compare stored medications against medication names explicitly extracted
   * from report analyses.
   */
  const reportMedicationNames =
    new Map<
      string,
      {
        report: HealthIntelligenceReport;
        name: string;
      }[]
    >();

  for (const report of record.reports) {
    for (
      const medication of
        report.analysis
          ?.medications ??
        []
    ) {
      const key =
        normalizeMedicationName(
          medication.name,
        );

      if (!key) {
        continue;
      }

      const list =
        reportMedicationNames.get(
          key,
        ) ?? [];

      list.push({
        report,

        name:
          medication.name,
      });

      reportMedicationNames.set(
        key,
        list,
      );
    }
  }

  const storedMedicationKeys =
    new Set(
      record.medications.map(
        (medication) =>
          normalizeMedicationName(
            medication.medicineName,
          ),
      ),
    );

  for (
    const [
      medicationName,
      references,
    ] of reportMedicationNames
  ) {
    if (
      storedMedicationKeys.has(
        medicationName,
      )
    ) {
      continue;
    }

    const evidence =
      references.map(
        (reference) =>
          reportEvidence(
            reference.report,
            `Medication mentioned in stored report analysis: ${reference.name}`,
          ),
      );

    insights.push(
      makeInsight(
        {
          id:
            `medication:unreconciled:${medicationName}`,

          type:
            "medication",

          domain:
            "medication",

          priority:
            "medium",

          confidence:
            "moderate",

          title:
            "Medication mentioned in a report but not in the medication list",

          statement:
            `"${medicationName}" appears in stored report evidence but is not currently represented in the structured medication records.`,

          what:
            "A medication reference exists in a medical report analysis without a matching normalized name in the medication table.",

          why:
            "This can create a difference between the medication information contained in documents and the structured medication list.",

          evidence,

          relatedEntities:
            [medicationName],

          limitation:
            "The available record does not establish whether the medication is current, historical, discontinued, or documented elsewhere.",

          ruleId:
            "MEDICATION-002",
        },
        options,
      ),
    );
  }

  return insights;
}

/* -------------------------------------------------------------------------- */
/* Record gaps                                                                */
/* -------------------------------------------------------------------------- */

function buildRecordGaps(
  record: HealthIntelligenceRecord,
  options: Required<HealthIntelligenceEngineOptions>,
): HealthIntelligenceInsight[] {
  const insights: HealthIntelligenceInsight[] =
    [];

  const unanalyzed =
    record.reports.filter(
      (report) =>
        !report.hasAnalysis,
    );

  for (const report of unanalyzed) {
    insights.push(
      makeInsight(
        {
          id:
            `record-gap:unanalyzed:${report.id}`,

          type:
            "record_gap",

          domain:
            "record_integrity",

          priority:
            "medium",

          confidence:
            "strong",

          title:
            "Report has no stored analysis",

          statement:
            `"${report.fileName}" is present in the medical record but does not currently have stored report analysis.`,

          what:
            "The report exists as a medical record, but structured analysis is not available for the Health Intelligence engine.",

          why:
            "This means some of the information inside the report cannot currently participate fully in cross-record reasoning.",

          evidence: [
            reportEvidence(
              report,
              "Report exists without stored analysis.",
            ),
          ],

          relatedEntities:
            [],

          limitation:
            "The report itself may contain useful information that is not represented in the structured evidence available to this engine.",

          ruleId:
            "RECORD-GAP-001",
        },
        options,
      ),
    );
  }

  const reportIds = new Set(
    record.reports.map(
      (report) => report.id,
    ),
  );

  for (const observation of record.observations) {
    if (
      observation.medicalReportId &&
      reportIds.has(observation.medicalReportId)
    ) {
      continue;
    }

    insights.push(
      makeInsight(
        {
          id: `record-gap:unlinked-observation:${observation.id}`,
          type: "record_gap",
          domain: "record_integrity",
          priority: "low",
          confidence: "strong",
          title: "Measurement is not linked to an available report",
          statement: `The ${observation.testName} measurement is available for this account but is not linked to a medical report in the current record.`,
          what: "The measurement can be reviewed, but its source document cannot currently be confirmed from the available record.",
          why: "Source links help distinguish documented longitudinal evidence from data that needs reconciliation.",
          evidence: [
            observationEvidence(observation),
          ],
          relatedEntities: [],
          limitation: "This may reflect a historical import, a deleted report, or incomplete linking. It does not mean the measurement is incorrect.",
          ruleId: "RECORD-GAP-003",
        },
        options,
      ),
    );
  }

  /*
   * Reports with analysis but no structured observations are not necessarily
   * defective because imaging and narrative reports may not produce numeric
   * observations. We therefore only surface this when the report appears to
   * be laboratory-oriented.
   */
  for (const report of record.reports) {
    if (
      !report.hasAnalysis
    ) {
      continue;
    }

    const reportType =
      normalizeReportType(
        report.reportType,
        report.fileName,
      );

    if (
      reportType !==
      "laboratory"
    ) {
      continue;
    }

    const matchingObservations =
      record.observations.filter(
        (observation) =>
          observation.medicalReportId ===
          report.id,
      );

    if (
      matchingObservations.length >
      0
    ) {
      continue;
    }

    insights.push(
      makeInsight(
        {
          id:
            `record-gap:lab-observation:${report.id}`,

          type:
            "record_gap",

          domain:
            "record_integrity",

          priority:
            "low",

          confidence:
            "moderate",

          title:
            "Laboratory report without structured observations",

          statement:
            `"${report.fileName}" is classified as laboratory evidence, but no structured observations are currently linked to it.`,

          what:
            "The report has stored analysis but no corresponding medical_observations records are linked to the report.",

          why:
            "Without structured observations, the report's measurements cannot participate fully in longitudinal measurement reasoning.",

          evidence: [
            reportEvidence(
              report,
              "Laboratory report with no linked structured observations.",
            ),
          ],

          relatedEntities:
            [],

          limitation:
            "This does not mean the report is incomplete. The measurements may exist only inside the original document or stored analysis.",

          ruleId:
            "RECORD-GAP-002",
        },
        options,
      ),
    );
  }

  return insights;
}

/* -------------------------------------------------------------------------- */
/* Questions for a healthcare professional                                   */
/* -------------------------------------------------------------------------- */

function buildClinicianQuestions(
  record: HealthIntelligenceRecord,
  careLoops: HealthIntelligenceInsight[],
  options: Required<HealthIntelligenceEngineOptions>,
): HealthIntelligenceClinicianQuestion[] {
  const questions: HealthIntelligenceClinicianQuestion[] = [];
  const seen = new Set<string>();

  const addQuestion = (
    question: string,
    source: HealthIntelligenceClinicianQuestion["source"],
    evidence: HealthIntelligenceEvidence[],
    limitation: string,
  ) => {
    const normalized = question.trim().toLowerCase();

    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    questions.push({
      id: `question:${source}:${seen.size}`,
      question: question.trim(),
      source,
      evidence: evidence.slice(0, options.maxEvidencePerInsight),
      limitation,
    });
  };

  for (const report of record.reports) {
    for (const question of report.analysis?.doctorQuestions ?? []) {
      addQuestion(
        question,
        "saved_report_question",
        [reportEvidence(report, "Question saved with this report analysis.")],
        "This question was saved with a report analysis. It is a discussion prompt, not medical advice.",
      );
    }
  }

  for (const careLoop of careLoops) {
    addQuestion(
      `Could we review the documented follow-up noted in my available records: ${careLoop.what}`,
      "record_follow_up",
      careLoop.evidence,
      "This prompt reflects missing matching documentation in Previa. It does not establish that follow-up did not occur elsewhere.",
    );
  }

  return questions.slice(0, options.maxPerCategory);
}

/* -------------------------------------------------------------------------- */
/* Don't Miss This                                                            */
/* -------------------------------------------------------------------------- */

function buildDontMiss(
  candidates: HealthIntelligenceInsight[],
  options: Required<HealthIntelligenceEngineOptions>,
): HealthIntelligenceInsight[] {
  const priorityWeight: Record<
    HealthIntelligencePriority,
    number
  > = {
    high: 3,
    medium: 2,
    low: 1,
  };

  const typeWeight: Record<
    HealthIntelligenceInsightType,
    number
  > = {
    dont_miss: 6,
    conflict: 5,
    care_loop: 5,
    medication: 5,
    persistence: 4,
    new_finding: 4,
    connection: 3,
    record_gap: 2,
    change: 2,
  };

  const scored =
    candidates.map(
      (insight) => {
        let score =
          priorityWeight[
            insight.priority
          ] ?? 0;

        score +=
          typeWeight[
            insight.type
          ] ?? 0;

        score +=
          insight.evidence.length >= 2
            ? 2
            : 0;

        if (
          insight.confidence ===
          "strong"
        ) {
          score += 2;
        } else if (
          insight.confidence ===
          "moderate"
        ) {
          score += 1;
        }

        return {
          insight,
          score,
        };
      },
    );

  scored.sort(
    (a, b) =>
      b.score -
      a.score,
  );

  /*
   * Don't Miss This is a presentation layer over existing intelligence.
   *
   * We do not create duplicate insights with different text. The same
   * underlying insight object is promoted into this category.
   */
  const selected =
    scored
      .filter(
        ({ insight }) =>
          insight.type !==
          "connection",
      )
      .slice(
        0,
        options.maxPerCategory,
      )
      .map(
        ({ insight }) =>
          ({
            ...insight,

            type:
              "dont_miss" as const,

            ruleId:
              `DONT-MISS:${insight.ruleId}`,
          }),
      );

  return selected;
}

/* -------------------------------------------------------------------------- */
/* Deduplication                                                              */
/* -------------------------------------------------------------------------- */

function deduplicateInsights(
  insights: HealthIntelligenceInsight[],
): HealthIntelligenceInsight[] {
  const seen =
    new Map<
      string,
      HealthIntelligenceInsight
    >();

  for (const insight of insights) {
    const evidenceIds =
      insight.evidence
        .map(
          (item) =>
            item.sourceId,
        )
        .sort()
        .join(",");

    const key =
      [
        insight.type,
        insight.domain,
        insight.title,
        insight.relatedEntities
          .slice()
          .sort()
          .join(","),
        evidenceIds,
      ].join("|");

    if (!seen.has(key)) {
      seen.set(
        key,
        insight,
      );
    }
  }

  return Array.from(
    seen.values(),
  );
}

/* -------------------------------------------------------------------------- */
/* Priority ordering                                                          */
/* -------------------------------------------------------------------------- */

function sortInsights(
  insights: HealthIntelligenceInsight[],
): HealthIntelligenceInsight[] {
  const priorityWeight: Record<
    HealthIntelligencePriority,
    number
  > = {
    high: 3,
    medium: 2,
    low: 1,
  };

  const confidenceWeight: Record<
    HealthIntelligenceConfidence,
    number
  > = {
    strong: 3,
    moderate: 2,
    limited: 1,
  };

  return [...insights].sort(
    (a, b) => {
      const priorityDifference =
        priorityWeight[
          b.priority
        ] -
        priorityWeight[
          a.priority
        ];

      if (
        priorityDifference !==
        0
      ) {
        return priorityDifference;
      }

      const confidenceDifference =
        confidenceWeight[
          b.confidence
        ] -
        confidenceWeight[
          a.confidence
        ];

      if (
        confidenceDifference !==
        0
      ) {
        return confidenceDifference;
      }

      return (
        (
          b.lastDate ??
          ""
        ).localeCompare(
          a.lastDate ??
            "",
        )
      );
    },
  );
}

/* -------------------------------------------------------------------------- */
/* Category limiting                                                          */
/* -------------------------------------------------------------------------- */

function limitCategory(
  insights: HealthIntelligenceInsight[],
  options: Required<HealthIntelligenceEngineOptions>,
): HealthIntelligenceInsight[] {
  return sortInsights(
    deduplicateInsights(
      insights,
    ),
  ).slice(
    0,
    options.maxPerCategory,
  );
}

/* -------------------------------------------------------------------------- */
/* Summary                                                                    */
/* -------------------------------------------------------------------------- */

function buildSummary(
  record: HealthIntelligenceRecord,
  insights: HealthIntelligenceInsight[],
): string {
  const reportCount = record.reports.length;
  const observationCount = record.observations.length;

  if (reportCount === 0 && observationCount === 0) {
    return "Previa does not yet have enough medical record evidence to build a longitudinal Health Intelligence view.";
  }

  const recordContext =
    `Across ${reportCount} medical report${reportCount === 1 ? "" : "s"} and ` +
    `${observationCount} structured observation${observationCount === 1 ? "" : "s"}, `;

  const rankedInsights = sortInsights(insights);
  const leadingInsights = rankedInsights
    .filter((insight) => insight.statement.trim().length > 0)
    .filter(
      (insight, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.statement.trim().toLowerCase() ===
            insight.statement.trim().toLowerCase(),
        ) === index,
    )
    .slice(0, 2);

  const analyzedReports = record.reports
    .filter((report) => report.analysis)
    .sort((a, b) =>
      (b.reportDate ?? b.uploadedAt ?? "").localeCompare(
        a.reportDate ?? a.uploadedAt ?? "",
      ),
    );

  const savedSummaries = analyzedReports
    .map((report) => ({
      report,
      summary: report.analysis?.summary?.trim() ?? "",
    }))
    .filter((item) => item.summary.length > 0)
    .filter(
      (item, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.summary.toLowerCase() === item.summary.toLowerCase(),
        ) === index,
    )
    .slice(0, 2)
    .map(({ report, summary }) => {
      const date = report.reportDate
        ? ` (${report.reportDate})`
        : "";
      const maximumLength = 260;
      const shortened =
        summary.length > maximumLength
          ? `${summary.slice(0, maximumLength).trimEnd()}…`
          : summary;

      return `${report.fileName}${date}: ${shortened}`;
    });

  const findingText = leadingInsights.map((insight) => {
    const title = insight.title.trim();
    const statement = insight.statement.trim().replace(/[.!?]+$/, "");
    const statementAlreadyNamesTitle =
      title.length > 0 &&
      statement.toLowerCase().startsWith(title.toLowerCase());

    return statementAlreadyNamesTitle || !title
      ? statement
      : `${title}: ${statement}`;
  });

  const parts: string[] = [recordContext];

  if (savedSummaries.length > 0) {
    parts.push(
      `saved report summaries include ${savedSummaries.join(" | ")}.`,
    );
  }

  if (findingText.length > 0) {
    parts.push(
      `the cross-record review also surfaced: ${findingText.join("; ")}.`,
    );
  } else if (savedSummaries.length === 0) {
    parts.push(
      "the rule-based review did not identify a strong cross-record pattern, " +
        "conflict, persistence signal, or documented continuity gap. This does not " +
        "mean every individual report is normal; review the available report findings " +
        "for report-specific details.",
    );
  }

  if (savedSummaries.length > 0 || findingText.length > 0) {
    parts.push(
      "This overview uses previously saved report analyses and deterministic record matching; it does not generate a new AI analysis or establish a diagnosis.",
    );
  }

  return parts.join(" ");
}
/* -------------------------------------------------------------------------- */
/* Main engine                                                                */
/* -------------------------------------------------------------------------- */

export function buildHealthIntelligence(
  record: HealthIntelligenceRecord,
  inputOptions?: HealthIntelligenceEngineOptions,
): HealthIntelligenceResult {
  const options: Required<HealthIntelligenceEngineOptions> =
    {
      ...DEFAULT_OPTIONS,
      ...(
        inputOptions ?? {}
      ),
    };

  const recordSnapshot =
    buildRecordSnapshot(
      record,
    );

  const recordIntegrity =
    buildRecordIntegrity(
      record,
    );

  const vascularImagingFindings =
    buildVascularImagingFindings(
      record,
      options,
    );

  const persistence =
    buildPersistentFindings(
      record,
      options,
    );

  const newFindings =
    buildNewFindings(
      record,
      options,
    );

  const connections =
    buildConnections(
      record,
      options,
    );

  const conflicts =
    buildConflicts(
      record,
      options,
    );

  const careLoops =
    buildCareLoops(
      record,
      options,
    );

  const medicationSignals =
    buildMedicationSignals(
      record,
      options,
    );

  const recordGaps =
    buildRecordGaps(
      record,
      options,
    );

  const clinicianQuestions =
    buildClinicianQuestions(
      record,
      careLoops,
      options,
    );

  /*
   * Build one deterministic intelligence pool.
   *
   * Individual builders are allowed to discover overlapping signals.
   * The presentation layer below removes only obvious duplicates while
   * preserving genuinely different types of intelligence.
   */
  const allDetected =
    deduplicateInsights([
      ...vascularImagingFindings,
      ...persistence,
      ...newFindings,
      ...connections,
      ...conflicts,
      ...careLoops,
      ...medicationSignals,
      ...recordGaps,
    ]);

  /*
   * Don't Miss is a curated presentation of the strongest existing
   * insights. It does not create a second independent interpretation.
   */
  const dontMiss =
    buildDontMiss(
      allDetected,
      options,
    );

  /*
   * Keep the underlying insight categories separate.
   *
   * `allInsights` contains the actual detected intelligence only.
   * Don't Miss is a presentation surface over that intelligence and
   * therefore should not be appended as additional insights.
   */
  const allInsights =
    sortInsights(
      allDetected,
    );

  return {
    source:
      "deterministic",

    generatedAt:
      new Date().toISOString(),

    summary:
      buildSummary(
        record,
        allDetected,
      ),

    recordSnapshot,

    recordIntegrity,

    clinicianQuestions,

    dontMiss:
      limitCategory(
        dontMiss,
        options,
      ),

    connections:
      limitCategory(
        connections,
        options,
      ),

    persistence:
      limitCategory(
        persistence,
        options,
      ),

    /*
     * Health Trends owns measurement trajectories.
     * Health Intelligence currently exposes changes through the
     * specialized new-finding/persistence/relationship signals instead
     * of duplicating the Health Trends engine.
     */
    changes:
      [],

    conflicts:
      limitCategory(
        conflicts,
        options,
      ),

    careLoops:
      limitCategory(
        careLoops,
        options,
      ),

    medicationSignals:
      limitCategory(
        medicationSignals,
        options,
      ),

    recordGaps:
      limitCategory(
        recordGaps,
        options,
      ),

    newFindings:
      limitCategory(
        newFindings,
        options,
      ),

    allInsights,
  };
}
