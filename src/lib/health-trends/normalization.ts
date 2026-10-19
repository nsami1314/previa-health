import {
    findHealthMetric,
    getHealthMetric,
    normalizeMetricName,
  } from "./constants";
  import type {
    HealthMeasurement,
    HealthMetricDefinition,
    NormalizedHealthMeasurement,
    RawHealthObservation,
    UnrecognizedHealthObservation,
  } from "./types";
  
  /**
   * Health Trends — Deterministic Normalization
   *
   * Responsibilities:
   * - Convert existing stored medical observations into canonical measurements.
   * - Resolve test-name aliases using the metric registry.
   * - Normalize supported units using explicit mathematical conversions.
   * - Preserve source/provenance information.
   *
   * This module intentionally contains:
   * - NO AI
   * - NO LLM calls
   * - NO external APIs
   * - NO database access
   *
   * Data flow:
   *
   * Existing medical_observations
   *          ↓
   *    normalizeObservation()
   *          ↓
   *   HealthMeasurement
   *          ↓
   *       Trend Engine
   */
  
  /* -------------------------------------------------------------------------- */
  /* Internal helpers                                                           */
  /* -------------------------------------------------------------------------- */
  
  function cleanUnit(unit: string | null | undefined): string | null {
    if (!unit) {
      return null;
    }
  
    return unit
      .trim()
      .replace(/\s+/g, " ")
      .replace(/μ/g, "µ");
  }
  
  function normalizeUnitForComparison(
    unit: string | null | undefined,
  ): string | null {
    const cleaned = cleanUnit(unit);
  
    if (!cleaned) {
      return null;
    }
  
    return cleaned
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/mcg/g, "µg")
      .replace(/ug/g, "µg");
  }
  
  function unitsAreEquivalent(
    first: string | null | undefined,
    second: string | null | undefined,
  ): boolean {
    const normalizedFirst = normalizeUnitForComparison(first);
    const normalizedSecond = normalizeUnitForComparison(second);
  
    if (!normalizedFirst || !normalizedSecond) {
      return false;
    }
  
    return normalizedFirst === normalizedSecond;
  }
  
  /**
   * Convert a value from a supported source unit into the metric's canonical
   * default unit.
   *
   * Only explicit, well-defined conversions are performed.
   *
   * If a conversion is not known, the function returns null rather than
   * guessing.
   */
  function convertToDefaultUnit(
    metric: HealthMetricDefinition,
    value: number,
    sourceUnit: string | null,
  ): {
    value: number;
    unit: string | null;
  } | null {
    const targetUnit = metric.defaultUnit;
  
    if (!targetUnit) {
      return {
        value,
        unit: sourceUnit,
      };
    }
  
    const normalizedSource = normalizeUnitForComparison(sourceUnit);
    const normalizedTarget = normalizeUnitForComparison(targetUnit);
  
    if (!normalizedSource) {
      /**
       * A missing unit is only safe when the metric itself has no meaningful
       * unit distinction. For measured laboratory values we do not guess.
       */
      return null;
    }
  
    if (normalizedSource === normalizedTarget) {
      return {
        value,
        unit: targetUnit,
      };
    }
  
    /* ---------------------------------------------------------------------- */
    /* Hemoglobin / Albumin / similar g/L ↔ g/dL                              */
    /* ---------------------------------------------------------------------- */
  
    if (
      normalizedSource === "g/l" &&
      normalizedTarget === "g/dl"
    ) {
      return {
        value: value / 10,
        unit: targetUnit,
      };
    }
  
    if (
      normalizedSource === "g/dl" &&
      normalizedTarget === "g/l"
    ) {
      return {
        value: value * 10,
        unit: targetUnit,
      };
    }
  
    /* ---------------------------------------------------------------------- */
    /* Hematocrit L/L ↔ %                                                     */
    /* ---------------------------------------------------------------------- */
  
    if (
      normalizedSource === "l/l" &&
      normalizedTarget === "%"
    ) {
      return {
        value: value * 100,
        unit: targetUnit,
      };
    }
  
    if (
      normalizedSource === "%" &&
      normalizedTarget === "l/l"
    ) {
      return {
        value: value / 100,
        unit: targetUnit,
      };
    }
  
    /* ---------------------------------------------------------------------- */
    /* Weight                                                                  */
    /* ---------------------------------------------------------------------- */
  
    if (
      normalizedSource === "g" &&
      normalizedTarget === "kg"
    ) {
      return {
        value: value / 1000,
        unit: targetUnit,
      };
    }
  
    if (
      normalizedSource === "kg" &&
      normalizedTarget === "g"
    ) {
      return {
        value: value * 1000,
        unit: targetUnit,
      };
    }
  
    if (
      (normalizedSource === "lb" || normalizedSource === "lbs") &&
      normalizedTarget === "kg"
    ) {
      return {
        value: value * 0.45359237,
        unit: targetUnit,
      };
    }
  
    if (
      normalizedSource === "kg" &&
      (normalizedTarget === "lb" || normalizedTarget === "lbs")
    ) {
      return {
        value: value / 0.45359237,
        unit: targetUnit,
      };
    }
  
    /* ---------------------------------------------------------------------- */
    /* Glucose / cholesterol / triglycerides                                   */
    /* mg/dL ↔ mmol/L                                                          */
    /* ---------------------------------------------------------------------- */
  
    if (
      normalizedSource === "mg/dl" &&
      normalizedTarget === "mmol/l"
    ) {
      const conversionFactor = getMgDlToMmolLFactor(metric.id);
  
      if (conversionFactor === null) {
        return null;
      }
  
      return {
        value: value * conversionFactor,
        unit: targetUnit,
      };
    }
  
    if (
      normalizedSource === "mmol/l" &&
      normalizedTarget === "mg/dl"
    ) {
      const conversionFactor = getMmolLToMgDlFactor(metric.id);
  
      if (conversionFactor === null) {
        return null;
      }
  
      return {
        value: value * conversionFactor,
        unit: targetUnit,
      };
    }
  
    /* ---------------------------------------------------------------------- */
    /* Creatinine / bilirubin                                                  */
    /* ---------------------------------------------------------------------- */
  
    if (
      normalizedSource === "mg/dl" &&
      (normalizedTarget === "µmol/l" || normalizedTarget === "umol/l")
    ) {
      if (metric.id === "creatinine") {
        return {
          value: value * 88.4,
          unit: targetUnit,
        };
      }
  
      if (metric.id === "total-bilirubin") {
        return {
          value: value * 17.104,
          unit: targetUnit,
        };
      }
  
      return null;
    }
  
    if (
      (normalizedSource === "µmol/l" || normalizedSource === "umol/l") &&
      normalizedTarget === "mg/dl"
    ) {
      if (metric.id === "creatinine") {
        return {
          value: value / 88.4,
          unit: targetUnit,
        };
      }
  
      if (metric.id === "total-bilirubin") {
        return {
          value: value / 17.104,
          unit: targetUnit,
        };
      }
  
      return null;
    }
  
    /* ---------------------------------------------------------------------- */
    /* Urea                                                                    */
    /* ---------------------------------------------------------------------- */
  
    if (
      normalizedSource === "mg/dl" &&
      normalizedTarget === "mmol/l"
    ) {
      if (metric.id === "urea") {
        return {
          value: value / 6.006,
          unit: targetUnit,
        };
      }
  
      if (metric.id === "blood-urea-nitrogen") {
        return {
          value: value / 2.801,
          unit: targetUnit,
        };
      }
    }
  
    if (
      normalizedSource === "mmol/l" &&
      normalizedTarget === "mg/dl"
    ) {
      if (metric.id === "urea") {
        return {
          value: value * 6.006,
          unit: targetUnit,
        };
      }
  
      if (metric.id === "blood-urea-nitrogen") {
        return {
          value: value * 2.801,
          unit: targetUnit,
        };
      }
    }
  
    /* ---------------------------------------------------------------------- */
    /* HbA1c                                                                   */
    /* ---------------------------------------------------------------------- */
  
    if (
      metric.id === "hba1c" &&
      normalizedSource === "mmol/mol" &&
      normalizedTarget === "%"
    ) {
      /**
       * IFCC mmol/mol → NGSP %
       *
       * NGSP = (0.09148 × IFCC) + 2.152
       */
      return {
        value: 0.09148 * value + 2.152,
        unit: targetUnit,
      };
    }
  
    if (
      metric.id === "hba1c" &&
      normalizedSource === "%" &&
      normalizedTarget === "mmol/mol"
    ) {
      return {
        value: (value - 2.152) / 0.09148,
        unit: targetUnit,
      };
    }
  
    /* ---------------------------------------------------------------------- */
    /* Vitamin D                                                                */
    /* ---------------------------------------------------------------------- */
  
    if (
      metric.id === "vitamin-d" &&
      normalizedSource === "nmol/l" &&
      normalizedTarget === "ng/ml"
    ) {
      return {
        value: value / 2.496,
        unit: targetUnit,
      };
    }
  
    if (
      metric.id === "vitamin-d" &&
      normalizedSource === "ng/ml" &&
      normalizedTarget === "nmol/l"
    ) {
      return {
        value: value * 2.496,
        unit: targetUnit,
      };
    }
  
    /* ---------------------------------------------------------------------- */
    /* Vitamin B12                                                              */
    /* ---------------------------------------------------------------------- */
  
    if (
      metric.id === "vitamin-b12" &&
      normalizedSource === "pmol/l" &&
      normalizedTarget === "pg/ml"
    ) {
      return {
        value: value / 0.7378,
        unit: targetUnit,
      };
    }
  
    if (
      metric.id === "vitamin-b12" &&
      normalizedSource === "pg/ml" &&
      normalizedTarget === "pmol/l"
    ) {
      return {
        value: value * 0.7378,
        unit: targetUnit,
      };
    }
  
    /* ---------------------------------------------------------------------- */
    /* Ferritin                                                                 */
    /* ---------------------------------------------------------------------- */
  
    if (
      metric.id === "ferritin" &&
      normalizedSource === "µg/l" &&
      normalizedTarget === "ng/ml"
    ) {
      return {
        value,
        unit: targetUnit,
      };
    }
  
    if (
      metric.id === "ferritin" &&
      normalizedSource === "ng/ml" &&
      normalizedTarget === "µg/l"
    ) {
      return {
        value,
        unit: targetUnit,
      };
    }
  
    /* ---------------------------------------------------------------------- */
    /* CRP                                                                     */
    /* ---------------------------------------------------------------------- */
  
    if (
      metric.id === "crp" &&
      normalizedSource === "mg/dl" &&
      normalizedTarget === "mg/l"
    ) {
      return {
        value: value * 10,
        unit: targetUnit,
      };
    }
  
    if (
      metric.id === "crp" &&
      normalizedSource === "mg/l" &&
      normalizedTarget === "mg/dl"
    ) {
      return {
        value: value / 10,
        unit: targetUnit,
      };
    }
  
    return null;
  }
  
  /* -------------------------------------------------------------------------- */
  /* Conversion factors                                                         */
  /* -------------------------------------------------------------------------- */
  
  function getMgDlToMmolLFactor(metricId: string): number | null {
    switch (metricId) {
      /**
       * Glucose:
       * mg/dL × 0.0555 = mmol/L
       */
      case "fasting-blood-glucose":
      case "random-blood-glucose":
      case "postprandial-blood-glucose":
        return 0.0555;
  
      /**
       * Cholesterol:
       * mg/dL × 0.02586 = mmol/L
       */
      case "total-cholesterol":
      case "ldl-cholesterol":
      case "hdl-cholesterol":
        return 0.02586;
  
      /**
       * Triglycerides:
       * mg/dL × 0.01129 = mmol/L
       */
      case "triglycerides":
        return 0.01129;
  
      default:
        return null;
    }
  }
  
  function getMmolLToMgDlFactor(metricId: string): number | null {
    switch (metricId) {
      case "fasting-blood-glucose":
      case "random-blood-glucose":
      case "postprandial-blood-glucose":
        return 18.0182;
  
      case "total-cholesterol":
      case "ldl-cholesterol":
      case "hdl-cholesterol":
        return 38.67;
  
      case "triglycerides":
        return 88.57;
  
      default:
        return null;
    }
  }
  
  /* -------------------------------------------------------------------------- */
  /* Reference-range parsing                                                    */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Parse common laboratory reference-range formats.
   *
   * Examples:
   *   "4.0 - 5.6"
   *   "4.0–5.6"
   *   "70 - 100 mg/dL"
   *   "< 5.7"
   *   "> 60"
   *
   * For one-sided ranges, the unspecified side remains null.
   *
   * This is intentionally conservative. Complex textual ranges are preserved
   * as raw text instead of being guessed.
   */
  export function parseReferenceRange(
    raw: string | null | undefined,
  ): {
    low: number | null;
    high: number | null;
    raw: string | null;
  } {
    if (!raw) {
      return {
        low: null,
        high: null,
        raw: null,
      };
    }
  
    const cleaned = raw.trim();
  
    if (!cleaned) {
      return {
        low: null,
        high: null,
        raw: null,
      };
    }
  
    const normalized = cleaned.replace(/[–—]/g, "-");
  
    const rangeMatch = normalized.match(
      /(-?\d+(?:\.\d+)?)\s*(?:to|-)\s*(-?\d+(?:\.\d+)?)/i,
    );
  
    if (rangeMatch) {
      return {
        low: Number(rangeMatch[1]),
        high: Number(rangeMatch[2]),
        raw: cleaned,
      };
    }
  
    const lessThanMatch = normalized.match(
      /(?:<|<=|less\s+than)\s*(-?\d+(?:\.\d+)?)/i,
    );
  
    if (lessThanMatch) {
      return {
        low: null,
        high: Number(lessThanMatch[1]),
        raw: cleaned,
      };
    }
  
    const greaterThanMatch = normalized.match(
      /(?:>|>=|greater\s+than)\s*(-?\d+(?:\.\d+)?)/i,
    );
  
    if (greaterThanMatch) {
      return {
        low: Number(greaterThanMatch[1]),
        high: null,
        raw: cleaned,
      };
    }
  
    return {
      low: null,
      high: null,
      raw: cleaned,
    };
  }
  
  /* -------------------------------------------------------------------------- */
  /* Single observation normalization                                           */
  /* -------------------------------------------------------------------------- */
  
  export function normalizeObservation(
    observation: RawHealthObservation,
  ): NormalizedHealthMeasurement | null {
    /**
     * Prefer normalized_name when it exists, while falling back to test_name.
     *
     * We first try the normalized name because the Medical Reports module may
     * already have performed deterministic normalization.
     */
    const metric =
      findHealthMetric(observation.normalized_name) ??
      findHealthMetric(observation.test_name);
  
    if (!metric) {
      return null;
    }
  
    if (!Number.isFinite(observation.value)) {
      return null;
    }
  
    const sourceUnit = cleanUnit(observation.unit);
  
    const converted = convertToDefaultUnit(
      metric,
      observation.value,
      sourceUnit,
    );
  
    if (!converted) {
      /**
       * We do not silently compare incompatible units.
       *
       * The observation is still identifiable, but it cannot safely participate
       * in a normalized longitudinal trend until the unit is understood.
       */
      return null;
    }
  
    const referenceRange = parseReferenceRange(
      observation.reference_range,
    );
  
    const measurement: HealthMeasurement = {
      id: observation.id,
  
      userId: observation.user_id,
  
      metricId: metric.id,
  
      canonicalName: metric.canonicalName,
  
      displayName: metric.displayName,
  
      testName: observation.test_name,
  
      normalizedName: observation.normalized_name
        ? normalizeMetricName(observation.normalized_name)
        : null,
  
      value: observation.value,
  
      normalizedValue: converted.value,
  
      unit: sourceUnit,
  
      normalizedUnit: converted.unit,
  
      referenceRange,
  
      abnormalFlag: observation.abnormal_flag,
  
      observationDate: observation.observation_date,
  
      sourceType: "MEDICAL_REPORT",
  
      sourceRecordId: observation.medical_report_id,
  
      medicalReportId: observation.medical_report_id,
    };
  
    return {
      measurement,
      metric,
    };
  }
  
  /* -------------------------------------------------------------------------- */
  /* Batch normalization                                                        */
  /* -------------------------------------------------------------------------- */
  
  export interface NormalizationResult {
    normalized: NormalizedHealthMeasurement[];
  
    unrecognized: UnrecognizedHealthObservation[];
  
    skipped: Array<{
      observation: RawHealthObservation;
      reason: string;
    }>;
  }
  
  /**
   * Normalize a collection of already stored medical observations.
   *
   * No database access occurs here.
   *
   * The caller supplies the observations retrieved from the database.
   */
  export function normalizeObservations(
    observations: RawHealthObservation[],
  ): NormalizationResult {
    const normalized: NormalizedHealthMeasurement[] = [];
    const unrecognized: UnrecognizedHealthObservation[] = [];
    const skipped: Array<{
      observation: RawHealthObservation;
      reason: string;
    }> = [];
  
    for (const observation of observations) {
      if (!observation.id) {
        skipped.push({
          observation,
          reason: "Observation is missing an ID.",
        });
  
        continue;
      }
  
      if (!observation.user_id) {
        skipped.push({
          observation,
          reason: "Observation is missing a user ID.",
        });
  
        continue;
      }
  
      if (!observation.test_name && !observation.normalized_name) {
        unrecognized.push({
          observation,
          reason: "Observation has no test name or normalized name.",
        });
  
        continue;
      }
  
      const metric =
        findHealthMetric(observation.normalized_name) ??
        findHealthMetric(observation.test_name);
  
      if (!metric) {
        unrecognized.push({
          observation,
          reason: "No canonical health metric matched the observation.",
        });
  
        continue;
      }
  
      if (!Number.isFinite(observation.value)) {
        skipped.push({
          observation,
          reason: "Observation contains a non-numeric value.",
        });
  
        continue;
      }
  
      const result = normalizeObservation(observation);
  
      if (!result) {
        skipped.push({
          observation,
          reason:
            "Observation could not be safely normalized to the metric's canonical unit.",
        });
  
        continue;
      }
  
      normalized.push(result);
    }
  
    return {
      normalized,
      unrecognized,
      skipped,
    };
  }
  
  /* -------------------------------------------------------------------------- */
  /* Convenience helpers                                                        */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Normalize one observation and return only the canonical measurement.
   */
  export function toHealthMeasurement(
    observation: RawHealthObservation,
  ): HealthMeasurement | null {
    return normalizeObservation(observation)?.measurement ?? null;
  }
  
  /**
   * Normalize many observations and return only successfully normalized
   * measurements.
   */
  export function toHealthMeasurements(
    observations: RawHealthObservation[],
  ): HealthMeasurement[] {
    return normalizeObservations(observations).normalized.map(
      (item) => item.measurement,
    );
  }
  
  /**
   * Look up a canonical metric from an observation without normalizing its
   * numerical value.
   */
  export function resolveObservationMetric(
    observation: RawHealthObservation,
  ): HealthMetricDefinition | null {
    return (
      findHealthMetric(observation.normalized_name) ??
      findHealthMetric(observation.test_name)
    );
  }
  
  /**
   * Check whether a source unit is explicitly supported by a metric.
   */
  export function isSupportedMetricUnit(
    metricId: string,
    unit: string | null | undefined,
  ): boolean {
    if (!unit) {
      return false;
    }
  
    const metric = getHealthMetric(metricId);
  
    if (!metric) {
      return false;
    }
  
    return metric.supportedUnits.some((supportedUnit) =>
      unitsAreEquivalent(unit, supportedUnit),
    );
  }