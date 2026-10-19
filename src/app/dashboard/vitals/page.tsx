"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  OBSERVATION_TYPES,
} from "@/lib/vitals/constants";
import {
  getScheduleOccurrences,
  getScheduleSummary,
} from "@/lib/vitals/schedules";

import type {
  MonitoringSchedule,
  PatientObservation,
} from "@/lib/vitals/types";

import VitalCard from "@/components/vitals/VitalCard";

type CareEpisode = {
  id: string;
  title: string;
  reason: string | null;
  start_at: string;
  end_at: string | null;
  monitoring_status: string;
};

const VITALS = OBSERVATION_TYPES.map((vital) => ({
  ...vital,
  type: vital.value,
  shortLabel: vital.label,
  decimals:
    vital.value === "TEMPERATURE" || vital.value === "WEIGHT" ? 1 : 0,
}));

function getVital(type: string) {
  return VITALS.find((vital) => vital.type === type);
}

function formatValue(value: number | null, decimals = 0) {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toFixed(decimals);
}

function formatObservationValue(observation: PatientObservation) {
  const vital = getVital(observation.observation_type);

  if (!vital || observation.value === null) {
    return "—";
  }

  if (
    observation.observation_type === "BLOOD_PRESSURE" &&
    observation.secondary_value !== null
  ) {
    return `${formatValue(observation.value, 0)}/${formatValue(
      observation.secondary_value,
      0
    )}`;
  }

  return `${formatValue(observation.value, vital.decimals)} ${vital.unit}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFullDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTrend(
  observations: PatientObservation[]
): "RISING" | "FALLING" | "STABLE" | "INSUFFICIENT_DATA" {
  const values = observations
    .filter((item) => item.value !== null)
    .sort(
      (a, b) =>
        new Date(a.recorded_at).getTime() -
        new Date(b.recorded_at).getTime()
    );

  if (values.length < 3) {
    return "INSUFFICIENT_DATA";
  }

  const first = values[0].value;
  const last = values[values.length - 1].value;

  if (first === null || last === null || first === 0) {
    return "INSUFFICIENT_DATA";
  }

  const change = ((last - first) / Math.abs(first)) * 100;

  if (Math.abs(change) < 2) {
    return "STABLE";
  }

  return change > 0 ? "RISING" : "FALLING";
}

function trendLabel(trend: string) {
  switch (trend) {
    case "RISING":
      return "Rising";
    case "FALLING":
      return "Falling";
    case "STABLE":
      return "Stable";
    default:
      return "Limited data";
  }
}

function formatSource(source: string) {
  return source
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatObservationTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function trendTone(trend: string) {
  switch (trend) {
    case "STABLE":
      return "previa-status-stable";
    case "RISING":
      return "previa-status-attention";
    case "FALLING":
      return "previa-status-info";
    default:
      return "previa-status-info";
  }
}

function trendIcon(trend: string) {
  if (trend === "RISING") return "↗";
  if (trend === "FALLING") return "↘";
  if (trend === "STABLE") return "→";
  return "•";
}

function episodeStatusTone(status: string) {
  switch (status) {
    case "ACTIVE":
      return "previa-status-stable";
    case "COMPLETED":
      return "previa-status-info";
    default:
      return "previa-status-info";
  }
}

export default function VitalsDashboardPage() {
  const [episodes, setEpisodes] = useState<CareEpisode[]>([]);
  const [observations, setObservations] = useState<PatientObservation[]>([]);
  const [schedules, setSchedules] = useState<MonitoringSchedule[]>([]);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [episodesResponse, observationsResponse] = await Promise.all([
        fetch("/api/vitals/episodes", {
          cache: "no-store",
        }),
        fetch("/api/vitals/observations?limit=500", {
          cache: "no-store",
        }),
      ]);

      const episodesData = await episodesResponse.json();
      const observationsData = await observationsResponse.json();

      if (!episodesResponse.ok) {
        throw new Error(
          episodesData.error || "Unable to load care episodes."
        );
      }

      if (!observationsResponse.ok) {
        throw new Error(
          observationsData.error || "Unable to load observations."
        );
      }

      const loadedEpisodes: CareEpisode[] = Array.isArray(episodesData)
        ? episodesData
        : episodesData.episodes ?? [];

      const loadedObservations: PatientObservation[] =
        Array.isArray(observationsData)
          ? observationsData
          : observationsData.observations ?? [];

      setEpisodes(loadedEpisodes);
      setObservations(loadedObservations);

      const activeEpisode = loadedEpisodes.find(
        (episode) => episode.monitoring_status === "ACTIVE"
      );

      setSelectedEpisodeId((current) => {
        if (
          current &&
          loadedEpisodes.some((episode) => episode.id === current)
        ) {
          return current;
        }

        return activeEpisode?.id || "";
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load vitals dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const loadSchedules = async () => {
      if (!selectedEpisodeId) {
        setSchedules([]);
        return;
      }

      try {
        const response = await fetch(
          `/api/vitals/schedules?careEpisodeId=${encodeURIComponent(
            selectedEpisodeId
          )}`,
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load monitoring schedules."
          );
        }

        setSchedules(
          Array.isArray(data) ? data : data.schedules ?? []
        );
      } catch (err) {
        setSchedules([]);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load monitoring schedules."
        );
      }
    };

    loadSchedules();
  }, [selectedEpisodeId]);

  const dashboardObservations = useMemo(() => {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    return observations.filter((observation) => {
      const recordedTime = new Date(observation.recorded_at).getTime();

      if (recordedTime < twentyFourHoursAgo || recordedTime > now) {
        return false;
      }

      if (selectedEpisodeId) {
        return observation.care_episode_id === selectedEpisodeId;
      }

      return true;
    });
  }, [observations, selectedEpisodeId]);

  const scheduleSummary = useMemo(() => {
    if (!selectedEpisodeId || schedules.length === 0) {
      return {
        completed: 0,
        due: 0,
        overdue: 0,
        upcoming: 0,
      };
    }

    const now = new Date();
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const occurrences = getScheduleOccurrences(
      schedules,
      dashboardObservations,
      from,
      now
    );

    return getScheduleSummary(occurrences);
  }, [schedules, dashboardObservations, selectedEpisodeId]);

  const metrics = useMemo(() => {
    return VITALS.map((vital) => {
      const readings = dashboardObservations
        .filter(
          (observation) =>
            observation.observation_type === vital.type
        )
        .filter((observation) => observation.value !== null)
        .sort(
          (a, b) =>
            new Date(a.recorded_at).getTime() -
            new Date(b.recorded_at).getTime()
        );

      const latest = readings[readings.length - 1] || null;

      const previous =
        readings.length >= 2 ? readings[readings.length - 2] : null;

      const numericValues = readings
        .map((reading) => reading.value)
        .filter((value): value is number => value !== null);

      const minimum =
        numericValues.length > 0 ? Math.min(...numericValues) : null;

      const maximum =
        numericValues.length > 0 ? Math.max(...numericValues) : null;

      const average =
        numericValues.length > 0
          ? numericValues.reduce((sum, value) => sum + value, 0) /
            numericValues.length
          : null;

      let change: number | null = null;

      if (
        latest?.value !== null &&
        latest?.value !== undefined &&
        previous?.value !== null &&
        previous?.value !== undefined
      ) {
        change = latest.value - previous.value;
      }

      return {
        vital,
        readings,
        latest,
        previous,
        minimum,
        maximum,
        average,
        change,
        trend: getTrend(readings),
      };
    });
  }, [dashboardObservations]);

  const recentObservations = useMemo(() => {
    return [...dashboardObservations]
      .sort(
        (a, b) =>
          new Date(b.recorded_at).getTime() -
          new Date(a.recorded_at).getTime()
      )
      .slice(0, 20);
  }, [dashboardObservations]);

  const selectedEpisode = episodes.find(
    (episode) => episode.id === selectedEpisodeId
  );

  const selectedEpisodeIsActive =
    selectedEpisode?.monitoring_status === "ACTIVE";

  const recordedVitalCount = metrics.filter(
    (metric) => metric.readings.length > 0
  ).length;

  const latestObservation = dashboardObservations.reduce<
    PatientObservation | null
  >((latest, current) => {
    if (!latest) return current;

    return new Date(current.recorded_at).getTime() >
      new Date(latest.recorded_at).getTime()
      ? current
      : latest;
  }, null);

  if (loading) {
    return (
      <main className="min-h-full bg-[var(--background)]">
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-5">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
            <div className="h-24 animate-pulse rounded-[16px] bg-[var(--surface)]" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-48 animate-pulse rounded-[16px] bg-[var(--surface)]"
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-[var(--background)]">
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="space-y-6">
          {/* Page header */}
          <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
                <Link
                  href="/dashboard"
                  className="transition-colors hover:text-[var(--foreground)]"
                >
                  Dashboard
                </Link>
                <span>/</span>
                <span className="text-[var(--foreground-secondary)]">
                  Vitals
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--primary-soft)] text-[var(--primary)]">
                  <svg
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 12h4l2.2-7 4.1 14 2.3-7H21"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div>
                  <h1 className="text-[25px] font-semibold tracking-[-0.025em] text-[var(--foreground)]">
                    Vitals
                  </h1>
                  <p className="mt-0.5 text-sm text-[var(--foreground-secondary)]">
                    Your recent measurements and monitoring activity.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/vitals/history"
                className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--foreground-secondary)] shadow-[var(--shadow-card)] transition hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
              >
                View history
              </Link>

              <Link
                href="/dashboard/vitals/record"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[var(--primary)] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--primary-hover)]"
              >
                <span className="text-base leading-none">+</span>
                Record vitals
              </Link>
            </div>
          </header>

          {error && (
            <div className="flex items-start gap-3 rounded-[12px] border border-[var(--critical-soft)] bg-[var(--critical-soft)] px-4 py-3 text-sm text-[var(--critical)]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M12 8v5M12 16.5v.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Monitoring context */}
          <section className="previa-card p-5 sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--foreground-muted)]">
                    Monitoring context
                  </span>

                  {selectedEpisode && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${episodeStatusTone(
                        selectedEpisode.monitoring_status
                      )}`}
                    >
                      {selectedEpisode.monitoring_status}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--surface-muted)] text-[var(--foreground-secondary)]">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 20V9l7-5 7 5v11"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9 20v-5h6v5M3 20h18"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold tracking-[-0.015em] text-[var(--foreground)]">
                      {selectedEpisode?.title || "General Monitoring"}
                    </h2>

                    <p className="mt-0.5 text-sm text-[var(--foreground-secondary)]">
                      {selectedEpisode?.reason ||
                        "View measurements across your health record."}
                    </p>
                  </div>
                </div>

                {selectedEpisode && (
                  <p className="mt-3 text-xs text-[var(--foreground-muted)]">
                    Started{" "}
                    {formatFullDateTime(selectedEpisode.start_at)}
                  </p>
                )}
              </div>

              <div className="w-full xl:max-w-[320px]">
                <label
                  htmlFor="monitoring-episode"
                  className="mb-1.5 block text-xs font-medium text-[var(--foreground-secondary)]"
                >
                  Monitoring episode
                </label>

                <select
                  id="monitoring-episode"
                  value={selectedEpisodeId}
                  onChange={(event) =>
                    setSelectedEpisodeId(event.target.value)
                  }
                  className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)]"
                >
                  <option value="">All observations</option>

                  {episodes.map((episode) => (
                    <option key={episode.id} value={episode.id}>
                      {episode.title}
                      {episode.monitoring_status !== "ACTIVE"
                        ? ` (${episode.monitoring_status})`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Monitoring overview */}
          <section>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-[var(--foreground)]">
                  Monitoring overview
                </h2>
                <p className="mt-0.5 text-sm text-[var(--foreground-secondary)]">
                  A quick view of activity over the last 24 hours.
                </p>
              </div>

              {latestObservation && (
                <p className="hidden text-xs text-[var(--foreground-muted)] sm:block">
                  Last updated{" "}
                  {formatDateTime(latestObservation.recorded_at)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <OverviewCard
                label="Vitals recorded"
                value={`${recordedVitalCount}/${VITALS.length}`}
                description="Types with recent data"
                icon="activity"
              />

              <OverviewCard
                label="Readings"
                value={String(dashboardObservations.length)}
                description="Measurements in 24h"
                icon="pulse"
              />

              <OverviewCard
                label="Monitoring status"
                value={
                  selectedEpisodeIsActive
                    ? "Active"
                    : selectedEpisode
                      ? "Inactive"
                      : "General"
                }
                description={
                  selectedEpisode
                    ? selectedEpisode.title
                    : "All observations"
                }
                icon="status"
              />

              <OverviewCard
                label="Last reading"
                value={
                  latestObservation
                    ? formatObservationTime(
                        latestObservation.recorded_at
                      )
                    : "—"
                }
                description={
                  latestObservation
                    ? getVital(
                        latestObservation.observation_type
                      )?.label ||
                      latestObservation.observation_type
                    : "No recent readings"
                }
                icon="clock"
              />
            </div>
          </section>

          {/* Monitoring plan */}
          {selectedEpisodeId && (
            <section className="previa-card overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-[var(--border)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[var(--primary-subtle)] text-[var(--primary)]">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M7 3v4M17 3v4M4 9h16"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                        />
                        <rect
                          x="4"
                          y="5"
                          width="16"
                          height="16"
                          rx="3"
                          stroke="currentColor"
                          strokeWidth="1.7"
                        />
                      </svg>
                    </div>

                    <h2 className="text-[16px] font-semibold text-[var(--foreground)]">
                      Monitoring plan
                    </h2>
                  </div>

                  <p className="mt-2 text-sm text-[var(--foreground-secondary)]">
                    Keep track of scheduled measurements for this
                    episode.
                  </p>
                </div>

                <Link
                  href="/dashboard/vitals/schedules"
                  className="text-sm font-medium text-[var(--primary)] transition hover:text-[var(--primary-hover)]"
                >
                  Manage schedules →
                </Link>
              </div>

              {schedules.length === 0 ? (
                <div className="px-5 py-8 sm:px-6">
                  <div className="rounded-[12px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-subtle)] px-5 py-7 text-center">
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      No monitoring schedules configured
                    </p>
                    <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[var(--foreground-secondary)]">
                      Create a schedule when this care episode
                      requires measurements at specific times.
                    </p>
                    <Link
                      href="/dashboard/vitals/schedules"
                      className="mt-4 inline-flex h-9 items-center rounded-[9px] bg-[var(--primary)] px-3.5 text-xs font-medium text-white transition hover:bg-[var(--primary-hover)]"
                    >
                      Configure schedule
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid divide-y divide-[var(--border)] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                  <ScheduleMetric
                    label="Completed"
                    value={scheduleSummary.completed}
                    description="Recorded on time"
                    tone="stable"
                  />
                  <ScheduleMetric
                    label="Due"
                    value={scheduleSummary.due}
                    description="Needs attention"
                    tone="attention"
                  />
                  <ScheduleMetric
                    label="Overdue"
                    value={scheduleSummary.overdue}
                    description="Past scheduled time"
                    tone="critical"
                  />
                  <ScheduleMetric
                    label="Upcoming"
                    value={scheduleSummary.upcoming}
                    description="Coming next"
                    tone="info"
                  />
                </div>
              )}
            </section>
          )}

          {/* Vitals */}
          <section>
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-[var(--foreground)]">
                  Recent vitals
                </h2>
                <p className="mt-0.5 text-sm text-[var(--foreground-secondary)]">
                  Latest measurements and 24-hour ranges.
                </p>
              </div>

              <span className="text-xs text-[var(--foreground-muted)]">
                Last 24 hours
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <VitalCard
                  key={metric.vital.type}
                  metric={metric}
                />
              ))}
            </div>
          </section>

          {/* Recent observations */}
          <section className="previa-card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="text-[16px] font-semibold text-[var(--foreground)]">
                  Recent observations
                </h2>
                <p className="mt-0.5 text-sm text-[var(--foreground-secondary)]">
                  The latest measurements in the selected monitoring
                  context.
                </p>
              </div>

              <Link
                href="/dashboard/vitals/history"
                className="text-sm font-medium text-[var(--primary)] transition hover:text-[var(--primary-hover)]"
              >
                View full history →
              </Link>
            </div>

            {recentObservations.length === 0 ? (
              <div className="px-5 py-12 text-center sm:px-6">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--foreground-muted)]">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 19V5M4 19h16"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
                  No recent vital readings
                </p>

                <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[var(--foreground-secondary)]">
                  Record a measurement to start building your
                  longitudinal vital history.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)]">
                      <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                        Date / time
                      </th>
                      <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                        Vital
                      </th>
                      <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                        Reading
                      </th>
                      <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                        Source
                      </th>
                      <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                        Recorded by
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[var(--border)]">
                    {recentObservations.map((observation) => {
                      const vital = getVital(
                        observation.observation_type
                      );

                      return (
                        <tr
                          key={observation.id}
                          className="transition-colors hover:bg-[var(--surface-subtle)]"
                        >
                          <td className="whitespace-nowrap px-6 py-3.5 text-sm text-[var(--foreground-secondary)]">
                            {formatDateTime(
                              observation.recorded_at
                            )}
                          </td>

                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--surface-muted)] text-[10px] font-semibold text-[var(--foreground-secondary)]">
                                {vital?.shortLabel?.slice(0, 3) ||
                                  "V"}
                              </span>

                              <span className="text-sm font-medium text-[var(--foreground)]">
                                {vital?.label ||
                                  observation.observation_type}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-3.5 text-sm font-semibold text-[var(--foreground)]">
                            {formatObservationValue(observation)}
                          </td>

                          <td className="px-6 py-3.5 text-sm text-[var(--foreground-secondary)]">
                            {formatSource(
                              observation.source_type
                            )}
                          </td>

                          <td className="px-6 py-3.5 text-sm text-[var(--foreground-secondary)]">
                            {observation.recorded_by || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Vitals navigation */}
          <section>
            <div className="mb-3">
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
                Vitals tools
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ActionCard
                href="/dashboard/vitals/record"
                title="Record vitals"
                description="Add a new measurement."
                icon="plus"
              />

              <ActionCard
                href="/dashboard/vitals/history"
                title="Vitals history"
                description="Review measurements over time."
                icon="history"
              />

              <ActionCard
                href="/dashboard/vitals/schedules"
                title="Monitoring schedules"
                description="Manage scheduled observations."
                icon="calendar"
              />

              <ActionCard
                href="/dashboard/vitals/episodes"
                title="Care episodes"
                description="Manage monitoring contexts."
                icon="episode"
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function OverviewCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: "activity" | "pulse" | "status" | "clock";
}) {
  return (
    <div className="previa-card previa-card-interactive p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-[var(--foreground-secondary)]">
          {label}
        </p>

        <OverviewIcon type={icon} />
      </div>

      <p className="mt-3 text-[22px] font-semibold tracking-[-0.025em] text-[var(--foreground)]">
        {value}
      </p>

      <p className="mt-1 truncate text-xs text-[var(--foreground-muted)]">
        {description}
      </p>
    </div>
  );
}

function OverviewIcon({
  type,
}: {
  type: "activity" | "pulse" | "status" | "clock";
}) {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--surface-muted)] text-[var(--foreground-secondary)]">
      {type === "activity" && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 12h4l2-6 4 12 2-6h4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {type === "pulse" && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="8"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M8 12h2l1.2-3 2.1 6 1.2-3H17"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {type === "status" && (
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--success)]" />
      )}

      {type === "clock" && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="8"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M12 8v4l2.5 1.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

function ScheduleMetric({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: number;
  description: string;
  tone: "stable" | "attention" | "critical" | "info";
}) {
  const toneClasses = {
    stable: "text-[var(--success)]",
    attention: "text-[var(--attention)]",
    critical: "text-[var(--critical)]",
    info: "text-[var(--info)]",
  };

  return (
    <div className="px-5 py-4 sm:px-6 sm:py-5">
      <p className="text-xs font-medium text-[var(--foreground-secondary)]">
        {label}
      </p>

      <p
        className={`mt-2 text-[25px] font-semibold tracking-[-0.03em] ${toneClasses[tone]}`}
      >
        {value}
      </p>

      <p className="mt-0.5 text-[11px] text-[var(--foreground-muted)]">
        {description}
      </p>
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: "plus" | "history" | "calendar" | "episode";
}) {
  return (
    <Link
      href={href}
      className="previa-card previa-card-interactive group flex items-center gap-3 p-4"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--surface-muted)] text-[var(--foreground-secondary)] transition-colors group-hover:bg-[var(--primary-soft)] group-hover:text-[var(--primary)]">
        {icon === "plus" && (
          <span className="text-xl font-light leading-none">+</span>
        )}

        {icon === "history" && (
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 12a8 8 0 1 0 2.3-5.7"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <path
              d="M4 5v4h4M12 8v4l2.5 1.5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {icon === "calendar" && (
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="4"
              y="5"
              width="16"
              height="15"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="M8 3v4M16 3v4M4 9h16"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        )}

        {icon === "episode" && (
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="4"
              y="4"
              width="16"
              height="16"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="M8 9h8M8 13h5M8 17h3"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>

      <span className="min-w-0">
        <span className="block text-sm font-medium text-[var(--foreground)]">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--foreground-muted)]">
          {description}
        </span>
      </span>

      <span className="ml-auto text-[var(--foreground-muted)] transition-transform group-hover:translate-x-0.5">
        →
      </span>
    </Link>
  );
}