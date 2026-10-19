"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  OBSERVATION_SOURCE_TYPES,
  OBSERVATION_TYPES,
} from "@/lib/vitals/constants";

import type {
  CareEpisode,
  ObservationSourceType,
  ObservationType,
  PatientObservation,
} from "@/lib/vitals/types";

import {
  formatBloodPressure,
  formatVitalValue,
} from "@/components/vitals/vital-utils";

type Observation = PatientObservation;

const VITALS = OBSERVATION_TYPES;
const SOURCE_TYPES = OBSERVATION_SOURCE_TYPES;

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(dateString: string) {
  return `${formatDate(dateString)} ${formatTime(dateString)}`;
}

function getVitalLabel(type: string) {
  return VITALS.find((vital) => vital.value === type)?.label ?? type;
}

function formatValue(observation: Observation) {
  if (observation.observation_type === "BLOOD_PRESSURE") {
    return formatBloodPressure(
      observation.value,
      observation.secondary_value
    );
  }

  return formatVitalValue(observation.value);
}

function getLocalDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getStartOfDay(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toISOString();
}

function getEndOfDay(dateString: string) {
  return new Date(`${dateString}T23:59:59.999`).toISOString();
}

function toDateTimeLocal(dateString: string) {
  const date = new Date(dateString);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function calculateStats(observations: Observation[]) {
  const values = observations
    .map((observation) => observation.value)
    .filter((value): value is number => typeof value === "number");

  if (values.length === 0) {
    return {
      count: 0,
      min: null,
      max: null,
      average: null,
    };
  }

  return {
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    average:
      values.reduce((sum, value) => sum + value, 0) / values.length,
  };
}

function calculateChange(observations: Observation[]) {
  if (observations.length < 2) {
    return null;
  }

  const sorted = [...observations].sort(
    (a, b) =>
      new Date(a.recorded_at).getTime() -
      new Date(b.recorded_at).getTime()
  );

  const first = sorted[0].value;
  const latest = sorted[sorted.length - 1].value;

  if (
    typeof first !== "number" ||
    typeof latest !== "number"
  ) {
    return null;
  }

  return latest - first;
}

export default function VitalsHistoryPage() {
  const today = getLocalDateInput(new Date());

  const [episodes, setEpisodes] = useState<CareEpisode[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);

  const [selectedEpisodeId, setSelectedEpisodeId] =
    useState("");

  const [selectedVital, setSelectedVital] =
    useState<ObservationType | "ALL">("ALL");

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [error, setError] = useState("");

  // Edit state
  const [editingObservation, setEditingObservation] =
    useState<Observation | null>(null);

  const [editVital, setEditVital] =
    useState<ObservationType>("HEART_RATE");

  const [editValue, setEditValue] = useState("");
  const [editSecondaryValue, setEditSecondaryValue] =
    useState("");

  const [editRecordedAt, setEditRecordedAt] =
    useState("");

  const [editSourceType, setEditSourceType] =
    useState<ObservationSourceType>("MANUAL");

  const [editRecordedBy, setEditRecordedBy] =
    useState("");

  const [editNotes, setEditNotes] =
    useState("");

  const [savingEdit, setSavingEdit] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  async function loadEpisodes() {
    try {
      setLoadingEpisodes(true);

      const response = await fetch("/api/vitals/episodes");

      if (!response.ok) {
        throw new Error("Failed to load care episodes.");
      }

      const data = await response.json();

      const loadedEpisodes: CareEpisode[] =
        Array.isArray(data)
          ? data
          : data.episodes ?? [];

      setEpisodes(loadedEpisodes);

      const activeEpisode = loadedEpisodes.find(
        (episode) =>
          episode.monitoring_status === "ACTIVE"
      );

      if (activeEpisode) {
        setSelectedEpisodeId(activeEpisode.id);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to load care episodes.");
    } finally {
      setLoadingEpisodes(false);
    }
  }

  async function loadObservations() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      params.set("limit", "500");

      if (selectedEpisodeId) {
        params.set(
          "careEpisodeId",
          selectedEpisodeId
        );
      }

      if (selectedVital !== "ALL") {
        params.set(
          "observationType",
          selectedVital
        );
      }

      if (startDate) {
        params.set(
          "startAt",
          getStartOfDay(startDate)
        );
      }

      if (endDate) {
        params.set(
          "endAt",
          getEndOfDay(endDate)
        );
      }

      const response = await fetch(
        `/api/vitals/observations?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to load observations.");
      }

      const data = await response.json();

      const loadedObservations: Observation[] =
        Array.isArray(data)
          ? data
          : data.observations ?? [];

      setObservations(loadedObservations);
    } catch (err) {
      console.error(err);
      setError("Unable to load vital history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEpisodes();
  }, []);

  useEffect(() => {
    if (!loadingEpisodes) {
      loadObservations();
    }
  }, [
    selectedEpisodeId,
    selectedVital,
    startDate,
    endDate,
    loadingEpisodes,
  ]);

  const sortedObservations = useMemo(() => {
    return [...observations].sort(
      (a, b) =>
        new Date(b.recorded_at).getTime() -
        new Date(a.recorded_at).getTime()
    );
  }, [observations]);

  const groupedByVital = useMemo(() => {
    const groups = new Map<string, Observation[]>();

    for (const observation of observations) {
      const existing =
        groups.get(observation.observation_type) ?? [];

      existing.push(observation);

      groups.set(
        observation.observation_type,
        existing
      );
    }

    return groups;
  }, [observations]);

  const summaryCards = useMemo(() => {
    return VITALS.map((vital) => {
      const vitalObservations =
        groupedByVital.get(vital.value) ?? [];

      const sorted = [...vitalObservations].sort(
        (a, b) =>
          new Date(a.recorded_at).getTime() -
          new Date(b.recorded_at).getTime()
      );

      const stats = calculateStats(
        vitalObservations
      );

      const change = calculateChange(
        vitalObservations
      );

      return {
        ...vital,
        observations: vitalObservations,
        latest:
          sorted[sorted.length - 1] ?? null,
        stats,
        change,
      };
    }).filter(
      (item) => item.observations.length > 0
    );
  }, [groupedByVital]);

  function setToday() {
    const date = getLocalDateInput(new Date());

    setStartDate(date);
    setEndDate(date);
  }

  function setLast7Days() {
    const end = new Date();
    const start = new Date();

    start.setDate(start.getDate() - 6);

    setStartDate(getLocalDateInput(start));
    setEndDate(getLocalDateInput(end));
  }

  function setLast30Days() {
    const end = new Date();
    const start = new Date();

    start.setDate(start.getDate() - 29);

    setStartDate(getLocalDateInput(start));
    setEndDate(getLocalDateInput(end));
  }

  function openEdit(observation: Observation) {
    setEditingObservation(observation);

    setEditVital(observation.observation_type as ObservationType);

    setEditValue(
      observation.value !== null
        ? String(observation.value)
        : ""
    );

    setEditSecondaryValue(
      observation.secondary_value !== null
        ? String(observation.secondary_value)
        : ""
    );

    setEditRecordedAt(
      toDateTimeLocal(observation.recorded_at)
    );

    setEditSourceType(
      observation.source_type || "MANUAL"
    );

    setEditRecordedBy(
      observation.recorded_by || ""
    );

    setEditNotes(
      observation.notes || ""
    );

    setError("");
  }

  function closeEdit() {
    if (savingEdit) return;

    setEditingObservation(null);
  }

  async function saveEdit() {
    if (!editingObservation) return;

    const value = Number(editValue);

    if (!Number.isFinite(value)) {
      setError("Please enter a valid value.");
      return;
    }

    let secondaryValue: number | null = null;

    if (editVital === "BLOOD_PRESSURE") {
      secondaryValue = Number(editSecondaryValue);

      if (!Number.isFinite(secondaryValue)) {
        setError(
          "Please enter a valid diastolic value."
        );
        return;
      }

      if (value <= secondaryValue) {
        setError(
          "Systolic blood pressure must be greater than diastolic."
        );
        return;
      }
    }

    if (!editRecordedAt) {
      setError("Please select the date and time.");
      return;
    }

    try {
      setSavingEdit(true);
      setError("");

      const response = await fetch(
        `/api/vitals/observations?observationId=${encodeURIComponent(
          editingObservation.id
        )}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            observation_type: editVital,
            value,
            secondary_value:
              editVital === "BLOOD_PRESSURE"
                ? secondaryValue
                : null,
            unit:
              VITALS.find(
                (vital) => vital.value === editVital
              )?.unit ?? null,
            recorded_at: new Date(
              editRecordedAt
            ).toISOString(),
            source_type: editSourceType,
            recorded_by:
              editRecordedBy.trim() || null,
            notes:
              editNotes.trim() || null,
          }),
        }
      );

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => null);

        throw new Error(
          data?.error ||
            "Failed to update observation."
        );
      }

      const data = await response.json();

      const updatedObservation =
        data.observation ?? data;

      setObservations((current) =>
        current.map((item) =>
          item.id === editingObservation.id
            ? updatedObservation
            : item
        )
      );

      setEditingObservation(null);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update vital."
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteObservation(
    observation: Observation
  ) {
    const confirmed = window.confirm(
      `Delete this ${getVitalLabel(
        observation.observation_type
      )} reading recorded on ${formatDateTime(
        observation.recorded_at
      )}? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(observation.id);
      setError("");

      const response = await fetch(
        `/api/vitals/observations?observationId=${encodeURIComponent(
          observation.id
        )}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => null);

        throw new Error(
          data?.error ||
            "Failed to delete observation."
        );
      }

      setObservations((current) =>
        current.filter(
          (item) => item.id !== observation.id
        )
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete vital."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-full bg-[var(--background)]">
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="space-y-6">
          {/* Header */}
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
  
                <Link
                  href="/dashboard/vitals"
                  className="transition-colors hover:text-[var(--foreground)]"
                >
                  Vitals
                </Link>
  
                <span>/</span>
  
                <span className="text-[var(--foreground-secondary)]">
                  History
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
                      d="M4 12a8 8 0 1 0 2.3-5.7"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M4 5v4h4M12 8v4l2.5 1.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
  
                <div>
                  <h1 className="text-[25px] font-semibold tracking-[-0.025em] text-[var(--foreground)]">
                    Vitals History
                  </h1>
  
                  <p className="mt-0.5 text-sm text-[var(--foreground-secondary)]">
                    Review measurements and understand how your
                    recorded vitals have changed over time.
                  </p>
                </div>
              </div>
            </div>
  
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/vitals"
                className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--foreground-secondary)] shadow-[var(--shadow-card)] transition hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
              >
                Back to Vitals
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
  
          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 rounded-[12px] border border-[var(--critical)]/15 bg-[var(--critical-soft)] px-4 py-3 text-sm text-[var(--critical)]">
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
  
          {/* Filters */}
          <section className="previa-card p-5 sm:p-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[16px] font-semibold text-[var(--foreground)]">
                    Filter history
                  </h2>
  
                  {selectedEpisodeId && (
                    <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-[10px] font-medium text-[var(--primary)]">
                      Episode selected
                    </span>
                  )}
                </div>
  
                <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
                  Narrow the history to a care episode, vital type,
                  or date range.
                </p>
              </div>
  
              <span className="text-xs text-[var(--foreground-muted)]">
                {observations.length}{" "}
                {observations.length === 1
                  ? "reading"
                  : "readings"}
              </span>
            </div>
  
            <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1.2fr_1fr_1fr]">
              <div>
                <label
                  htmlFor="episode"
                  className="mb-1.5 block text-xs font-medium text-[var(--foreground-secondary)]"
                >
                  Care episode
                </label>
  
                <select
                  id="episode"
                  value={selectedEpisodeId}
                  onChange={(e) =>
                    setSelectedEpisodeId(e.target.value)
                  }
                  disabled={loadingEpisodes}
                  className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)] disabled:bg-[var(--surface-muted)]"
                >
                  <option value="">
                    {loadingEpisodes
                      ? "Loading..."
                      : "All care episodes"}
                  </option>
  
                  {episodes.map((episode) => (
                    <option
                      key={episode.id}
                      value={episode.id}
                    >
                      {episode.title}
                      {episode.monitoring_status === "ACTIVE"
                        ? " — Active"
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
  
              <div>
                <label
                  htmlFor="vital"
                  className="mb-1.5 block text-xs font-medium text-[var(--foreground-secondary)]"
                >
                  Vital
                </label>
  
                <select
                  id="vital"
                  value={selectedVital}
                  onChange={(e) =>
                    setSelectedVital(
                      e.target.value as
                        | ObservationType
                        | "ALL"
                    )
                  }
                  className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)]"
                >
                  <option value="ALL">All vitals</option>
  
                  {VITALS.map((vital) => (
                    <option
                      key={vital.value}
                      value={vital.value}
                    >
                      {vital.label}
                    </option>
                  ))}
                </select>
              </div>
  
              <div>
                <label
                  htmlFor="startDate"
                  className="mb-1.5 block text-xs font-medium text-[var(--foreground-secondary)]"
                >
                  From
                </label>
  
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) =>
                    setStartDate(e.target.value)
                  }
                  className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)]"
                />
              </div>
  
              <div>
                <label
                  htmlFor="endDate"
                  className="mb-1.5 block text-xs font-medium text-[var(--foreground-secondary)]"
                >
                  To
                </label>
  
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) =>
                    setEndDate(e.target.value)
                  }
                  className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)]"
                />
              </div>
            </div>
  
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs text-[var(--foreground-muted)]">
                Quick range
              </span>
  
              <button
                type="button"
                onClick={setToday}
                className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
              >
                Today
              </button>
  
              <button
                type="button"
                onClick={setLast7Days}
                className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
              >
                Last 7 days
              </button>
  
              <button
                type="button"
                onClick={setLast30Days}
                className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]"
              >
                Last 30 days
              </button>
            </div>
          </section>
  
          {/* Period summary */}
          <section>
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-[var(--foreground)]">
                  Period summary
                </h2>
  
                <p className="mt-0.5 text-sm text-[var(--foreground-secondary)]">
                  Latest values and basic statistics for the selected
                  period.
                </p>
              </div>
  
              <span className="text-xs text-[var(--foreground-muted)]">
                {startDate === endDate
                  ? startDate
                  : `${startDate} → ${endDate}`}
              </span>
            </div>
  
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-48 animate-pulse rounded-[16px] bg-[var(--surface)]"
                  />
                ))}
              </div>
            ) : summaryCards.length === 0 ? (
              <div className="previa-card border-dashed p-10 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--foreground-muted)]">
                  <svg
                    width="19"
                    height="19"
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
  
                <h3 className="mt-4 text-sm font-semibold text-[var(--foreground)]">
                  No vitals found for this period
                </h3>
  
                <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[var(--foreground-secondary)]">
                  Try another date range or vital type, or record a
                  new measurement.
                </p>
  
                <Link
                  href="/dashboard/vitals/record"
                  className="mt-5 inline-flex h-9 items-center rounded-[9px] bg-[var(--primary)] px-4 text-xs font-medium text-white transition hover:bg-[var(--primary-hover)]"
                >
                  Record a vital
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((item) => {
                  const latestValue = item.latest
                    ? formatValue(item.latest)
                    : "—";
  
                  const previousReading =
                    item.observations.length > 1
                      ? [...item.observations].sort(
                          (a, b) =>
                            new Date(b.recorded_at).getTime() -
                            new Date(a.recorded_at).getTime()
                        )[1]
                      : null;
  
                  return (
                    <article
                      key={item.value}
                      className="previa-card previa-card-interactive overflow-hidden p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--primary-subtle)] text-[10px] font-semibold text-[var(--primary)]">
                              {item.label.slice(0, 3)}
                            </span>
  
                            <h3 className="truncate text-sm font-medium text-[var(--foreground-secondary)]">
                              {item.label}
                            </h3>
                          </div>
  
                          <div className="mt-4 flex items-baseline gap-1.5">
                            <span className="text-[28px] font-semibold tracking-[-0.035em] text-[var(--foreground)]">
                              {latestValue}
                            </span>
  
                            {item.latest?.unit && (
                              <span className="text-xs text-[var(--foreground-muted)]">
                                {item.latest.unit}
                              </span>
                            )}
                          </div>
                        </div>
  
                        {item.change !== null && (
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                              item.change > 0
                                ? "previa-status-attention"
                                : item.change < 0
                                  ? "previa-status-info"
                                  : "previa-status-stable"
                            }`}
                          >
                            {item.change > 0 ? "+" : ""}
                            {item.change.toFixed(1)}
                          </span>
                        )}
                      </div>
  
                      <p className="mt-2 text-[11px] text-[var(--foreground-muted)]">
                        Latest{" "}
                        {item.latest
                          ? formatDateTime(
                              item.latest.recorded_at
                            )
                          : "—"}
                      </p>
  
                      <div className="my-4 h-px bg-[var(--border)]" />
  
                      <div className="grid grid-cols-3 gap-3">
                        <HistoryStat
                          label="Min"
                          value={
                            item.stats.min !== null
                              ? String(item.stats.min)
                              : "—"
                          }
                        />
  
                        <HistoryStat
                          label="Average"
                          value={
                            item.stats.average !== null
                              ? item.stats.average.toFixed(1)
                              : "—"
                          }
                        />
  
                        <HistoryStat
                          label="Max"
                          value={
                            item.stats.max !== null
                              ? String(item.stats.max)
                              : "—"
                          }
                        />
                      </div>
  
                      {previousReading && (
                        <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-[11px]">
                          <span className="text-[var(--foreground-muted)]">
                            Previous
                          </span>
  
                          <span className="font-medium text-[var(--foreground-secondary)]">
                            {formatValue(previousReading)}
                            {previousReading.unit
                              ? ` ${previousReading.unit}`
                              : ""}
                          </span>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
  
          {/* Observation history */}
          <section className="previa-card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="text-[16px] font-semibold text-[var(--foreground)]">
                  Observation history
                </h2>
  
                <p className="mt-0.5 text-sm text-[var(--foreground-secondary)]">
                  Individual measurements recorded during the selected
                  period.
                </p>
              </div>
  
              <span className="text-xs text-[var(--foreground-muted)]">
                {sortedObservations.length}{" "}
                {sortedObservations.length === 1
                  ? "observation"
                  : "observations"}
              </span>
            </div>
  
            {loading ? (
              <div className="px-6 py-12 text-center text-sm text-[var(--foreground-muted)]">
                Loading observations...
              </div>
            ) : sortedObservations.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  No observations found
                </p>
  
                <p className="mt-1 text-xs text-[var(--foreground-secondary)]">
                  No measurements match the current filters.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[900px] text-left">
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
  
                        <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                          Notes
                        </th>
  
                        <th className="px-6 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                          Actions
                        </th>
                      </tr>
                    </thead>
  
                    <tbody className="divide-y divide-[var(--border)]">
                      {sortedObservations.map(
                        (observation) => (
                          <tr
                            key={observation.id}
                            className="transition-colors hover:bg-[var(--surface-subtle)]"
                          >
                            <td className="whitespace-nowrap px-6 py-4">
                              <div className="text-sm font-medium text-[var(--foreground)]">
                                {formatDate(
                                  observation.recorded_at
                                )}
                              </div>
  
                              <div className="mt-0.5 text-[11px] text-[var(--foreground-muted)]">
                                {formatTime(
                                  observation.recorded_at
                                )}
                              </div>
                            </td>
  
                            <td className="whitespace-nowrap px-6 py-4">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--surface-muted)] text-[9px] font-semibold text-[var(--foreground-secondary)]">
                                  {getVitalLabel(
                                    observation.observation_type
                                  ).slice(0, 3)}
                                </span>
  
                                <span className="text-sm font-medium text-[var(--foreground)]">
                                  {getVitalLabel(
                                    observation.observation_type
                                  )}
                                </span>
                              </div>
                            </td>
  
                            <td className="whitespace-nowrap px-6 py-4">
                              <span className="text-sm font-semibold text-[var(--foreground)]">
                                {formatValue(observation)}
                              </span>
  
                              {observation.unit && (
                                <span className="ml-1 text-[11px] text-[var(--foreground-muted)]">
                                  {observation.unit}
                                </span>
                              )}
                            </td>
  
                            <td className="whitespace-nowrap px-6 py-4">
                              <span className="inline-flex rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-medium text-[var(--foreground-secondary)]">
                                {observation.source_type}
                              </span>
                            </td>
  
                            <td className="px-6 py-4 text-sm text-[var(--foreground-secondary)]">
                              {observation.recorded_by || "—"}
                            </td>
  
                            <td className="max-w-[220px] px-6 py-4">
                              <div
                                className="truncate text-sm text-[var(--foreground-secondary)]"
                                title={
                                  observation.notes || undefined
                                }
                              >
                                {observation.notes || "—"}
                              </div>
                            </td>
  
                            <td className="px-6 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEdit(observation)
                                  }
                                  className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
                                >
                                  Edit
                                </button>
  
                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteObservation(
                                      observation
                                    )
                                  }
                                  disabled={
                                    deletingId ===
                                    observation.id
                                  }
                                  className="rounded-[8px] border border-[var(--critical)]/20 bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--critical)] transition hover:bg-[var(--critical-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {deletingId ===
                                  observation.id
                                    ? "Deleting..."
                                    : "Delete"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
  
                {/* Mobile */}
                <div className="divide-y divide-[var(--border)] md:hidden">
                  {sortedObservations.map(
                    (observation) => (
                      <article
                        key={observation.id}
                        className="p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[var(--primary-soft)] text-[9px] font-semibold text-[var(--primary)]">
                                {getVitalLabel(
                                  observation.observation_type
                                ).slice(0, 3)}
                              </span>
  
                              <div className="min-w-0">
                                <h3 className="truncate text-sm font-semibold text-[var(--foreground)]">
                                  {getVitalLabel(
                                    observation.observation_type
                                  )}
                                </h3>
  
                                <p className="mt-0.5 text-[11px] text-[var(--foreground-muted)]">
                                  {formatDateTime(
                                    observation.recorded_at
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
  
                          <div className="shrink-0 text-right">
                            <div className="text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                              {formatValue(observation)}
                            </div>
  
                            {observation.unit && (
                              <div className="text-[10px] text-[var(--foreground-muted)]">
                                {observation.unit}
                              </div>
                            )}
                          </div>
                        </div>
  
                        <div className="mt-4 grid grid-cols-2 gap-3 rounded-[10px] bg-[var(--surface-subtle)] p-3">
                          <div>
                            <div className="text-[10px] text-[var(--foreground-muted)]">
                              Source
                            </div>
  
                            <div className="mt-0.5 text-xs font-medium text-[var(--foreground-secondary)]">
                              {observation.source_type}
                            </div>
                          </div>
  
                          <div>
                            <div className="text-[10px] text-[var(--foreground-muted)]">
                              Recorded by
                            </div>
  
                            <div className="mt-0.5 truncate text-xs font-medium text-[var(--foreground-secondary)]">
                              {observation.recorded_by ||
                                "—"}
                            </div>
                          </div>
                        </div>
  
                        {observation.notes && (
                          <div className="mt-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs leading-5 text-[var(--foreground-secondary)]">
                            {observation.notes}
                          </div>
                        )}
  
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEdit(observation)
                            }
                            className="flex-1 rounded-[9px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--foreground-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
                          >
                            Edit
                          </button>
  
                          <button
                            type="button"
                            onClick={() =>
                              deleteObservation(
                                observation
                              )
                            }
                            disabled={
                              deletingId ===
                              observation.id
                            }
                            className="flex-1 rounded-[9px] border border-[var(--critical)]/20 bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--critical)] transition hover:bg-[var(--critical-soft)] disabled:opacity-50"
                          >
                            {deletingId === observation.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </article>
                    )
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
  
      {/* Edit modal */}
      {editingObservation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,27,24,0.38)] px-4 py-6 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEdit();
            }
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-[620px] flex-col overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_70px_rgba(18,32,28,0.16)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-5 sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[var(--primary-soft)] text-[var(--primary)]">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 12h4l2.2-7 4.1 14 2.3-7H21"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
  
                  <h2 className="text-[17px] font-semibold text-[var(--foreground)]">
                    Edit observation
                  </h2>
                </div>
  
                <p className="mt-2 text-sm text-[var(--foreground-secondary)]">
                  Update the recorded vital while preserving its
                  clinical history.
                </p>
              </div>
  
              <button
                type="button"
                onClick={closeEdit}
                disabled={savingEdit}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--foreground-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] disabled:opacity-50"
              >
                ×
              </button>
            </div>
  
            <div className="overflow-y-auto px-5 py-6 sm:px-6">
              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--foreground-secondary)]">
                    Vital
                  </label>
  
                  <select
                    value={editVital}
                    onChange={(e) =>
                      setEditVital(
                        e.target.value as ObservationType
                      )
                    }
                    className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)]"
                  >
                    {VITALS.map((vital) => (
                      <option
                        key={vital.value}
                        value={vital.value}
                      >
                        {vital.label}
                      </option>
                    ))}
                  </select>
                </div>
  
                <div
                  className={
                    editVital === "BLOOD_PRESSURE"
                      ? "grid gap-4 sm:grid-cols-2"
                      : ""
                  }
                >
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--foreground-secondary)]">
                      {editVital === "BLOOD_PRESSURE"
                        ? "Systolic"
                        : "Value"}
                    </label>
  
                    <input
                      type="number"
                      step="any"
                      value={editValue}
                      onChange={(e) =>
                        setEditValue(e.target.value)
                      }
                      className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)]"
                    />
                  </div>
  
                  {editVital === "BLOOD_PRESSURE" && (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[var(--foreground-secondary)]">
                        Diastolic
                      </label>
  
                      <input
                        type="number"
                        step="any"
                        value={editSecondaryValue}
                        onChange={(e) =>
                          setEditSecondaryValue(
                            e.target.value
                          )
                        }
                        className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)]"
                      />
                    </div>
                  )}
                </div>
  
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--foreground-secondary)]">
                    Date & time
                  </label>
  
                  <input
                    type="datetime-local"
                    value={editRecordedAt}
                    onChange={(e) =>
                      setEditRecordedAt(e.target.value)
                    }
                    className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)]"
                  />
                </div>
  
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--foreground-secondary)]">
                    Source
                  </label>
  
                  <select
                    value={editSourceType}
                    onChange={(e) =>
                      setEditSourceType(
                        e.target.value as ObservationSourceType
                      )
                    }
                    className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)]"
                  >
                    {SOURCE_TYPES.map((source) => (
                      <option
                        key={source.value}
                        value={source.value}
                      >
                        {source.label}
                      </option>
                    ))}
                  </select>
                </div>
  
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--foreground-secondary)]">
                    Recorded by
                  </label>
  
                  <input
                    type="text"
                    value={editRecordedBy}
                    onChange={(e) =>
                      setEditRecordedBy(e.target.value)
                    }
                    placeholder="Optional"
                    className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)]"
                  />
                </div>
  
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--foreground-secondary)]">
                    Notes
                  </label>
  
                  <textarea
                    value={editNotes}
                    onChange={(e) =>
                      setEditNotes(e.target.value)
                    }
                    rows={4}
                    placeholder="Optional clinical or contextual notes"
                    className="w-full resize-none rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)]"
                  />
                </div>
              </div>
            </div>
  
            <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeEdit}
                disabled={savingEdit}
                className="h-10 rounded-[9px] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--foreground-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--foreground)] disabled:opacity-50"
              >
                Cancel
              </button>
  
              <button
                type="button"
                onClick={saveEdit}
                disabled={savingEdit}
                className="h-10 rounded-[9px] bg-[var(--primary)] px-4 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingEdit ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
    );
  }
  
  function HistoryStat({
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