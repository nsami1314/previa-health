import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

type AnyRecord = Record<string, unknown>;

type Evidence = {
  reportId: string;
  fileName: string;
  reportType: string;
  date: string | null;
  detail: string;
};

type RecordReport = {
  id: string;
  fileName: string;
  reportType: string;
  date: string | null;
};

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object"
    ? (value as AnyRecord)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function textValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function normalizeDate(...values: unknown[]): string | null {
  const raw = textValue(...values);
  if (!raw) return null;

  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString().slice(0, 10);
}

function compactText(value: unknown, max = 320): string {
  const record = asRecord(value);
  const text = textValue(
    value,
    record.text,
    record.finding,
    record.description,
    record.statement,
    record.title,
    record.name,
    record.value
  );

  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(value.trim());
  }

  return result;
}

function isLaboratoryReport(report: RecordReport) {
  const value = `${report.reportType} ${report.fileName}`.toLowerCase();
  return /lab|laboratory|pathology|blood|lipid|cbc|biochemistry|hematology/.test(value);
}

function reportEvidence(report: RecordReport, detail: string): Evidence {
  return {
    reportId: report.id,
    fileName: report.fileName || "Medical report",
    reportType: report.reportType || "Medical report",
    date: report.date,
    detail,
  };
}

const DOMAINS = [
  {
    id: "vascular",
    label: "Vascular / cardiovascular",
    keywords: [
      "carotid",
      "vertebral artery",
      "artery",
      "arterial",
      "atherosclerotic",
      "atherosclerosis",
      "stenosis",
      "intima media",
      "doppler",
      "angiogram",
    ],
  },
  {
    id: "glucose",
    label: "Glucose / metabolic",
    keywords: ["glucose", "hba1c", "glycated", "diabetes", "insulin"],
  },
  {
    id: "liver",
    label: "Liver",
    keywords: ["alt", "ast", "bilirubin", "albumin", "liver", "hepatic"],
  },
  {
    id: "kidney",
    label: "Kidney",
    keywords: ["creatinine", "egfr", "urea", "kidney", "renal"],
  },
  {
    id: "thyroid",
    label: "Thyroid",
    keywords: ["tsh", "t3", "t4", "thyroid"],
  },
  {
    id: "hematology",
    label: "Blood / hematology",
    keywords: ["hemoglobin", "platelet", "wbc", "rbc", "anemia", "anaemia"],
  },
  {
    id: "neck",
    label: "Neck / cervical region",
    keywords: ["neck", "cervical", "carotid", "vertebral"],
  },
];

function domainsForReport(report: RecordReport, analysis: AnyRecord) {
  const searchable = [
    report.fileName,
    report.reportType,
    textValue(analysis.summary),
    ...asArray(analysis.abnormal_findings).map(compactText),
    ...asArray(analysis.normal_findings).map(compactText),
  ]
    .join(" ")
    .toLowerCase();

  return DOMAINS.filter((domain) =>
    domain.keywords.some((keyword) => searchable.includes(keyword))
  );
}

async function loadReportAnalyses(reportIds: string[], userId: string) {
  if (reportIds.length === 0) return [];

  const byReport = await supabaseAdmin
    .from("report_analysis")
    .select("*")
    .in("report_id", reportIds);

  if (!byReport.error) return Array.isArray(byReport.data) ? byReport.data : [];

  const byUser = await supabaseAdmin
    .from("report_analysis")
    .select("*")
    .eq("user_id", userId);

  if (byUser.error) {
    console.warn("Health Intelligence report_analysis query failed:", byUser.error.message);
    return [];
  }

  return Array.isArray(byUser.data) ? byUser.data : [];
}

async function loadOptionalTable(tableName: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from(tableName)
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.warn(`Health Intelligence optional ${tableName} query failed:`, error.message);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

function buildImportantFindings(
  reports: RecordReport[],
  analyses: AnyRecord[],
  analysesByReport: Map<string, AnyRecord>
) {
  const findings: Array<{
    id: string;
    title: string;
    statement: string;
    evidence: Evidence[];
  }> = [];

  for (const report of reports) {
    const analysis = analysesByReport.get(report.id);
    if (!analysis || isLaboratoryReport(report)) continue;

    const rawFindings = asArray(analysis.abnormal_findings)
      .map(compactText)
      .filter(Boolean);

    const fallbackSummary = compactText(analysis.summary, 360);
    const sourceItems = rawFindings.length > 0
      ? uniqueStrings(rawFindings).slice(0, 2)
      : fallbackSummary
        ? [fallbackSummary]
        : [];

    for (const statement of sourceItems) {
      findings.push({
        id: `${report.id}:${statement.slice(0, 32)}`,
        title: report.reportType || "Report finding",
        statement,
        evidence: [reportEvidence(report, statement)],
      });
    }
  }

  return findings.slice(0, 6);
}

function buildConnections(reports: RecordReport[], analysesByReport: Map<string, AnyRecord>) {
  return DOMAINS.flatMap((domain) => {
    const matched = reports.filter((report) => {
      const analysis = analysesByReport.get(report.id);
      return analysis && domainsForReport(report, analysis).some((item) => item.id === domain.id);
    });

    if (matched.length < 2) return [];

    return [{
      id: domain.id,
      title: `${domain.label} information appears across reports`,
      statement: `${matched.length} reports contain information in the same clinical area. Previa groups them here so the original reports can be reviewed together.`,
      evidence: matched.slice(0, 4).map((report) =>
        reportEvidence(report, report.reportType || "Report")
      ),
    }];
  }).slice(0, 4);
}

function buildReportDifferences(reports: RecordReport[], analysesByReport: Map<string, AnyRecord>) {
  const results: Array<{
    id: string;
    title: string;
    statement: string;
    evidence: Evidence[];
  }> = [];

  for (const domain of DOMAINS) {
    const matching = reports.filter((report) => {
      const analysis = analysesByReport.get(report.id);
      return analysis && domainsForReport(report, analysis).some((item) => item.id === domain.id);
    });

    if (matching.length < 2) continue;

    const texts = matching.map((report) => {
      const analysis = analysesByReport.get(report.id) || {};
      return {
        report,
        text: [
          textValue(analysis.summary),
          ...asArray(analysis.abnormal_findings).map(compactText),
          ...asArray(analysis.normal_findings).map(compactText),
        ].join(" ").toLowerCase(),
      };
    });

    const hasPositive = texts.some(({ text }) =>
      /stenosis|narrowing|atherosclerotic|thickening/.test(text)
    );
    const hasNegative = texts.some(({ text }) =>
      /no significant stenosis|no stenosis|no hemodynamic abnormality|no evidence of soft plaque|normal/.test(text)
    );

    if (!hasPositive || !hasNegative) continue;

    results.push({
      id: `difference:${domain.id}`,
      title: `Different findings appear across ${domain.label.toLowerCase()} reports`,
      statement: "The reports use different findings or reference contexts. This may reflect differences in date, modality, technique, or the specific feature being assessed; review the original reports together rather than treating this as a direct contradiction.",
      evidence: texts.slice(0, 4).map(({ report }) =>
        reportEvidence(report, report.reportType || "Report")
      ),
    });
  }

  return results.slice(0, 2);
}

function buildProcessingGaps(reports: RecordReport[], analysesByReport: Map<string, AnyRecord>) {
  return reports
    .filter((report) => !analysesByReport.has(report.id))
    .slice(0, 4)
    .map((report) => ({
      id: `analysis-missing:${report.id}`,
      title: "Report analysis is not available",
      statement: "The original report is present in Previa, but a processed report analysis is not currently available for this document.",
      evidence: [reportEvidence(report, "Original report is available")],
    }));
}

function buildRecordSummary(reports: RecordReport[], analyses: AnyRecord[], observations: AnyRecord[]) {
  const dates = reports
    .map((report) => report.date)
    .filter((value): value is string => Boolean(value))
    .sort();

  const types = Array.from(new Set(reports.map((report) => report.reportType).filter(Boolean)));

  return {
    reportCount: reports.length,
    analyzedReportCount: analyses.length,
    observationCount: observations.length,
    reportTypes: types,
    dateRange: { from: dates[0] || null, to: dates[dates.length - 1] || null },
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = body?.userId;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    const { data: reportRows, error: reportsError } = await supabaseAdmin
      .from("medical_reports")
      .select("id, original_file_name, report_type, report_date, uploaded_at")
      .eq("user_id", userId)
      .order("report_date", { ascending: true, nullsFirst: false });

    if (reportsError) {
      throw new Error(`Unable to load medical reports: ${reportsError.message}`);
    }

    const reports: RecordReport[] = (Array.isArray(reportRows) ? reportRows : []).map((row) => ({
      id: textValue(row.id),
      fileName: textValue(row.original_file_name) || "Medical report",
      reportType: textValue(row.report_type) || "Medical report",
      date: normalizeDate(row.report_date, row.uploaded_at),
    }));

    const reportIds = reports.map((report) => report.id).filter(Boolean);

    const [rawAnalyses, observations, medications, conditions] = await Promise.all([
      loadReportAnalyses(reportIds, userId),
      loadOptionalTable("medical_observations", userId),
      loadOptionalTable("medications", userId),
      loadOptionalTable("health_conditions", userId),
    ]);

    const analyses: AnyRecord[] = rawAnalyses.map(asRecord);
    const analysesByReport = new Map<string, AnyRecord>();

    for (const analysis of analyses) {
      const reportId = textValue(
        analysis.report_id,
        analysis.medical_report_id,
        analysis.reportId
      );
      if (reportId) analysesByReport.set(reportId, analysis);
    }

    const findings = buildImportantFindings(reports, analyses, analysesByReport);
    const connections = buildConnections(reports, analysesByReport);
    const differences = buildReportDifferences(reports, analysesByReport);
    const gaps = buildProcessingGaps(reports, analysesByReport);

    const snapshot = buildRecordSummary(reports, analyses, observations as AnyRecord[]);

    const summary = reports.length === 0
      ? "No medical reports are available yet."
      : `${reports.length} medical ${reports.length === 1 ? "report is" : "reports are"} available in Previa. Health Intelligence highlights report-level information that is not simply a measurement trend.`;

    return NextResponse.json({
      source: "deterministic",
      summary,
      healthIntelligence: {
        summary,
        recordSnapshot: snapshot,
        findings,
        connections,
        differences,
        gaps,
        contextCounts: {
          medications: medications.length,
          conditions: conditions.length,
        },
      },
    });
  } catch (error) {
    console.error("Health Intelligence error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Failed to build Health Intelligence.",
      },
      { status: 500 }
    );
  }
}