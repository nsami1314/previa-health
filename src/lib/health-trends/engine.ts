import {
    findHealthMetric,
    getHealthMetric,
  } from "./constants";
  import { normalizeObservations } from "./normalization";
  import type {
    HealthMeasurement,
    HealthTrend,
    HealthTrendsResult,
    TrendChange,
    TrendDataSufficiency,
    TrendDirection,
    TrendEvidence,
    TrendPattern,
    TrendStatistics,
    TrendPeriod,
  } from "./types";
  
  const STABLE_RELATIVE_CHANGE = 0.05;
  const SUDDEN_RELATIVE_CHANGE = 0.2;
  const PERSISTENCE_COUNT = 3;
  
  const MIN_STRONG_MEASUREMENTS = 5;
  const MIN_MODERATE_MEASUREMENTS = 3;
  const MIN_LIMITED_MEASUREMENTS = 2;
  
  function round(
    value: number,
    decimals = 2,
  ): number {
    const factor = 10 ** decimals;
  
    return Math.round(value * factor) / factor;
  }
  
  function calculateRelativeChange(
    previous: number,
    latest: number,
  ): number | null {
    if (previous === 0) {
      return latest === 0 ? 0 : null;
    }
  
    return (
      ((latest - previous) / Math.abs(previous)) *
      100
    );
  }
  
  function getDirection(
    previous: number,
    latest: number,
  ): TrendDirection {
    const relativeChange =
      calculateRelativeChange(previous, latest);
  
    if (relativeChange === null) {
      if (latest > previous) {
        return "INCREASING";
      }
  
      if (latest < previous) {
        return "DECREASING";
      }
  
      return "STABLE";
    }
  
    if (
      Math.abs(relativeChange) <=
      STABLE_RELATIVE_CHANGE * 100
    ) {
      return "STABLE";
    }
  
    return latest > previous
      ? "INCREASING"
      : "DECREASING";
  }
  
  function getDataSufficiency(
    measurementCount: number,
  ): TrendDataSufficiency {
    if (
      measurementCount >=
      MIN_STRONG_MEASUREMENTS
    ) {
      return "STRONG";
    }
  
    if (
      measurementCount >=
      MIN_MODERATE_MEASUREMENTS
    ) {
      return "MODERATE";
    }
  
    if (
      measurementCount >=
      MIN_LIMITED_MEASUREMENTS
    ) {
      return "LIMITED";
    }
  
    return "INSUFFICIENT";
  }
  
  function calculateMean(
    values: number[],
  ): number | null {
    if (values.length === 0) {
      return null;
    }
  
    return (
      values.reduce(
        (sum, value) => sum + value,
        0,
      ) / values.length
    );
  }
  
  function calculateStandardDeviation(
    values: number[],
  ): number | null {
    if (values.length < 2) {
      return null;
    }
  
    const mean = calculateMean(values);
  
    if (mean === null) {
      return null;
    }
  
    const variance =
      values.reduce(
        (sum, value) =>
          sum + (value - mean) ** 2,
        0,
      ) / values.length;
  
    return Math.sqrt(variance);
  }
  
  function calculateSlope(
    measurements: HealthMeasurement[],
  ): number | null {
    if (measurements.length < 2) {
      return null;
    }
  
    const firstDate = new Date(
      measurements[0].observationDate,
    ).getTime();
  
    const points = measurements.map(
      (measurement) => ({
        x:
          (new Date(
            measurement.observationDate,
          ).getTime() -
            firstDate) /
          (1000 * 60 * 60 * 24),
  
        y: measurement.normalizedValue,
      }),
    );
  
    const xValues = points.map(
      (point) => point.x,
    );
  
    const yValues = points.map(
      (point) => point.y,
    );
  
    const meanX = calculateMean(xValues);
    const meanY = calculateMean(yValues);
  
    if (meanX === null || meanY === null) {
      return null;
    }
  
    let numerator = 0;
    let denominator = 0;
  
    for (const point of points) {
      numerator +=
        (point.x - meanX) *
        (point.y - meanY);
  
      denominator +=
        (point.x - meanX) ** 2;
    }
  
    if (denominator === 0) {
      return null;
    }
  
    return numerator / denominator;
  }
  
  function calculateChange(
    measurements: HealthMeasurement[],
  ): TrendChange {
    if (measurements.length < 2) {
      return {
        absolute: null,
        percentage: null,
      };
    }
  
    const latest =
      measurements[measurements.length - 1];
  
    const previous =
      measurements[measurements.length - 2];
  
    const absolute =
      latest.normalizedValue -
      previous.normalizedValue;
  
    const percentage =
      calculateRelativeChange(
        previous.normalizedValue,
        latest.normalizedValue,
      );
  
    return {
      absolute: round(absolute),
      percentage:
        percentage === null
          ? null
          : round(percentage),
    };
  }
  
  function calculateStatistics(
    measurements: HealthMeasurement[],
  ): TrendStatistics {
    if (measurements.length === 0) {
      return {
        baselineValue: null,
        latestValue: null,
        previousValue: null,
        change: {
          absolute: null,
          percentage: null,
        },
        slopePerDay: null,
        minimum: null,
        maximum: null,
        average: null,
        standardDeviation: null,
      };
    }
  
    const values = measurements.map(
      (measurement) =>
        measurement.normalizedValue,
    );
  
    const latest =
      measurements[measurements.length - 1];
  
    const previous =
      measurements.length >= 2
        ? measurements[
            measurements.length - 2
          ]
        : null;
  
    const baseline = measurements[0];
  
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
  
    const average = calculateMean(values);
  
    const standardDeviation =
      calculateStandardDeviation(values);
  
    const slopePerDay =
      calculateSlope(measurements);
  
    return {
      baselineValue:
        baseline.normalizedValue,
  
      latestValue:
        latest.normalizedValue,
  
      previousValue:
        previous?.normalizedValue ?? null,
  
      change: calculateChange(
        measurements,
      ),
  
      slopePerDay:
        slopePerDay === null
          ? null
          : round(slopePerDay, 4),
  
      minimum: round(minimum),
  
      maximum: round(maximum),
  
      average:
        average === null
          ? null
          : round(average),
  
      standardDeviation:
        standardDeviation === null
          ? null
          : round(
              standardDeviation,
            ),
    };
  }
  
  function detectFluctuation(
    measurements: HealthMeasurement[],
  ): boolean {
    if (measurements.length < 4) {
      return false;
    }
  
    const values = measurements.map(
      (measurement) =>
        measurement.normalizedValue,
    );
  
    let directionChanges = 0;
  
    let previousDirection:
      | "UP"
      | "DOWN"
      | null = null;
  
    for (
      let index = 1;
      index < values.length;
      index += 1
    ) {
      const difference =
        values[index] -
        values[index - 1];
  
      if (difference === 0) {
        continue;
      }
  
      const currentDirection =
        difference > 0 ? "UP" : "DOWN";
  
      if (
        previousDirection !== null &&
        currentDirection !==
          previousDirection
      ) {
        directionChanges += 1;
      }
  
      previousDirection =
        currentDirection;
    }
  
    return directionChanges >= 2;
  }
  
  function detectPattern(
    measurements: HealthMeasurement[],
    direction: TrendDirection,
  ): TrendPattern {
    if (measurements.length < 2) {
      return "INSUFFICIENT_EVIDENCE";
    }
  
    const values = measurements.map(
      (measurement) =>
        measurement.normalizedValue,
    );
  
    const latest =
      values[values.length - 1];
  
    const previous =
      values[values.length - 2];
  
    const relativeChange =
      calculateRelativeChange(
        previous,
        latest,
      );
  
    if (
      relativeChange !== null &&
      relativeChange >=
        SUDDEN_RELATIVE_CHANGE * 100
    ) {
      return "SUDDEN_INCREASE";
    }
  
    if (
      relativeChange !== null &&
      relativeChange <=
        -SUDDEN_RELATIVE_CHANGE * 100
    ) {
      return "SUDDEN_DECREASE";
    }
  
    if (
      values.length >=
      PERSISTENCE_COUNT
    ) {
      const recentValues =
        values.slice(
          -PERSISTENCE_COUNT,
        );
  
      let consistentlyIncreasing =
        true;
  
      let consistentlyDecreasing =
        true;
  
      for (
        let index = 1;
        index < recentValues.length;
        index += 1
      ) {
        if (
          recentValues[index] <=
          recentValues[index - 1]
        ) {
          consistentlyIncreasing =
            false;
        }
  
        if (
          recentValues[index] >=
          recentValues[index - 1]
        ) {
          consistentlyDecreasing =
            false;
        }
      }
  
      if (consistentlyIncreasing) {
        return "PERSISTENT_INCREASE";
      }
  
      if (consistentlyDecreasing) {
        return "PERSISTENT_DECREASE";
      }
    }
  
    if (direction === "INCREASING") {
      return "INCREASING";
    }
  
    if (direction === "DECREASING") {
      return "DECREASING";
    }
  
    if (direction === "STABLE") {
      return "STABLE";
    }
  
    if (direction === "FLUCTUATING") {
      return "FLUCTUATING";
    }
  
    return "INSUFFICIENT_EVIDENCE";
  }
  
  function buildEvidence(
    measurements: HealthMeasurement[],
    dataSufficiency: TrendDataSufficiency,
  ): TrendEvidence {
    if (measurements.length === 0) {
      return {
        measurementIds: [],
        measurementCount: 0,
        period: {
          start: null,
          end: null,
        },
        dataSufficiency,
        dataQualityMessage:
          "Insufficient data for a reliable trend",
      };
    }
  
    const first = measurements[0];
  
    const latest =
      measurements[
        measurements.length - 1
      ];
  
    let dataQualityMessage: string;
  
    switch (dataSufficiency) {
      case "STRONG":
        dataQualityMessage =
          "Strong longitudinal data";
  
        break;
  
      case "MODERATE":
        dataQualityMessage =
          "Moderate longitudinal data";
  
        break;
  
      case "LIMITED":
        dataQualityMessage =
          "Limited data — more measurements are needed";
  
        break;
  
      default:
        dataQualityMessage =
          "Insufficient data for a reliable trend";
    }
  
    return {
      measurementIds: measurements.map(
        (measurement) =>
          measurement.id,
      ),
  
      measurementCount:
        measurements.length,
  
      period: {
        start:
          first.observationDate,
  
        end:
          latest.observationDate,
      },
  
      dataSufficiency,
  
      dataQualityMessage,
    };
  }
  
  function buildTrend(
    metricId: string,
    measurements: HealthMeasurement[],
    period: TrendPeriod = "ALL",
  ): HealthTrend {
    const metric =
      getHealthMetric(metricId);
  
    if (!metric) {
      throw new Error(
        `Unknown health metric: ${metricId}`,
      );
    }
  
    const sortedMeasurements =
      [...measurements].sort(
        (a, b) =>
          new Date(
            a.observationDate,
          ).getTime() -
          new Date(
            b.observationDate,
          ).getTime(),
      );
  
    const latest =
      sortedMeasurements.length > 0
        ? sortedMeasurements[
            sortedMeasurements.length - 1
          ]
        : null;
  
    const previous =
      sortedMeasurements.length >= 2
        ? sortedMeasurements[
            sortedMeasurements.length - 2
          ]
        : null;
  
    const baseline =
      sortedMeasurements.length > 0
        ? sortedMeasurements[0]
        : null;
  
    const dataSufficiency =
      getDataSufficiency(
        sortedMeasurements.length,
      );
  
    const statistics =
      calculateStatistics(
        sortedMeasurements,
      );
  
    let direction:
      TrendDirection;
  
    if (!previous || !latest) {
      direction =
        "INSUFFICIENT_DATA";
    } else {
      direction = getDirection(
        previous.normalizedValue,
        latest.normalizedValue,
      );
    }
  
    const isFluctuating =
      detectFluctuation(
        sortedMeasurements,
      );
  
    if (isFluctuating) {
      direction = "FLUCTUATING";
    }
  
    const pattern = detectPattern(
      sortedMeasurements,
      direction,
    );
  
    const dateRange = {
      start:
        baseline?.observationDate ??
        null,
  
      end:
        latest?.observationDate ??
        null,
    };
  
    return {
      metric,
  
      period,
  
      dateRange,
  
      observations:
        sortedMeasurements,
  
      latest,
  
      previous,
  
      baseline,
  
      statistics,
  
      direction,
  
      pattern,
  
      dataSufficiency,
  
      measurementCount:
        sortedMeasurements.length,
  
      evidence: buildEvidence(
        sortedMeasurements,
        dataSufficiency,
      ),
    };
  }
  
  export function calculateHealthTrend(
    measurements: HealthMeasurement[],
    period: TrendPeriod = "ALL",
  ): HealthTrend | null {
    if (measurements.length === 0) {
      return null;
    }
  
    const metricId =
      measurements[0].metricId;
  
    return buildTrend(
      metricId,
      measurements,
      period,
    );
  }
  
  export function calculateHealthTrends(
    measurements: HealthMeasurement[],
    period: TrendPeriod = "ALL",
  ): HealthTrend[] {
    const grouped = new Map<
      string,
      HealthMeasurement[]
    >();
  
    for (const measurement of measurements) {
      const existing =
        grouped.get(
          measurement.metricId,
        ) ?? [];
  
      existing.push(measurement);
  
      grouped.set(
        measurement.metricId,
        existing,
      );
    }
  
    return Array.from(
      grouped.entries(),
    ).map(
      ([
        metricId,
        metricMeasurements,
      ]) =>
        buildTrend(
          metricId,
          metricMeasurements,
          period,
        ),
    );
  }
  
  export function buildHealthTrendsResult(
    measurements: HealthMeasurement[],
    period: TrendPeriod = "ALL",
  ): HealthTrendsResult {
    const trends =
      calculateHealthTrends(
        measurements,
        period,
      );
  
    return {
      trends,
  
      suggestions: [],
  
      generatedAt:
        new Date().toISOString(),
    };
  }
  
  export function normalizeAndCalculateHealthTrends(
    observations: Parameters<
      typeof normalizeObservations
    >[0],
    period: TrendPeriod = "ALL",
  ): HealthTrendsResult {
    const normalized =
      normalizeObservations(
        observations,
      );
  
      return buildHealthTrendsResult(
        normalized.normalized.map(
          (item) => item.measurement,
        ),
        period,
      );
  }
  
  export function getTrendForMetric(
    trends: HealthTrend[],
    metricId: string,
  ): HealthTrend | null {
    return (
      trends.find(
        (trend) =>
          trend.metric.id === metricId,
      ) ?? null
    );
  }
  
  export function getTrendForMetricName(
    trends: HealthTrend[],
    metricName: string,
  ): HealthTrend | null {
    const metric =
      findHealthMetric(metricName);
  
    if (!metric) {
      return null;
    }
  
    return getTrendForMetric(
      trends,
      metric.id,
    );
  }
  
  export function getTrendDataSufficiency(
    measurements: HealthMeasurement[],
  ): TrendDataSufficiency {
    return getDataSufficiency(
      measurements.length,
    );
  }