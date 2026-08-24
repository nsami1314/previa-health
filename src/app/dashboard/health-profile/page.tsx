"use client";
import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { useAuth, useUser } from "@clerk/nextjs";
export default function HealthProfilePage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [dateOfBirth, setDateOfBirth] = useState("");
const [biologicalSex, setBiologicalSex] = useState("");
const [profileExists, setProfileExists] = useState(false);
const [isEditing, setIsEditing] = useState(false);
const [heightCm, setHeightCm] = useState("");
const [weightKg, setWeightKg] = useState("");
const [bloodGroup, setBloodGroup] = useState("");
const [medicalConditions, setMedicalConditions] = useState("");
const [allergies, setAllergies] = useState("");
const [currentMedications, setCurrentMedications] = useState("");
const [pastSurgeries, setPastSurgeries] = useState(""); 
const [familyMedicalHistory, setFamilyMedicalHistory] = useState("");
const [smokingStatus, setSmokingStatus] = useState("");
const [alcoholConsumption, setAlcoholConsumption] = useState("");
const [exerciseFrequency, setExerciseFrequency] = useState("");
const [dietPreference, setDietPreference] = useState("");
const [sleepDuration, setSleepDuration] = useState("");
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

      setProfileExists(true);

    setDateOfBirth(data.date_of_birth ?? "");
    setBiologicalSex(data.biological_sex ?? "");
    setHeightCm(data.height_cm?.toString() ?? "");
    setWeightKg(data.weight_kg?.toString() ?? "");
    setBloodGroup(data.blood_group ?? "");
    setMedicalConditions(data.medical_conditions ?? "");
    setAllergies(data.allergies ?? "");
    setCurrentMedications(data.current_medications ?? "");
    setPastSurgeries(data.past_surgeries ?? "");
    setFamilyMedicalHistory(data.family_medical_history ?? "");
    setSmokingStatus(data.smoking_status ?? "");
setAlcoholConsumption(data.alcohol_consumption ?? "");
setExerciseFrequency(data.exercise_frequency ?? "");
setDietPreference(data.diet_preference ?? "");
setSleepDuration(data.sleep_duration ?? "");
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
    past_surgeries: pastSurgeries || null,
    family_medical_history: familyMedicalHistory || null,
    smoking_status: smokingStatus || null,
alcohol_consumption: alcoholConsumption || null,
exercise_frequency: exerciseFrequency || null,
diet_preference: dietPreference || null,
sleep_duration: sleepDuration || null,
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
  setProfileExists(true);
setIsEditing(false);
}
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <p className="text-sm font-medium text-teal-700">Previa Health</p>
  
            <div className="flex items-center justify-between gap-4">
  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
    Health Profile
  </h1>

  {profileExists && (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
    >
      Edit Profile
    </button>
  )}
</div>
  
<div className="mt-4">
  <p className="text-lg font-semibold text-zinc-900">
    {user?.fullName || "Your Health Profile"}
  </p>

  <p className="mt-1 text-sm text-zinc-500">
    Personal health record
  </p>
</div>
          </div>
  
          <div
  className={`rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm ${
    profileExists && !isEditing ? "hidden" : ""
  }`}
>
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
<div className="sm:col-span-2">
  <label className="text-sm font-medium text-zinc-700">
    Past Surgeries / Procedures
  </label>

  <textarea
    rows={4}
    placeholder="e.g. Appendix removal (2018), Cataract surgery (2022)"
    value={pastSurgeries}
    onChange={(e) => setPastSurgeries(e.target.value)}
    className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
  />
</div>
<div className="sm:col-span-2">
  <label className="text-sm font-medium text-zinc-700">
    Family Medical History
  </label>

  <textarea
    rows={4}
    placeholder="e.g. Father: Diabetes, Mother: Hypertension, Grandfather: Heart disease"
    value={familyMedicalHistory}
    onChange={(e) => setFamilyMedicalHistory(e.target.value)}
    className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
  />
</div>
<div className="mt-10 border-t border-zinc-200 pt-8">
  <h2 className="text-xl font-semibold text-zinc-900">
    Lifestyle
  </h2>

  <p className="mt-1 mb-6 text-sm text-zinc-600">
    Help us understand your daily lifestyle habits.
  </p>

  <div className="grid gap-6 sm:grid-cols-2">

    <div>
      <label className="text-sm font-medium text-zinc-700">
        Smoking Status
      </label>

      <select
        value={smokingStatus}
        onChange={(e) => setSmokingStatus(e.target.value)}
        className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
      >
        <option value="">Select</option>
        <option value="Never">Never</option>
        <option value="Former">Former Smoker</option>
        <option value="Occasionally">Occasionally</option>
        <option value="Daily">Daily</option>
      </select>
    </div>

    <div>
      <label className="text-sm font-medium text-zinc-700">
        Alcohol Consumption
      </label>

      <select
        value={alcoholConsumption}
        onChange={(e) => setAlcoholConsumption(e.target.value)}
        className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
      >
        <option value="">Select</option>
        <option value="Never">Never</option>
        <option value="Occasionally">Occasionally</option>
        <option value="Weekly">Weekly</option>
        <option value="Daily">Daily</option>
      </select>
    </div>

    <div>
      <label className="text-sm font-medium text-zinc-700">
        Exercise Frequency
      </label>

      <select
        value={exerciseFrequency}
        onChange={(e) => setExerciseFrequency(e.target.value)}
        className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
      >
        <option value="">Select</option>
        <option value="Never">Never</option>
        <option value="1-2 days/week">1–2 days/week</option>
        <option value="3-5 days/week">3–5 days/week</option>
        <option value="Daily">Daily</option>
      </select>
    </div>

    <div>
      <label className="text-sm font-medium text-zinc-700">
        Diet Preference
      </label>

      <select
        value={dietPreference}
        onChange={(e) => setDietPreference(e.target.value)}
        className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
      >
        <option value="">Select</option>
        <option value="Vegetarian">Vegetarian</option>
        <option value="Vegan">Vegan</option>
        <option value="Eggetarian">Eggetarian</option>
        <option value="Non-Vegetarian">Non-Vegetarian</option>
        <option value="Other">Other</option>
      </select>
    </div>

    <div>
      <label className="text-sm font-medium text-zinc-700">
        Average Sleep Duration
      </label>

      <input
        type="text"
        placeholder="e.g. 7 hours"
        value={sleepDuration}
        onChange={(e) => setSleepDuration(e.target.value)}
        className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2"
      />
    </div>

  </div>
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

        {profileExists && !isEditing && (
  <div className="space-y-6">
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-zinc-900">
        Basic Information
      </h2>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="text-sm text-zinc-500">Date of Birth</p>
          <p className="mt-1 font-medium text-zinc-900">
            {dateOfBirth || "-"}
          </p>
        </div>

        <div>
          <p className="text-sm text-zinc-500">Biological Sex</p>
          <p className="mt-1 font-medium text-zinc-900">
            {biologicalSex || "-"}
          </p>
        </div>

        <div>
          <p className="text-sm text-zinc-500">Height</p>
          <p className="mt-1 font-medium text-zinc-900">
            {heightCm ? `${heightCm} cm` : "-"}
          </p>
        </div>

        <div>
          <p className="text-sm text-zinc-500">Weight</p>
          <p className="mt-1 font-medium text-zinc-900">
            {weightKg ? `${weightKg} kg` : "-"}
          </p>
        </div>

        <div>
          <p className="text-sm text-zinc-500">Blood Group</p>
          <p className="mt-1 font-medium text-zinc-900">
            {bloodGroup || "-"}
          </p>
        </div>
      </div>
    </div>

    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-zinc-900">
        Health Information
      </h2>

      <div className="mt-5 space-y-5">
        <div>
          <p className="text-sm text-zinc-500">Medical Conditions</p>
          <p className="mt-1 text-zinc-900">
            {medicalConditions || "-"}
          </p>
        </div>

        <div>
          <p className="text-sm text-zinc-500">Allergies</p>
          <p className="mt-1 text-zinc-900">
            {allergies || "-"}
          </p>
        </div>

        <div>
          <p className="text-sm text-zinc-500">Current Medications</p>
          <p className="mt-1 text-zinc-900">
            {currentMedications || "-"}
          </p>
        </div>

        <div>
          <p className="text-sm text-zinc-500">Past Surgeries</p>
          <p className="mt-1 text-zinc-900">
            {pastSurgeries || "-"}
          </p>
        </div>

        <div>
          <p className="text-sm text-zinc-500">Family Medical History</p>
          <p className="mt-1 text-zinc-900">
            {familyMedicalHistory || "-"}
          </p>
        </div>
      </div>
    </div>

    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-zinc-900">
        Lifestyle
      </h2>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="text-sm text-zinc-500">Smoking</p>
          <p className="mt-1 font-medium text-zinc-900">
            {smokingStatus || "-"}
          </p>
        </div>

        <div>
          <p className="text-sm text-zinc-500">Alcohol</p>
          <p className="mt-1 font-medium text-zinc-900">
            {alcoholConsumption || "-"}
          </p>
        </div>

        <div>
          <p className="text-sm text-zinc-500">Exercise</p>
          <p className="mt-1 font-medium text-zinc-900">
            {exerciseFrequency || "-"}
          </p>
        </div>

        <div>
          <p className="text-sm text-zinc-500">Diet</p>
          <p className="mt-1 font-medium text-zinc-900">
            {dietPreference || "-"}
          </p>
        </div>

        <div>
          <p className="text-sm text-zinc-500">Sleep</p>
          <p className="mt-1 font-medium text-zinc-900">
            {sleepDuration || "-"}
          </p>
        </div>
      </div>
    </div>
  </div>
)}
      </main>
    );
  }