/**
 * Health Trends — Deterministic Pattern Detection
 *
 * Responsibilities:
 * - Classify longitudinal measurement patterns.
 * - Detect persistence, sudden changes, stability, and fluctuation.
 * - Use only normalized stored measurements and numerical evidence.
 *
 * This module intentionally contains:
 * - NO AI
 * - NO LLM calls
 * - NO database access
 * - NO medical diagnosis
 *
 * Pattern detection is descriptive. It identifies what the numbers are doing;
 * it does not determine whether a change is medically good or bad.
 */

import type {
    HealthMeasurement,
    TrendDirection,
    TrendPattern,
  } from "./types";
  
  /* -------------------------------------------------------------------------- */
  /* Thresholds                                                                 */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Minimum relative change used to distinguish a meaningful numerical movement
   * from small measurement noise.
   */
  const DEFAULT_RELATIVE_CHANGE_THRESHOLD = 0.05;
  
  /**
   * Absolute percentage change considered unusually large between two
   * consecutive measurements.
   */
  const SUDDEN_CHANGE_THRESHOLD = 0.20;
  
  /**
   * Minimum number of observations required before persistence can be claimed.
   */
  const PERSISTENCE_MIN_OBSERVATIONS = 3;
  
  /**
   * A stable trend requires consecutive changes to remain within this band.
   */
  const STABILITY_RELATIVE_THRESHOLD = 0.05;
  
  /* -------------------------------------------------------------------------- */
  /* Internal helpers                                                           */
  /* -------------------------------------------------------------------------- */
  
  function relativeChange(
    from: number,
    to: number,
  ): number {
    if (from === 0) {
      return to === 0 ? 0 : Number.POSITIVE_INFINITY;
    }
  
    return Math.abs((to - from) / from);
  }
  
  function signedRelativeChange(
    from: number,
    to: number,
  ): number {
    if (from === 0) {
      if (to === 0) {
        return 0;
      }
  
      return to > 0
        ? Number.POSITIVE_INFINITY
        : Number.NEGATIVE_INFINITY;
    }
  
    return (to - from) / Math.abs(from);
  }
  
  function isMeaningfulChange(
    from: number,
    to: number,
    threshold = DEFAULT_RELATIVE_CHANGE_THRESHOLD,
  ): boolean {
    return relativeChange(from, to) >= threshold;
  }
  
  function classifyPairDirection(
    from: number,
    to: number,
    threshold = DEFAULT_RELATIVE_CHANGE_THRESHOLD,
  ): TrendDirection {
    const change = signedRelativeChange(from, to);
  
    if (!Number.isFinite(change)) {
      if (from === 0 && to === 0) {
        return "STABLE";
      }
  
      return to > from ? "INCREASING" : "DECREASING";
    }
  
    if (Math.abs(change) < threshold) {
      return "STABLE";
    }
  
    return change > 0 ? "INCREASING" : "DECREASING";
  }
  
  function getValidMeasurements(
    measurements: HealthMeasurement[],
  ): HealthMeasurement[] {
    return measurements
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
  
  /* -------------------------------------------------------------------------- */
  /* Direction detection                                                        */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Determine the overall numerical direction of a measurement series.
   *
   * The calculation compares the earliest and latest observations while also
   * checking whether the intermediate observations broadly support that
   * direction.
   */
  export function detectTrendDirection(
    measurements: HealthMeasurement[],
  ): TrendDirection {
    const valid = getValidMeasurements(measurements);
  
    if (valid.length < 2) {
      return "INSUFFICIENT_DATA";
    }
  
    const first = valid[0].normalizedValue;
    const latest = valid[valid.length - 1].normalizedValue;
  
    const overallDirection = classifyPairDirection(first, latest);
  
    if (overallDirection === "STABLE") {
      const meaningfulChanges = valid.slice(1).filter((measurement, index) =>
        isMeaningfulChange(
          valid[index].normalizedValue,
          measurement.normalizedValue,
        ),
      );
  
      if (meaningfulChanges.length === 0) {
        return "STABLE";
      }
  
      return "FLUCTUATING";
    }
  
    let supportingChanges = 0;
    let opposingChanges = 0;
  
    for (let index = 1; index < valid.length; index += 1) {
      const pairDirection = classifyPairDirection(
        valid[index - 1].normalizedValue,
        valid[index].normalizedValue,
      );
  
      if (pairDirection === overallDirection) {
        supportingChanges += 1;
      } else if (
        pairDirection === "INCREASING" ||
        pairDirection === "DECREASING"
      ) {
        opposingChanges += 1;
      }
    }
  
    if (
      opposingChanges > supportingChanges &&
      valid.length >= PERSISTENCE_MIN_OBSERVATIONS
    ) {
      return "FLUCTUATING";
    }
  
    return overallDirection;
  }
  
  /* -------------------------------------------------------------------------- */
  /* Persistence detection                                                      */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Detect a persistent increase or decrease.
   *
   * Persistence requires at least three measurements and at least two
   * consecutive meaningful movements in the same direction.
   */
  export function detectPersistentPattern(
    measurements: HealthMeasurement[],
  ): TrendPattern | null {
    const valid = getValidMeasurements(measurements);
  
    if (valid.length < PERSISTENCE_MIN_OBSERVATIONS) {
      return null;
    }
  
    const directions: TrendDirection[] = [];
  
    for (let index = 1; index < valid.length; index += 1) {
      directions.push(
        classifyPairDirection(
          valid[index - 1].normalizedValue,
          valid[index].normalizedValue,
        ),
      );
    }
  
    const meaningfulDirections = directions.filter(
      (direction) =>
        direction === "INCREASING" ||
        direction === "DECREASING",
    );
  
    if (meaningfulDirections.length < 2) {
      return null;
    }
  
    const increasingCount = meaningfulDirections.filter(
      (direction) => direction === "INCREASING",
    ).length;
  
    const decreasingCount = meaningfulDirections.filter(
      (direction) => direction === "DECREASING",
    ).length;
  
    if (
      increasingCount >= 2 &&
      increasingCount >= decreasingCount * 2
    ) {
      return "PERSISTENT_INCREASE";
    }
  
    if (
      decreasingCount >= 2 &&
      decreasingCount >= increasingCount * 2
    ) {
      return "PERSISTENT_DECREASE";
    }
  
    return null;
  }
  
  /* -------------------------------------------------------------------------- */
  /* Sudden-change detection                                                    */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Detect a large change between the latest two measurements.
   */
  export function detectSuddenPattern(
    measurements: HealthMeasurement[],
  ): TrendPattern | null {
    const valid = getValidMeasurements(measurements);
  
    if (valid.length < 2) {
      return null;
    }
  
    const previous = valid[valid.length - 2].normalizedValue;
    const latest = valid[valid.length - 1].normalizedValue;
  
    const change = signedRelativeChange(previous, latest);
  
    if (!Number.isFinite(change)) {
      if (previous === 0 && latest === 0) {
        return null;
      }
  
      return latest > previous
        ? "SUDDEN_INCREASE"
        : "SUDDEN_DECREASE";
    }
  
    if (Math.abs(change) < SUDDEN_CHANGE_THRESHOLD) {
      return null;
    }
  
    return change > 0
      ? "SUDDEN_INCREASE"
      : "SUDDEN_DECREASE";
  }
  
  /* -------------------------------------------------------------------------- */
  /* Stability detection                                                        */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Detect whether the measurements remain within a relatively narrow numerical
   * range across the observed period.
   */
  export function detectStablePattern(
    measurements: HealthMeasurement[],
  ): boolean {
    const valid = getValidMeasurements(measurements);
  
    if (valid.length < 2) {
      return false;
    }
  
    for (let index = 1; index < valid.length; index += 1) {
      const previous = valid[index - 1].normalizedValue;
      const current = valid[index].normalizedValue;
  
      if (
        relativeChange(previous, current) >
        STABILITY_RELATIVE_THRESHOLD
      ) {
        return false;
      }
    }
  
    return true;
  }
  
  /* -------------------------------------------------------------------------- */
  /* Fluctuation detection                                                      */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Detect repeated direction changes in the series.
   */
  export function detectFluctuationPattern(
    measurements: HealthMeasurement[],
  ): boolean {
    const valid = getValidMeasurements(measurements);
  
    if (valid.length < 3) {
      return false;
    }
  
    const directions = valid
      .slice(1)
      .map((measurement, index) =>
        classifyPairDirection(
          valid[index].normalizedValue,
          measurement.normalizedValue,
        ),
      )
      .filter(
        (direction) =>
          direction === "INCREASING" ||
          direction === "DECREASING",
      );
  
    if (directions.length < 2) {
      return false;
    }
  
    let directionChanges = 0;
  
    for (let index = 1; index < directions.length; index += 1) {
      if (directions[index] !== directions[index - 1]) {
        directionChanges += 1;
      }
    }
  
    return directionChanges >= 1;
  }
  
  /* -------------------------------------------------------------------------- */
  /* Overall pattern classification                                              */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Classify one complete measurement series into the canonical Health Trends
   * pattern vocabulary.
   *
   * Priority:
   * 1. insufficient evidence
   * 2. sudden latest change
   * 3. persistent movement
   * 4. fluctuation
   * 5. stable
   * 6. ordinary increase/decrease
   */
  export function detectTrendPattern(
    measurements: HealthMeasurement[],
  ): TrendPattern {
    const valid = getValidMeasurements(measurements);
  
    if (valid.length < 2) {
      return "INSUFFICIENT_EVIDENCE";
    }
  
    const suddenPattern = detectSuddenPattern(valid);
  
    if (suddenPattern) {
      return suddenPattern;
    }
  
    const persistentPattern = detectPersistentPattern(valid);
  
    if (persistentPattern) {
      return persistentPattern;
    }
  
    if (detectFluctuationPattern(valid)) {
      return "FLUCTUATING";
    }
  
    if (detectStablePattern(valid)) {
      return "STABLE";
    }
  
    const direction = detectTrendDirection(valid);
  
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
  
  /* -------------------------------------------------------------------------- */
  /* Convenience result                                                          */
  /* -------------------------------------------------------------------------- */
  
  export interface TrendPatternAnalysis {
    direction: TrendDirection;
    pattern: TrendPattern;
  }
  
  /**
   * Run direction and pattern detection together so callers that need both do
   * not have to duplicate the analysis workflow.
   */
  export function analyzeTrendPattern(
    measurements: HealthMeasurement[],
  ): TrendPatternAnalysis {
    const valid = getValidMeasurements(measurements);
  
    return {
      direction: detectTrendDirection(valid),
      pattern: detectTrendPattern(valid),
    };
  }