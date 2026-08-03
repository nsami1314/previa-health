"use client";
import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { createSupabaseClient } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export default function MedicalReportsPage() {
    const { getToken } = useAuth();
    const { user } = useUser();

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [reports, setReports] = useState<any[]>([]);
    useEffect(() => {
      async function loadReports() {
        if (!user) return;
    
        const token = await getToken();
        const supabase = createSupabaseClient(token);
    
        const { data, error } = await supabase
          .from("medical_reports")
          .select("*")
          .eq("user_id", user.id)
          .order("uploaded_at", { ascending: false });
    
        if (error) {
          console.error(error);
          return;
        }
    
        setReports(data ?? []);
      }
    
      loadReports();
    }, [user, getToken]);
    async function uploadReport() {
        if (!selectedFile) {
          alert("Please select a file first.");
          return;
        }
      
        const token = await getToken();
      
        if (!token) {
          alert("You are not authenticated.");
          return;
        }
      
        const supabase = createSupabaseClient(token);
      
        const fileExtension = selectedFile.name.split(".").pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
      
        const { error } = await supabase.storage
          .from("medical-reports")
          .upload(fileName, selectedFile);
      
          if (error) {
            alert(`Upload failed: ${error.message}`);
            return;
          }
          
          if (!user) {
            alert("User not found.");
            return;
          }
          
          const { data: reportData, error: dbError } = await supabase
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
  alert(`Database error: ${dbError.message}`);
  return;
}

const { error: analysisError } = await supabase
  .from("report_analysis")
  .insert({
    report_id: reportData.id,
    user_id: user.id,
    status: "pending",
  });

  if (analysisError) {
    console.log("Analysis Error:", analysisError);
  
    alert(
  `Message: ${analysisError.message}
  Code: ${analysisError.code}
  Details: ${analysisError.details}
  Hint: ${analysisError.hint}`
    );
  
    return;
  }

// Call AI processing endpoint
console.log("Report Data:", reportData);
console.log("Report ID:", reportData?.id);
const aiResponse = await fetch("/api/ai/process-report", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    reportId: reportData.id,
  }),
});

const aiResult = await aiResponse.json();

console.log("AI API Response:", aiResult);

alert("Report uploaded successfully and queued for AI analysis.");

setSelectedFile(null);

// Reload reports list
const { data: refreshedReports } = await supabase
  .from("medical_reports")
  .select("*")
  .eq("user_id", user.id)
  .order("uploaded_at", { ascending: false });

setReports(refreshedReports ?? []);

}

return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-teal-700">
            Previa Health
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
            Medical Reports
          </h1>

          <p className="mt-3 text-zinc-600">
            Upload and securely store your medical reports,
            prescriptions, scans and lab results.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
  <label className="block text-sm font-medium text-zinc-700">
    Select Medical Report
  </label>

  <input
    type="file"
    accept=".pdf,.jpg,.jpeg,.png"
    onChange={(e) => {
      if (e.target.files && e.target.files.length > 0) {
        setSelectedFile(e.target.files[0]);
      }
    }}
    className="mt-3 block w-full text-sm"
  />

{selectedFile && (
  <div className="mt-4 rounded-lg bg-zinc-100 p-3">
    <p className="text-sm text-zinc-700">
      Selected file: <strong>{selectedFile.name}</strong>
    </p>

    <button
  type="button"
  onClick={uploadReport}
  className="mt-4 rounded-lg bg-teal-700 px-5 py-2 text-sm font-medium text-white"
>
  Upload Report
</button>
  </div>
)}
{reports.length > 0 && (
  <div className="mt-8">
    <h2 className="mb-4 text-lg font-semibold text-zinc-900">
      Your Reports
    </h2>

    <div className="space-y-3">
      {reports.map((report) => (
        <div
          key={report.id}
          className="rounded-lg border border-zinc-200 p-4"
        >
          <p className="font-medium">
            {report.original_file_name}
          </p>

          <p className="mt-1 text-sm text-zinc-500">
            Uploaded:{" "}
            {new Date(report.uploaded_at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  </div>
)}
</div>
      </div>
    </main>
  );
}