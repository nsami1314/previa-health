"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { createSupabaseClient } from "@/lib/supabase";

export default function MedicationsPage() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [medicineName, setMedicineName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("Active");
  const [notes, setNotes] = useState("");
  const [medications, setMedications] = useState<any[]>([]);
  useEffect(() => {
    async function loadMedications() {
      if (!user) return;
  
      const token = await getToken();
  
      if (!token) return;
  
      const supabase = createSupabaseClient(token);
  
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
  
      if (error) {
        console.error(error);
        return;
      }
  
      setMedications(data ?? []);
    }
  
    loadMedications();
  }, [user, getToken]);
  async function saveMedication() {
    if (!user) return;
  
    if (!medicineName.trim()) {
      alert("Please enter the medicine name.");
      return;
    }
  
    const token = await getToken();
  
    if (!token) {
      alert("You are not authenticated.");
      return;
    }
  
    const supabase = createSupabaseClient(token);
  
    const { error } = await supabase
      .from("medications")
      .insert({
        user_id: user.id,
        medicine_name: medicineName,
        dosage: dosage || null,
        frequency: frequency || null,
        start_date: startDate || null,
        end_date: endDate || null,
        status: status || null,
        notes: notes || null,
      });
  
    if (error) {
      alert(`Database error: ${error.message}`);
      return;
    }
  
    setMedicineName("");
setDosage("");
setFrequency("");
setStartDate("");
setEndDate("");
setStatus("Active");
setNotes("");

alert("Medication saved successfully.");
  }
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-teal-700">
            Previa Health
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
            Medications
          </h1>

          <p className="mt-3 text-zinc-600">
            Track your current and previous medications in one place.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 sm:grid-cols-2">
  <div>
    <label className="text-sm font-medium text-zinc-700">
      Medicine Name
    </label>

    <input
      type="text"
      value={medicineName}
      onChange={(e) => setMedicineName(e.target.value)}
      placeholder="e.g. Metformin"
      className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
    />
  </div>

  <div>
    <label className="text-sm font-medium text-zinc-700">
      Dosage
    </label>

    <input
      type="text"
      value={dosage}
      onChange={(e) => setDosage(e.target.value)}
      placeholder="e.g. 500 mg"
      className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
    />
  </div>

  <div>
    <label className="text-sm font-medium text-zinc-700">
      Frequency
    </label>

    <input
      type="text"
      value={frequency}
      onChange={(e) => setFrequency(e.target.value)}
      placeholder="e.g. Twice Daily"
      className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
    />
  </div>

  <div>
    <label className="text-sm font-medium text-zinc-700">
      Status
    </label>

    <select
      value={status}
      onChange={(e) => setStatus(e.target.value)}
      className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
    >
      <option>Active</option>
      <option>Completed</option>
      <option>Stopped</option>
    </select>
  </div>

  <div>
    <label className="text-sm font-medium text-zinc-700">
      Start Date
    </label>

    <input
      type="date"
      value={startDate}
      onChange={(e) => setStartDate(e.target.value)}
      className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
    />
  </div>

  <div>
    <label className="text-sm font-medium text-zinc-700">
      End Date
    </label>

    <input
      type="date"
      value={endDate}
      onChange={(e) => setEndDate(e.target.value)}
      className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
    />
  </div>

  <div className="sm:col-span-2">
    <label className="text-sm font-medium text-zinc-700">
      Notes
    </label>

    <textarea
      rows={3}
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      placeholder="Additional instructions or notes"
      className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
    />
    </div>
</div>

<button
  type="button"
  onClick={saveMedication}
  className="mt-8 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white"
>
  Save Medication
</button>
{medications.length > 0 && (
  <div className="mt-8">
    <h2 className="mb-4 text-lg font-semibold text-zinc-900">
      Your Medications
    </h2>

    <div className="space-y-3">
      {medications.map((medication) => (
        <div
          key={medication.id}
          className="rounded-lg border border-zinc-200 p-4"
        >
          <p className="font-medium">
            {medication.medicine_name}
          </p>

          <p className="mt-1 text-sm text-zinc-600">
            Dosage: {medication.dosage || "-"}
          </p>

          <p className="text-sm text-zinc-600">
            Frequency: {medication.frequency || "-"}
          </p>

          <p className="text-sm text-zinc-500">
            Status: {medication.status || "-"}
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