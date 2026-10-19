"use client";

import type {
  TrendInsight as TrendInsightData,
  TrendPattern,
  TrendDirection,
  TrendDataSufficiency,
} from "@/lib/health-trends/types";

interface TrendInsightProps {
  insight?: TrendInsightData | null;
  title?: string;
  summary?: string;
  direction?: TrendDirection;
  pattern?: TrendPattern;
  dataSufficiency?: TrendDataSufficiency;
  measurementCount?: number;
  compact?: boolean;
  className?: string;
}

function getDirectionLabel(
  direction?: TrendDirection,
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

function getPatternLabel(
  pattern?: TrendPattern,
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
      return "Insufficient evidence";

    default:
      return "Trend observation";
  }
}

function getDirectionStyles(
  direction?: TrendDirection,
): {
  container: string;
  icon: string;
  iconBackground: string;
} {
  switch (direction) {
    case "INCREASING":
      return {
        container: "border-emerald-100 bg-emerald-50/50",
        icon: "↑",
        iconBackground: "bg-emerald-100 text-emerald-700",
      };

    case "DECREASING":
      return {
        container: "border-blue-100 bg-blue-50/50",
        icon: "↓",
        iconBackground: "bg-blue-100 text-blue-700",
      };

    case "FLUCTUATING":
      return {
        container: "border-amber-100 bg-amber-50/50",
        icon: "↕",
        iconBackground: "bg-amber-100 text-amber-700",
      };

    case "STABLE":
      return {
        container: "border-slate-200 bg-slate-50/70",
        icon: "→",
        iconBackground: "bg-slate-100 text-slate-600",
      };

    case "INSUFFICIENT_DATA":
    default:
      return {
        container: "border-slate-200 bg-slate-50/70",
        icon: "•",
        iconBackground: "bg-slate-100 text-slate-500",
      };
  }
}

function getSufficiencyLabel(
  sufficiency?: TrendDataSufficiency,
): string {
  switch (sufficiency) {
    case "STRONG":
      return "Strong longitudinal evidence";

    case "MODERATE":
      return "Moderate longitudinal evidence";

    case "LIMITED":
      return "Limited data";

    case "INSUFFICIENT":
      return "Insufficient data";

    default:
      return "Evidence based on recorded measurements";
  }
}

function getSufficiencyStyle(
  sufficiency?: TrendDataSufficiency,
): string {
  switch (sufficiency) {
    case "STRONG":
      return "text-emerald-700";

    case "MODERATE":
      return "text-slate-600";

    case "LIMITED":
      return "text-amber-700";

    case "INSUFFICIENT":
      return "text-slate-500";

    default:
      return "text-slate-500";
  }
}

function InsightIcon({
  direction,
}: {
  direction?: TrendDirection;
}) {
  const styles = getDirectionStyles(direction);

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-semibold ${styles.iconBackground}`}
      aria-hidden="true"
    >
      {styles.icon}
    </div>
  );
}

export default function TrendInsight({
  insight,
  title,
  summary,
  direction,
  pattern,
  dataSufficiency,
  measurementCount,
  compact = false,
  className = "",
}: TrendInsightProps) {
  const resolvedTitle =
    title ?? insight?.title ?? "Trend observation";

  const resolvedSummary =
    summary ??
    insight?.summary ??
    "This observation is based on the measurements currently available.";

  const resolvedDirection =
    direction ?? insight?.direction;

  const resolvedPattern =
    pattern ?? insight?.pattern;

  const resolvedEvidence =
    insight?.evidence;

  const resolvedSufficiency =
    dataSufficiency ??
    resolvedEvidence?.dataSufficiency;

  const resolvedMeasurementCount =
    measurementCount ??
    resolvedEvidence?.measurementCount;

  const styles = getDirectionStyles(
    resolvedDirection,
  );

  return (
    <section
      className={`rounded-2xl border p-4 ${
        styles.container
      } ${className}`}
      aria-label="Health trend insight"
    >
      <div className="flex items-start gap-3">
        <InsightIcon direction={resolvedDirection} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`font-semibold text-slate-900 ${
                compact ? "text-sm" : "text-[15px]"
              }`}
            >
              {resolvedTitle}
            </h3>

            {resolvedDirection && (
              <span className="rounded-full border border-white/70 bg-white/70 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                {getDirectionLabel(
                  resolvedDirection,
                )}
              </span>
            )}
          </div>

          <p
            className={`mt-1.5 leading-6 text-slate-600 ${
              compact ? "text-xs" : "text-sm"
            }`}
          >
            {resolvedSummary}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            {resolvedPattern && (
              <span className="text-[11px] font-medium text-slate-600">
                {getPatternLabel(resolvedPattern)}
              </span>
            )}

            {resolvedMeasurementCount !==
              undefined && (
              <>
                {resolvedPattern && (
                  <span
                    className="text-slate-300"
                    aria-hidden="true"
                  >
                    •
                  </span>
                )}

                <span className="text-[11px] text-slate-500">
                  {resolvedMeasurementCount}{" "}
                  measurement
                  {resolvedMeasurementCount === 1
                    ? ""
                    : "s"}
                </span>
              </>
            )}

            {resolvedSufficiency && (
              <>
                <span
                  className="text-slate-300"
                  aria-hidden="true"
                >
                  •
                </span>

                <span
                  className={`text-[11px] font-medium ${getSufficiencyStyle(
                    resolvedSufficiency,
                  )}`}
                >
                  {getSufficiencyLabel(
                    resolvedSufficiency,
                  )}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {resolvedEvidence &&
        resolvedEvidence.measurementIds
          .length > 0 && (
          <div className="mt-4 border-t border-black/[0.04] pt-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
              Evidence
            </p>

            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              Based on{" "}
              {resolvedEvidence.measurementCount}{" "}
              recorded measurement
              {resolvedEvidence.measurementCount ===
              1
                ? ""
                : "s"}
              {resolvedEvidence.period.start &&
              resolvedEvidence.period.end
                ? ` from ${formatEvidenceDate(
                    resolvedEvidence.period.start,
                  )} to ${formatEvidenceDate(
                    resolvedEvidence.period.end,
                  )}.`
                : "."}
            </p>
          </div>
        )}
    </section>
  );
}

function formatEvidenceDate(
  value: string,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}