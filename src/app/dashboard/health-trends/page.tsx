"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth, useUser } from "@clerk/nextjs";

import TrendInsight from "@/components/health-trends/TrendInsight";
import TrendMetricCard from "@/components/health-trends/TrendMetricCard";

import {
  getAllHealthTrendObservations,
} from "@/lib/health-trends/data";

import {
  calculateHealthTrends,
} from "@/lib/health-trends/engine";

import {
  buildTrendSuggestions,
} from "@/lib/health-trends/suggestions";

import {
  createDashboardDefaultsFromTrends,
} from "@/lib/health-trends/preferences";

import type {
  HealthTrend,
  TrendPeriod,
} from "@/lib/health-trends/types";

import {
    normalizeObservations,
  } from "@/lib/health-trends/normalization";

const PERIODS: Array<{
  value: TrendPeriod;
  label: string;
}> = [
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "1Y", label: "1Y" },
  { value: "ALL", label: "All" },
];

function getPeriodStart(period: TrendPeriod): Date | null {
  if (period === "ALL") {
    return null;
  }

  const date = new Date();

  switch (period) {
    case "1M":
      date.setMonth(date.getMonth() - 1);
      break;

    case "3M":
      date.setMonth(date.getMonth() - 3);
      break;

    case "6M":
      date.setMonth(date.getMonth() - 6);
      break;

    case "1Y":
      date.setFullYear(date.getFullYear() - 1);
      break;
  }

  return date;
}

function getTrendPriority(trend: HealthTrend): number {
  switch (trend.pattern) {
    case "SUDDEN_INCREASE":
    case "SUDDEN_DECREASE":
      return 5;

    case "PERSISTENT_INCREASE":
    case "PERSISTENT_DECREASE":
      return 4;

    case "INCREASING":
    case "DECREASING":
      return 3;

    case "FLUCTUATING":
      return 2;

    case "STABLE":
      return 1;

    default:
      return 0;
  }
}

function getDetectedChanges(
  trends: HealthTrend[],
): HealthTrend[] {
  return [...trends]
    .filter(
      (trend) =>
        trend.pattern !== "STABLE" &&
        trend.pattern !== "INSUFFICIENT_EVIDENCE" &&
        trend.measurementCount >= 2,
    )
    .sort((a, b) => {
      const priorityDifference =
        getTrendPriority(b) -
        getTrendPriority(a);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return (
        (b.latest?.observationDate ?? "").localeCompare(
          a.latest?.observationDate ?? "",
        )
      );
    });
}

function formatLastUpdated(date: string): string {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function EmptyTrendsState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path
            d="M4 18V6"
            strokeLinecap="round"
          />
          <path
            d="M4 18h16"
            strokeLinecap="round"
          />
          <path
            d="m7 14 3-3 3 2 5-6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h2 className="mt-4 text-base font-semibold text-slate-900">
        Your trends will appear here
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Health Trends uses measurements already extracted from
        your medical reports to show how your health data changes
        over time.
      </p>

      <p className="mt-3 text-xs text-slate-400">
        Add medical reports with measurable results to start
        building your longitudinal history.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />

      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-80 animate-pulse rounded-2xl bg-slate-100"
          />
        ))}
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50/50 px-6 py-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
          !
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            We couldn't load your health trends
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            {message}
          </p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HealthTrendsPage() {
  const { userId, getToken } = useAuth();
  const { isLoaded } = useUser();

  const [period, setPeriod] =
    useState<TrendPeriod>("ALL");

    const [allMeasurements, setAllMeasurements] =
    useState<
      Awaited<
        ReturnType<typeof getAllHealthTrendObservations>
      >
    >([]);

  const [trackedMetricIds, setTrackedMetricIds] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadTrends = useCallback(async () => {
    if (!userId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();

      if (!token) {
        throw new Error(
          "Your session could not be verified. Please sign in again.",
        );
      }

      const result =
        await getAllHealthTrendObservations(
          token,
          userId,
        );

        setAllMeasurements(result);
    } catch (err) {
      console.error(
        "Failed to load health trends:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while loading your health trends.",
      );
    } finally {
      setLoading(false);
    }
  }, [getToken, userId]);

  useEffect(() => {
    if (!isLoaded || !userId) {
      return;
    }

    void loadTrends();
  }, [isLoaded, userId, loadTrends]);

  const filteredMeasurements = useMemo(() => {
    const start = getPeriodStart(period);
  
    const filtered = start
      ? allMeasurements.filter((measurement) => {
          const observationTime = new Date(
            measurement.observation_date,
          ).getTime();
  
          return (
            Number.isFinite(observationTime) &&
            observationTime >= start.getTime()
          );
        })
      : allMeasurements;
  
    return normalizeObservations(filtered).normalized;
  }, [allMeasurements, period]);

  const trends = useMemo(
    () =>
      calculateHealthTrends(
        filteredMeasurements.map(
          (item) => item.measurement,
        ),
        period,
      ),
    [filteredMeasurements, period],
  );

  const allAvailableTrends = useMemo(() => {
    const normalized =
      normalizeObservations(allMeasurements).normalized;
  
    return calculateHealthTrends(
      normalized.map((item) => item.measurement),
      "ALL",
    );
  }, [allMeasurements]);

  useEffect(() => {
    if (
      trackedMetricIds.length > 0 ||
      allAvailableTrends.length === 0 ||
      !userId
    ) {
      return;
    }

    const defaults =
      createDashboardDefaultsFromTrends(
        userId,
        allAvailableTrends,
        4,
      );

    setTrackedMetricIds(
      defaults.map(
        (preference) => preference.metricId,
      ),
    );
  }, [
    allAvailableTrends,
    trackedMetricIds.length,
    userId,
  ]);

  const trackedTrends = useMemo(
    () =>
      trends.filter((trend) =>
        trackedMetricIds.includes(
          trend.metric.id,
        ),
      ),
    [trackedMetricIds, trends],
  );

  const suggestions = useMemo(
    () =>
      buildTrendSuggestions(
        allAvailableTrends,
        {
          visibleMetricIds: trackedMetricIds,
          limit: 3,
        },
      ),
    [allAvailableTrends, trackedMetricIds],
  );

  const detectedChanges = useMemo(
    () => getDetectedChanges(trends).slice(0, 4),
    [trends],
  );

  const handleAddTrend = (
    metricId: string,
  ) => {
    setTrackedMetricIds((current) =>
      current.includes(metricId)
        ? current
        : [...current, metricId],
    );
  };

  const handleRemoveTrend = (
    metricId: string,
  ) => {
    setTrackedMetricIds((current) =>
      current.filter(
        (id) => id !== metricId,
      ),
    );
  };

  if (!isLoaded || loading) {
    return (
      <main className="min-h-full bg-slate-50/60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <LoadingState />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-full bg-slate-50/60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <ErrorState
            message={error}
            onRetry={() => void loadTrends()}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-slate-50/60">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 17.5 9 12l3.5 3.5L20 8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M16 8h4v4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-teal-700">
                  Health Intelligence
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Health Trends
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                See how your recorded health measurements are
                changing over time. Trends show the evidence;
                Health Insights can help interpret it.
              </p>
            </div>

            <div className="shrink-0">
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {PERIODS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      setPeriod(item.value)
                    }
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      period === item.value
                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {allAvailableTrends.length === 0 ? (
          <div className="mt-6">
            <EmptyTrendsState />
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            {/* Tracked Trends */}
            <section>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                    Tracked trends
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    The health measurements currently surfaced
                    for you.
                  </p>
                </div>

                <span className="shrink-0 text-xs text-slate-400">
                  {trackedTrends.length} tracked
                </span>
              </div>

              {trackedTrends.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    No trends are being tracked yet.
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Add a metric from Suggested trends below.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {trackedTrends.map((trend) => (
                    <div
                      key={trend.metric.id}
                      className="relative"
                    >
                      <TrendMetricCard
                        trend={trend}
                        href={`/dashboard/health-trends/${encodeURIComponent(
                          trend.metric.id,
                        )}`}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveTrend(
                            trend.metric.id,
                          )
                        }
                        className="absolute right-4 top-4 rounded-lg border border-slate-200 bg-white/90 px-2 py-1 text-[10px] font-medium text-slate-400 backdrop-blur transition hover:border-slate-300 hover:text-slate-600"
                        aria-label={`Remove ${trend.metric.displayName} from tracked trends`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Suggested Trends */}
            {suggestions.length > 0 && (
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                    Suggested trends
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Metrics with useful longitudinal data that
                    you may want to track.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {suggestions.map((suggestion) => {
                    const trend =
                      allAvailableTrends.find(
                        (item) =>
                          item.metric.id ===
                          suggestion.metric.id,
                      );

                    if (!trend) {
                      return null;
                    }

                    return (
                      <div
                        key={suggestion.metric.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">
                              {suggestion.metric.displayName}
                            </h3>

                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {suggestion.reason}
                            </p>
                          </div>

                          <span className="shrink-0 rounded-full bg-teal-50 px-2 py-1 text-[10px] font-medium text-teal-700">
                            Suggested
                          </span>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                          <span className="text-[11px] text-slate-400">
                            {suggestion.measurementCount}{" "}
                            measurements
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              handleAddTrend(
                                suggestion.metric.id,
                              )
                            }
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-slate-800"
                          >
                            Track
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Recently Detected Changes */}
            {detectedChanges.length > 0 && (
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                    Recently detected changes
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Patterns detected directly from your recorded
                    measurements.
                  </p>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {detectedChanges.map((trend) => (
                    <TrendInsight
                      key={trend.metric.id}
                      title={trend.metric.displayName}
                      summary={getChangeSummary(
                        trend,
                      )}
                      direction={trend.direction}
                      pattern={trend.pattern}
                      dataSufficiency={
                        trend.dataSufficiency
                      }
                      measurementCount={
                        trend.measurementCount
                      }
                      insight={{
                        title:
                          trend.metric.displayName,
                        summary:
                          getChangeSummary(
                            trend,
                          ),
                        direction:
                          trend.direction,
                        pattern:
                          trend.pattern,
                        evidence:
                          trend.evidence,
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* All Available Metrics */}
            <section>
              <div className="mb-4">
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  All available trends
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Every measurable health metric currently
                  available from your stored records.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {trends.map((trend) => (
                  <TrendMetricCard
                    key={trend.metric.id}
                    trend={trend}
                    href={`/dashboard/health-trends/${encodeURIComponent(
                      trend.metric.id,
                    )}`}
                    compact
                  />
                ))}
              </div>
            </section>

            {/* Data provenance */}
            <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    Evidence-based trends
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Trends are calculated from measurements already
                    stored in your health records. No new medical
                    report analysis is performed here.
                  </p>
                </div>

                {allMeasurements.length > 0 && (
                  <p className="shrink-0 text-[11px] text-slate-400">
                    {allMeasurements.length} recorded measurement
                    {allMeasurements.length === 1
                      ? ""
                      : "s"}
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function getChangeSummary(
  trend: HealthTrend,
): string {
  const latest = trend.latest;

  if (!latest) {
    return "A trend pattern was detected from the available measurements.";
  }

  const latestDate = formatLastUpdated(
    latest.observationDate,
  );

  switch (trend.pattern) {
    case "PERSISTENT_INCREASE":
      return `Measurements show a persistent increase across the most recent observations. Latest measurement was recorded ${latestDate}.`;

    case "PERSISTENT_DECREASE":
      return `Measurements show a persistent decrease across the most recent observations. Latest measurement was recorded ${latestDate}.`;

    case "SUDDEN_INCREASE":
      return `The latest measurement shows a notable increase compared with the previous measurement. Latest measurement was recorded ${latestDate}.`;

    case "SUDDEN_DECREASE":
      return `The latest measurement shows a notable decrease compared with the previous measurement. Latest measurement was recorded ${latestDate}.`;

    case "INCREASING":
      return `The latest measurements show an increasing direction over the available observation history. Latest measurement was recorded ${latestDate}.`;

    case "DECREASING":
      return `The latest measurements show a decreasing direction over the available observation history. Latest measurement was recorded ${latestDate}.`;

    case "FLUCTUATING":
      return `The available measurements show changes in both directions rather than one consistent direction. Latest measurement was recorded ${latestDate}.`;

    default:
      return `A change pattern was detected from the available measurements. Latest measurement was recorded ${latestDate}.`;
  }
}