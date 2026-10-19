import type { PatientObservation } from "@/lib/vitals/types";
import { OBSERVATION_TYPES } from "@/lib/vitals/constants";
import {
  formatBloodPressure,
  formatVitalDateTime,
  formatVitalTrendLabel,
  formatVitalValue,
  getVitalDecimals,
  getVitalTrendIcon,
  getVitalTrendTone,
} from "@/components/vitals/vital-utils";

type VitalDefinition = (typeof OBSERVATION_TYPES)[number];

export type VitalCardMetric = {
  vital: VitalDefinition;
  readings: PatientObservation[];
  latest: PatientObservation | null;
  previous: PatientObservation | null;
  minimum: number | null;
  maximum: number | null;
  average: number | null;
  change: number | null;
  trend: "RISING" | "FALLING" | "STABLE" | "INSUFFICIENT_DATA" | string;
};

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] text-[var(--foreground-muted)]">
        {label}
      </p>

      <p className="mt-0.5 truncate text-xs font-medium text-[var(--foreground-secondary)]">
        {value}
      </p>
    </div>
  );
}

export default function VitalCard({
  metric,
}: {
  metric: VitalCardMetric;
}) {
  const { vital } = metric;
  const decimals = getVitalDecimals(vital.value);

  const isBloodPressure = vital.value === "BLOOD_PRESSURE";

  const latestValue = isBloodPressure
    ? formatBloodPressure(
        metric.latest?.value,
        metric.latest?.secondary_value
      )
    : formatVitalValue(metric.latest?.value, decimals);

  const previousValue = isBloodPressure
    ? formatBloodPressure(
        metric.previous?.value,
        metric.previous?.secondary_value
      )
    : formatVitalValue(metric.previous?.value, decimals);

  return (
    <article className="previa-card previa-card-interactive overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--primary-subtle)] text-[10px] font-semibold text-[var(--primary)]">
              {vital.label.slice(0, 3)}
            </span>

            <p className="truncate text-sm font-medium text-[var(--foreground-secondary)]">
              {vital.label}
            </p>
          </div>

          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-[28px] font-semibold tracking-[-0.035em] text-[var(--foreground)]">
              {latestValue}
            </span>

            {!isBloodPressure && (
              <span className="text-xs text-[var(--foreground-muted)]">
                {vital.unit}
              </span>
            )}
          </div>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${getVitalTrendTone(
            metric.trend
          )}`}
        >
          <span>{getVitalTrendIcon(metric.trend)}</span>

          {formatVitalTrendLabel(metric.trend)}
        </span>
      </div>

      {metric.latest ? (
        <p className="mt-2 text-[11px] text-[var(--foreground-muted)]">
          Updated {formatVitalDateTime(metric.latest.recorded_at)}
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-[var(--foreground-muted)]">
          No readings in the last 24 hours
        </p>
      )}

      <div className="my-4 h-px bg-[var(--border)]" />

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <MiniStat
          label="Previous"
          value={
            previousValue === "—"
              ? "—"
              : isBloodPressure
                ? previousValue
                : `${previousValue} ${vital.unit}`
          }
        />

        <MiniStat
          label="Change"
          value={
            metric.change === null
              ? "—"
              : `${metric.change > 0 ? "+" : ""}${formatVitalValue(
                  metric.change,
                  decimals
                )}`
          }
        />

        <MiniStat
          label="24h min"
          value={
            metric.minimum === null
              ? "—"
              : formatVitalValue(metric.minimum, decimals)
          }
        />

        <MiniStat
          label="24h max"
          value={
            metric.maximum === null
              ? "—"
              : formatVitalValue(metric.maximum, decimals)
          }
        />

        <MiniStat
          label="24h average"
          value={
            metric.average === null
              ? "—"
              : formatVitalValue(metric.average, decimals)
          }
        />

        <MiniStat
          label="Readings"
          value={String(metric.readings.length)}
        />
      </div>
    </article>
  );
}