import type {
    ObservationType,
    PatientObservation,
  } from "./types";
  
  export type TrendDirection =
    | "RISING"
    | "FALLING"
    | "STABLE"
    | "INSUFFICIENT_DATA";
  
  export interface ObservationStatistics {
    observationType: string;
  
    latest: PatientObservation | null;
    previous: PatientObservation | null;
  
    count: number;
  
    min: number | null;
    max: number | null;
    average: number | null;
  
    change: number | null;
    percentageChange: number | null;
  
    trend: TrendDirection;
  
    firstRecordedAt: string | null;
    lastRecordedAt: string | null;
  
    secondary: {
      min: number | null;
      max: number | null;
      average: number | null;
      change: number | null;
      percentageChange: number | null;
    } | null;
  }
  
  export interface VitalDashboardMetric {
    observationType: string;
  
    latest: PatientObservation | null;
    previous: PatientObservation | null;
  
    min24h: number | null;
    max24h: number | null;
    average24h: number | null;
  
    change: number | null;
    percentageChange: number | null;
  
    trend: TrendDirection;
  
    readingCount24h: number;
  
    secondaryMin24h: number | null;
    secondaryMax24h: number | null;
    secondaryAverage24h: number | null;
  }
  
  /* ============================================================
     BASIC HELPERS
     ============================================================ */
  
  function round(value: number, decimals = 2): number {
    const multiplier = 10 ** decimals;
  
    return Math.round(value * multiplier) / multiplier;
  }
  
  function calculateAverage(values: number[]): number | null {
    if (values.length === 0) {
      return null;
    }
  
    return round(
      values.reduce((sum, value) => sum + value, 0) /
        values.length,
    );
  }
  
  function calculateMin(values: number[]): number | null {
    if (values.length === 0) {
      return null;
    }
  
    return Math.min(...values);
  }
  
  function calculateMax(values: number[]): number | null {
    if (values.length === 0) {
      return null;
    }
  
    return Math.max(...values);
  }
  
  function calculateChange(
    latest: number | null,
    previous: number | null,
  ): number | null {
    if (
      latest === null ||
      previous === null
    ) {
      return null;
    }
  
    return round(latest - previous);
  }
  
  function calculatePercentageChange(
    latest: number | null,
    previous: number | null,
  ): number | null {
    if (
      latest === null ||
      previous === null ||
      previous === 0
    ) {
      return null;
    }
  
    return round(
      ((latest - previous) / Math.abs(previous)) * 100,
    );
  }
  
  /* ============================================================
     TREND ENGINE
     ============================================================ */
  
  export function calculateTrend(
    observations: PatientObservation[],
    minimumReadings = 3,
  ): TrendDirection {
    const valid = observations
      .filter(
        (observation) =>
          observation.value !== null &&
          Number.isFinite(observation.value),
      )
      .sort(
        (a, b) =>
          new Date(a.recorded_at).getTime() -
          new Date(b.recorded_at).getTime(),
      );
  
    if (valid.length < minimumReadings) {
      return "INSUFFICIENT_DATA";
    }
  
    /*
     * Use the first and last readings to determine the
     * overall direction.
     *
     * A small change is treated as stable.
     */
  
    const first = valid[0].value!;
    const last = valid[valid.length - 1].value!;
  
    const difference = last - first;
  
    /*
     * Relative tolerance prevents tiny measurement
     * fluctuations from being presented as a trend.
     */
  
    const tolerance = Math.max(
      Math.abs(first) * 0.02,
      0.5,
    );
  
    if (Math.abs(difference) <= tolerance) {
      return "STABLE";
    }
  
    if (difference > 0) {
      return "RISING";
    }
  
    return "FALLING";
  }
  
  /* ============================================================
     SORTING
     ============================================================ */
  
  function sortNewestFirst(
    observations: PatientObservation[],
  ): PatientObservation[] {
    return [...observations].sort(
      (a, b) =>
        new Date(b.recorded_at).getTime() -
        new Date(a.recorded_at).getTime(),
    );
  }
  
  /* ============================================================
     STATISTICS
     ============================================================ */
  
  export function calculateObservationStatistics(
    observations: PatientObservation[],
    observationType?: ObservationType | string,
  ): ObservationStatistics {
    const filtered = sortNewestFirst(
      observations.filter((observation) => {
        if (!observationType) {
          return true;
        }
  
        return (
          observation.observation_type ===
          observationType
        );
      }),
    );
  
    const valid = filtered.filter(
      (observation) =>
        observation.value !== null &&
        Number.isFinite(observation.value),
    );
  
    const latest = valid[0] ?? null;
    const previous = valid[1] ?? null;
  
    const values = valid.map(
      (observation) => observation.value!,
    );
  
    const secondaryValues = valid
      .map(
        (observation) =>
          observation.secondary_value,
      )
      .filter(
        (value): value is number =>
          value !== null &&
          value !== undefined &&
          Number.isFinite(value),
      );
  
    const latestValue =
      latest?.value ?? null;
  
    const previousValue =
      previous?.value ?? null;
  
    const latestSecondary =
      latest?.secondary_value ?? null;
  
    const previousSecondary =
      previous?.secondary_value ?? null;
  
    return {
      observationType:
        observationType ??
        latest?.observation_type ??
        "",
  
      latest,
      previous,
  
      count: valid.length,
  
      min: calculateMin(values),
      max: calculateMax(values),
      average: calculateAverage(values),
  
      change: calculateChange(
        latestValue,
        previousValue,
      ),
  
      percentageChange:
        calculatePercentageChange(
          latestValue,
          previousValue,
        ),
  
      trend: calculateTrend(valid),
  
      firstRecordedAt:
        valid.length > 0
          ? valid[valid.length - 1].recorded_at
          : null,
  
      lastRecordedAt:
        valid.length > 0
          ? valid[0].recorded_at
          : null,
  
      secondary:
        secondaryValues.length > 0
          ? {
              min: calculateMin(
                secondaryValues,
              ),
  
              max: calculateMax(
                secondaryValues,
              ),
  
              average:
                calculateAverage(
                  secondaryValues,
                ),
  
              change: calculateChange(
                latestSecondary,
                previousSecondary,
              ),
  
              percentageChange:
                calculatePercentageChange(
                  latestSecondary,
                  previousSecondary,
                ),
            }
          : null,
    };
  }
  
  /* ============================================================
     24-HOUR DASHBOARD METRIC
     ============================================================ */
  
  export function calculate24HourMetric(
    observations: PatientObservation[],
    observationType: ObservationType | string,
    now = new Date(),
  ): VitalDashboardMetric {
    const endTime = now.getTime();
  
    const startTime =
      endTime - 24 * 60 * 60 * 1000;
  
    const filtered = observations.filter(
      (observation) => {
        if (
          observation.observation_type !==
          observationType
        ) {
          return false;
        }
  
        const recordedTime =
          new Date(
            observation.recorded_at,
          ).getTime();
  
        return (
          recordedTime >= startTime &&
          recordedTime <= endTime
        );
      },
    );
  
    const statistics =
      calculateObservationStatistics(
        filtered,
        observationType,
      );
  
    return {
      observationType,
  
      latest: statistics.latest,
      previous: statistics.previous,
  
      min24h: statistics.min,
      max24h: statistics.max,
      average24h: statistics.average,
  
      change: statistics.change,
      percentageChange:
        statistics.percentageChange,
  
      trend: statistics.trend,
  
      readingCount24h:
        statistics.count,
  
      secondaryMin24h:
        statistics.secondary?.min ?? null,
  
      secondaryMax24h:
        statistics.secondary?.max ?? null,
  
      secondaryAverage24h:
        statistics.secondary?.average ?? null,
    };
  }
  
  /* ============================================================
     MULTI-VITAL DASHBOARD
     ============================================================ */
  
  export function calculateDashboardMetrics(
    observations: PatientObservation[],
    observationTypes: Array<
      ObservationType | string
    >,
    now = new Date(),
  ): VitalDashboardMetric[] {
    return observationTypes.map(
      (observationType) =>
        calculate24HourMetric(
          observations,
          observationType,
          now,
        ),
    );
  }
  
  /* ============================================================
     DATE RANGE FILTER
     ============================================================ */
  
  export function filterObservationsByDateRange(
    observations: PatientObservation[],
    startAt: string | Date,
    endAt: string | Date,
  ): PatientObservation[] {
    const start =
      new Date(startAt).getTime();
  
    const end =
      new Date(endAt).getTime();
  
    return observations.filter(
      (observation) => {
        const timestamp =
          new Date(
            observation.recorded_at,
          ).getTime();
  
        return (
          timestamp >= start &&
          timestamp <= end
        );
      },
    );
  }
  
  /* ============================================================
     TIME-OF-DAY PATTERN
     ============================================================ */
  
  export interface TimeOfDayAverage {
    hour: number;
    average: number | null;
    count: number;
  }
  
  export function calculateTimeOfDayPattern(
    observations: PatientObservation[],
  ): TimeOfDayAverage[] {
    const buckets = new Map<
      number,
      number[]
    >();
  
    for (const observation of observations) {
      if (
        observation.value === null ||
        !Number.isFinite(observation.value)
      ) {
        continue;
      }
  
      const hour = new Date(
        observation.recorded_at,
      ).getHours();
  
      const existing =
        buckets.get(hour) ?? [];
  
      existing.push(observation.value);
  
      buckets.set(hour, existing);
    }
  
    return Array.from(
      { length: 24 },
      (_, hour) => {
        const values =
          buckets.get(hour) ?? [];
  
        return {
          hour,
          average:
            calculateAverage(values),
          count: values.length,
        };
      },
    );
  }