"use client";

import Link from "next/link";
import TrendChart from "./TrendChart";

import type { HealthTrend } from "@/lib/health-trends/types";

interface TrendMetricCardProps {
  trend: HealthTrend;
  href?: string;
  compact?: boolean;
  showChart?: boolean;
  className?: string;
}

function formatValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  if (Math.abs(value) >= 100) {
    return Math.round(value).toString();
  }

  if (Math.abs(value) >= 10) {
    return value.toFixed(1);
  }

  return value.toFixed(2).replace(/\.?0+$/, "");
}

function formatChange(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  const rounded =
    Math.abs(value) >= 10
      ? value.toFixed(1)
      : value.toFixed(2).replace(/\.?0+$/, "");

  return `${value > 0 ? "+" : ""}${rounded}`;
}

function formatPercentage(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  const rounded =
    Math.abs(value) >= 10
      ? value.toFixed(1)
      : value.toFixed(2).replace(/\.?0+$/, "");

  return `${value > 0 ? "+" : ""}${rounded}%`;
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
      return "Unknown";
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

    case "INSUFFICIENT_EVIDENCE":
    default:
      return "Insufficient evidence";
  }
}

function getDirectionStyles(
  direction: HealthTrend["direction"],
): {
  badge: string;
  icon: string;
} {
  switch (direction) {
    case "INCREASING":
      return {
        badge:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        icon: "↑",
      };

    case "DECREASING":
      return {
        badge:
          "border-blue-200 bg-blue-50 text-blue-700",
        icon: "↓",
      };

    case "FLUCTUATING":
      return {
        badge:
          "border-amber-200 bg-amber-50 text-amber-700",
        icon: "↕",
      };

    case "STABLE":
      return {
        badge:
          "border-slate-200 bg-slate-50 text-slate-600",
        icon: "→",
      };

    case "INSUFFICIENT_DATA":
    default:
      return {
        badge:
          "border-slate-200 bg-slate-50 text-slate-500",
        icon: "•",
      };
  }
}

function getSufficiencyLabel(
  sufficiency: HealthTrend["dataSufficiency"],
): string {
  switch (sufficiency) {
    case "STRONG":
      return "Strong data";

    case "MODERATE":
      return "Moderate data";

    case "LIMITED":
      return "Limited data";

    case "INSUFFICIENT":
    default:
      return "Insufficient data";
  }
}

function getSufficiencyStyles(
  sufficiency: HealthTrend["dataSufficiency"],
): string {
  switch (sufficiency) {
    case "STRONG":
      return "text-emerald-600";

    case "MODERATE":
      return "text-slate-600";

    case "LIMITED":
      return "text-amber-600";

    case "INSUFFICIENT":
    default:
      return "text-slate-400";
  }
}

function MetricIcon() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
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
    </div>
  );
}

function CardContent({
  trend,
  compact,
  showChart,
}: {
  trend: HealthTrend;
  compact: boolean;
  showChart: boolean;
}) {
  const styles = getDirectionStyles(trend.direction);

  const latestValue =
    trend.latest?.normalizedValue ?? null;

  const previousValue =
    trend.previous?.normalizedValue ?? null;

  const absoluteChange =
    trend.statistics.change.absolute;

  const percentageChange =
    trend.statistics.change.percentage;

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <MetricIcon />

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {trend.metric.displayName}
            </p>

            <p className="mt-0.5 truncate text-xs text-slate-500">
              {trend.metric.category}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${styles.badge}`}
        >
          <span aria-hidden="true">
            {styles.icon}
          </span>
          {getDirectionLabel(trend.direction)}
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-semibold tracking-tight text-slate-950 ${
                compact ? "text-2xl" : "text-3xl"
              }`}
            >
              {formatValue(latestValue)}
            </span>

            <span className="text-xs font-medium text-slate-500">
              {trend.latest?.normalizedUnit ?? ""}
            </span>
          </div>

          {previousValue !== null && (
            <p className="mt-1 text-xs text-slate-500">
              Previous{" "}
              <span className="font-medium text-slate-700">
                {formatValue(previousValue)}
              </span>
            </p>
          )}
        </div>

        {absoluteChange !== null && (
          <div className="text-right">
            <p
              className={`text-sm font-semibold ${
                trend.direction === "FLUCTUATING"
                  ? "text-amber-600"
                  : trend.direction === "INCREASING"
                    ? "text-emerald-600"
                    : trend.direction === "DECREASING"
                      ? "text-blue-600"
                      : "text-slate-600"
              }`}
            >
              {formatChange(absoluteChange)}
            </p>

            {percentageChange !== null && (
              <p className="mt-0.5 text-[11px] text-slate-400">
                {formatPercentage(percentageChange)}
              </p>
            )}
          </div>
        )}
      </div>

      {showChart && (
        <div className="mt-4">
          <TrendChart
            trend={trend}
            height={compact ? 120 : 150}
            showAxis={false}
            showPoints={!compact}
            showLatestLabel={false}
          />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`truncate text-[11px] font-medium ${getSufficiencyStyles(
              trend.dataSufficiency,
            )}`}
          >
            {getSufficiencyLabel(
              trend.dataSufficiency,
            )}
          </span>

          <span className="text-slate-300">
            •
          </span>

          <span className="truncate text-[11px] text-slate-400">
            {trend.measurementCount} measurement
            {trend.measurementCount === 1 ? "" : "s"}
          </span>
        </div>

        <span className="shrink-0 text-[11px] text-slate-400">
          {getPatternLabel(trend.pattern)}
        </span>
      </div>
    </>
  );
}

export default function TrendMetricCard({
  trend,
  href,
  compact = false,
  showChart = true,
  className = "",
}: TrendMetricCardProps) {
  const content = (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition ${
        href
          ? "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
          : ""
      } ${className}`}
    >
      <CardContent
        trend={trend}
        compact={compact}
        showChart={showChart}
      />
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      href={href}
      className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
    >
      {content}
    </Link>
  );
}