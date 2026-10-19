"use client";

import { SyntheticEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { createSupabaseClient } from "@/lib/supabase";
import type {
  HealthIntelligenceConfidence,
  HealthIntelligenceInsight,
  HealthIntelligencePriority,
  HealthIntelligenceResult,
} from "@/lib/health-intelligence/types";

type HealthInsight = {
  id: string;
  title: string;
  category: string | null;
  insight_date: string | null;
  notes: string | null;
  created_at: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function splitIntelligenceSummary(summary: string) {
  const markers = [
    " the cross-record review also surfaced:",
    " Cross-record patterns identified:",
    " Across the record, Previa also identified:",
  ];

  for (const marker of markers) {
    const index = summary.toLowerCase().indexOf(marker.toLowerCase());
    if (index > 0) {
      return {
        reportFindings: summary.slice(0, index).trim(),
        crossRecordPatterns: summary.slice(index + marker.length).trim(),
      };
    }
  }

  return { reportFindings: summary.trim(), crossRecordPatterns: "" };
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function priorityClasses(priority: HealthIntelligencePriority) {
  if (priority === "high") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (priority === "medium") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  return "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--foreground-muted)]";
}

function confidenceLabel(confidence: HealthIntelligenceConfidence) {
  if (confidence === "strong") return "Strong evidence";
  if (confidence === "moderate") return "Moderate evidence";
  return "Limited evidence";
}

function EvidenceList({
  evidence,
}: {
  evidence: HealthIntelligenceInsight["evidence"];
}) {
  if (!evidence.length) return null;

  return (
    <div className="mt-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--foreground-subtle)]">
        Evidence
      </p>

      <div className="space-y-2">
        {evidence.slice(0, 4).map((item, index) => (
          <div
            key={`${item.sourceId}-${index}`}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-3">
              {item.reportId ? (
                <Link
                  href={`/dashboard/medical-reports/${encodeURIComponent(item.reportId)}`}
                  className="min-w-0 text-xs font-medium text-[var(--primary)] hover:underline"
                >
                  {item.title}
                </Link>
              ) : (
                <p className="min-w-0 text-xs font-medium text-[var(--foreground)]">
                  {item.title}
                </p>
              )}

              {item.date ? (
                <span className="shrink-0 text-[10px] text-[var(--foreground-muted)]">
                  {formatDate(item.date)}
                </span>
              ) : null}
            </div>

            {item.detail ? (
              <p className="mt-1 text-xs leading-5 text-[var(--foreground-muted)]">
                {item.detail}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightCard({
  insight,
  featured = false,
}: {
  insight: HealthIntelligenceInsight;
  featured?: boolean;
}) {
  return (
    <article
      className={[
        "rounded-2xl border bg-white p-5 shadow-sm",
        featured
          ? "border-amber-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
          : "border-[var(--border)]",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${priorityClasses(
            insight.priority
          )}`}
        >
          {formatLabel(insight.priority)}
        </span>

        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1 text-[10px] font-medium text-[var(--foreground-muted)]">
          {formatLabel(insight.domain)}
        </span>

        <span className="text-[10px] text-[var(--foreground-subtle)]">
          {confidenceLabel(insight.confidence)}
        </span>
      </div>

      <h3 className="mt-3 text-sm font-semibold leading-5 text-[var(--foreground)]">
        {insight.title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-[var(--foreground-secondary)]">
        {insight.statement}
      </p>

      {insight.what ? (
        <div className="mt-4 rounded-xl bg-[var(--surface-subtle)] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--foreground-subtle)]">
            What Previa found
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--foreground-secondary)]">
            {insight.what}
          </p>
        </div>
      ) : null}

      {insight.why ? (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--foreground-subtle)]">
            Why it surfaced
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--foreground-muted)]">
            {insight.why}
          </p>
        </div>
      ) : null}

      <EvidenceList evidence={insight.evidence} />

      {insight.limitation ? (
        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--foreground-subtle)]">
            Important boundary
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--foreground-muted)]">
            {insight.limitation}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function InsightSection({
  title,
  description,
  insights,
  featured = false,
}: {
  title: string;
  description: string;
  insights: HealthIntelligenceInsight[];
  featured?: boolean;
}) {
  if (!insights.length) return null;

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          {title}
        </h2>
        <p className="mt-1 text-xs leading-5 text-[var(--foreground-muted)]">
          {description}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {insights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            featured={featured}
          />
        ))}
      </div>
    </section>
  );
}

function ClinicianQuestions({
  questions,
}: {
  questions: HealthIntelligenceResult["clinicianQuestions"];
}) {
  if (!questions.length) return null;

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Questions for your healthcare professional
        </h2>
        <p className="mt-1 text-xs leading-5 text-[var(--foreground-muted)]">
          Discussion prompts grounded in saved report questions and documented follow-up items.
        </p>
      </div>

      <div className="space-y-3">
        {questions.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm"
          >
            <p className="text-sm leading-6 text-[var(--foreground-secondary)]">
              {item.question}
            </p>
            <EvidenceList evidence={item.evidence} />
            <p className="mt-3 text-[10px] leading-5 text-[var(--foreground-subtle)]">
              {item.limitation}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function HealthInsightsPage() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [intelligence, setIntelligence] =
    useState<HealthIntelligenceResult | null>(null);

  const [intelligenceLoading, setIntelligenceLoading] = useState(true);
  const [intelligenceError, setIntelligenceError] = useState("");
  const [showFullSummary, setShowFullSummary] = useState(false);

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

  async function loadIntelligence() {
    if (!user) return;

    try {
      setIntelligenceLoading(true);
      setIntelligenceError("");

      const response = await fetch("/api/health-insights", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to load Health Intelligence."
        );
      }

      setIntelligence(data.healthIntelligence ?? null);
    } catch (error) {
      console.error("Health Intelligence error:", error);

      setIntelligenceError(
        error instanceof Error
          ? error.message
          : "Unable to load Health Intelligence right now."
      );
    } finally {
      setIntelligenceLoading(false);
    }
  }

  useEffect(() => {
    loadIntelligence();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    async function loadInsights() {
      if (!user) return;

      try {
        const token = await getToken();

        if (!token) return;

        const supabase = createSupabaseClient(token);

        const { data, error } = await supabase
          .from("health_insights")
          .select(
            "id, title, category, insight_date, notes, created_at"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setInsights(data ?? []);
      } catch (error) {
        console.error(
          "Failed to load personal health insights:",
          error
        );
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

  async function handleSubmit(
    event: SyntheticEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!user) {
      setFormError("You must be signed in to save a health insight.");
      return;
    }

    const title = insightTitle.trim();

    if (!title) {
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

      const payload = {
        title,
        category: insightCategory.trim() || null,
        insight_date: insightDate || null,
        notes: insightNotes.trim() || null,
      };

      if (editingInsight) {
        const { data, error } = await supabase
          .from("health_insights")
          .update(payload)
          .eq("id", editingInsight.id)
          .eq("user_id", user.id)
          .select(
            "id, title, category, insight_date, notes, created_at"
          )
          .single();

        if (error) throw error;

        setInsights((current) =>
          current.map((item) =>
            item.id === editingInsight.id ? data : item
          )
        );
      } else {
        const { data, error } = await supabase
          .from("health_insights")
          .insert({
            ...payload,
            user_id: user.id,
          })
          .select(
            "id, title, category, insight_date, notes, created_at"
          )
          .single();

        if (error) throw error;

        setInsights((current) => [data, ...current]);
      }

      handleCancel();
    } catch (error) {
      console.error("Failed to save health insight:", error);
      setFormError("Unable to save this insight. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(insight: HealthInsight) {
    if (
      !user ||
      !window.confirm(
        `Delete "${insight.title}" from your health insights?`
      )
    ) {
      return;
    }

    setDeletingId(insight.id);

    try {
      const token = await getToken();

      if (!token) return;

      const supabase = createSupabaseClient(token);

      const { error } = await supabase
        .from("health_insights")
        .delete()
        .eq("id", insight.id)
        .eq("user_id", user.id);

      if (error) throw error;

      setInsights((current) =>
        current.filter((item) => item.id !== insight.id)
      );
    } catch (error) {
      console.error("Failed to delete health insight:", error);
      window.alert("Unable to delete this insight. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const snapshot = intelligence?.recordSnapshot;
  const integrity = intelligence?.recordIntegrity;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
            Previa Health
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[var(--foreground)]">
            Health Intelligence
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--foreground-muted)]">
            Your entire medical record, considered as one story — finding
            relationships, persistent findings, conflicts, continuity signals,
            and record blind spots without replacing your doctor&apos;s
            judgment.
          </p>
        </header>

        <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
          <div className="border-b border-[var(--border)] bg-[var(--surface-subtle)] p-5 sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
                  Record-wide view
                </p>

                <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                  Your health record, understood together
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--foreground-muted)]">
                  Health Trends answers what is happening to your measurements.
                  Health Intelligence looks across reports, observations,
                  medications, conditions, and continuity signals to identify
                  relationships in the available record.
                </p>
              </div>

              <Link
                href="/dashboard/health-trends"
                className="shrink-0 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--primary)]"
              >
                Open Health Trends →
              </Link>
            </div>

            {snapshot ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-[var(--border)] bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--foreground-subtle)]">
                    Reports
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                    {snapshot.reportCount}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--foreground-subtle)]">
                    Analyzed
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                    {snapshot.analyzedReportCount}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--foreground-subtle)]">
                    Observations
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                    {snapshot.observationCount}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--foreground-subtle)]">
                    Record sources
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                    {snapshot.reportTypes.length}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="p-5 sm:p-7">
            {intelligenceLoading ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-subtle)] p-8">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Reading your health record…
                </p>
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                  Previa is assembling the available record relationships.
                </p>
              </div>
            ) : intelligenceError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-medium text-amber-800">
                  {intelligenceError}
                </p>

                <button
                  type="button"
                  onClick={loadIntelligence}
                  className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-800"
                >
                  Try again
                </button>
              </div>
            ) : !intelligence ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Health Intelligence is not available yet.
                </p>
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                  Upload medical reports to build your record.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {(() => {
                  const summaryParts = splitIntelligenceSummary(intelligence.summary);
                  return (
                    <div className="space-y-4">
                      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-5 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
                              Saved report findings
                            </p>
                            <h2 className="mt-1 text-base font-semibold text-[var(--foreground)]">
                              What your reports say
                            </h2>
                          </div>
                          <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-[10px] font-medium text-[var(--foreground-muted)]">
                            Existing analyses · No new AI request
                          </span>
                        </div>
                        <p className={`mt-3 max-w-4xl whitespace-pre-line text-sm leading-7 text-[var(--foreground-secondary)] ${showFullSummary ? "" : "line-clamp-4"}`}>
                          {summaryParts.reportFindings}
                        </p>
                        {summaryParts.reportFindings.length > 260 ? (
                          <button
                            type="button"
                            onClick={() => setShowFullSummary((current) => !current)}
                            className="mt-3 text-xs font-semibold text-[var(--primary)] hover:underline"
                          >
                            {showFullSummary ? "Show less" : "Read full summary"}
                          </button>
                        ) : null}
                      </section>

                      {summaryParts.crossRecordPatterns ? (
                        <section className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
                            Patterns across your record
                          </p>
                          <p className="mt-2 max-w-4xl text-sm leading-7 text-[var(--foreground-secondary)]">
                            {summaryParts.crossRecordPatterns}
                          </p>
                        </section>
                      ) : null}
                    </div>
                  );
                })()}

                {integrity ? (
                  <section className="rounded-2xl border border-[var(--border)] p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-base font-semibold text-[var(--foreground)]">
                          Record completeness
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-[var(--foreground-muted)]">
                          This describes how much documented information is
                          currently available for longitudinal reasoning. It is
                          not a health score.
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-2xl font-semibold text-[var(--foreground)]">
                            {integrity.score}
                          </p>
                          <p className="text-[10px] text-[var(--foreground-muted)]">
                            documentation score
                          </p>
                        </div>

                        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground-secondary)]">
                          {formatLabel(integrity.label)}
                        </span>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-[var(--foreground-muted)]">
                      {integrity.explanation}
                    </p>
                  </section>
                ) : null}

                <InsightSection
                  title="Important findings to review"
                  description="The highest-priority evidence-backed items identified across the available record."
                  insights={intelligence.dontMiss}
                  featured
                />

                <InsightSection
                  title="New findings"
                  description="Findings that appear newly in the available record compared with earlier evidence."
                  insights={intelligence.newFindings}
                />

                <InsightSection
                  title="Persistent findings"
                  description="Findings documented in more than one report that may be useful to compare with a healthcare professional."
                  insights={intelligence.persistence}
                />

                <InsightSection
                  title="Connections across your record"
                  description="Evidence-backed relationships found across reports, measurements, medications, or conditions."
                  insights={intelligence.connections}
                />

                <InsightSection
                  title="Documented follow-up to review"
                  description="Follow-up items without matching later documentation in the records available to Previa."
                  insights={intelligence.careLoops}
                />

                <ClinicianQuestions
                  questions={intelligence.clinicianQuestions}
                />

                <InsightSection
                  title="Record conflicts"
                  description="Sources containing potentially inconsistent information. A conflict does not automatically mean either source is wrong."
                  insights={intelligence.conflicts}
                />

                <InsightSection
                  title="Medication signals"
                  description="Temporal medication-related signals that may be useful for reconciliation and review. They do not establish causation."
                  insights={intelligence.medicationSignals}
                />

                <InsightSection
                  title="Record blind spots"
                  description="Reports or evidence that Previa cannot currently connect or fully process."
                  insights={intelligence.recordGaps}
                />

                {intelligence.changes.length > 0 ? (
                  <InsightSection
                    title="Structural record changes"
                    description="Important changes in the documented record. Numeric measurement trajectories remain the responsibility of Health Trends."
                    insights={intelligence.changes}
                  />
                ) : null}

                {!intelligence.allInsights.length ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      Nothing additional to surface yet.
                    </p>
                    <p className="mx-auto mt-1 max-w-xl text-xs leading-5 text-[var(--foreground-muted)]">
                      As more reports, observations, medications, and conditions
                      become available, Health Intelligence can identify
                      relationships across them.
                    </p>
                  </div>
                ) : null}

                <p className="text-[10px] leading-5 text-[var(--foreground-subtle)]">
                  Generated {formatDate(intelligence.generatedAt)}. Health
                  Intelligence uses deterministic record analysis and does not
                  diagnose, prescribe, or make treatment decisions.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--primary)]">
                Personal
              </p>

              <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                Your Insights
              </h2>

              <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                Keep your own observations separate from Previa&apos;s record
                intelligence.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddInsightForm}
              className="rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white"
            >
              Add Insight
            </button>
          </div>

          {showAddForm ? (
            <form
              onSubmit={handleSubmit}
              className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 sm:p-5"
            >
              {formError ? (
                <p className="mb-4 text-sm text-red-600">{formError}</p>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="text-sm font-medium text-[var(--foreground-secondary)]">
                    Title
                  </span>

                  <input
                    value={insightTitle}
                    onChange={(event) =>
                      setInsightTitle(event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
                  />
                </label>

                <label>
                  <span className="text-sm font-medium text-[var(--foreground-secondary)]">
                    Category
                  </span>

                  <input
                    value={insightCategory}
                    onChange={(event) =>
                      setInsightCategory(event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
                  />
                </label>

                <label>
                  <span className="text-sm font-medium text-[var(--foreground-secondary)]">
                    Date
                  </span>

                  <input
                    type="date"
                    value={insightDate}
                    onChange={(event) =>
                      setInsightDate(event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
                  />
                </label>

                <label className="sm:col-span-2">
                  <span className="text-sm font-medium text-[var(--foreground-secondary)]">
                    Notes
                  </span>

                  <textarea
                    value={insightNotes}
                    onChange={(event) =>
                      setInsightNotes(event.target.value)
                    }
                    rows={4}
                    className="mt-1 w-full resize-y rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
                  />
                </label>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="rounded-lg border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving
                    ? "Saving…"
                    : editingInsight
                      ? "Update Insight"
                      : "Save Insight"}
                </button>
              </div>
            </form>
          ) : null}

          {loading ? (
            <p className="mt-6 text-sm text-[var(--foreground-muted)]">
              Loading personal insights…
            </p>
          ) : insights.length > 0 ? (
            <div className="mt-6 space-y-3">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="rounded-xl border border-[var(--border)] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-[var(--foreground)]">
                        {insight.title}
                      </p>

                      {insight.category ? (
                        <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                          {insight.category}
                        </p>
                      ) : null}
                    </div>

                    {insight.insight_date ? (
                      <span className="text-xs text-[var(--foreground-muted)]">
                        {formatDate(insight.insight_date)}
                      </span>
                    ) : null}
                  </div>

                  {insight.notes ? (
                    <p className="mt-3 text-sm leading-6 text-[var(--foreground-secondary)]">
                      {insight.notes}
                    </p>
                  ) : null}

                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => openEditInsightForm(insight)}
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--primary)]"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(insight)}
                      disabled={deletingId === insight.id}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 disabled:opacity-60"
                    >
                      {deletingId === insight.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--foreground-muted)]">
              No personal health insights have been recorded yet.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
