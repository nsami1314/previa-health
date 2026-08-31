"use client";

import { SyntheticEvent, useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { createSupabaseClient } from "@/lib/supabase";

type HealthCondition = {
  id: string;
  condition_name: string;
  status: string;
  diagnosed_date: string | null;
  notes: string | null;
  created_at: string;
};

export default function HealthConditionsPage() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [conditions, setConditions] = useState<HealthCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [conditionName, setConditionName] = useState("");
  const [status, setStatus] = useState("Active");
  const [diagnosedDate, setDiagnosedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingCondition, setEditingCondition] =
  useState<HealthCondition | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadConditions() {
      if (!user) return;

      try {
        const token = await getToken();

        if (!token) {
          console.error("No authentication token.");
          return;
        }

        const supabase = createSupabaseClient(token);

        const { data, error } = await supabase
          .from("health_conditions")
          .select(
            "id, condition_name, status, diagnosed_date, notes, created_at"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error(
            "Health conditions error:",
            JSON.stringify(error, null, 2)
          );
          return;
        }

        setConditions(data ?? []);
      } catch (error) {
        console.error("Failed to load health conditions:", error);
      } finally {
        setLoading(false);
      }
    }

    loadConditions();
  }, [user, getToken]);

  function openAddForm() {
    resetForm();
    setFormError("");
    setEditingCondition(null);
    setShowAddForm(true);
  }
  
  function openEditForm(condition: HealthCondition) {
    setConditionName(condition.condition_name);
    setStatus(condition.status);
    setDiagnosedDate(condition.diagnosed_date || "");
    setNotes(condition.notes || "");
    setFormError("");
    setEditingCondition(condition);
    setShowAddForm(true);
  }

  function resetForm() {
    setConditionName("");
    setStatus("Active");
    setDiagnosedDate("");
    setNotes("");
  }

  function handleCancel() {
    resetForm();
    setFormError("");
    setEditingCondition(null);
    setShowAddForm(false);
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
  
    if (!user) {
      setFormError("You must be signed in to save a health condition.");
      return;
    }
  
    const trimmedConditionName = conditionName.trim();
  
    if (!trimmedConditionName) {
      setFormError("Please enter a condition name.");
      return;
    }
  
    setSaving(true);
    setFormError("");
  
    try {
      const token = await getToken();
  
      if (!token) {
        setFormError("Your session has expired. Please sign in again.");
        return;
      }
  
      const supabase = createSupabaseClient(token);
  
      const conditionData = {
        condition_name: trimmedConditionName,
        status,
        diagnosed_date: diagnosedDate || null,
        notes: notes.trim() || null,
      };
  
      if (editingCondition) {
        const { data, error } = await supabase
          .from("health_conditions")
          .update(conditionData)
          .eq("id", editingCondition.id)
          .eq("user_id", user.id)
          .select(
            "id, condition_name, status, diagnosed_date, notes, created_at"
          )
          .single();
  
        if (error) {
          console.error(
            "Failed to update health condition:",
            JSON.stringify(error, null, 2)
          );
          setFormError("Unable to update this condition. Please try again.");
          return;
        }
  
        setConditions((currentConditions) =>
          currentConditions.map((condition) =>
            condition.id === data.id ? data : condition
          )
        );
      } else {
        const { data, error } = await supabase
          .from("health_conditions")
          .insert({
            user_id: user.id,
            ...conditionData,
          })
          .select(
            "id, condition_name, status, diagnosed_date, notes, created_at"
          )
          .single();
  
        if (error) {
          console.error(
            "Failed to save health condition:",
            JSON.stringify(error, null, 2)
          );
          setFormError("Unable to save this condition. Please try again.");
          return;
        }
  
        setConditions((currentConditions) => [
          data,
          ...currentConditions,
        ]);
      }
  
      resetForm();
      setEditingCondition(null);
      setShowAddForm(false);
    } catch (error) {
      console.error("Failed to save health condition:", error);
      setFormError("Unable to save this condition. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(condition: HealthCondition) {
    const confirmed = window.confirm(
      `Delete "${condition.condition_name}" from your health record?`
    );
  
    if (!confirmed || !user) {
      return;
    }
  
    setDeletingId(condition.id);
  
    try {
      const token = await getToken();
  
      if (!token) {
        window.alert("Your session has expired. Please sign in again.");
        return;
      }
  
      const supabase = createSupabaseClient(token);
  
      const { error } = await supabase
        .from("health_conditions")
        .delete()
        .eq("id", condition.id)
        .eq("user_id", user.id);
  
      if (error) {
        console.error(
          "Failed to delete health condition:",
          JSON.stringify(error, null, 2)
        );
        window.alert("Unable to delete this condition. Please try again.");
        return;
      }
  
      setConditions((currentConditions) =>
        currentConditions.filter(
          (currentCondition) => currentCondition.id !== condition.id
        )
      );
    } catch (error) {
      console.error("Failed to delete health condition:", error);
      window.alert("Unable to delete this condition. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-teal-700">
            Previa Health
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
            Health Conditions
          </h1>

          <p className="mt-3 text-zinc-600">
            Maintain a structured record of your current and past health
            conditions.
          </p>
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">
                Your Conditions
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                {user?.fullName || "Your health record"}
              </p>
            </div>

            <button
              type="button"
              onClick={openAddForm}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800"
            >
              Add Condition
            </button>
          </div>

          {showAddForm && (
            <form
              onSubmit={handleSubmit}
              className="mt-6 rounded-xl border border-teal-200 bg-teal-50 p-5"
            >
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">
                {editingCondition ? "Edit Health Condition" : "Add Health Condition"}
                </h3>

                <p className="mt-1 text-sm text-zinc-600">
                  Record a current or past health condition.
                </p>
              </div>

              {formError && (
  <p
    role="alert"
    className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
  >
    {formError}
  </p>
)}

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="text-sm font-medium text-zinc-700">
                    Condition name
                  </span>

                  <input
                    type="text"
                    value={conditionName}
                    onChange={(event) => setConditionName(event.target.value)}
                    placeholder="e.g. Hypertension"
                    required
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-teal-600 transition focus:ring-2"
                  />
                </label>

                <label>
                  <span className="text-sm font-medium text-zinc-700">
                    Status
                  </span>

                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-teal-600 transition focus:ring-2"
                  >
                    <option value="Active">Active</option>
                    <option value="Managed">Managed</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Past">Past</option>
                  </select>
                </label>

                <label>
                  <span className="text-sm font-medium text-zinc-700">
                    Diagnosed date
                  </span>

                  <input
                    type="date"
                    value={diagnosedDate}
                    onChange={(event) => setDiagnosedDate(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-teal-600 transition focus:ring-2"
                  />
                </label>

                <label className="sm:col-span-2">
                  <span className="text-sm font-medium text-zinc-700">
                    Notes
                  </span>

                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Optional details, symptoms, or treatment notes."
                    rows={4}
                    className="mt-1 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-teal-600 transition focus:ring-2"
                  />
                </label>
              </div>

              <div className="mt-5 flex justify-end gap-3">
              <button
  type="button"
  onClick={handleCancel}
  disabled={saving}
  className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
>
  Cancel
</button>

<button
  type="submit"
  disabled={saving}
  className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
>
{saving
  ? "Saving..."
  : editingCondition
    ? "Update Condition"
    : "Save Condition"}
</button>
              </div>
            </form>
          )}

          {loading ? (
            <p className="mt-6 text-sm text-zinc-500">
              Loading conditions...
            </p>
          ) : conditions.length > 0 ? (
            <div className="mt-6 space-y-3">
              {conditions.map((condition) => (
                <div
                  key={condition.id}
                  className="rounded-xl border border-zinc-200 p-4"
                >
                  <p className="font-medium text-zinc-900">
                    {condition.condition_name}
                  </p>

                  <p className="mt-1 text-sm text-zinc-600">
                    Status: {condition.status}
                  </p>

                  {condition.diagnosed_date && (
                    <p className="mt-1 text-sm text-zinc-600">
                      Diagnosed: {condition.diagnosed_date}
                    </p>
                  )}

                  {condition.notes && (
                    <p className="mt-1 text-sm text-zinc-600">
                      Notes: {condition.notes}
                    </p>
                  )}

<div className="mt-4 flex gap-3">
  <button
    type="button"
    onClick={() => openEditForm(condition)}
    disabled={deletingId === condition.id}
    className="rounded-lg border border-teal-700 px-3 py-1.5 text-sm font-medium text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
  >
    Edit
  </button>

  <button
    type="button"
    onClick={() => handleDelete(condition)}
    disabled={deletingId === condition.id}
    className="rounded-lg border border-red-600 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {deletingId === condition.id ? "Deleting..." : "Delete"}
  </button>
</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
              <p className="text-sm text-zinc-600">
                No health conditions have been recorded yet.
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Add a condition to begin building your health record.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}