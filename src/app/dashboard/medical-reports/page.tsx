"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { createSupabaseClient } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

const REPORT_TYPE_OPTIONS = [
  "All",
  "Laboratory",
  "MRI",
  "CT",
  "Sonography",
  "X-Ray",
  "Prescription",
  "ECG",
  "Pathology",
  "Discharge Summary",
  "Other",
  "Unclassified",
];

function getReportTypeLabel(
  reportType: string | null | undefined,
  reportAnalysis: any
) {
  const aiData = Array.isArray(reportAnalysis)
    ? reportAnalysis[0]?.extracted_data
    : reportAnalysis?.extracted_data;

  const summary =
    typeof aiData?.summary === "string"
      ? aiData.summary.toLowerCase()
      : "";

  const raw = (reportType ?? "").trim().toLowerCase();

  // Use AI analysis first for imaging classification
  if (
    summary.includes("mri") ||
    summary.includes("magnetic resonance")
  ) {
    return "MRI";
  }

  if (
    summary.includes("ct angiogram") ||
    summary.includes("computed tomography") ||
    summary.includes("ct scan") ||
    summary.includes("cat scan")
  ) {
    return "CT";
  }

  if (
    summary.includes("doppler") ||
    summary.includes("duplex") ||
    summary.includes("ultrasound") ||
    summary.includes("ultrasonography") ||
    summary.includes("sonography") ||
    summary.includes("usg")
  ) {
    return "Sonography";
  }

  // Fall back to the database report_type
  if (
    raw.includes("mri") ||
    raw.includes("magnetic resonance")
  ) {
    return "MRI";
  }

  if (
    raw.includes("ct") ||
    raw.includes("computed tomography") ||
    raw.includes("cat scan")
  ) {
    return "CT";
  }

  if (
    raw.includes("doppler") ||
    raw.includes("duplex") ||
    raw.includes("ultrasound") ||
    raw.includes("ultrasonography") ||
    raw.includes("sonography") ||
    raw.includes("usg")
  ) {
    return "Sonography";
  }

  if (
    raw.includes("x-ray") ||
    raw.includes("xray") ||
    raw.includes("radiograph")
  ) {
    return "X-Ray";
  }

  if (
    raw.includes("ecg") ||
    raw.includes("ekg") ||
    raw.includes("electrocardiogram")
  ) {
    return "ECG";
  }

  if (
    raw.includes("pathology") ||
    raw.includes("histopathology") ||
    raw.includes("biopsy")
  ) {
    return "Pathology";
  }

  if (
    raw.includes("prescription") ||
    raw.includes("prescribed") ||
    raw === "rx"
  ) {
    return "Prescription";
  }

  if (raw.includes("discharge")) {
    return "Discharge Summary";
  }

  if (
    raw.includes("laboratory") ||
    raw.includes("lab") ||
    raw.includes("blood test") ||
    raw.includes("cbc") ||
    raw.includes("lipid") ||
    raw.includes("thyroid") ||
    raw.includes("glucose") ||
    raw.includes("hemoglobin") ||
    raw.includes("hba1c")
  ) {
    return "Laboratory";
  }

  return raw ? "Other" : "Unclassified";
}

function getReportAnalysisData(reportAnalysis: any) {
  return Array.isArray(reportAnalysis)
    ? reportAnalysis[0]?.extracted_data
    : reportAnalysis?.extracted_data;
}

function normalizeIdentityPart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/&/g, "-AND-")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function getReportPanelCodes(report: any): string[] {
  const aiData = getReportAnalysisData(report.report_analysis);
  const labResults = Array.isArray(aiData?.lab_results) ? aiData.lab_results : [];
  const testNames = Array.from(new Set<string>(
    labResults
      .map((result: any) => typeof result?.test_name === "string" ? result.test_name.trim() : "")
      .filter((name: string) => Boolean(name))
  ));
  const tests = testNames.join(" | ").toLowerCase();
  const panels: string[] = [];
  const add = (code: string) => { if (!panels.includes(code)) panels.push(code); };

  // Only classify panels from this report's own extracted test names.
  if (/\bcbc\b|complete blood count/.test(tests) ||
      ["haemoglobin", "hemoglobin", "rbc", "wbc", "pcv", "platelet", "mcv", "mch"].filter((marker) => tests.includes(marker)).length >= 3) {
    add("CBC");
  }
  if (/thyroid profile|thyroid function|\btsh\b|\bfree t3\b|\bfree t4\b|\bt3\b|\bt4\b/.test(tests)) {
    add("THYROID-PROFILE");
  }
  // TPO is a separate investigation and must be explicitly present in test names.
  if (/\banti[- ]?tpo\b|tpo\)?\s*antibod|thyroid peroxidase antibody|microsomal.{0,20}tpo|tpo.{0,20}microsomal/.test(tests)) {
    add("TPO-ANTIBODY");
  }
  if (/urine routine|urinalysis|urine analysis|urine examination|urine r\/e|urine culture/.test(tests)) {
    add("URINE");
  }
  if (/\blft\b|liver function|sgot|sgpt|alanine aminotransferase|aspartate aminotransferase|bilirubin/.test(tests)) {
    add("LFT");
  }
  if (/\brft\b|renal function|kidney function|serum creatinine|blood urea|\begfr\b/.test(tests)) {
    add("RFT");
  }
  if (/lipid profile|total cholesterol|hdl cholesterol|ldl cholesterol|triglyceride/.test(tests)) {
    add("LIPID-PROFILE");
  }
  if (/\bhba1c\b|glycated haemoglobin|glycated hemoglobin/.test(tests)) {
    add("HBA1C");
  }
  if (/fasting blood sugar|fasting glucose|random blood sugar|blood glucose|serum glucose/.test(tests)) {
    add("GLUCOSE");
  }
  if (/electrolyte|serum sodium|serum potassium|serum chloride/.test(tests)) {
    add("ELECTROLYTES");
  }
  if (/vitamin d|25-oh vitamin d|vitamin b12/.test(tests)) {
    add("VITAMIN-PROFILE");
  }
  if (/\becg\b|electrocardiogram/.test(tests)) add("ECG");

  // If common panels cannot be confidently mapped, use the first explicit test
  // names from this report rather than inventing a clinical panel.
  if (panels.length === 0 && testNames.length > 0) {
    for (const name of testNames.slice(0, 3)) {
      const code = normalizeIdentityPart(name);
      if (code && !panels.includes(code)) panels.push(code);
    }
  }

  // Explicit AI titles are a last-resort source only when no lab test names exist.
  if (panels.length === 0 && testNames.length === 0) {
    const explicitTitle = [
      aiData?.report_title,
      aiData?.investigation_name,
      aiData?.procedure_name,
      aiData?.document_title,
      aiData?.title,
    ].find((value) => typeof value === "string" && value.trim().length > 2 &&
      !["laboratory", "lab", "medical report", "report", "other"].includes(value.trim().toLowerCase()));
    if (typeof explicitTitle === "string") {
      const normalized = normalizeIdentityPart(explicitTitle);
      if (normalized) panels.push(normalized.slice(0, 40));
    }
  }

  return panels;
}

function getReportPanelDescription(report: any): string | null {
  const panels = getReportPanelCodes(report);
  if (panels.length === 0) return null;

  const labels: Record<string, string> = {
    CBC: "CBC",
    "THYROID-PROFILE": "Thyroid Profile",
    "TPO-ANTIBODY": "TPO Antibody",
    URINE: "Urine Analysis",
    LFT: "Liver Function (LFT)",
    RFT: "Renal Function (RFT)",
    "LIPID-PROFILE": "Lipid Profile",
    HBA1C: "HbA1c",
    GLUCOSE: "Glucose Tests",
    ELECTROLYTES: "Electrolytes",
    "VITAMIN-PROFILE": "Vitamin Tests",
    ECG: "ECG",
  };

  return panels.map((panel) => labels[panel] ?? panel.replace(/-/g, " ")).join(" · ");
}

function getReportSearchText(report: any): string {
  const aiData = getReportAnalysisData(report.report_analysis);
  const labResults = Array.isArray(aiData?.lab_results) ? aiData.lab_results : [];
  return [
    report.original_file_name,
    report.report_type,
    getReportTypeLabel(report.report_type, report.report_analysis),
    aiData?.summary,
    aiData?.report_title,
    aiData?.title,
    aiData?.investigation_name,
    ...labResults.map((result: any) => result?.test_name),
  ]
    .filter((value) => typeof value === "string" && value.trim())
    .join(" ")
    .toLowerCase();
}

export default function MedicalReportsPage() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [sortOrder, setSortOrder] = useState("report-date-desc");

  async function loadReports() {
    if (!user) return;

    const token = await getToken();
    const supabase = createSupabaseClient(token);

    const { data, error } = await supabase
      .from("medical_reports")
      .select(`
        *,
        report_analysis (
  status,
  extracted_data
)
      `)
      .eq("user_id", user.id)
      .order("report_date", {
        ascending: false,
        nullsFirst: false,
      })
      .order("uploaded_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      return;
    }

    setReports(data ?? []);
    
  }

  useEffect(() => {
    loadReports();
  }, [user, getToken]);

  async function uploadReports() {
    if (selectedFiles.length === 0) {
      alert("Please select at least one file.");
      return;
    }
  
    if (!user) {
      alert("User not found.");
      return;
    }
    
    setUploading(true);
  
    let successful = 0;
    let failed = 0;
  
    try {
      for (const selectedFile of selectedFiles) {
        try {
          const token = await getToken({ skipCache: true });

if (!token) {
  throw new Error("Authentication token unavailable.");
}

const supabase = createSupabaseClient(token);
          const fileExtension = selectedFile.name.split(".").pop();
          const fileName = `${uuidv4()}.${fileExtension}`;
  
          const { error: uploadError } = await supabase.storage
            .from("medical-reports")
            .upload(fileName, selectedFile);
  
          if (uploadError) {
            console.error(
              `Upload failed for ${selectedFile.name}:`,
              uploadError
            );
            failed++;
            continue;
          }
  
          const { data: reportData, error: dbError } =
            await supabase
              .from("medical_reports")
              .insert({
                user_id: user.id,
                original_file_name: selectedFile.name,
                file_name: fileName,
                file_path: `/${fileName}`,
              })
              .select()
              .single();
  
          if (dbError) {
            console.error(
              `Database error for ${selectedFile.name}:`,
              dbError
            );
            failed++;
            continue;
          }
  
          const { error: analysisError } = await supabase
            .from("report_analysis")
            .insert({
              report_id: reportData.id,
              user_id: user.id,
              status: "pending",
            });
  
          if (analysisError) {
            console.error(
              `Analysis record error for ${selectedFile.name}:`,
              analysisError
            );
            failed++;
            continue;
          }
  
          const aiResponse = await fetch(
            "/api/ai/process-report",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                reportId: reportData.id,
              }),
            }
          );
  
          const aiResult = await aiResponse.json();
  
          console.log(
            `AI API Response for ${selectedFile.name}:`,
            aiResult
          );
  
          if (!aiResponse.ok) {
            failed++;
            continue;
          }
  
          successful++;
        } catch (error) {
          console.error(
            `Unexpected error processing ${selectedFile.name}:`,
            error
          );
          failed++;
        }
      }
  
      await loadReports();
  
      setSelectedFiles([]);
  
      if (failed === 0) {
        alert(
          `${successful} medical report${
            successful === 1 ? "" : "s"
          } uploaded successfully and queued for AI analysis.`
        );
      } else {
        alert(
          `${successful} report${
            successful === 1 ? "" : "s"
          } uploaded successfully. ${failed} failed.`
        );
      }
    } finally {
      setUploading(false);
    }
  }

  const filteredReports = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return reports.filter((report) => {
      const typeLabel = getReportTypeLabel(report.report_type, report.report_analysis);
      const matchesType = selectedType === "All" || typeLabel === selectedType;
      const matchesSearch = !query || getReportSearchText(report).includes(query);
      return matchesType && matchesSearch;
    }).sort((a, b) => {
      const aReportDate = a.report_date ? new Date(a.report_date).getTime() : null;
      const bReportDate = b.report_date ? new Date(b.report_date).getTime() : null;
      const aUploadDate = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
      const bUploadDate = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;

      if (sortOrder === "title-asc") return (a.original_file_name ?? "").localeCompare(b.original_file_name ?? "");
      if (sortOrder === "uploaded-desc") return bUploadDate - aUploadDate;
      if (sortOrder === "report-date-asc") {
        if (aReportDate === null) return 1;
        if (bReportDate === null) return -1;
        return aReportDate - bReportDate;
      }
      // Default: newest report date first; missing dates stay at the bottom.
      if (aReportDate === null && bReportDate === null) return bUploadDate - aUploadDate;
      if (aReportDate === null) return 1;
      if (bReportDate === null) return -1;
      return (bReportDate - aReportDate) || (bUploadDate - aUploadDate);
    });
  }, [reports, searchQuery, selectedType, sortOrder]);

  const reportTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    reports.forEach((report) => {
      const type = getReportTypeLabel(
        report.report_type,
        report.report_analysis
      )
      counts[type] = (counts[type] || 0) + 1;
    });

    return counts;
  }, [reports]);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-medium text-teal-700">
            Previa Health
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
            Medical Reports
          </h1>

          <p className="mt-3 max-w-2xl text-zinc-600">
            Upload and securely store your medical reports,
            prescriptions, scans and lab results.
          </p>
        </div>

        {/* Upload */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium text-zinc-700">
            Select Medical Report
          </label>

          <input
  type="file"
  accept=".pdf,.jpg,.jpeg,.png"
  multiple
  onChange={(e) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  }}
  className="mt-3 block w-full text-sm"
/>

{selectedFiles.length > 0 && (
  <div className="mt-4 rounded-lg bg-zinc-100 p-4">
    <p className="text-sm font-medium text-zinc-800">
      {selectedFiles.length} file
      {selectedFiles.length === 1 ? "" : "s"} selected
    </p>

    <div className="mt-3 space-y-2">
      {selectedFiles.map((file, index) => (
        <div
          key={`${file.name}-${file.size}-${index}`}
          className="flex items-center justify-between rounded-lg bg-white px-3 py-2"
        >
          <p className="min-w-0 truncate text-sm text-zinc-700">
            {file.name}
          </p>

          <span className="ml-3 shrink-0 text-xs text-zinc-400">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>
      ))}
    </div>

    <button
      type="button"
      onClick={uploadReports}
      disabled={uploading}
      className="mt-4 rounded-lg bg-teal-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {uploading
        ? "Uploading reports..."
        : `Upload ${selectedFiles.length} Report${
            selectedFiles.length === 1 ? "" : "s"
          }`}
    </button>
  </div>
)}
        </div>

        {/* Reports */}
        {reports.length > 0 && (
          <div className="mt-8">

            <div className="mb-5 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Your Reports
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  {filteredReports.length} of {reports.length} reports
                </p>
              </div>

              <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_13rem] lg:w-auto lg:min-w-[27rem]">
                <div className="w-full min-w-0">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search test, lab or filename..."
                    aria-label="Search medical reports"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <div className="w-full min-w-0">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    aria-label="Sort medical reports"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="report-date-desc">Report date: newest</option>
                    <option value="report-date-asc">Report date: oldest</option>
                    <option value="uploaded-desc">Recently uploaded</option>
                    <option value="title-asc">Report name: A–Z</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Type Filters */}
            <div className="mb-6 overflow-x-auto">
              <div className="flex min-w-max gap-2">
                {REPORT_TYPE_OPTIONS.map((type) => {
                  const isSelected = selectedType === type;
                  const count =
                    type === "All"
                      ? reports.length
                      : reportTypeCounts[type] || 0;

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedType(type)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        isSelected
                          ? "bg-teal-700 text-white"
                          : "bg-white text-zinc-600 border border-zinc-200 hover:border-teal-400 hover:text-teal-700"
                      }`}
                    >
                      {type}
                      <span
                        className={`ml-2 text-xs ${
                          isSelected
                            ? "text-teal-100"
                            : "text-zinc-400"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Report List */}
            {filteredReports.length > 0 ? (
              <div className="space-y-3">
                {filteredReports.map((report) => {
                  const typeLabel = getReportTypeLabel(
                    report.report_type,
                    report.report_analysis
                  );

                  const status =
                    report.report_analysis?.[0]?.status;

                  return (
                    <div
                      key={report.id}
                      onClick={() => {
                        window.location.href =
                          `/dashboard/medical-reports/${report.id}`;
                      }}
                      className="cursor-pointer rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-teal-500 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-900">
                            {report.original_file_name ?? "Untitled report"}
                          </p>

                          {getReportPanelDescription(report) && (
                            <p className="mt-1 text-sm text-zinc-600">
                              Investigations: {getReportPanelDescription(report)}
                            </p>
                          )}

                          <p className="mt-1 text-sm text-zinc-500">
                            Report date: {" "}
                            {report.report_date
                              ? new Date(report.report_date).toLocaleDateString()
                              : "Date not available"}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
                          View Report →
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">

                        {/* Classification */}
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                          {typeLabel}
                        </span>

                        {/* Processing status */}
                        {status === "completed" && (
                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                            ✓ Analysis complete
                          </span>
                        )}

                        {status === "failed" && (
                          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                            ⚠ Analysis failed
                          </span>
                        )}

                        {status !== "completed" &&
                          status !== "failed" && (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                              ⏳ Processing
                            </span>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
                <p className="font-medium text-zinc-800">
                  No reports found
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  Try a different search term or report type.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedType("All");
                    setSortOrder("report-date-desc");
                  }}
                  className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {reports.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
            <p className="font-medium text-zinc-800">
              No medical reports yet
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Upload your first medical report to start building
              your medical record.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
