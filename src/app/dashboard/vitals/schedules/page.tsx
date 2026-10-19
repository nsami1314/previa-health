"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  OBSERVATION_TYPES,
} from "@/lib/vitals/constants";
import type {
  MonitoringSchedule,
  MonitoringScheduleType,
  ObservationType,
} from "@/lib/vitals/types";

type Episode = {
  id: string;
  title: string;
  monitoring_status: "ACTIVE" | "COMPLETED" | "CANCELLED";
};

type ScheduleFormState = {
  observationType: ObservationType;
  scheduleType: MonitoringScheduleType;
  frequencyMinutes: string;
  targetTimes: string;
  startAt: string;
  endAt: string;
  notes: string;
  enabled: boolean;
};

const SCHEDULE_TYPES: Array<
  [MonitoringScheduleType, string]
> = [
  ["INTERVAL", "Every X minutes"],
  ["DAILY", "Daily at specific times"],
];

function getCurrentDateTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);

  return local.toISOString().slice(0, 16);
}

function formatDateTime(dateString: string | null) {
  if (!dateString) return "No end date";

  return new Date(dateString).toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatObservation(type: string) {
  const match = OBSERVATION_TYPES.find(
    (item) => item.value === type
  );

  return match?.label ?? type;
}

function formatFrequency(minutes: number | null) {
  if (!minutes) return "Custom";

  if (minutes % 1440 === 0) {
    const days = minutes / 1440;

    return `Every ${days} day${days === 1 ? "" : "s"}`;
  }

  if (minutes % 60 === 0) {
    const hours = minutes / 60;

    return `Every ${hours} hour${hours === 1 ? "" : "s"}`;
  }

  return `Every ${minutes} minutes`;
}

function formatScheduleSummary(schedule: MonitoringSchedule) {
  if (schedule.schedule_type === "DAILY") {
    const times =
      schedule.target_times?.filter(Boolean).join(", ");

    return `Daily at ${
      times || "configured times"
    }`;
  }

  return formatFrequency(schedule.frequency_minutes);
}

function getStatusStyles(enabled: boolean) {
  return enabled
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-zinc-200 bg-zinc-100 text-zinc-600";
}

const EMPTY_FORM: ScheduleFormState = {
  observationType: "BLOOD_PRESSURE",
  scheduleType: "INTERVAL",
  frequencyMinutes: "240",
  targetTimes: "08:00,20:00",
  startAt: "",
  endAt: "",
  notes: "",
  enabled: true,
};

function getScheduleForm(
  schedule: MonitoringSchedule
): ScheduleFormState {
  return {
    observationType: schedule.observation_type as ObservationType,
    scheduleType: schedule.schedule_type,
    frequencyMinutes:
      schedule.frequency_minutes !== null
        ? String(schedule.frequency_minutes)
        : "",
    targetTimes: Array.isArray(schedule.target_times)
      ? schedule.target_times.join(",")
      : "",
    startAt: schedule.start_at
      ? new Date(schedule.start_at)
          .toISOString()
          .slice(0, 16)
      : "",
    endAt: schedule.end_at
      ? new Date(schedule.end_at)
          .toISOString()
          .slice(0, 16)
      : "",
    notes: schedule.notes ?? "",
    enabled: schedule.enabled,
  };
}

export default function MonitoringSchedulesPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [schedules, setSchedules] = useState<
    MonitoringSchedule[]
  >([]);

  const [selectedEpisode, setSelectedEpisode] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<ScheduleFormState>({
      ...EMPTY_FORM,
    });

  const selectedEpisodeRecord = useMemo(
    () =>
      episodes.find(
        (episode) => episode.id === selectedEpisode
      ),
    [episodes, selectedEpisode]
  );

  const selectedSchedules = useMemo(
    () =>
      schedules.filter(
        (schedule) =>
          schedule.care_episode_id ===
          selectedEpisode
      ),
    [schedules, selectedEpisode]
  );

  const enabledSchedules = useMemo(
    () =>
      selectedSchedules.filter(
        (schedule) => schedule.enabled
      ),
    [selectedSchedules]
  );

  const disabledSchedules = useMemo(
    () =>
      selectedSchedules.filter(
        (schedule) => !schedule.enabled
      ),
    [selectedSchedules]
  );

  async function loadEpisodes() {
    const response = await fetch(
      "/api/vitals/episodes"
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Failed to load episodes."
      );
    }

    const nextEpisodes: Episode[] = Array.isArray(data)
      ? data
      : data.episodes ?? [];

    setEpisodes(nextEpisodes);

    if (
      !selectedEpisode &&
      nextEpisodes.length > 0
    ) {
      setSelectedEpisode(nextEpisodes[0].id);
    }
  }

  async function loadSchedules(
    episodeId?: string
  ) {
    const id =
      episodeId ?? selectedEpisode;

    if (!id) {
      setSchedules([]);
      return;
    }

    const response = await fetch(
      `/api/vitals/schedules?careEpisodeId=${encodeURIComponent(
        id
      )}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Failed to load monitoring schedules."
      );
    }

    setSchedules(
      Array.isArray(data)
        ? data
        : data.schedules ?? []
    );
  }

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      await loadEpisodes();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load monitoring data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedEpisode) return;

    loadSchedules(selectedEpisode).catch((err) => {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load monitoring schedules."
      );
    });
  }, [selectedEpisode]);

  function resetForm() {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
      startAt: "",
    });
  }

  function updateForm<K extends keyof ScheduleFormState>(
    key: K,
    value: ScheduleFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openCreateForm() {
    setError("");
    setSuccess("");

    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
      startAt: getCurrentDateTime(),
    });
  }

  function editSchedule(
    schedule: MonitoringSchedule
  ) {
    setError("");
    setSuccess("");

    setEditingId(schedule.id);
    setForm(getScheduleForm(schedule));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function validateTargetTimes(
    value: string
  ) {
    const times = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (times.length === 0) {
      return "Please enter at least one target time.";
    }

    const invalidTime = times.find(
      (time) =>
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
    );

    if (invalidTime) {
      return `Invalid target time "${invalidTime}". Use HH:MM format.`;
    }

    return null;
  }

  async function saveSchedule(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedEpisode) {
      setError("Please select a care episode.");
      return;
    }

    setError("");
    setSuccess("");

    const parsedFrequency =
      form.frequencyMinutes.trim()
        ? Number(form.frequencyMinutes)
        : null;

    if (
      form.scheduleType === "INTERVAL" &&
      (!parsedFrequency ||
        !Number.isFinite(parsedFrequency) ||
        parsedFrequency <= 0)
    ) {
      setError(
        "Please enter a valid frequency greater than zero."
      );
      return;
    }

    const targetTimeError =
      form.scheduleType === "DAILY"
        ? validateTargetTimes(form.targetTimes)
        : null;

    if (targetTimeError) {
      setError(targetTimeError);
      return;
    }

    if (
      form.startAt &&
      form.endAt &&
      new Date(form.endAt) <=
        new Date(form.startAt)
    ) {
      setError(
        "End time must be later than the start time."
      );
      return;
    }

    try {
      setSaving(true);

      const parsedTargetTimes =
        form.targetTimes
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);

      const payload = {
        care_episode_id: selectedEpisode,
        observation_type:
          form.observationType,
        schedule_type: form.scheduleType,
        frequency_minutes:
          form.scheduleType === "INTERVAL"
            ? parsedFrequency
            : null,
        target_times:
          form.scheduleType === "DAILY"
            ? parsedTargetTimes
            : [],
        start_at: form.startAt
          ? new Date(
              form.startAt
            ).toISOString()
          : new Date().toISOString(),
        end_at: form.endAt
          ? new Date(form.endAt).toISOString()
          : null,
        enabled: form.enabled,
        notes: form.notes.trim() || null,
      };

      const url = editingId
        ? `/api/vitals/schedules?scheduleId=${editingId}`
        : "/api/vitals/schedules";

      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to save monitoring schedule."
        );
      }

      setSuccess(
        editingId
          ? "Monitoring schedule updated successfully."
          : "Monitoring schedule created successfully."
      );

      resetForm();

      await loadSchedules(selectedEpisode);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save monitoring schedule."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleSchedule(
    schedule: MonitoringSchedule
  ) {
    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/vitals/schedules?scheduleId=${schedule.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            enabled: !schedule.enabled,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update schedule."
        );
      }

      setSuccess(
        schedule.enabled
          ? "Monitoring schedule disabled."
          : "Monitoring schedule enabled."
      );

      await loadSchedules(selectedEpisode);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update schedule."
      );
    }
  }

  async function deleteSchedule(
    scheduleId: string
  ) {
    if (
      !window.confirm(
        "Delete this monitoring schedule?"
      )
    ) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/vitals/schedules?scheduleId=${scheduleId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to delete schedule."
        );
      }

      if (editingId === scheduleId) {
        resetForm();
      }

      setSuccess(
        "Monitoring schedule deleted successfully."
      );

      await loadSchedules(selectedEpisode);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete schedule."
      );
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <div className="h-4 w-40 animate-pulse rounded bg-zinc-100" />
            <div className="mt-4 h-8 w-72 animate-pulse rounded bg-zinc-100" />
            <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/vitals"
            className="inline-flex items-center text-sm font-medium text-teal-700 transition hover:text-teal-800"
          >
            ← Back to Vitals & Care
          </Link>

          <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
                Care Management
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                Monitoring Schedules
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                Define when observations should be
                recorded during a care episode. These
                schedules can drive recurring monitoring
                and due tasks across Vitals & Care.
              </p>
            </div>

            {episodes.length > 0 && (
              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              >
                + New Schedule
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        {success && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        {/* No episodes */}
        {episodes.length === 0 ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-xl text-teal-700">
              +
            </div>

            <h2 className="mt-5 text-xl font-semibold text-zinc-900">
              No care episodes yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              Monitoring schedules belong to a care
              episode. Create an episode first, then
              configure the observations and frequency
              for that period of care.
            </p>

            <Link
              href="/dashboard/vitals/episodes"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              Manage Care Episodes
            </Link>
          </section>
        ) : (
          <>
            {/* Episode context */}
            <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Current care episode
                  </p>

                  <label
                    htmlFor="care-episode"
                    className="sr-only"
                  >
                    Care Episode
                  </label>

                  <select
                    id="care-episode"
                    value={selectedEpisode}
                    onChange={(event) => {
                      setSelectedEpisode(
                        event.target.value
                      );
                      resetForm();
                      setError("");
                      setSuccess("");
                    }}
                    className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 lg:max-w-2xl"
                  >
                    {episodes.map((episode) => (
                      <option
                        key={episode.id}
                        value={episode.id}
                      >
                        {episode.title} —{" "}
                        {episode.monitoring_status}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedEpisodeRecord && (
                  <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <div className="h-2 w-2 rounded-full bg-teal-600" />

                    <div>
                      <p className="text-xs text-zinc-500">
                        Episode status
                      </p>
                      <p className="text-sm font-semibold text-zinc-800">
                        {
                          selectedEpisodeRecord.monitoring_status
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Overview */}
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-zinc-500">
                  Total schedules
                </p>

                <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
                  {selectedSchedules.length}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-zinc-500">
                  Enabled
                </p>

                <p className="mt-2 text-3xl font-bold tracking-tight text-teal-700">
                  {enabledSchedules.length}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-zinc-500">
                  Disabled
                </p>

                <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
                  {disabledSchedules.length}
                </p>
              </div>
            </div>

            {/* Create / Edit */}
            <form
              onSubmit={saveSchedule}
              className="mb-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
            >
              <div className="border-b border-zinc-200 px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                      {editingId
                        ? "Update monitoring plan"
                        : "Add monitoring rule"}
                    </p>

                    <h2 className="mt-1 text-xl font-semibold text-zinc-900">
                      {editingId
                        ? "Edit Monitoring Schedule"
                        : "New Monitoring Schedule"}
                    </h2>

                    <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
                      Choose what to monitor, how often
                      it should be recorded, and the
                      period for which the schedule
                      applies.
                    </p>
                  </div>

                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="self-start rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
                    >
                      Cancel edit
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-8 p-5 sm:p-6">
                {/* Observation */}
                <section>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-zinc-900">
                      Observation
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      Select the vital or health measure
                      this schedule should collect.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {OBSERVATION_TYPES.map(
                      (observation) => {
                        const selected =
                          form.observationType ===
                          observation.value;

                        return (
                          <button
                            key={observation.value}
                            type="button"
                            onClick={() =>
                              updateForm(
                                "observationType",
                                observation.value as ObservationType
                              )
                            }
                            className={`rounded-xl border px-4 py-3 text-left transition ${
                              selected
                                ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
                                : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span
                                className={`text-sm font-semibold ${
                                  selected
                                    ? "text-teal-800"
                                    : "text-zinc-800"
                                }`}
                              >
                                {observation.label}
                              </span>

                              {selected && (
                                <span className="text-xs font-bold text-teal-700">
                                  ✓
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                </section>

                <div className="border-t border-zinc-100" />

                {/* Frequency */}
                <section>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-zinc-900">
                      Frequency
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      Define when the observation should
                      be collected.
                    </p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="schedule-type"
                        className="block text-sm font-medium text-zinc-700"
                      >
                        Schedule type
                      </label>

                      <select
                        id="schedule-type"
                        value={form.scheduleType}
                        onChange={(event) =>
                          updateForm(
                            "scheduleType",
                            event.target
                              .value as MonitoringScheduleType
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      >
                        {SCHEDULE_TYPES.map(
                          ([value, label]) => (
                            <option
                              key={value}
                              value={value}
                            >
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {form.scheduleType ===
                      "INTERVAL" && (
                      <div>
                        <label
                          htmlFor="frequency-minutes"
                          className="block text-sm font-medium text-zinc-700"
                        >
                          Frequency
                        </label>

                        <div className="mt-2 flex">
                          <input
                            id="frequency-minutes"
                            type="number"
                            min="1"
                            value={
                              form.frequencyMinutes
                            }
                            onChange={(event) =>
                              updateForm(
                                "frequencyMinutes",
                                event.target.value
                              )
                            }
                            className="min-w-0 flex-1 rounded-l-xl border border-r-0 border-zinc-300 px-3 py-3 text-sm text-zinc-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                          />

                          <div className="flex items-center rounded-r-xl border border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-500">
                            minutes
                          </div>
                        </div>

                        <p className="mt-2 text-xs text-zinc-500">
                          Example: 240 minutes = every
                          4 hours.
                        </p>
                      </div>
                    )}

                    {form.scheduleType ===
                      "DAILY" && (
                      <div>
                        <label
                          htmlFor="target-times"
                          className="block text-sm font-medium text-zinc-700"
                        >
                          Target times
                        </label>

                        <input
                          id="target-times"
                          type="text"
                          value={form.targetTimes}
                          onChange={(event) =>
                            updateForm(
                              "targetTimes",
                              event.target.value
                            )
                          }
                          placeholder="08:00, 20:00"
                          className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                        />

                        <p className="mt-2 text-xs text-zinc-500">
                          Use 24-hour HH:MM format and
                          separate times with commas.
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                <div className="border-t border-zinc-100" />

                {/* Care timeline */}
                <section>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-zinc-900">
                      Care timeline
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      Set the period during which this
                      monitoring rule applies.
                    </p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="start-at"
                        className="block text-sm font-medium text-zinc-700"
                      >
                        Start
                      </label>

                      <input
                        id="start-at"
                        type="datetime-local"
                        value={form.startAt}
                        onChange={(event) =>
                          updateForm(
                            "startAt",
                            event.target.value
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-3 text-sm text-zinc-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="end-at"
                        className="block text-sm font-medium text-zinc-700"
                      >
                        End
                      </label>

                      <input
                        id="end-at"
                        type="datetime-local"
                        value={form.endAt}
                        onChange={(event) =>
                          updateForm(
                            "endAt",
                            event.target.value
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-3 text-sm text-zinc-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      />

                      <p className="mt-2 text-xs text-zinc-500">
                        Leave empty for an open-ended
                        schedule.
                      </p>
                    </div>
                  </div>
                </section>

                <div className="border-t border-zinc-100" />

                {/* Notes and status */}
                <section>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-zinc-900">
                      Instructions
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      Add optional context for yourself,
                      caregivers, or future care workflows.
                    </p>
                  </div>

                  <label
                    htmlFor="schedule-notes"
                    className="block text-sm font-medium text-zinc-700"
                  >
                    Notes
                  </label>

                  <textarea
                    id="schedule-notes"
                    value={form.notes}
                    onChange={(event) =>
                      updateForm(
                        "notes",
                        event.target.value
                      )
                    }
                    rows={3}
                    placeholder="Optional monitoring instructions"
                    className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />

                  <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={(event) =>
                        updateForm(
                          "enabled",
                          event.target.checked
                        )
                      }
                      className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-teal-700 focus:ring-teal-500"
                    />

                    <span>
                      <span className="block text-sm font-semibold text-zinc-800">
                        Schedule enabled
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-zinc-500">
                        Enabled schedules are considered
                        active monitoring rules for this
                        care episode.
                      </span>
                    </span>
                  </label>
                </section>
              </div>

              {/* Form actions */}
              <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 bg-zinc-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-600 transition hover:bg-white hover:text-zinc-900"
                >
                  {editingId
                    ? "Cancel Edit"
                    : "Reset"}
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Create Schedule"}
                </button>
              </div>
            </form>

            {/* Current monitoring plan */}
            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-200 px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                      Monitoring plan
                    </p>

                    <h2 className="mt-1 text-xl font-semibold text-zinc-900">
                      Current Schedules
                    </h2>

                    <p className="mt-1 text-sm text-zinc-500">
                      {selectedSchedules.length} schedule
                      {selectedSchedules.length === 1
                        ? ""
                        : "s"} configured for this
                      episode.
                    </p>
                  </div>

                  {selectedSchedules.length > 0 && (
                    <div className="text-sm text-zinc-500">
                      <span className="font-semibold text-teal-700">
                        {enabledSchedules.length}
                      </span>{" "}
                      enabled
                    </div>
                  )}
                </div>
              </div>

              {selectedSchedules.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-lg text-zinc-500">
                    +
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-zinc-900">
                    No monitoring schedules
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                    Add the first monitoring rule for
                    this care episode to define when
                    observations should be collected.
                  </p>

                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="mt-5 rounded-xl border border-teal-200 bg-white px-4 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
                  >
                    Add First Schedule
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {selectedSchedules.map(
                    (schedule) => (
                      <article
                        key={schedule.id}
                        className="p-5 transition hover:bg-zinc-50/60 sm:p-6"
                      >
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold text-zinc-900">
                                {formatObservation(
                                  schedule.observation_type
                                )}
                              </h3>

                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusStyles(
                                  schedule.enabled
                                )}`}
                              >
                                {schedule.enabled
                                  ? "Enabled"
                                  : "Disabled"}
                              </span>
                            </div>

                            <p className="mt-2 text-sm font-medium text-zinc-800">
                              {formatScheduleSummary(
                                schedule
                              )}
                            </p>

                            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                                  Start
                                </p>

                                <p className="mt-1 text-zinc-600">
                                  {formatDateTime(
                                    schedule.start_at
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                                  End
                                </p>

                                <p className="mt-1 text-zinc-600">
                                  {formatDateTime(
                                    schedule.end_at
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                                  Schedule
                                </p>

                                <p className="mt-1 text-zinc-600">
                                  {schedule.schedule_type ===
                                  "DAILY"
                                    ? "Daily"
                                    : "Interval"}
                                </p>
                              </div>
                            </div>

                            {schedule.notes && (
                              <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                                  Notes
                                </p>

                                <p className="mt-1 text-sm leading-6 text-zinc-600">
                                  {schedule.notes}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                toggleSchedule(
                                  schedule
                                )
                              }
                              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                            >
                              {schedule.enabled
                                ? "Disable"
                                : "Enable"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                editSchedule(
                                  schedule
                                )
                              }
                              className="rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteSchedule(
                                  schedule.id
                                )
                              }
                              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}