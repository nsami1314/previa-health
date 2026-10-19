"use client";

import {
  useMemo,
  type CSSProperties,
  type SVGProps,
} from "react";

import type { HealthMeasurement, HealthTrend } from "@/lib/health-trends/types";

interface TrendChartProps {
  trend?: HealthTrend | null;
  measurements?: HealthMeasurement[];
  height?: number;
  showAxis?: boolean;
  showPoints?: boolean;
  showLatestLabel?: boolean;
  className?: string;
}

interface ChartPoint {
  x: number;
  y: number;
  value: number;
  measurement: HealthMeasurement;
}

const CHART_PADDING = {
  top: 20,
  right: 16,
  bottom: 28,
  left: 16,
};

const MIN_CHART_WIDTH = 320;

function getMeasurements(
  trend?: HealthTrend | null,
  measurements?: HealthMeasurement[],
): HealthMeasurement[] {
  const source = measurements ?? trend?.observations ?? [];

  return [...source]
    .filter(
      (measurement) =>
        Number.isFinite(measurement.normalizedValue) &&
        Boolean(measurement.observationDate),
    )
    .sort(
      (a, b) =>
        new Date(a.observationDate).getTime() -
        new Date(b.observationDate).getTime(),
    );
}

function formatDateLabel(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatValue(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }

  if (Math.abs(value) >= 100) {
    return Math.round(value).toString();
  }

  if (Math.abs(value) >= 10) {
    return value.toFixed(1);
  }

  return value.toFixed(2).replace(/\.?0+$/, "");
}

function createPoints(
  measurements: HealthMeasurement[],
  width: number,
  height: number,
): ChartPoint[] {
  if (measurements.length === 0) {
    return [];
  }

  const chartWidth =
    width - CHART_PADDING.left - CHART_PADDING.right;

  const chartHeight =
    height - CHART_PADDING.top - CHART_PADDING.bottom;

  const values = measurements.map(
    (measurement) => measurement.normalizedValue,
  );

  let min = Math.min(...values);
  let max = Math.max(...values);

  if (min === max) {
    const padding = Math.max(Math.abs(min) * 0.1, 1);
    min -= padding;
    max += padding;
  } else {
    const padding = (max - min) * 0.12;
    min -= padding;
    max += padding;
  }

  return measurements.map((measurement, index) => {
    const x =
      measurements.length === 1
        ? CHART_PADDING.left + chartWidth / 2
        : CHART_PADDING.left +
          (index / (measurements.length - 1)) * chartWidth;

    const value = measurement.normalizedValue;

    const normalizedPosition = (value - min) / (max - min);

    const y =
      CHART_PADDING.top +
      (1 - normalizedPosition) * chartHeight;

    return {
      x,
      y,
      value,
      measurement,
    };
  });
}

function buildPath(points: ChartPoint[]): string {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";

      return `${command} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
}

function buildAreaPath(
  points: ChartPoint[],
  height: number,
): string {
  if (points.length === 0) {
    return "";
  }

  const linePath = buildPath(points);

  const first = points[0];
  const last = points[points.length - 1];

  const baseline =
    height - CHART_PADDING.bottom;

  return [
    linePath,
    `L ${last.x.toFixed(2)} ${baseline}`,
    `L ${first.x.toFixed(2)} ${baseline}`,
    "Z",
  ].join(" ");
}

function getTrendDirectionClass(
  trend?: HealthTrend | null,
): string {
  switch (trend?.direction) {
    case "INCREASING":
      return "text-emerald-600";

    case "DECREASING":
      return "text-blue-600";

    case "FLUCTUATING":
      return "text-amber-600";

    case "STABLE":
      return "text-slate-500";

    default:
      return "text-slate-400";
  }
}

function GridLine({
  y,
  width,
}: {
  y: number;
  width: number;
}) {
  return (
    <line
      x1={CHART_PADDING.left}
      x2={width - CHART_PADDING.right}
      y1={y}
      y2={y}
      stroke="currentColor"
      strokeWidth="1"
      strokeDasharray="3 5"
      className="text-slate-200"
    />
  );
}

function TrendLine({
  points,
}: {
  points: ChartPoint[];
}) {
  if (points.length < 2) {
    return null;
  }

  return (
    <path
      d={buildPath(points)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-teal-600"
    />
  );
}

function TrendArea({
  points,
  height,
}: {
  points: ChartPoint[];
  height: number;
}) {
  if (points.length < 2) {
    return null;
  }

  return (
    <path
      d={buildAreaPath(points, height)}
      className="fill-teal-500/[0.07]"
    />
  );
}

function TrendPoints({
  points,
  showPoints,
}: {
  points: ChartPoint[];
  showPoints: boolean;
}) {
  if (!showPoints) {
    return null;
  }

  return (
    <>
      {points.map((point) => (
        <circle
          key={point.measurement.id}
          cx={point.x}
          cy={point.y}
          r="3.5"
          strokeWidth="2"
          className="fill-white stroke-teal-600"
        />
      ))}
    </>
  );
}

function LatestPoint({
  point,
  showLatestLabel,
}: {
  point: ChartPoint | undefined;
  showLatestLabel: boolean;
}) {
  if (!point) {
    return null;
  }

  return (
    <>
      <circle
        cx={point.x}
        cy={point.y}
        r="5"
        strokeWidth="2.5"
        className="fill-white stroke-teal-700"
      />

      {showLatestLabel && (
        <g>
          <rect
            x={Math.min(point.x + 8, 250)}
            y={Math.max(point.y - 28, 4)}
            width="64"
            height="24"
            rx="6"
            className="fill-slate-900"
          />

          <text
            x={Math.min(point.x + 40, 282)}
            y={Math.max(point.y - 12, 20)}
            textAnchor="middle"
            className="fill-white text-[11px] font-medium"
          >
            {formatValue(point.value)}
          </text>
        </g>
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-[180px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70">
      <div className="px-6 text-center">
        <p className="text-sm font-medium text-slate-600">
          Not enough measurements
        </p>
        <p className="mt-1 text-xs text-slate-400">
          More measurements are needed to show a trend.
        </p>
      </div>
    </div>
  );
}

function SingleMeasurementState({
  measurement,
}: {
  measurement: HealthMeasurement;
}) {
  return (
    <div className="flex h-full min-h-[180px] items-center justify-center">
      <div className="text-center">
        <p className="text-2xl font-semibold tracking-tight text-slate-900">
          {formatValue(measurement.normalizedValue)}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {measurement.normalizedUnit}
        </p>

        <p className="mt-3 text-xs text-slate-400">
          One measurement recorded
        </p>
      </div>
    </div>
  );
}

export default function TrendChart({
  trend,
  measurements,
  height = 240,
  showAxis = true,
  showPoints = true,
  showLatestLabel = true,
  className = "",
}: TrendChartProps) {
  const chartMeasurements = useMemo(
    () => getMeasurements(trend, measurements),
    [trend, measurements],
  );

  const width = Math.max(
    MIN_CHART_WIDTH,
    chartMeasurements.length * 72,
  );

  const points = useMemo(
    () => createPoints(chartMeasurements, width, height),
    [chartMeasurements, width, height],
  );

  const latestPoint =
    points.length > 0 ? points[points.length - 1] : undefined;

  const dates = useMemo(() => {
    if (chartMeasurements.length === 0) {
      return [];
    }

    if (chartMeasurements.length === 1) {
      return [formatDateLabel(chartMeasurements[0].observationDate)];
    }

    const first = chartMeasurements[0];
    const middle =
      chartMeasurements[
        Math.floor(chartMeasurements.length / 2)
      ];
    const last =
      chartMeasurements[chartMeasurements.length - 1];

    return [
      formatDateLabel(first.observationDate),
      formatDateLabel(middle.observationDate),
      formatDateLabel(last.observationDate),
    ];
  }, [chartMeasurements]);

  const directionClass = getTrendDirectionClass(trend);

  const chartStyle = {
    minWidth: `${width}px`,
  } satisfies CSSProperties;

  if (chartMeasurements.length === 0) {
    return <EmptyState />;
  }

  if (chartMeasurements.length === 1) {
    return (
      <div className={className}>
        <SingleMeasurementState
          measurement={chartMeasurements[0]}
        />
      </div>
    );
  }

  const svgProps: SVGProps<SVGSVGElement> = {
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": trend?.metric.displayName
      ? `${trend.metric.displayName} trend`
      : "Health metric trend",
    preserveAspectRatio: "none",
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full overflow-x-auto overflow-y-hidden">
        <svg
          {...svgProps}
          width={width}
          height={height}
          style={chartStyle}
          className={`block ${directionClass}`}
        >
          {showAxis && (
            <>
              <GridLine
                y={CHART_PADDING.top}
                width={width}
              />

              <GridLine
                y={height / 2}
                width={width}
              />

              <GridLine
                y={height - CHART_PADDING.bottom}
                width={width}
              />
            </>
          )}

          <TrendArea
            points={points}
            height={height}
          />

          <TrendLine points={points} />

          <TrendPoints
            points={points}
            showPoints={showPoints}
          />

          <LatestPoint
            point={latestPoint}
            showLatestLabel={showLatestLabel}
          />
        </svg>
      </div>

      {showAxis && dates.length > 0 && (
        <div className="mt-1 flex justify-between px-1 text-[11px] text-slate-400">
          {dates.map((date, index) => (
            <span key={`${date}-${index}`}>
              {date}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
