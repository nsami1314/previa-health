"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";

export default function MedicalReportDetailsPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const params = useParams();

  const reportId = params.id as string;

  const [report, setReport] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadReportDetails() {
      if (!user || !reportId) return;

      try {
        const token = await getToken();

        if (!token) {
          console.error("No authentication token.");
          return;
        }

        const supabase = createSupabaseClient(token);

        const { data: reportData, error: reportError } =
          await supabase
            .from("medical_reports")
            .select("*")
            .eq("id", reportId)
            .eq("user_id", user.id)
            .single();

        if (reportError) {
          console.error("Report error:", reportError);
          return;
        }

        setReport(reportData);

        const { data: signedUrlData, error: signedUrlError } =
  await supabase.storage
    .from("medical-reports")
    .createSignedUrl(reportData.file_name, 300);

if (signedUrlError) {
  console.error("Failed to create signed URL:", signedUrlError);
} else {
  setFileUrl(signedUrlData.signedUrl);
}

        const { data: analysisData, error: analysisError } =
          await supabase
            .from("report_analysis")
            .select("*")
            .eq("report_id", reportId)
            .eq("user_id", user.id)
            .single();

        if (analysisError) {
          console.error("Analysis error:", analysisError);
        } else {
          setAnalysis(analysisData);
        }

        const { data: medicationData, error: medicationError } =
  await supabase
    .from("medications")
    .select("*")
    .eq("report_id", reportId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

console.log("MEDICATION DATA:", medicationData);
console.log("MEDICATION ERROR:", medicationError);

if (medicationError) {
  console.error("Medication error:", medicationError);
} else {
  setMedications(medicationData ?? []);
}

      } catch (error) {
        console.error("Failed to load report details:", error);
      } finally {
        setLoading(false);
      }
    }

    loadReportDetails();
  }, [user, reportId, getToken]);

  async function deleteReport() {
    if (!user || !reportId) return;
  
    const confirmed = window.confirm(
      "Are you sure you want to delete this report? This will also delete its AI analysis and medications linked to this report."
    );
  
    if (!confirmed) return;
  
    try {
      setDeleting(true);
  
      const response = await fetch("/api/reports/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportId,
          userId: user.id,
        }),
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        console.error("Delete error:", result);
        alert(result.error ?? "Failed to delete report.");
        return;
      }
  
      alert("Report deleted successfully.");
  
      window.location.href = "/dashboard/medical-reports";
    } catch (error) {
      console.error("Delete report error:", error);
      alert("Something went wrong while deleting the report.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <p className="text-zinc-600">Loading report...</p>
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Report not found
          </h1>

          <button
            onClick={() => {
              window.location.href = "/dashboard/medical-reports";
            }}
            className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white"
          >
            Back to Reports
          </button>
        </div>
      </main>
    );
  }

  const aiResponse = analysis?.ai_response;

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">

      <div className="mb-6 flex items-center justify-between gap-4">
  <button
    type="button"
    onClick={() => {
      window.location.href = "/dashboard/medical-reports";
    }}
    className="text-sm font-medium text-teal-700 hover:text-teal-800"
  >
    ← Back to Medical Reports
  </button>

  <button
    type="button"
    onClick={deleteReport}
    disabled={deleting}
    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {deleting ? "Deleting..." : "Delete Report"}
  </button>
</div>

        <div className="mb-8">
          <p className="text-sm font-medium text-teal-700">
            Previa Health
          </p>

          <div className="mt-2">
  <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
    {report.original_file_name}
  </h1>

  <p className="mt-2 text-lg font-semibold text-zinc-900">
    {user?.fullName || "Your Medical Report"}
  </p>

  <p className="mt-1 text-sm text-zinc-500">
    Personal medical report
  </p>
</div>

          <p className="mt-2 text-sm text-zinc-500">
            Uploaded{" "}
            {new Date(report.uploaded_at).toLocaleString()}
          </p>
          
          {fileUrl && (
  <div className="mt-4">
    <button
      type="button"
      onClick={() => {
        window.open(fileUrl, "_blank");
      }}
      className="rounded-lg bg-teal-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-teal-800"
    >
      View Original Report
    </button>
  </div>
)}
        </div>

        <div className="space-y-6">

         {/* Processing Status */}
<section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
  <div className="flex items-center justify-between gap-4">
    <div>
      <h2 className="text-lg font-semibold text-zinc-900">
        AI Analysis
      </h2>

      <p className="mt-1 text-sm text-zinc-500">
        Previa has processed this medical report.
      </p>
    </div>

    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        analysis?.status === "completed"
          ? "bg-green-50 text-green-700"
          : analysis?.status === "failed"
          ? "bg-red-50 text-red-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {analysis?.status === "completed"
        ? "Analysis Ready"
        : analysis?.status === "failed"
        ? "Analysis Failed"
        : analysis?.status ?? "Not Available"}
    </span>
  </div>
</section>

          {/* AI Summary */}
{analysis?.ai_summary && (
  <section className="rounded-2xl border border-teal-100 bg-teal-50/40 p-6 shadow-sm">
    <p className="text-sm font-medium text-teal-700">
      Previa Health AI
    </p>

    <h2 className="mt-1 text-xl font-semibold text-zinc-900">
      Report Summary
    </h2>

    <p className="mt-4 leading-7 text-zinc-700">
      {analysis.ai_summary}
    </p>

    <p className="mt-4 text-xs leading-5 text-zinc-500">
      This AI-generated summary is for informational purposes and should
      not replace advice from a qualified healthcare professional.
    </p>
  </section>
)}

          {/* Diagnoses */}
{aiResponse?.diagnoses?.length > 0 && (
  <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
    <p className="text-sm font-medium text-teal-700">
      Clinical context
    </p>

    <h2 className="mt-1 text-xl font-semibold text-zinc-900">
      Diagnoses / Conditions Mentioned
    </h2>

    <div className="mt-5 space-y-3">
      {aiResponse.diagnoses.map(
        (diagnosis: string, index: number) => (
          <div
            key={index}
            className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
          >
            <p className="text-sm leading-6 text-zinc-700">
              {diagnosis}
            </p>
          </div>
        )
      )}
    </div>

    <p className="mt-4 text-xs leading-5 text-zinc-500">
      These conditions are mentioned or identified in the report and are
      not necessarily confirmed diagnoses.
    </p>
  </section>
)}

          {/* Medications */}
{medications.length > 0 && (
  <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
    <p className="text-sm font-medium text-teal-700">
      Current treatment
    </p>

    <h2 className="mt-1 text-xl font-semibold text-zinc-900">
      Medications
    </h2>

    <div className="mt-5 space-y-3">
      {medications.map((medication) => (
        <div
          key={medication.id}
          className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
        >
          <p className="font-medium text-zinc-900">
            {medication.medicine_name}
          </p>

          {(medication.dosage ||
            medication.frequency ||
            medication.notes) && (
            <div className="mt-3 space-y-1">
              {medication.dosage && (
                <p className="text-sm text-zinc-600">
                  <span className="font-medium text-zinc-700">
                    Dosage:
                  </span>{" "}
                  {medication.dosage}
                </p>
              )}

              {medication.frequency && (
                <p className="text-sm text-zinc-600">
                  <span className="font-medium text-zinc-700">
                    Frequency:
                  </span>{" "}
                  {medication.frequency}
                </p>
              )}

              {medication.notes && (
                <p className="text-sm text-zinc-600">
                  <span className="font-medium text-zinc-700">
                    Instructions:
                  </span>{" "}
                  {medication.notes}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>

    <p className="mt-4 text-xs leading-5 text-zinc-500">
      Medication information is shown from the available report and
      medication records. Follow your healthcare professional's
      instructions.
    </p>
  </section>
)}

          {/* Abnormal Findings */}
{aiResponse?.abnormal_findings?.length > 0 && (
  <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6 shadow-sm">
    <div className="flex items-start gap-3">
      <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />

      <div>
        <p className="text-sm font-medium text-amber-700">
          Findings that may need attention
        </p>

        <h2 className="mt-1 text-xl font-semibold text-zinc-900">
          Abnormal Findings
        </h2>
      </div>
    </div>

    <ul className="mt-5 space-y-3">
      {aiResponse.abnormal_findings.map(
        (finding: string, index: number) => (
          <li
            key={index}
            className="rounded-xl border border-amber-100 bg-white p-4 text-zinc-700"
          >
            {finding}
          </li>
        )
      )}
    </ul>

    <p className="mt-4 text-xs leading-5 text-zinc-500">
      Abnormal findings do not necessarily indicate a diagnosis. Discuss
      relevant results with your healthcare professional.
    </p>
  </section>
)}

          {/* Normal Findings */}
{aiResponse?.normal_findings?.length > 0 && (
  <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
    <p className="text-sm font-medium text-teal-700">
      Within expected range
    </p>

    <h2 className="mt-1 text-xl font-semibold text-zinc-900">
      Normal Findings
    </h2>

    <ul className="mt-5 space-y-3">
      {aiResponse.normal_findings.map(
        (finding: string, index: number) => (
          <li
            key={index}
            className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-700"
          >
            {finding}
          </li>
        )
      )}
    </ul>
  </section>
)}

          {/* Lab Results */}
{aiResponse?.lab_results?.length > 0 && (
  <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
    <p className="text-sm font-medium text-teal-700">
      Test results
    </p>

    <h2 className="mt-1 text-xl font-semibold text-zinc-900">
      Laboratory Results
    </h2>

    <div className="mt-5 space-y-3">
      {aiResponse.lab_results.map(
        (result: any, index: number) => (
          <div
            key={index}
            className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
          >
            {typeof result === "string" ? (
              <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                {result}
              </p>
            ) : (
              <div className="space-y-2">
                {Object.entries(result).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4"
                  >
                    <span className="text-sm font-medium text-zinc-600">
                      {key.replace(/_/g, " ")}
                    </span>

                    <span className="text-sm text-zinc-900 sm:text-right">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      )}
    </div>
  </section>
)}

          {/* Doctor Questions */}
{aiResponse?.doctor_questions?.length > 0 && (
  <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
    <p className="text-sm font-medium text-teal-700">
      Prepare for your appointment
    </p>

    <h2 className="mt-1 text-xl font-semibold text-zinc-900">
      Questions to Ask Your Doctor
    </h2>

    <div className="mt-5 space-y-3">
      {aiResponse.doctor_questions.map(
        (question: string, index: number) => (
          <div
            key={index}
            className="flex gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
          >
            <span className="shrink-0 font-semibold text-teal-700">
              {index + 1}.
            </span>

            <p className="text-sm leading-6 text-zinc-700">
              {question}
            </p>
          </div>
        )
      )}
    </div>

    <p className="mt-4 text-xs leading-5 text-zinc-500">
      These questions are intended to help you discuss your report with
      your healthcare professional.
    </p>
  </section>
)}

          {/* Follow-up Tests */}
{aiResponse?.follow_up_tests?.length > 0 && (
  <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
    <p className="text-sm font-medium text-teal-700">
      Recommended follow-up
    </p>

    <h2 className="mt-1 text-xl font-semibold text-zinc-900">
      Follow-up Tests
    </h2>

    <div className="mt-5 space-y-3">
      {aiResponse.follow_up_tests.map(
        (test: string, index: number) => (
          <div
            key={index}
            className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
          >
            <p className="text-sm leading-6 text-zinc-700">
              {test}
            </p>
          </div>
        )
      )}
    </div>

    <p className="mt-4 text-xs leading-5 text-zinc-500">
      Follow-up tests shown here are based on information available in
      the report. Discuss whether they are appropriate for you with your
      healthcare professional.
    </p>
  </section>
)}

          {/* Recommendations */}
{aiResponse?.recommendations?.length > 0 && (
  <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
    <p className="text-sm font-medium text-teal-700">
      Suggested next steps
    </p>

    <h2 className="mt-1 text-xl font-semibold text-zinc-900">
      Recommendations
    </h2>

    <div className="mt-5 space-y-3">
      {aiResponse.recommendations.map(
        (recommendation: string, index: number) => (
          <div
            key={index}
            className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
          >
            <p className="text-sm leading-6 text-zinc-700">
              {recommendation}
            </p>
          </div>
        )
      )}
    </div>

    <p className="mt-4 text-xs leading-5 text-zinc-500">
      These suggestions are generated from the available report
      information and are not a substitute for personalized medical
      advice.
    </p>
  </section>
)}

        </div>
      </div>
    </main>
  );
}