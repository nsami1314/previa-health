"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth, useUser } from "@clerk/nextjs";

import TrendChart from "@/components/health-trends/TrendChart";
import TrendInsight from "@/components/health-trends/TrendInsight";

import {
  getAllHealthTrendObservations,
} from "@/lib/health-trends/data";

import {
  calculateHealthTrends,
} from "@/lib/health-trends/engine";

import {
  normalizeObservations,
} from "@/lib/health-trends/normalization";

import type {
  HealthTrend,
  TrendPeriod,
} from "@/lib/health-trends/types";

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

function getPeriodStart(
  period: TrendPeriod,
): Date | null {
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

function formatValue(
  value: number | null,
): string {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  if (Math.abs(value) >= 100) {
    return Math.round(value).toString();
  }

  if (Math.abs(value) >= 10) {
    return value.toFixed(1);
  }

  return value
    .toFixed(2)
    .replace(/\.?0+$/, "");
}

function formatChange(
  value: number | null,
): string {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  const formatted =
    Math.abs(value) >= 10
      ? value.toFixed(1)
      : value
          .toFixed(2)
          .replace(/\.?0+$/, "");

  return `${value > 0 ? "+" : ""}${formatted}`;
}

function formatPercentage(
  value: number | null,
): string {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  const formatted =
    Math.abs(value) >= 10
      ? value.toFixed(1)
      : value
          .toFixed(2)
          .replace(/\.?0+$/, "");

  return `${value > 0 ? "+" : ""}${formatted}%`;
}

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getDirectionLabel(
  direction: HealthTrend["direction"],
): string {
  switch (direction) {
    case "INCREASING":
      return "Increasing";

    case "DECREASING":
      return "Decreasing";

    case "STABLE":
      return "Stable";

    case "FLUCTUATING":
      return "Fluctuating";

    case "INSUFFICIENT_DATA":
      return "Limited data";

    default:
      return "Trend";
  }
}

function getDirectionStyles(
  direction: HealthTrend["direction"],
): {
  badge: string;
  value: string;
  icon: string;
} {
  switch (direction) {
    case "INCREASING":
      return {
        badge:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        value: "text-emerald-700",
        icon: "↑",
      };

    case "DECREASING":
      return {
        badge:
          "border-blue-200 bg-blue-50 text-blue-700",
        value: "text-blue-700",
        icon: "↓",
      };

    case "FLUCTUATING":
      return {
        badge:
          "border-amber-200 bg-amber-50 text-amber-700",
        value: "text-amber-700",
        icon: "↕",
      };

    case "STABLE":
      return {
        badge:
          "border-slate-200 bg-slate-50 text-slate-600",
        value: "text-slate-700",
        icon: "→",
      };

    default:
      return {
        badge:
          "border-slate-200 bg-slate-50 text-slate-500",
        value: "text-slate-700",
        icon: "•",
      };
  }
}

function getPatternLabel(
  pattern: HealthTrend["pattern"],
): string {
  switch (pattern) {
    case "PERSISTENT_INCREASE":
      return "Persistent increase";

    case "PERSISTENT_DECREASE":
      return "Persistent decrease";

    case "SUDDEN_INCREASE":
      return "Sudden increase";

    case "SUDDEN_DECREASE":
      return "Sudden decrease";

    case "INCREASING":
      return "Increasing trend";

    case "DECREASING":
      return "Decreasing trend";

    case "FLUCTUATING":
      return "Fluctuating";

    case "STABLE":
      return "Stable";

    default:
      return "Insufficient evidence";
  }
}

function getSufficiencyLabel(
  value: HealthTrend["dataSufficiency"],
): string {
  switch (value) {
    case "STRONG":
      return "Strong longitudinal data";

    case "MODERATE":
      return "Moderate longitudinal data";

    case "LIMITED":
      return "Limited data";

    default:
      return "Insufficient data";
  }
}

function getInsightSummary(
  trend: HealthTrend,
): string {
  switch (trend.pattern) {
    case "PERSISTENT_INCREASE":
      return "The available measurements show a persistent increase across the recent observation history.";

    case "PERSISTENT_DECREASE":
      return "The available measurements show a persistent decrease across the recent observation history.";

    case "SUDDEN_INCREASE":
      return "The latest measurement shows a notable increase compared with the previous measurement.";

    case "SUDDEN_DECREASE":
      return "The latest measurement shows a notable decrease compared with the previous measurement.";

    case "INCREASING":
      return "The available measurements show an increasing direction over time.";

    case "DECREASING":
      return "The available measurements show a decreasing direction over time.";

    case "FLUCTUATING":
      return "The available measurements move in both directions rather than following one consistent direction.";

    case "STABLE":
      return "The latest measurements remain within the stable range defined by the trend engine.";

    default:
      return "There are not yet enough measurements to establish a reliable longitudinal pattern.";
  }
}

function LoadingState() {
  return (
    <main className="min-h-full bg-slate-50/60">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-[360px] animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    </main>
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
    <main className="min-h-full bg-slate-50/60">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-red-100 bg-red-50/50 px-6 py-8">
          <h1 className="text-sm font-semibold text-slate-900">
            We couldn't load this trend
          </h1>

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
    </main>
  );
}

function NotFoundState() {
  return (
    <main className="min-h-full bg-slate-50/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <h1 className="text-lg font-semibold text-slate-900">
            Trend not found
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            This metric is not currently available in your
            stored health measurements.
          </p>

          <Link
            href="/dashboard/health-trends"
            className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Back to Health Trends
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function HealthTrendMetricPage({
  params,
}: {
  params: Promise<{
    metric: string;
  }>;
}) {
  const { userId, getToken } = useAuth();
  const { isLoaded } = useUser();

  const [metricId, setMetricId] =
    useState<string | null>(null);

  const [period, setPeriod] =
    useState<TrendPeriod>("ALL");

  const [allMeasurements, setAllMeasurements] =
    useState<
      Awaited<
        ReturnType<
          typeof getAllHealthTrendObservations
        >
      >
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void params.then((resolvedParams) => {
      if (!active) {
        return;
      }

      setMetricId(
        decodeURIComponent(
          resolvedParams.metric,
        ),
      );
    });

    return () => {
      active = false;
    };
  }, [params]);

  const loadMeasurements =
    useCallback(async () => {
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
          "Failed to load health trend:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred while loading this health trend.",
        );
      } finally {
        setLoading(false);
      }
    }, [getToken, userId]);

  useEffect(() => {
    if (!isLoaded || !userId) {
      return;
    }

    void loadMeasurements();
  }, [
    isLoaded,
    userId,
    loadMeasurements,
  ]);

  const normalizedMeasurements =
    useMemo(() => {
      return normalizeObservations(
        allMeasurements,
      ).normalized.map(
        (item) => item.measurement,
      );
    }, [allMeasurements]);

  const filteredMeasurements =
    useMemo(() => {
      if (!metricId) {
        return [];
      }

      const start =
        getPeriodStart(period);

      return normalizedMeasurements
        .filter(
          (measurement) =>
            measurement.metricId === metricId,
        )
        .filter((measurement) => {
          if (!start) {
            return true;
          }

          const timestamp = new Date(
            measurement.observationDate,
          ).getTime();

          return (
            Number.isFinite(timestamp) &&
            timestamp >= start.getTime()
          );
        });
    }, [
      metricId,
      normalizedMeasurements,
      period,
    ]);

  const trend = useMemo(() => {
    if (filteredMeasurements.length === 0) {
      return null;
    }

    const trends = calculateHealthTrends(
      filteredMeasurements,
      period,
    );

    return trends[0] ?? null;
  }, [
    filteredMeasurements,
    period,
  ]);

  const styles = trend
    ? getDirectionStyles(
        trend.direction,
      )
    : getDirectionStyles(
        "INSUFFICIENT_DATA",
      );

  if (
    !isLoaded ||
    loading ||
    metricId === null
  ) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() =>
          void loadMeasurements()
        }
      />
    );
  }

  if (!trend) {
    return <NotFoundState />;
  }

  const latest =
    trend.latest?.normalizedValue ?? null;

  const previous =
    trend.previous?.normalizedValue ?? null;

  const baseline =
    trend.baseline?.normalizedValue ?? null;

  return (
    <main className="min-h-full bg-slate-50/60">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Back navigation */}
        <Link
          href="/dashboard/health-trends"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
        >
          <span aria-hidden="true">
            ←
          </span>
          Health Trends
        </Link>

        {/* Header */}
        <header className="mt-5 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                  {trend.metric.category}
                </span>

                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium ${styles.badge}`}
                >
                  <span aria-hidden="true">
                    {styles.icon}
                  </span>
                  {getDirectionLabel(
                    trend.direction,
                  )}
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                {trend.metric.displayName}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {trend.metric.canonicalName}
              </p>
            </div>

            <div className="inline-flex self-start rounded-xl border border-slate-200 bg-slate-50 p-1">
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
        </header>

        {/* Current snapshot */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
              Latest
            </p>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-slate-950">
                {formatValue(latest)}
              </span>

              <span className="text-xs font-medium text-slate-500">
                {trend.latest?.normalizedUnit ?? ""}
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              {formatDate(
                trend.latest?.observationDate ??
                  null,
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
              Previous
            </p>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-slate-950">
                {formatValue(previous)}
              </span>

              <span className="text-xs font-medium text-slate-500">
                {trend.previous?.normalizedUnit ?? ""}
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              {formatDate(
                trend.previous?.observationDate ??
                  null,
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
              Change
            </p>

            <div className="mt-3">
              <span
                className={`text-3xl font-semibold tracking-tight ${styles.value}`}
              >
                {formatChange(
                  trend.statistics.change
                    .absolute,
                )}
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              {formatPercentage(
                trend.statistics.change
                  .percentage,
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
              Baseline
            </p>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-slate-950">
                {formatValue(baseline)}
              </span>

              <span className="text-xs font-medium text-slate-500">
                {trend.baseline?.normalizedUnit ?? ""}
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              {formatDate(
                trend.baseline?.observationDate ??
                  null,
              )}
            </p>
          </div>
        </section>

        {/* Chart */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Longitudinal trend
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {trend.measurementCount} recorded measurement
                {trend.measurementCount === 1
                  ? ""
                  : "s"}{" "}
                in this period
              </p>
            </div>

            <span className="text-xs text-slate-400">
              {formatDate(
                trend.dateRange.start,
              )}{" "}
              —{" "}
              {formatDate(
                trend.dateRange.end,
              )}
            </span>
          </div>

          <div className="mt-6">
            <TrendChart
              trend={trend}
              height={330}
              showAxis
              showPoints
              showLatestLabel
            />
          </div>
        </section>

        {/* What the data shows */}
        <section className="mt-6">
          <TrendInsight
            title="What the data shows"
            summary={getInsightSummary(
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
                "What the data shows",
              summary:
                getInsightSummary(
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
        </section>

        {/* Statistics */}
        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Trend statistics
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Calculated from the measurements available in the
              selected period.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatisticCard
              label="Minimum"
              value={formatValue(
                trend.statistics.minimum,
              )}
              unit={
                trend.latest
                  ?.normalizedUnit ?? ""
              }
            />

            <StatisticCard
              label="Maximum"
              value={formatValue(
                trend.statistics.maximum,
              )}
              unit={
                trend.latest
                  ?.normalizedUnit ?? ""
              }
            />

            <StatisticCard
              label="Average"
              value={formatValue(
                trend.statistics.average,
              )}
              unit={
                trend.latest
                  ?.normalizedUnit ?? ""
              }
            />

            <StatisticCard
              label="Standard deviation"
              value={formatValue(
                trend.statistics
                  .standardDeviation,
              )}
              unit={
                trend.latest
                  ?.normalizedUnit ?? ""
              }
            />
          </div>
        </section>

        {/* Measurement history */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">
              Measurement history
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Source measurements used to calculate this trend.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {[...trend.observations]
              .reverse()
              .map((measurement) => (
                <div
                  key={measurement.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {formatDate(
                        measurement.observationDate,
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {getSourceLabel(
                        measurement.sourceType,
                      )}
                    </p>
                    {measurement.medicalReportId ? (
                      <Link
                        href={`/dashboard/medical-reports/${encodeURIComponent(
                          measurement.medicalReportId,
                        )}`}
                        className="mt-1 inline-block text-xs font-medium text-teal-700 hover:underline"
                      >
                        Open source report
                      </Link>
                    ) : null}
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-semibold text-slate-900">
                      {formatValue(
                        measurement.normalizedValue,
                      )}
                    </span>

                    <span className="text-xs text-slate-500">
                      {measurement.normalizedUnit}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* Evidence */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-700">
                Evidence & data quality
              </p>

              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                {trend.evidence.dataQualityMessage ??
                  getSufficiencyLabel(
                    trend.dataSufficiency,
                  )}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-[11px] font-medium text-slate-600">
                {getSufficiencyLabel(
                  trend.dataSufficiency,
                )}
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                {trend.evidence.measurementCount}{" "}
                measurement
                {trend.evidence
                  .measurementCount === 1
                  ? ""
                  : "s"}
              </p>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
              Observation period
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {formatDate(
                trend.evidence.period.start,
              )}{" "}
              —{" "}
              {formatDate(
                trend.evidence.period.end,
              )}
            </p>
          </div>
        </section>

        {/* Navigation */}
        <div className="mt-6 flex justify-between pb-8">
          <Link
            href="/dashboard/health-trends"
            className="text-sm font-medium text-slate-500 transition hover:text-slate-800"
          >
            ← All Health Trends
          </Link>
        </div>
      </div>
    </main>
  );
}

function StatisticCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-400">
        {label}
      </p>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-xl font-semibold tracking-tight text-slate-900">
          {value}
        </span>

        {unit && (
          <span className="text-[11px] text-slate-500">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function getSourceLabel(
  sourceType: string,
): string {
  switch (sourceType) {
    case "MEDICAL_REPORT":
      return "Medical report";

    case "VITALS":
      return "Vitals";

    case "MANUAL":
      return "Manual entry";

    case "DEVICE":
      return "Device";

    case "IMPORT":
      return "Imported record";

    case "API":
      return "Connected source";

    default:
      return "Health record";
  }
}
