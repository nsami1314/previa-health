"use client";
import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { useAuth, useUser } from "@clerk/nextjs";
export default function HealthProfilePage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [dateOfBirth, setDateOfBirth] = useState("");
const [biologicalSex, setBiologicalSex] = useState("");
const [heightCm, setHeightCm] = useState("");
const [weightKg, setWeightKg] = useState("");
const [bloodGroup, setBloodGroup] = useState("");
const [medicalConditions, setMedicalConditions] = useState("");
const [allergies, setAllergies] = useState("");
const [currentMedications, setCurrentMedications] = useState("");
useEffect(() => {
  async function loadHealthProfile() {
    if (!user) return;

    const token = await getToken();
    const supabase = createSupabaseClient(token);

    const { data, error } = await supabase
      .from("health_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error || !data) return;

    setDateOfBirth(data.date_of_birth ?? "");
    setBiologicalSex(data.biological_sex ?? "");
    setHeightCm(data.height_cm?.toString() ?? "");
    setWeightKg(data.weight_kg?.toString() ?? "");
    setBloodGroup(data.blood_group ?? "");
    setMedicalConditions(data.medical_conditions ?? "");
    setAllergies(data.allergies ?? "");
    setCurrentMedications(data.current_medications ?? "");
  }

  loadHealthProfile();
}, [user, getToken]);
async function saveHealthProfile() {


  if (!user) return;
  const token = await getToken();

const supabase = createSupabaseClient(token);

  const { error } = await supabase.from("health_profiles").upsert({
    user_id: user.id,
    date_of_birth: dateOfBirth || null,
    biological_sex: biologicalSex || null,
    height_cm: heightCm ? Number(heightCm) : null,
    weight_kg: weightKg ? Number(weightKg) : null,
    blood_group: bloodGroup || null,
    medical_conditions: medicalConditions || null,
    allergies: allergies || null,
    current_medications: currentMedications || null,
  }, {
    onConflict: "user_id",
  });

  if (error) {
    alert(
      `Supabase error:
    Message: ${error.message}
    Code: ${error.code}
    Details: ${error.details}
    Hint: ${error.hint}`
    );
    return;
  }

  alert("Health profile saved successfully.");
}
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <p className="text-sm font-medium text-teal-700">Previa Health</p>
  
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
              Health Profile
            </h1>
  
            <p className="mt-3 text-zinc-600">
              Add your basic health information to build your personal health
              record.
            </p>
          </div>
  
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">
  Basic Information
</h2>

<p className="mt-1 mb-6 text-sm text-zinc-600">
  Tell us about your basic health profile.
</p>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-zinc-700">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
onChange={(e) => setDateOfBirth(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </div>
  
              <div>
                <label className="text-sm font-medium text-zinc-700">
                  Biological Sex
                </label>
                <select 
                value={biologicalSex}
                onChange={(e) => setBiologicalSex(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2">
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
  
              <div>
                <label className="text-sm font-medium text-zinc-700">
                  Height (cm)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 172"
                  value={heightCm}
onChange={(e) => setHeightCm(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </div>
  
              <div>
                <label className="text-sm font-medium text-zinc-700">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 70"
                  value={weightKg}
onChange={(e) => setWeightKg(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </div>
  
              <div>
                <label className="text-sm font-medium text-zinc-700">
                  Blood Group
                </label>
                <select 
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2">
                  <option value="">Select</option>
                  <option>A+</option>
                  <option>A-</option>
                  <option>B+</option>
                  <option>B-</option>
                  <option>AB+</option>
                  <option>AB-</option>
                  <option>O+</option>
                  <option>O-</option>
                </select>
              </div>
              <div className="sm:col-span-2">
  <label className="text-sm font-medium text-zinc-700">
    Medical Conditions
  </label>

  <textarea
    rows={4}
    placeholder="e.g. Diabetes, Hypertension, Asthma"
    value={medicalConditions}
    onChange={(e) => setMedicalConditions(e.target.value)}
    className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
  />
</div>
<div className="sm:col-span-2">
  <label className="text-sm font-medium text-zinc-700">
    Allergies
  </label>

  <textarea
    rows={3}
    placeholder="e.g. Penicillin, Peanuts, Dust"
    value={allergies}
    onChange={(e) => setAllergies(e.target.value)}
    className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
  />
</div>
<div className="sm:col-span-2">
  <label className="text-sm font-medium text-zinc-700">
    Current Medications
  </label>

  <textarea
    rows={4}
    placeholder="e.g. Metformin 500 mg twice daily, Telmisartan 40 mg once daily"
    value={currentMedications}
    onChange={(e) => setCurrentMedications(e.target.value)}
    className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
  />
</div>
            </div>
  
            <button
              type="button"
              onClick={saveHealthProfile}
              className="mt-8 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white"
            >
              Save Health Profile
            </button>
          </div>
        </div>
      </main>
    );
  }