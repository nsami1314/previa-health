/**
 * Health Trends — Personalization Utilities
 *
 * Responsibilities:
 * - Manage user-facing trend preferences in memory.
 * - Determine dashboard-visible metrics.
 * - Preserve display ordering.
 * - Provide deterministic defaults when preferences do not exist.
 *
 * This module intentionally contains:
 * - NO AI
 * - NO LLM calls
 * - NO database access
 * - NO medical interpretation
 *
 * Persistence can be connected later without changing the core trend engine.
 */

import type {
    HealthMetricDefinition,
    HealthTrend,
    HealthTrendPreference,
  } from "./types";
  
  /* -------------------------------------------------------------------------- */
  /* Default preference helpers                                                  */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Create deterministic default preferences for a set of metrics.
   *
   * New metrics start hidden from the dashboard. This prevents the dashboard
   * from suddenly becoming crowded whenever a new laboratory metric is found.
   *
   * The full Health Trends module can still expose all available metrics.
   */
  export function createDefaultTrendPreferences(
    userId: string,
    metrics: HealthMetricDefinition[],
  ): HealthTrendPreference[] {
    if (!userId) {
      return [];
    }
  
    return metrics.map((metric, index) => ({
      userId,
      metricId: metric.id,
      dashboardVisible: false,
      displayOrder: index,
    }));
  }
  
  /* -------------------------------------------------------------------------- */
  /* Preference normalization                                                    */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Normalize persisted preferences against currently available metrics.
   *
   * Invalid or obsolete metric IDs are removed.
   * Missing metrics receive a deterministic default preference.
   */
  export function normalizeTrendPreferences(
    userId: string,
    metrics: HealthMetricDefinition[],
    preferences: HealthTrendPreference[],
  ): HealthTrendPreference[] {
    if (!userId) {
      return [];
    }
  
    const availableMetricIds = new Set(
      metrics.map((metric) => metric.id),
    );
  
    const validPreferences = preferences.filter(
      (preference) =>
        preference.userId === userId &&
        availableMetricIds.has(preference.metricId),
    );
  
    const existingMetricIds = new Set(
      validPreferences.map((preference) => preference.metricId),
    );
  
    const missingPreferences = metrics
      .filter((metric) => !existingMetricIds.has(metric.id))
      .map((metric, index) => ({
        userId,
        metricId: metric.id,
        dashboardVisible: false,
        displayOrder:
          validPreferences.length + index,
      }));
  
    return [...validPreferences, ...missingPreferences].sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );
  }
  
  /* -------------------------------------------------------------------------- */
  /* Visibility                                                                  */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Return only preferences currently selected for dashboard display.
   */
  export function getDashboardVisiblePreferences(
    preferences: HealthTrendPreference[],
  ): HealthTrendPreference[] {
    return preferences
      .filter((preference) => preference.dashboardVisible)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }
  
  /**
   * Return dashboard-visible metric IDs in user-selected order.
   */
  export function getDashboardVisibleMetricIds(
    preferences: HealthTrendPreference[],
  ): string[] {
    return getDashboardVisiblePreferences(preferences).map(
      (preference) => preference.metricId,
    );
  }
  
  /* -------------------------------------------------------------------------- */
  /* Preference lookup                                                           */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Find a preference for a specific metric.
   */
  export function getTrendPreference(
    preferences: HealthTrendPreference[],
    metricId: string,
  ): HealthTrendPreference | null {
    return (
      preferences.find(
        (preference) => preference.metricId === metricId,
      ) ?? null
    );
  }
  
  /**
   * Determine whether a metric is visible on the dashboard.
   */
  export function isMetricDashboardVisible(
    preferences: HealthTrendPreference[],
    metricId: string,
  ): boolean {
    return (
      getTrendPreference(preferences, metricId)?.dashboardVisible ??
      false
    );
  }
  
  /* -------------------------------------------------------------------------- */
  /* Ordering                                                                    */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Sort preferences into a stable display order.
   *
   * If two preferences have the same order, metric ID is used as a deterministic
   * tie-breaker.
   */
  export function sortTrendPreferences(
    preferences: HealthTrendPreference[],
  ): HealthTrendPreference[] {
    return [...preferences].sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
  
      return a.metricId.localeCompare(b.metricId);
    });
  }
  
  /**
   * Re-index preferences so their displayOrder values are consecutive.
   *
   * This is useful after removing or reordering metrics.
   */
  export function compactTrendPreferenceOrder(
    preferences: HealthTrendPreference[],
  ): HealthTrendPreference[] {
    return sortTrendPreferences(preferences).map(
      (preference, index) => ({
        ...preference,
        displayOrder: index,
      }),
    );
  }
  
  /* -------------------------------------------------------------------------- */
  /* Preference updates                                                          */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Update dashboard visibility for one metric.
   */
  export function setMetricDashboardVisibility(
    preferences: HealthTrendPreference[],
    metricId: string,
    visible: boolean,
  ): HealthTrendPreference[] {
    return preferences.map((preference) =>
      preference.metricId === metricId
        ? {
            ...preference,
            dashboardVisible: visible,
          }
        : preference,
    );
  }
  
  /**
   * Move a metric to a requested position.
   *
   * Other visible metrics are shifted automatically.
   * Hidden metrics retain their relative position after the visible group.
   */
  export function moveDashboardMetric(
    preferences: HealthTrendPreference[],
    metricId: string,
    targetIndex: number,
  ): HealthTrendPreference[] {
    const ordered = sortTrendPreferences(preferences);
  
    const currentIndex = ordered.findIndex(
      (preference) => preference.metricId === metricId,
    );
  
    if (currentIndex === -1) {
      return ordered;
    }
  
    const clampedTargetIndex = Math.max(
      0,
      Math.min(targetIndex, ordered.length - 1),
    );
  
    if (currentIndex === clampedTargetIndex) {
      return compactTrendPreferenceOrder(ordered);
    }
  
    const next = [...ordered];
    const [moved] = next.splice(currentIndex, 1);
  
    if (!moved) {
      return compactTrendPreferenceOrder(ordered);
    }
  
    next.splice(clampedTargetIndex, 0, moved);
  
    return compactTrendPreferenceOrder(next);
  }
  
  /* -------------------------------------------------------------------------- */
  /* Trend ordering                                                              */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Sort calculated trends according to user preferences.
   *
   * Trends without a preference are placed after explicitly ordered metrics.
   */
  export function sortTrendsByPreference(
    trends: HealthTrend[],
    preferences: HealthTrendPreference[],
  ): HealthTrend[] {
    const preferenceMap = new Map(
      preferences.map((preference) => [
        preference.metricId,
        preference,
      ]),
    );
  
    return [...trends].sort((a, b) => {
      const preferenceA = preferenceMap.get(a.metric.id);
      const preferenceB = preferenceMap.get(b.metric.id);
  
      if (!preferenceA && !preferenceB) {
        return a.metric.displayName.localeCompare(
          b.metric.displayName,
        );
      }
  
      if (!preferenceA) {
        return 1;
      }
  
      if (!preferenceB) {
        return -1;
      }
  
      if (preferenceA.displayOrder !== preferenceB.displayOrder) {
        return (
          preferenceA.displayOrder -
          preferenceB.displayOrder
        );
      }
  
      return a.metric.displayName.localeCompare(
        b.metric.displayName,
      );
    });
  }
  
  /**
   * Return only trends selected for dashboard display.
   */
  export function getDashboardTrends(
    trends: HealthTrend[],
    preferences: HealthTrendPreference[],
  ): HealthTrend[] {
    const visibleMetricIds = new Set(
      getDashboardVisibleMetricIds(preferences),
    );
  
    return sortTrendsByPreference(
      trends.filter((trend) =>
        visibleMetricIds.has(trend.metric.id),
      ),
      preferences,
    );
  }
  
  /* -------------------------------------------------------------------------- */
  /* Preference creation / repair                                                */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Ensure every currently available metric has a preference.
   *
   * Existing user choices are preserved.
   */
  export function ensureTrendPreferences(
    userId: string,
    metrics: HealthMetricDefinition[],
    preferences: HealthTrendPreference[],
  ): HealthTrendPreference[] {
    return normalizeTrendPreferences(
      userId,
      metrics,
      preferences,
    );
  }
  
  /**
   * Add a newly discovered metric to an existing preference collection.
   *
   * New metrics are hidden by default and placed at the end.
   */
  export function addMetricPreference(
    userId: string,
    preferences: HealthTrendPreference[],
    metric: HealthMetricDefinition,
  ): HealthTrendPreference[] {
    const existing = getTrendPreference(
      preferences,
      metric.id,
    );
  
    if (existing) {
      return sortTrendPreferences(preferences);
    }
  
    const maxOrder = preferences.reduce(
      (maximum, preference) =>
        Math.max(maximum, preference.displayOrder),
      -1,
    );
  
    return [
      ...preferences,
      {
        userId,
        metricId: metric.id,
        dashboardVisible: false,
        displayOrder: maxOrder + 1,
      },
    ];
  }
  
  /* -------------------------------------------------------------------------- */
  /* Dashboard defaults                                                          */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Select sensible deterministic dashboard defaults from available trends.
   *
   * This does NOT make a medical recommendation.
   *
   * The rule is intentionally conservative:
   * - Prefer trends with sufficient longitudinal data.
   * - Prefer metrics with more observations.
   * - Never automatically expose more than the requested maximum.
   */
  export function selectDefaultDashboardTrends(
    trends: HealthTrend[],
    maxItems = 4,
  ): HealthTrend[] {
    if (maxItems <= 0) {
      return [];
    }
  
    const eligible = trends.filter(
      (trend) =>
        trend.measurementCount >= 2 &&
        trend.dataSufficiency !== "INSUFFICIENT",
    );
  
    return [...eligible]
      .sort((a, b) => {
        if (
          a.measurementCount !==
          b.measurementCount
        ) {
          return (
            b.measurementCount -
            a.measurementCount
          );
        }
  
        const dateA =
          a.latest?.observationDate ?? "";
        const dateB =
          b.latest?.observationDate ?? "";
  
        return dateB.localeCompare(dateA);
      })
      .slice(0, maxItems);
  }
  
  /**
   * Build dashboard preferences from deterministic default trend selection.
   *
   * This is useful before persistence exists or when a user has never configured
   * their dashboard.
   */
  export function createDashboardDefaultsFromTrends(
    userId: string,
    trends: HealthTrend[],
    maxItems = 4,
  ): HealthTrendPreference[] {
    const selected = selectDefaultDashboardTrends(
      trends,
      maxItems,
    );
  
    return selected.map((trend, index) => ({
      userId,
      metricId: trend.metric.id,
      dashboardVisible: true,
      displayOrder: index,
    }));
  }