"use client";

import { SyntheticEvent, useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { createSupabaseClient } from "@/lib/supabase";

type HealthInsight = {
  id: string;
  title: string;
  category: string | null;
  insight_date: string | null;
  notes: string | null;
  created_at: string;
};

export default function HealthInsightsPage() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [insightTitle, setInsightTitle] = useState("");
  const [insightCategory, setInsightCategory] = useState("");
  const [insightDate, setInsightDate] = useState("");
  const [insightNotes, setInsightNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingInsight, setEditingInsight] =
    useState<HealthInsight | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadInsights() {
      if (!user) {
        return;
      }

      try {
        const token = await getToken();

        if (!token) {
          console.error("No authentication token.");
          return;
        }

        const supabase = createSupabaseClient(token);

        const { data, error } = await supabase
          .from("health_insights")
          .select("id, title, category, insight_date, notes, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error(
            "Health insights error:",
            JSON.stringify(error, null, 2)
          );
          return;
        }

        setInsights(data ?? []);
      } catch (error) {
        console.error("Failed to load health insights:", error);
      } finally {
        setLoading(false);
      }
    }

    loadInsights();
  }, [user, getToken]);

  function resetInsightForm() {
    setInsightTitle("");
    setInsightCategory("");
    setInsightDate("");
    setInsightNotes("");
  }

  function openAddInsightForm() {
    resetInsightForm();
    setFormError("");
    setEditingInsight(null);
    setShowAddForm(true);
  }

  function openEditInsightForm(insight: HealthInsight) {
    setInsightTitle(insight.title);
    setInsightCategory(insight.category || "");
    setInsightDate(insight.insight_date || "");
    setInsightNotes(insight.notes || "");
    setFormError("");
    setEditingInsight(insight);
    setShowAddForm(true);
  }

  function handleCancel() {
    resetInsightForm();
    setFormError("");
    setEditingInsight(null);
    setShowAddForm(false);
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setFormError("You must be signed in to save a health insight.");
      return;
    }

    const trimmedTitle = insightTitle.trim();

    if (!trimmedTitle) {
      setFormError("Please enter an insight title.");
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

      const insightData = {
        title: trimmedTitle,
        category: insightCategory.trim() || null,
        insight_date: insightDate || null,
        notes: insightNotes.trim() || null,
      };

      if (editingInsight) {
        const { data, error } = await supabase
          .from("health_insights")
          .update(insightData)
          .eq("id", editingInsight.id)
          .eq("user_id", user.id)
          .select("id, title, category, insight_date, notes, created_at")
          .single();

        if (error) {
          console.error(
            "Failed to update health insight:",
            JSON.stringify(error, null, 2)
          );
          setFormError("Unable to update this insight. Please try again.");
          return;
        }

        setInsights((currentInsights) =>
          currentInsights.map((insight) =>
            insight.id === data.id ? data : insight
          )
        );
      } else {
        const { data, error } = await supabase
          .from("health_insights")
          .insert({
            user_id: user.id,
            ...insightData,
          })
          .select("id, title, category, insight_date, notes, created_at")
          .single();

        if (error) {
          console.error(
            "Failed to save health insight:",
            JSON.stringify(error, null, 2)
          );
          setFormError("Unable to save this insight. Please try again.");
          return;
        }

        setInsights((currentInsights) => [data, ...currentInsights]);
      }

      resetInsightForm();
      setEditingInsight(null);
      setShowAddForm(false);
    } catch (error) {
      console.error("Failed to save health insight:", error);
      setFormError("Unable to save this insight. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(insight: HealthInsight) {
    const confirmed = window.confirm(
      `Delete "${insight.title}" from your health insights?`
    );

    if (!confirmed || !user) {
      return;
    }

    setDeletingId(insight.id);

    try {
      const token = await getToken();

      if (!token) {
        window.alert("Your session has expired. Please sign in again.");
        return;
      }

      const supabase = createSupabaseClient(token);

      const { error } = await supabase
        .from("health_insights")
        .delete()
        .eq("id", insight.id)
        .eq("user_id", user.id);

      if (error) {
        console.error(
          "Failed to delete health insight:",
          JSON.stringify(error, null, 2)
        );
        window.alert("Unable to delete this insight. Please try again.");
        return;
      }

      setInsights((currentInsights) =>
        currentInsights.filter(
          (currentInsight) => currentInsight.id !== insight.id
        )
      );
    } catch (error) {
      console.error("Failed to delete health insight:", error);
      window.alert("Unable to delete this insight. Please try again.");
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
            Health Insights
          </h1>

          <p className="mt-3 text-zinc-600">
            Keep personal observations and learnings about your health.
          </p>
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">
                Your Insights
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                {user?.fullName || "Your health journey"}
              </p>
            </div>

            <button
              type="button"
              onClick={openAddInsightForm}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800"
            >
              Add Insight
            </button>
          </div>

          {showAddForm && (
            <form
              onSubmit={handleSubmit}
              className="mt-6 rounded-xl border border-teal-200 bg-teal-50 p-5"
            >
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">
                  {editingInsight ? "Edit Health Insight" : "Add Health Insight"}
                </h3>

                <p className="mt-1 text-sm text-zinc-600">
                  Record an observation that helps you understand your health.
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
                    Insight title
                  </span>

                  <input
                    type="text"
                    value={insightTitle}
                    onChange={(event) => setInsightTitle(event.target.value)}
                    placeholder="e.g. I sleep better after an evening walk"
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
                    value={insightCategory}
                    onChange={(event) => setInsightCategory(event.target.value)}
                    placeholder="e.g. Sleep"
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-teal-600 transition focus:ring-2"
                  />
                </label>

                <label>
                  <span className="text-sm font-medium text-zinc-700">
                    Insight date
                  </span>

                  <input
                    type="date"
                    value={insightDate}
                    onChange={(event) => setInsightDate(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-teal-600 transition focus:ring-2"
                  />
                </label>

                <label className="sm:col-span-2">
                  <span className="text-sm font-medium text-zinc-700">
                    Notes
                  </span>

                  <textarea
                    value={insightNotes}
                    onChange={(event) => setInsightNotes(event.target.value)}
                    placeholder="Optional details about this insight."
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
                    : editingInsight
                      ? "Update Insight"
                      : "Save Insight"}
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <p className="mt-6 text-sm text-zinc-500">
              Loading insights...
            </p>
          ) : insights.length > 0 ? (
            <div className="mt-6 space-y-3">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="rounded-xl border border-zinc-200 p-4"
                >
                  <p className="font-medium text-zinc-900">{insight.title}</p>

                  {insight.category && (
                    <p className="mt-1 text-sm text-zinc-600">
                      Category: {insight.category}
                    </p>
                  )}

                  {insight.insight_date && (
                    <p className="mt-1 text-sm text-zinc-600">
                      Date: {insight.insight_date}
                    </p>
                  )}

                  {insight.notes && (
                    <p className="mt-1 text-sm text-zinc-600">
                      Notes: {insight.notes}
                    </p>
                  )}

                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => openEditInsightForm(insight)}
                      disabled={deletingId === insight.id}
                      className="rounded-lg border border-teal-700 px-3 py-1.5 text-sm font-medium text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(insight)}
                      disabled={deletingId === insight.id}
                      className="rounded-lg border border-red-600 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === insight.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
              <p className="text-sm text-zinc-600">
                No health insights have been recorded yet.
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Add an insight to keep track of what you learn about your health.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}