/**
 * Health Trends — Canonical Domain Types
 *
 * This file defines the shared data contracts for the Health Trends
 * intelligence layer.
 *
 * Architecture:
 * Medical Reports / Vitals / future sources
 *          ↓
 *     Normalization
 *          ↓
 *   HealthMeasurement
 *          ↓
 *    Trend Analysis
 *          ↓
 *      HealthTrend
 *          ↓
 * Dashboard / Health Trends / Health Insights
 */

/* -------------------------------------------------------------------------- */
/* Metric taxonomy                                                            */
/* -------------------------------------------------------------------------- */

export type HealthMetricCategory =
  | "BLOOD"
  | "CARDIOVASCULAR"
  | "METABOLIC"
  | "KIDNEY"
  | "LIVER"
  | "THYROID"
  | "BLOOD_COUNT"
  | "NUTRITION"
  | "BODY"
  | "RESPIRATORY"
  | "INFLAMMATION"
  | "HORMONAL"
  | "URINALYSIS"
  | "OTHER";

/**
 * A canonical metric identifier.
 *
 * This is deliberately separate from the laboratory's original test name.
 * For example:
 *
 * HbA1c
 * Hemoglobin A1c
 * Glycated Hemoglobin
 *
 * can all eventually normalize to the same canonical metric.
 */
export type HealthMetricId = string;

/* -------------------------------------------------------------------------- */
/* Trend direction and pattern                                                */
/* -------------------------------------------------------------------------- */

export type TrendDirection =
  | "INCREASING"
  | "DECREASING"
  | "STABLE"
  | "FLUCTUATING"
  | "INSUFFICIENT_DATA";

export type TrendPattern =
  | "INCREASING"
  | "DECREASING"
  | "STABLE"
  | "PERSISTENT_INCREASE"
  | "PERSISTENT_DECREASE"
  | "SUDDEN_INCREASE"
  | "SUDDEN_DECREASE"
  | "FLUCTUATING"
  | "INSUFFICIENT_EVIDENCE";

export type TrendDataSufficiency =
  | "STRONG"
  | "MODERATE"
  | "LIMITED"
  | "INSUFFICIENT";

/* -------------------------------------------------------------------------- */
/* Measurement source                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Source categories used by the shared Health Trends intelligence layer.
 *
 * Health Trends remains independent from the Vitals module. Vitals can later
 * provide measurements through an adapter without making this domain depend
 * on Vitals implementation details.
 */
export type HealthMeasurementSourceType =
  | "MEDICAL_REPORT"
  | "VITALS"
  | "MANUAL"
  | "DEVICE"
  | "IMPORT"
  | "API"
  | "OTHER";

/* -------------------------------------------------------------------------- */
/* Reference range                                                            */
/* -------------------------------------------------------------------------- */

export interface HealthReferenceRange {
  low: number | null;
  high: number | null;

  /**
   * Original reference-range text as supplied by the source.
   *
   * Examples:
   * "4.0 - 5.6"
   * "< 5.7"
   * "70-100 mg/dL"
   */
  raw: string | null;
}

/* -------------------------------------------------------------------------- */
/* Metric definition                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Describes a canonical health metric independently of any individual
 * measurement.
 */
export interface HealthMetricDefinition {
  id: HealthMetricId;

  /**
   * Human-readable canonical name.
   */
  displayName: string;

  /**
   * Normalized machine-friendly name.
   *
   * Example:
   * "hba1c"
   */
  canonicalName: string;

  category: HealthMetricCategory;

  /**
   * Names that can be mapped to this metric during normalization.
   */
  aliases: string[];

  /**
   * Preferred unit used internally and/or for display when applicable.
   */
  defaultUnit: string | null;

  /**
   * Units accepted by the normalization layer.
   */
  supportedUnits: string[];

  /**
   * Whether higher/lower values generally represent an increase or decrease
   * in the clinically relevant direction.
   *
   * This does NOT determine whether a value is medically good or bad.
   * It only describes numerical direction.
   */
  directionality?: "HIGHER" | "LOWER" | "NEUTRAL";
}

/* -------------------------------------------------------------------------- */
/* Health measurement                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Canonical representation of one observed health value.
 *
 * This is the bridge between raw medical data and the trend engine.
 */
export interface HealthMeasurement {
  id: string;

  userId: string;

  metricId: HealthMetricId;

  /**
   * Canonical metric name.
   */
  canonicalName: string;

  /**
   * Display name of the metric.
   */
  displayName: string;

  /**
   * Original name supplied by the source.
   */
  testName: string;

  /**
   * Existing normalized_name value when available.
   */
  normalizedName: string | null;

  /**
   * Original numerical value from the source.
   */
  value: number;

  /**
   * Value after unit normalization.
   *
   * May equal `value` when no conversion is required.
   */
  normalizedValue: number;

  /**
   * Original unit supplied by the source.
   */
  unit: string | null;

  /**
   * Unit corresponding to normalizedValue.
   */
  normalizedUnit: string | null;

  referenceRange: HealthReferenceRange | null;

  /**
   * Existing abnormal flag from the source, when available.
   */
  abnormalFlag: string | null;

  observationDate: string;

  sourceType: HealthMeasurementSourceType;

  /**
   * Identifier of the originating record when available.
   *
   * For medical reports this will normally correspond to the medical report
   * record.
   */
  sourceRecordId: string | null;

  /**
   * Medical report identifier when the measurement originated from a report.
   */
  medicalReportId: string | null;
}

/* -------------------------------------------------------------------------- */
/* Trend statistics                                                           */
/* -------------------------------------------------------------------------- */

export interface TrendChange {
  /**
   * Latest normalized value minus comparison value.
   */
  absolute: number | null;

  /**
   * Percentage change relative to comparison value.
   */
  percentage: number | null;
}

export interface TrendStatistics {
  /**
   * First measurement in the analyzed period.
   */
  baselineValue: number | null;

  /**
   * Most recent measurement.
   */
  latestValue: number | null;

  /**
   * Immediately preceding measurement.
   */
  previousValue: number | null;

  change: TrendChange;

  /**
   * Approximate rate of numerical change per day.
   */
  slopePerDay: number | null;

  /**
   * Minimum normalized value in the analyzed period.
   */
  minimum: number | null;

  /**
   * Maximum normalized value in the analyzed period.
   */
  maximum: number | null;

  /**
   * Mean normalized value in the analyzed period.
   */
  average: number | null;

  /**
   * Standard deviation when enough observations exist.
   */
  standardDeviation: number | null;
}

/* -------------------------------------------------------------------------- */
/* Trend period                                                               */
/* -------------------------------------------------------------------------- */

export type TrendPeriod =
  | "1M"
  | "3M"
  | "6M"
  | "1Y"
  | "ALL";

export interface TrendDateRange {
  start: string | null;
  end: string | null;
}

/* -------------------------------------------------------------------------- */
/* Trend evidence                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Evidence supporting a detected trend.
 *
 * Health Trends should always be able to trace an interpretation back to
 * actual measurements.
 */
export interface TrendEvidence {
  measurementIds: string[];

  measurementCount: number;

  period: TrendDateRange;

  dataSufficiency: TrendDataSufficiency;

  /**
   * Human-readable explanation of why the data is considered sufficient or
   * limited.
   */
  dataQualityMessage: string | null;
}

/* -------------------------------------------------------------------------- */
/* Health trend                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Complete calculated trend for one canonical health metric.
 */
export interface HealthTrend {
  metric: HealthMetricDefinition;

  period: TrendPeriod;

  dateRange: TrendDateRange;

  observations: HealthMeasurement[];

  latest: HealthMeasurement | null;

  previous: HealthMeasurement | null;

  baseline: HealthMeasurement | null;

  statistics: TrendStatistics;

  direction: TrendDirection;

  pattern: TrendPattern;

  dataSufficiency: TrendDataSufficiency;

  measurementCount: number;

  evidence: TrendEvidence;
}

/* -------------------------------------------------------------------------- */
/* Dashboard personalization                                                  */
/* -------------------------------------------------------------------------- */

/**
 * User-controlled configuration for a metric on the dashboard.
 */
export interface HealthTrendPreference {
  userId: string;

  metricId: HealthMetricId;

  /**
   * Whether this metric is currently displayed in the dashboard's
   * "Your Health Trends" widget.
   */
  dashboardVisible: boolean;

  /**
   * Lower values appear earlier in the user's selected order.
   */
  displayOrder: number;

  createdAt?: string;

  updatedAt?: string;
}

/* -------------------------------------------------------------------------- */
/* Trend suggestions                                                           */
/* -------------------------------------------------------------------------- */

/**
 * A metric that Previa believes may be useful for the user to track.
 *
 * Suggestions are evidence-based and should not imply a diagnosis.
 */
export interface HealthTrendSuggestion {
  metric: HealthMetricDefinition;

  reason: string;

  measurementCount: number;

  lastObservedAt: string | null;

  dataSufficiency: TrendDataSufficiency;
}

/* -------------------------------------------------------------------------- */
/* Trend insight                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Human-readable interpretation generated from HealthTrend data.
 *
 * The trend engine provides the evidence; the presentation layer decides
 * how this is worded for the user.
 */
export interface TrendInsight {
  title: string;

  summary: string;

  direction: TrendDirection;

  pattern: TrendPattern;

  evidence: TrendEvidence;
}

/* -------------------------------------------------------------------------- */
/* Trend engine result                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Result returned by the Health Trends intelligence layer.
 *
 * This allows the dashboard, Health Trends module and Health Insights to
 * consume the same calculations rather than independently recalculating
 * trends.
 */
export interface HealthTrendsResult {
  trends: HealthTrend[];

  suggestions: HealthTrendSuggestion[];

  generatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Normalization contracts                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Raw observation shape consumed by the normalization layer.
 *
 * This intentionally mirrors the existing medical_observations data currently
 * used by Health Insights while remaining independent of Supabase types.
 */
export interface RawHealthObservation {
  id: string;

  user_id: string;

  medical_report_id: string | null;

  observation_date: string;

  test_name: string;

  normalized_name: string | null;

  value: number;

  unit: string | null;

  reference_range: string | null;

  abnormal_flag: string | null;
}

/**
 * Result produced when a raw observation is successfully normalized.
 */
export interface NormalizedHealthMeasurement {
  measurement: HealthMeasurement;

  metric: HealthMetricDefinition;
}

/**
 * A raw observation that could not be safely mapped to a canonical metric.
 */
export interface UnrecognizedHealthObservation {
  observation: RawHealthObservation;

  reason: string;
}