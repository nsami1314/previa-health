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

type TrendObservation = {
  id: string;
  medical_report_id: string;
  observation_date: string | null;
  test_name: string;
  normalized_name: string | null;
  value: number | null;
  unit: string | null;
  reference_range: string | null;
  abnormal_flag: string | null;
};

type TrendSummary = {
  name: string;
  observations: TrendObservation[];
  latest: TrendObservation | null;
  previous: TrendObservation | null;
  change: number | null;
};

type HealthOverview = {
  summary: string;
  keyChanges: TrendSummary[];
};

function TrendChart({
  observations,
}: {
  observations: TrendObservation[];
}) {
  const validObservations = observations.filter(
    (observation) =>
      observation.value !== null &&
      observation.observation_date !== null
  );

  if (validObservations.length < 2) {
    return null;
  }

  const values = validObservations.map((observation) => observation.value!);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue;

  const width = 320;
  const height = 100;
  const paddingX = 8;
  const paddingY = 12;

  const points = validObservations.map((observation, index) => {
    const x =
      paddingX +
      (index / (validObservations.length - 1)) *
        (width - paddingX * 2);

    const y =
      valueRange === 0
        ? height / 2
        : height -
          paddingY -
          ((observation.value! - minValue) / valueRange) *
            (height - paddingY * 2);

    return {
      x,
      y,
      observation,
    };
  });

  const path = points
    .map((point, index) =>
      index === 0
        ? `M ${point.x} ${point.y}`
        : `L ${point.x} ${point.y}`
    )
    .join(" ");

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Trend
        </p>
        <p className="text-xs text-zinc-400">
          {validObservations.length} observations
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white px-2 py-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-24 w-full"
          role="img"
          aria-label="Longitudinal health trend"
          preserveAspectRatio="none"
        >
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="currentColor"
            className="text-zinc-200"
            strokeWidth="1"
          />

          <path
            d={path}
            fill="none"
            stroke="currentColor"
            className="text-teal-600"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point) => (
            <circle
              key={point.observation.id}
              cx={point.x}
              cy={point.y}
              r="3.5"
              fill="currentColor"
              className="text-teal-600"
            />
          ))}
        </svg>

        <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
          <span>
            {validObservations[0].observation_date}
          </span>
          <span>
            {
              validObservations[validObservations.length - 1]
                .observation_date
            }
          </span>
        </div>
      </div>
    </div>
  );
}

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
  const [trendObservations, setTrendObservations] = useState<
  TrendObservation[]
>([]);

const [trendSummaries, setTrendSummaries] = useState<
TrendSummary[]
>([]);
const [healthChanges, setHealthChanges] = useState<TrendSummary[]>([]);
const [healthOverview, setHealthOverview] =
  useState<HealthOverview | null>(null);
  const [healthOverviewLoading, setHealthOverviewLoading] =
  useState(false);
const [healthOverviewError, setHealthOverviewError] =
  useState("");

useEffect(() => {
  async function loadTrendObservations() {
    if (!user) {
      return;
    }

    try {
      const token = await getToken({ skipCache: true });

      if (!token) {
        console.error("No authentication token.");
        return;
      }

      const supabase = createSupabaseClient(token);

      const { data, error } = await supabase
        .from("medical_observations")
        .select(
          "id, medical_report_id, observation_date, test_name, normalized_name, value, unit, reference_range, abnormal_flag"
        )
        .eq("user_id", user.id)
        .order("observation_date", { ascending: true });

      if (error) {
        console.error(
          "Health trend observations error:",
          JSON.stringify(error, null, 2)
        );
        return;
      }

      setTrendObservations(data ?? []);

      console.log(
        "Health trend observations:",
        JSON.stringify(data ?? [], null, 2)
      );
    } catch (error) {
      console.error(
        "Failed to load health trend observations:",
        error
      );
    }
  }

  loadTrendObservations();
}, [user, getToken]);

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

  useEffect(() => {
    if (trendObservations.length === 0) {
      return;
    }

    const groupedTrends = trendObservations.reduce(
      (groups, observation) => {
        const key =
          observation.normalized_name || observation.test_name;

        if (!groups[key]) {
          groups[key] = [];
        }

        groups[key].push(observation);

        return groups;
      },
      {} as Record<
        string,
        typeof trendObservations
      >
    );

    const trendSummaries = Object.entries(groupedTrends).map(
      ([name, observations]) => {
        const sortedObservations = [...observations].sort((a, b) => {
          const dateA = a.observation_date || "";
          const dateB = b.observation_date || "";

          return dateA.localeCompare(dateB);
        });

        const latest =
          sortedObservations[sortedObservations.length - 1] ?? null;

        const previous =
          sortedObservations.length > 1
            ? sortedObservations[sortedObservations.length - 2]
            : null;

        const change =
          latest?.value !== null &&
          latest?.value !== undefined &&
          previous?.value !== null &&
          previous?.value !== undefined
            ? latest.value - previous.value
            : null;

            return {
              name,
              observations: sortedObservations,
              latest,
              previous,
              change,
            };
      }
    );

    setTrendSummaries(trendSummaries);
    
    console.log(
      "Trend summaries:",
      JSON.stringify(trendSummaries, null, 2)
    );

    console.log(
      "Grouped health trends:",
      JSON.stringify(groupedTrends, null, 2)
    );
  }, [trendObservations]);

  useEffect(() => {
    const changes = trendSummaries.filter(
      (trend) =>
        trend.latest !== null &&
        trend.previous !== null &&
        trend.change !== null &&
        trend.change !== 0
    );
  
    setHealthChanges(changes);

    
  }, [trendSummaries]);

  const [healthOverviewRequestRef] = useState(() => ({
    current: null as string | null,
  }));
  
  useEffect(() => {
    if (trendObservations.length === 0) {
      healthOverviewRequestRef.current = null;
      setHealthOverview(null);
      return;
    }
  
    if (trendSummaries.length === 0) {
      return;
    }
  
    const requestKey = JSON.stringify(
      trendObservations.map((observation) => ({
        id: observation.id,
        observation_date: observation.observation_date,
        normalized_name: observation.normalized_name,
        test_name: observation.test_name,
        value: observation.value,
        unit: observation.unit,
        reference_range: observation.reference_range,
        abnormal_flag: observation.abnormal_flag,
      }))
    );
  
    if (healthOverviewRequestRef.current === requestKey) {
      return;
    }
  
    healthOverviewRequestRef.current = requestKey;
  
    const controller = new AbortController();
    let isCurrentRequest = true;
  
    async function generateHealthOverview() {
      try {
        setHealthOverviewLoading(true);
        setHealthOverviewError("");
  
        const response = await fetch("/api/ai/health-overview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            observations: trendObservations,
          }),
        });
  
        const data = await response.json();
  
        if (!response.ok) {
          throw new Error(
            data?.error || "Failed to generate health overview."
          );
        }
  
        if (!isCurrentRequest) {
          return;
        }
  
        setHealthOverview({
          summary: data.summary || "",
          keyChanges: trendSummaries.filter(
            (trend) =>
              trend.latest !== null &&
              trend.previous !== null &&
              trend.change !== null &&
              trend.change !== 0
          ),
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
  
        console.error("Health overview request failed:", error);
  
        if (isCurrentRequest) {
          setHealthOverviewError(
            "Unable to generate the AI health overview right now."
          );
        }
      } finally {
        if (isCurrentRequest) {
          setHealthOverviewLoading(false);
        }
      }
    }
  
    generateHealthOverview();
  
    return () => {
      isCurrentRequest = false;
      controller.abort();
    
      if (healthOverviewRequestRef.current === requestKey) {
        healthOverviewRequestRef.current = null;
      }
    };
  }, [trendObservations, trendSummaries, healthOverviewRequestRef]);

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
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              AI Health Overview
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              A high-level summary of what has changed across your
              longitudinal health data.
            </p>
          </div>

          {!healthOverview ? (
            <div className="mt-5 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-5">
              <p className="text-sm text-zinc-600">
                Your health overview will appear here once enough
                longitudinal data is available.
              </p>
            </div>
          ) : (
            <div className="mt-5">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
                <p className="text-sm leading-6 text-zinc-700">
                  {healthOverview.summary}
                </p>
              </div>

              {healthOverview.keyChanges.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    Key Changes
                  </h3>

                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {healthOverview.keyChanges.map((trend) => {
                      const change = trend.change!;
                      const latest = trend.latest!;

                      return (
                        <div
                          key={trend.name}
                          className="rounded-xl border border-zinc-200 p-4"
                        >
                          <p className="text-sm font-medium text-zinc-900">
                            {trend.name}
                          </p>

                          <p
                            className={`mt-2 text-lg font-semibold ${
                              change > 0
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {change > 0 ? "+" : ""}
                            {Number(change.toFixed(2))}
                            {latest.unit ? ` ${latest.unit}` : ""}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            Change from previous observation
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

                {/* Health Trends */}
                <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-zinc-900">
              Health Trends
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Previa tracks your medical observations over time to help you
              understand how your health measurements are changing.
            </p>
          </div>

          {trendSummaries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-8 text-center">
              <p className="text-sm font-medium text-zinc-700">
                No health trends available yet
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Upload more medical reports with recurring test results to
                build your longitudinal health trends.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {trendSummaries.map((trend) => {
                const latest = trend.latest;
                const previous = trend.previous;

                return (
                  <div
                    key={trend.name}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                  >
                    <div className="mb-3">
                      <h3 className="font-medium text-zinc-900">
                        {trend.name}
                      </h3>
                    </div>
                    
                    <TrendChart observations={trend.observations} />

                    {latest ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                            Latest
                          </p>
                          <p className="mt-1 text-2xl font-semibold text-zinc-900">
                            {latest.value ?? "—"}{" "}
                            <span className="text-sm font-normal text-zinc-500">
                              {latest.unit ?? ""}
                            </span>
                          </p>
                          {latest.observation_date && (
                            <p className="mt-1 text-xs text-zinc-500">
                              {new Date(
                                latest.observation_date
                              ).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        {previous && (
                          <div className="border-t border-zinc-200 pt-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                  Previous
                                </p>
                                <p className="mt-1 text-sm font-medium text-zinc-700">
                                  {previous.value ?? "—"}{" "}
                                  {previous.unit ?? ""}
                                </p>
                              </div>

                              {trend.change !== null && (
                                <div className="text-right">
                                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                    Change
                                  </p>
                                  <p
                                    className={`mt-1 text-sm font-semibold ${
                                      trend.change > 0
                                        ? "text-amber-600"
                                        : trend.change < 0
                                          ? "text-emerald-600"
                                          : "text-zinc-600"
                                    }`}
                                  >
                                    {trend.change > 0 ? "+" : ""}
                                    {Number(trend.change.toFixed(2))}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500">
                        No observation data available.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
  <div className="flex items-center justify-between gap-4">
    <div>
      <h2 className="text-xl font-semibold text-zinc-900">
        What Changed?
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Changes detected between your latest and previous observations.
      </p>
    </div>

    {healthChanges.length > 0 && (
      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
        {healthChanges.length} changed
      </span>
    )}
  </div>

  {healthChanges.length === 0 ? (
    <div className="mt-6 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-5">
      <p className="text-sm text-zinc-600">
      No changes detected yet.
      </p>
    </div>
  ) : (
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {healthChanges.map((trend) => {
        const change = trend.change!;
        const latest = trend.latest!;
        const previous = trend.previous!;

        return (
          <div
            key={trend.name}
            className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
          >
            <p className="text-sm font-semibold text-zinc-900">
              {trend.name}
            </p>

            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-zinc-500">
                  Previous
                </p>
                <p className="mt-1 text-lg font-medium text-zinc-700">
                  {previous.value}
                  {previous.unit ? ` ${previous.unit}` : ""}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-zinc-500">
                  Latest
                </p>
                <p className="mt-1 text-lg font-semibold text-zinc-900">
                  {latest.value}
                  {latest.unit ? ` ${latest.unit}` : ""}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-zinc-200 pt-3">
              <p className="text-xs text-zinc-500">
                Change
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  change > 0
                    ? "text-amber-600"
                    : "text-emerald-600"
                }`}
              >
                {change > 0 ? "+" : ""}
                {Number(change.toFixed(2))}
                {latest.unit ? ` ${latest.unit}` : ""}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  )}
</section>

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