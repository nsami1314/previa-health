// src/lib/health-trends/suggestions.ts

import type {
    HealthMetricDefinition,
    HealthTrend,
    HealthTrendSuggestion,
    TrendDataSufficiency,
  } from "./types";
  
  const MIN_SUGGESTION_MEASUREMENTS = 2;
  
  const SUFFICIENCY_SCORE: Record<TrendDataSufficiency, number> = {
    STRONG: 4,
    MODERATE: 3,
    LIMITED: 2,
    INSUFFICIENT: 1,
  };
  
  interface SuggestionCandidate {
    trend: HealthTrend;
    score: number;
    reason: string;
  }
  
  function getRecencyScore(lastObservedAt: string | null): number {
    if (!lastObservedAt) {
      return 0;
    }
  
    const timestamp = new Date(lastObservedAt).getTime();
  
    if (!Number.isFinite(timestamp)) {
      return 0;
    }
  
    const ageInDays =
      (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
  
    if (ageInDays <= 30) {
      return 4;
    }
  
    if (ageInDays <= 90) {
      return 3;
    }
  
    if (ageInDays <= 180) {
      return 2;
    }
  
    if (ageInDays <= 365) {
      return 1;
    }
  
    return 0;
  }
  
  function getPatternScore(trend: HealthTrend): number {
    switch (trend.pattern) {
      case "PERSISTENT_INCREASE":
      case "PERSISTENT_DECREASE":
        return 4;
  
      case "SUDDEN_INCREASE":
      case "SUDDEN_DECREASE":
        return 4;
  
      case "INCREASING":
      case "DECREASING":
        return 3;
  
      case "FLUCTUATING":
        return 2;
  
      case "STABLE":
        return 1;
  
      case "INSUFFICIENT_EVIDENCE":
      default:
        return 0;
    }
  }
  
  function getMeasurementScore(measurementCount: number): number {
    if (measurementCount >= 6) {
      return 4;
    }
  
    if (measurementCount >= 4) {
      return 3;
    }
  
    if (measurementCount >= 2) {
      return 2;
    }
  
    return 0;
  }
  
  function getSuggestionReason(trend: HealthTrend): string {
    const { measurementCount, dataSufficiency, pattern } = trend;
  
    if (
      pattern === "PERSISTENT_INCREASE" ||
      pattern === "PERSISTENT_DECREASE"
    ) {
      return "A persistent pattern has been detected across multiple measurements.";
    }
  
    if (
      pattern === "SUDDEN_INCREASE" ||
      pattern === "SUDDEN_DECREASE"
    ) {
      return "A notable change has been detected between measurements.";
    }
  
    if (
      pattern === "INCREASING" ||
      pattern === "DECREASING"
    ) {
      return "Multiple measurements show a directional trend.";
    }
  
    if (dataSufficiency === "STRONG") {
      return "There is a strong longitudinal history available for this metric.";
    }
  
    if (measurementCount >= 4) {
      return "This metric has enough historical measurements to make trend tracking useful.";
    }
  
    return "This metric has multiple recorded measurements and can be tracked over time.";
  }
  
  function buildCandidate(trend: HealthTrend): SuggestionCandidate | null {
    if (trend.measurementCount < MIN_SUGGESTION_MEASUREMENTS) {
      return null;
    }
  
    const latestObservedAt =
      trend.latest?.observationDate ?? null;
  
    const score =
      SUFFICIENCY_SCORE[trend.dataSufficiency] +
      getMeasurementScore(trend.measurementCount) +
      getRecencyScore(latestObservedAt) +
      getPatternScore(trend);
  
    return {
      trend,
      score,
      reason: getSuggestionReason(trend),
    };
  }
  
  function toSuggestion(
    candidate: SuggestionCandidate,
  ): HealthTrendSuggestion {
    const trend = candidate.trend;
  
    return {
      metric: trend.metric,
      reason: candidate.reason,
      measurementCount: trend.measurementCount,
      lastObservedAt: trend.latest?.observationDate ?? null,
      dataSufficiency: trend.dataSufficiency,
    };
  }
  
  /**
   * Generate deterministic metric suggestions from existing trend data.
   *
   * No AI, network calls, database writes, or clinical inference are performed.
   */
  export function generateTrendSuggestions(
    trends: HealthTrend[],
  ): HealthTrendSuggestion[] {
    return trends
      .map(buildCandidate)
      .filter(
        (candidate): candidate is SuggestionCandidate =>
          candidate !== null,
      )
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
  
        const aDate =
          a.trend.latest?.observationDate ?? "";
        const bDate =
          b.trend.latest?.observationDate ?? "";
  
        return bDate.localeCompare(aDate);
      })
      .map(toSuggestion);
  }
  
  /**
   * Return suggestions that are not already visible on the dashboard.
   */
  export function generateDashboardSuggestions(
    trends: HealthTrend[],
    visibleMetricIds: string[],
  ): HealthTrendSuggestion[] {
    const visibleIds = new Set(visibleMetricIds);
  
    return generateTrendSuggestions(trends).filter(
      (suggestion) => !visibleIds.has(suggestion.metric.id),
    );
  }
  
  /**
   * Limit suggestions for compact dashboard presentation.
   */
  export function limitTrendSuggestions(
    suggestions: HealthTrendSuggestion[],
    limit = 3,
  ): HealthTrendSuggestion[] {
    if (limit <= 0) {
      return [];
    }
  
    return suggestions.slice(0, limit);
  }
  
  /**
   * Remove duplicate suggestions by canonical metric ID.
   */
  export function deduplicateTrendSuggestions(
    suggestions: HealthTrendSuggestion[],
  ): HealthTrendSuggestion[] {
    const seen = new Set<string>();
    const result: HealthTrendSuggestion[] = [];
  
    for (const suggestion of suggestions) {
      const metricId = suggestion.metric.id;
  
      if (seen.has(metricId)) {
        continue;
      }
  
      seen.add(metricId);
      result.push(suggestion);
    }
  
    return result;
  }
  
  /**
   * Check whether a metric has enough evidence to be suggested.
   */
  export function isTrendSuggestionEligible(
    trend: HealthTrend,
  ): boolean {
    return (
      trend.measurementCount >= MIN_SUGGESTION_MEASUREMENTS &&
      trend.dataSufficiency !== "INSUFFICIENT"
    );
  }
  
  /**
   * Return a concise explanation for why a metric was suggested.
   */
  export function getTrendSuggestionReason(
    trend: HealthTrend,
  ): string {
    return getSuggestionReason(trend);
  }
  
  /**
   * Sort suggestions by practical tracking relevance.
   */
  export function sortTrendSuggestions(
    suggestions: HealthTrendSuggestion[],
  ): HealthTrendSuggestion[] {
    return [...suggestions].sort((a, b) => {
      const sufficiencyDifference =
        SUFFICIENCY_SCORE[b.dataSufficiency] -
        SUFFICIENCY_SCORE[a.dataSufficiency];
  
      if (sufficiencyDifference !== 0) {
        return sufficiencyDifference;
      }
  
      if (b.measurementCount !== a.measurementCount) {
        return b.measurementCount - a.measurementCount;
      }
  
      const aDate = a.lastObservedAt ?? "";
      const bDate = b.lastObservedAt ?? "";
  
      return bDate.localeCompare(aDate);
    });
  }
  
  /**
   * Build a suggestion list while keeping the output deterministic.
   */
  export function buildTrendSuggestions(
    trends: HealthTrend[],
    options?: {
      visibleMetricIds?: string[];
      limit?: number;
    },
  ): HealthTrendSuggestion[] {
    const visibleMetricIds = options?.visibleMetricIds ?? [];
  
    const suggestions = generateDashboardSuggestions(
      trends,
      visibleMetricIds,
    );
  
    return limitTrendSuggestions(
      sortTrendSuggestions(
        deduplicateTrendSuggestions(suggestions),
      ),
      options?.limit ?? 3,
    );
  }
  
  /**
   * Utility for consumers that need only the suggested metric definitions.
   */
  export function getSuggestedMetrics(
    suggestions: HealthTrendSuggestion[],
  ): HealthMetricDefinition[] {
    return suggestions.map((suggestion) => suggestion.metric);
  }