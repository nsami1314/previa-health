"use client";

import { SyntheticEvent, useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { createSupabaseClient } from "@/lib/supabase";

type HealthGoal = {
  id: string;
  title: string;
  category: string | null;
  target_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

export default function HealthGoalsPage() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [goals, setGoals] = useState<HealthGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalCategory, setGoalCategory] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [goalStatus, setGoalStatus] = useState("Active");
  const [goalNotes, setGoalNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingGoal, setEditingGoal] = useState<HealthGoal | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadGoals() {
      if (!user) return;

      try {
        const token = await getToken();

        if (!token) {
          console.error("No authentication token.");
          return;
        }

        const supabase = createSupabaseClient(token);

        const { data, error } = await supabase
          .from("health_goals")
          .select(
            "id, title, category, target_date, status, notes, created_at"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error(
            "Health goals error:",
            JSON.stringify(error, null, 2)
          );
          return;
        }

        setGoals(data ?? []);
      } catch (error) {
        console.error("Failed to load health goals:", error);
      } finally {
        setLoading(false);
      }
    }

    loadGoals();
  }, [user, getToken]);

  function openAddGoalForm() {
    resetGoalForm();
    setFormError("");
    setEditingGoal(null);
    setShowAddForm(true);
  }
  
  function openEditGoalForm(goal: HealthGoal) {
    setGoalTitle(goal.title);
    setGoalCategory(goal.category || "");
    setTargetDate(goal.target_date || "");
    setGoalStatus(goal.status);
    setGoalNotes(goal.notes || "");
    setFormError("");
    setEditingGoal(goal);
    setShowAddForm(true);
  }

  function resetGoalForm() {
    setGoalTitle("");
    setGoalCategory("");
    setTargetDate("");
    setGoalStatus("Active");
    setGoalNotes("");
  }
  
  function handleCancel() {
    resetGoalForm();
    setFormError("");
    setEditingGoal(null);
    setShowAddForm(false);
  }
  
  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
  
    if (!user) {
      setFormError("You must be signed in to save a health goal.");
      return;
    }
  
    const trimmedTitle = goalTitle.trim();
  
    if (!trimmedTitle) {
      setFormError("Please enter a goal title.");
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
  
      const goalData = {
        title: trimmedTitle,
        category: goalCategory.trim() || null,
        target_date: targetDate || null,
        status: goalStatus,
        notes: goalNotes.trim() || null,
      };
  
      if (editingGoal) {
        const { data, error } = await supabase
          .from("health_goals")
          .update(goalData)
          .eq("id", editingGoal.id)
          .eq("user_id", user.id)
          .select(
            "id, title, category, target_date, status, notes, created_at"
          )
          .single();
  
        if (error) {
          console.error(
            "Failed to update health goal:",
            JSON.stringify(error, null, 2)
          );
          setFormError("Unable to update this goal. Please try again.");
          return;
        }
  
        setGoals((currentGoals) =>
          currentGoals.map((goal) => (goal.id === data.id ? data : goal))
        );
      } else {
        const { data, error } = await supabase
          .from("health_goals")
          .insert({
            user_id: user.id,
            ...goalData,
          })
          .select(
            "id, title, category, target_date, status, notes, created_at"
          )
          .single();
  
        if (error) {
          console.error(
            "Failed to save health goal:",
            JSON.stringify(error, null, 2)
          );
          setFormError("Unable to save this goal. Please try again.");
          return;
        }
  
        setGoals((currentGoals) => [data, ...currentGoals]);
      }
  
      resetGoalForm();
      setEditingGoal(null);
      setShowAddForm(false);
    } catch (error) {
      console.error("Failed to save health goal:", error);
      setFormError("Unable to save this goal. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(goal: HealthGoal) {
    const confirmed = window.confirm(
      `Delete "${goal.title}" from your health goals?`
    );
  
    if (!confirmed || !user) {
      return;
    }
  
    setDeletingId(goal.id);
  
    try {
      const token = await getToken();
  
      if (!token) {
        window.alert("Your session has expired. Please sign in again.");
        return;
      }
  
      const supabase = createSupabaseClient(token);
  
      const { error } = await supabase
        .from("health_goals")
        .delete()
        .eq("id", goal.id)
        .eq("user_id", user.id);
  
      if (error) {
        console.error(
          "Failed to delete health goal:",
          JSON.stringify(error, null, 2)
        );
        window.alert("Unable to delete this goal. Please try again.");
        return;
      }
  
      setGoals((currentGoals) =>
        currentGoals.filter((currentGoal) => currentGoal.id !== goal.id)
      );
    } catch (error) {
      console.error("Failed to delete health goal:", error);
      window.alert("Unable to delete this goal. Please try again.");
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
            Health Goals
          </h1>

          <p className="mt-3 text-zinc-600">
            Set and track personal health goals that matter to you.
          </p>
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">
                Your Goals
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                {user?.fullName || "Your health journey"}
              </p>
            </div>

            <button
              type="button"
              onClick={openAddGoalForm}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800"
            >
              Add Goal
            </button>
          </div>

          {showAddForm && (
  <form
    onSubmit={handleSubmit}
    className="mt-6 rounded-xl border border-teal-200 bg-teal-50 p-5"
  >
    <div>
      <h3 className="text-lg font-semibold text-zinc-900">
      {editingGoal ? "Edit Health Goal" : "Add Health Goal"}
      </h3>

      <p className="mt-1 text-sm text-zinc-600">
        Set a clear goal to support your health journey.
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
          Goal title
        </span>

        <input
          type="text"
          value={goalTitle}
          onChange={(event) => setGoalTitle(event.target.value)}
          placeholder="e.g. Walk 30 minutes each day"
          required
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-teal-600 transition focus:ring-2"
        />
      </label>

      <label>
        <span className="text-sm font-medium text-zinc-700">
          Category
        </span>

        <input
          type="text"
          value={goalCategory}
          onChange={(event) => setGoalCategory(event.target.value)}
          placeholder="e.g. Exercise"
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-teal-600 transition focus:ring-2"
        />
      </label>

      <label>
        <span className="text-sm font-medium text-zinc-700">
          Target date
        </span>

        <input
          type="date"
          value={targetDate}
          onChange={(event) => setTargetDate(event.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-teal-600 transition focus:ring-2"
        />
      </label>

      <label>
        <span className="text-sm font-medium text-zinc-700">
          Status
        </span>

        <select
          value={goalStatus}
          onChange={(event) => setGoalStatus(event.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-teal-600 transition focus:ring-2"
        >
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Paused">Paused</option>
        </select>
      </label>

      <label className="sm:col-span-2">
        <span className="text-sm font-medium text-zinc-700">Notes</span>

        <textarea
          value={goalNotes}
          onChange={(event) => setGoalNotes(event.target.value)}
          placeholder="Optional details about this goal."
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
  : editingGoal
    ? "Update Goal"
    : "Save Goal"}
  </button>
</div>
  </form>
)}

          {loading ? (
            <p className="mt-6 text-sm text-zinc-500">Loading goals...</p>
          ) : goals.length > 0 ? (
            <div className="mt-6 space-y-3">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className="rounded-xl border border-zinc-200 p-4"
                >
                  <p className="font-medium text-zinc-900">{goal.title}</p>

                  <p className="mt-1 text-sm text-zinc-600">
                    Status: {goal.status}
                  </p>

                  {goal.category && (
                    <p className="mt-1 text-sm text-zinc-600">
                      Category: {goal.category}
                    </p>
                  )}

                  {goal.target_date && (
                    <p className="mt-1 text-sm text-zinc-600">
                      Target date: {goal.target_date}
                    </p>
                  )}

                  {goal.notes && (
                    <p className="mt-1 text-sm text-zinc-600">
                      Notes: {goal.notes}
                    </p>
                  )}
                  <div className="mt-4 flex gap-3">
  <button
    type="button"
    onClick={() => openEditGoalForm(goal)}
    disabled={deletingId === goal.id}
    className="rounded-lg border border-teal-700 px-3 py-1.5 text-sm font-medium text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
  >
    Edit
  </button>

  <button
    type="button"
    onClick={() => handleDelete(goal)}
    disabled={deletingId === goal.id}
    className="rounded-lg border border-red-600 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {deletingId === goal.id ? "Deleting..." : "Delete"}
  </button>
</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
              <p className="text-sm text-zinc-600">
                No health goals have been recorded yet.
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Add a goal to start building healthier habits.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}