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

        <button
          onClick={() => {
            window.location.href = "/dashboard/medical-reports";
          }}
          className="mb-6 text-sm font-medium text-teal-700"
        >
          ← Back to Medical Reports
        </button>

        <button
  type="button"
  onClick={deleteReport}
  disabled={deleting}
  className="mb-6 ml-4 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
>
  {deleting ? "Deleting..." : "Delete Report"}
</button>

        <div className="mb-8">
          <p className="text-sm font-medium text-teal-700">
            Previa Health
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
            {report.original_file_name}
          </h1>

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
            <h2 className="text-lg font-semibold text-zinc-900">
              Processing Status
            </h2>

            <p className="mt-2 text-sm text-zinc-600">
              {analysis?.status ?? "Not available"}
            </p>
          </section>

          {/* AI Summary */}
          {analysis?.ai_summary && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">
                AI Summary
              </h2>

              <p className="mt-3 leading-7 text-zinc-700">
                {analysis.ai_summary}
              </p>
            </section>
          )}

          {/* Diagnoses */}
          {aiResponse?.diagnoses?.length > 0 && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">
                Diagnoses / Conditions Mentioned
              </h2>

              <ul className="mt-4 list-disc space-y-2 pl-5 text-zinc-700">
                {aiResponse.diagnoses.map(
                  (diagnosis: string, index: number) => (
                    <li key={index}>{diagnosis}</li>
                  )
                )}
              </ul>
            </section>
          )}

          {/* Medications */}
          {medications.length > 0 && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">
                Medications
              </h2>

              <div className="mt-4 space-y-3">
                {medications.map((medication) => (
                  <div
                    key={medication.id}
                    className="rounded-xl border border-zinc-200 p-4"
                  >
                    <p className="font-medium text-zinc-900">
                      {medication.medicine_name}
                    </p>

                    {medication.dosage && (
                      <p className="mt-1 text-sm text-zinc-600">
                        Dosage: {medication.dosage}
                      </p>
                    )}

                    {medication.frequency && (
                      <p className="mt-1 text-sm text-zinc-600">
                        Frequency: {medication.frequency}
                      </p>
                    )}

                    {medication.notes && (
                      <p className="mt-1 text-sm text-zinc-600">
                        Instructions: {medication.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Abnormal Findings */}
          {aiResponse?.abnormal_findings?.length > 0 && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">
                Abnormal Findings
              </h2>

              <ul className="mt-4 list-disc space-y-2 pl-5 text-zinc-700">
                {aiResponse.abnormal_findings.map(
                  (finding: string, index: number) => (
                    <li key={index}>{finding}</li>
                  )
                )}
              </ul>
            </section>
          )}

          {/* Normal Findings */}
          {aiResponse?.normal_findings?.length > 0 && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">
                Normal Findings
              </h2>

              <ul className="mt-4 list-disc space-y-2 pl-5 text-zinc-700">
                {aiResponse.normal_findings.map(
                  (finding: string, index: number) => (
                    <li key={index}>{finding}</li>
                  )
                )}
              </ul>
            </section>
          )}

          {/* Lab Results */}
          {aiResponse?.lab_results?.length > 0 && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">
                Laboratory Results
              </h2>

              <div className="mt-4 space-y-3">
                {aiResponse.lab_results.map(
                  (result: any, index: number) => (
                    <div
                      key={index}
                      className="rounded-xl border border-zinc-200 p-4"
                    >
                      <pre className="whitespace-pre-wrap text-sm text-zinc-700">
                        {typeof result === "string"
                          ? result
                          : JSON.stringify(result, null, 2)}
                      </pre>
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          {/* Doctor Questions */}
          {aiResponse?.doctor_questions?.length > 0 && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">
                Questions to Ask Your Doctor
              </h2>

              <ul className="mt-4 list-disc space-y-2 pl-5 text-zinc-700">
                {aiResponse.doctor_questions.map(
                  (question: string, index: number) => (
                    <li key={index}>{question}</li>
                  )
                )}
              </ul>
            </section>
          )}

          {/* Follow-up Tests */}
          {aiResponse?.follow_up_tests?.length > 0 && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">
                Follow-up Tests
              </h2>

              <ul className="mt-4 list-disc space-y-2 pl-5 text-zinc-700">
                {aiResponse.follow_up_tests.map(
                  (test: string, index: number) => (
                    <li key={index}>{test}</li>
                  )
                )}
              </ul>
            </section>
          )}

          {/* Recommendations */}
          {aiResponse?.recommendations?.length > 0 && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">
                Recommendations
              </h2>

              <ul className="mt-4 list-disc space-y-2 pl-5 text-zinc-700">
                {aiResponse.recommendations.map(
                  (recommendation: string, index: number) => (
                    <li key={index}>{recommendation}</li>
                  )
                )}
              </ul>
            </section>
          )}

        </div>
      </div>
    </main>
  );
}