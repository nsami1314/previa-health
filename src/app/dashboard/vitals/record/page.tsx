"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

import {
  OBSERVATION_SOURCE_TYPES,
  OBSERVATION_TYPES,
} from "@/lib/vitals/constants";

import type {
  CareEpisode as CareEpisodeRecord,
  ObservationSourceType,
  ObservationType,
} from "@/lib/vitals/types";

type SourceType = ObservationSourceType;

type CareEpisode = Pick<
  CareEpisodeRecord,
  "id" | "title" | "reason" | "monitoring_status"
>;

const VITAL_DESCRIPTIONS: Record<ObservationType, string> = {
  BLOOD_PRESSURE: "Systolic / Diastolic",
  HEART_RATE: "Pulse rate",
  SPO2: "Oxygen saturation",
  RESPIRATORY_RATE: "Breaths per minute",
  TEMPERATURE: "Body temperature",
  BLOOD_GLUCOSE: "Blood sugar",
  WEIGHT: "Body weight",
  PAIN: "Patient-reported pain",
};

const VITALS = OBSERVATION_TYPES.map((vital) => ({
  ...vital,
  type: vital.value,
  description: VITAL_DESCRIPTIONS[vital.value],
}));

const SOURCES = OBSERVATION_SOURCE_TYPES;

function getCurrentDateTime() {
  const now = new Date();

  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);

  return local.toISOString().slice(0, 16);
}

function validateValue(
  observationType: ObservationType,
  value: number,
  secondaryValue?: number
): string | null {
  if (!Number.isFinite(value)) {
    return "Please enter a valid numeric value.";
  }

  switch (observationType) {
    case "BLOOD_PRESSURE":
      if (value < 20 || value > 300) {
        return "Systolic blood pressure must be between 20 and 300.";
      }

      if (
        secondaryValue === undefined ||
        !Number.isFinite(secondaryValue)
      ) {
        return "Please enter diastolic blood pressure.";
      }

      if (secondaryValue < 10 || secondaryValue > 200) {
        return "Diastolic blood pressure must be between 10 and 200.";
      }

      if (value <= secondaryValue) {
        return "Systolic blood pressure must be greater than diastolic.";
      }

      break;

    case "HEART_RATE":
      if (value < 1 || value > 300) {
        return "Heart rate must be between 1 and 300 bpm.";
      }
      break;

    case "SPO2":
      if (value < 0 || value > 100) {
        return "SpO₂ must be between 0 and 100%.";
      }
      break;

    case "RESPIRATORY_RATE":
      if (value < 1 || value > 100) {
        return "Respiratory rate must be between 1 and 100.";
      }
      break;

    case "TEMPERATURE":
      if (value < 25 || value > 45) {
        return "Temperature must be between 25°C and 45°C.";
      }
      break;

    case "BLOOD_GLUCOSE":
      if (value < 1 || value > 1000) {
        return "Blood glucose must be between 1 and 1000 mg/dL.";
      }
      break;

    case "WEIGHT":
      if (value <= 0 || value > 500) {
        return "Weight must be greater than 0 and no more than 500 kg.";
      }
      break;

    case "PAIN":
      if (value < 0 || value > 10) {
        return "Pain score must be between 0 and 10.";
      }
      break;
  }

  return null;
}

export default function RecordVitalsPage() {
  const [episodes, setEpisodes] = useState<CareEpisode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);

  const [observationType, setObservationType] =
    useState<ObservationType>("BLOOD_PRESSURE");

  const [value, setValue] = useState("");
  const [secondaryValue, setSecondaryValue] = useState("");

  const [unit, setUnit] = useState("mmHg");
  const [recordedAt, setRecordedAt] = useState(getCurrentDateTime());

  const [sourceType, setSourceType] = useState<SourceType>("MANUAL");
  const [careEpisodeId, setCareEpisodeId] = useState("");

  const [recordedBy, setRecordedBy] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadEpisodes() {
      try {
        setLoadingEpisodes(true);
        setErrorMessage("");

        const response = await fetch("/api/vitals/episodes", {
          cache: "no-store",
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);

          throw new Error(
            data?.error || "Failed to load care episodes."
          );
        }

        const data = await response.json();

        /*
         * The current episodes API returns the array directly.
         * Keep support for { episodes: [...] } as a fallback.
         */
        const loadedEpisodes: CareEpisode[] = Array.isArray(data)
          ? data
          : data.episodes ?? [];

        setEpisodes(loadedEpisodes);

        /*
         * Automatically select the first ACTIVE episode.
         * This ensures a new vital is associated with the
         * current care episode instead of being saved with NULL.
         */
        const activeEpisode = loadedEpisodes.find(
          (episode) => episode.monitoring_status === "ACTIVE"
        );

        if (activeEpisode) {
          setCareEpisodeId(activeEpisode.id);
        } else {
          setCareEpisodeId("");
        }
      } catch (error) {
        console.error(error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load care episodes."
        );
      } finally {
        setLoadingEpisodes(false);
      }
    }

    loadEpisodes();
  }, []);

  useEffect(() => {
    const vital = VITALS.find(
      (item) => item.type === observationType
    );

    if (vital) {
      setUnit(vital.unit);
    }

    setValue("");
    setSecondaryValue("");
    setErrorMessage("");
    setSuccessMessage("");
  }, [observationType]);

  const selectedVital = VITALS.find(
    (item) => item.type === observationType
  );

  const selectedEpisode = episodes.find(
    (episode) => episode.id === careEpisodeId
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const numericValue = Number(value);

    const numericSecondaryValue =
      observationType === "BLOOD_PRESSURE" &&
      secondaryValue.trim() !== ""
        ? Number(secondaryValue)
        : undefined;

    if (value.trim() === "") {
      setErrorMessage("Please enter the measurement.");
      return;
    }

    const validationError = validateValue(
      observationType,
      numericValue,
      numericSecondaryValue
    );

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (!recordedAt) {
      setErrorMessage("Please select the date and time.");
      return;
    }

    /*
     * A care episode is important for monitoring context.
     * Don't silently create an unattached observation when
     * an ACTIVE episode exists.
     */
    if (!careEpisodeId && episodes.some(
      (episode) => episode.monitoring_status === "ACTIVE"
    )) {
      setErrorMessage(
        "Please select a care episode before recording this vital."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        care_episode_id: careEpisodeId || null,
        observation_type: observationType,
        value: numericValue,
        secondary_value: numericSecondaryValue ?? null,
        unit,
        recorded_at: new Date(recordedAt).toISOString(),
        source_type: sourceType,
        recorded_by: recordedBy.trim() || null,
        notes: notes.trim() || null,
      };

      const response = await fetch("/api/vitals/observations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to save vital observation."
        );
      }

      setSuccessMessage(
        `${selectedVital?.label ?? "Vital"} recorded successfully${
          selectedEpisode
            ? ` for ${selectedEpisode.title}`
            : ""
        }.`
      );

      setValue("");
      setSecondaryValue("");
      setRecordedAt(getCurrentDateTime());
      setNotes("");
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save vital observation."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleClear() {
    setValue("");
    setSecondaryValue("");
    setRecordedAt(getCurrentDateTime());
    setRecordedBy("");
    setNotes("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/vitals"
            className="mb-4 inline-flex items-center text-sm font-medium text-teal-700 hover:text-teal-800"
          >
            ← Back to Vitals & Care
          </Link>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
              Record Vitals
            </h1>

            <p className="mt-2 text-sm text-zinc-600">
              Record a patient measurement or observation with
              its source and care episode.
            </p>
          </div>
        </div>

        {/* Status messages */}
        {successMessage && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vital selection */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-zinc-900">
                Select Vital
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Choose the measurement you want to record.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {VITALS.map((vital) => {
                const selected =
                  observationType === vital.type;

                return (
                  <button
                    key={vital.type}
                    type="button"
                    onClick={() =>
                      setObservationType(vital.type)
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <div
                      className={`text-sm font-semibold ${
                        selected
                          ? "text-teal-800"
                          : "text-zinc-900"
                      }`}
                    >
                      {vital.label}
                    </div>

                    <div className="mt-1 text-xs text-zinc-500">
                      {vital.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Measurement */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-zinc-900">
                Measurement
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Enter the recorded value.
              </p>
            </div>

            {observationType === "BLOOD_PRESSURE" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="systolic"
                    className="mb-2 block text-sm font-medium text-zinc-700"
                  >
                    Systolic
                  </label>

                  <div className="relative">
                    <input
                      id="systolic"
                      type="number"
                      inputMode="decimal"
                      value={value}
                      onChange={(e) =>
                        setValue(e.target.value)
                      }
                      placeholder="128"
                      className="w-full rounded-xl border border-zinc-300 px-4 py-3 pr-20 text-zinc-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    />

                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                      mmHg
                    </span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="diastolic"
                    className="mb-2 block text-sm font-medium text-zinc-700"
                  >
                    Diastolic
                  </label>

                  <div className="relative">
                    <input
                      id="diastolic"
                      type="number"
                      inputMode="decimal"
                      value={secondaryValue}
                      onChange={(e) =>
                        setSecondaryValue(e.target.value)
                      }
                      placeholder="78"
                      className="w-full rounded-xl border border-zinc-300 px-4 py-3 pr-20 text-zinc-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    />

                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                      mmHg
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="value"
                    className="mb-2 block text-sm font-medium text-zinc-700"
                  >
                    {selectedVital?.label ?? "Value"}
                  </label>

                  <input
                    id="value"
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) =>
                      setValue(e.target.value)
                    }
                    placeholder="Enter value"
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-zinc-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="unit"
                    className="mb-2 block text-sm font-medium text-zinc-700"
                  >
                    Unit
                  </label>

                  <input
                    id="unit"
                    value={unit}
                    onChange={(e) =>
                      setUnit(e.target.value)
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-zinc-700 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Context */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-zinc-900">
                Observation Details
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Add timing, source, and care context.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="recordedAt"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Date & Time
                </label>

                <input
                  id="recordedAt"
                  type="datetime-local"
                  value={recordedAt}
                  onChange={(e) =>
                    setRecordedAt(e.target.value)
                  }
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-zinc-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div>
                <label
                  htmlFor="sourceType"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Source
                </label>

                <select
                  id="sourceType"
                  value={sourceType}
                  onChange={(e) =>
                    setSourceType(
                      e.target.value as SourceType
                    )
                  }
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                >
                  {SOURCES.map((source) => (
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
                <label
                  htmlFor="careEpisode"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Care Episode
                </label>

                <select
                  id="careEpisode"
                  value={careEpisodeId}
                  onChange={(e) =>
                    setCareEpisodeId(e.target.value)
                  }
                  disabled={loadingEpisodes}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-zinc-100"
                >
                  <option value="">
                    {loadingEpisodes
                      ? "Loading episodes..."
                      : episodes.length === 0
                        ? "No care episodes"
                        : "No care episode"}
                  </option>

                  {episodes.map((episode) => (
                    <option
                      key={episode.id}
                      value={episode.id}
                    >
                      {episode.title}
                      {episode.monitoring_status === "ACTIVE"
                        ? " — Active"
                        : ` — ${episode.monitoring_status}`}
                    </option>
                  ))}
                </select>

                {selectedEpisode && (
                  <p className="mt-2 text-xs text-emerald-700">
                    This vital will be linked to{" "}
                    <span className="font-semibold">
                      {selectedEpisode.title}
                    </span>
                    .
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="recordedBy"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Recorded By
                </label>

                <input
                  id="recordedBy"
                  type="text"
                  value={recordedBy}
                  onChange={(e) =>
                    setRecordedBy(e.target.value)
                  }
                  placeholder="Name of person recording"
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-zinc-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="notes"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Notes
                </label>

                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) =>
                    setNotes(e.target.value)
                  }
                  rows={4}
                  placeholder="Optional clinical or care notes..."
                  className="w-full resize-none rounded-xl border border-zinc-300 px-4 py-3 text-zinc-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClear}
              disabled={saving}
              className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear
            </button>

            <button
              type="submit"
              disabled={saving || loadingEpisodes}
              className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Record Vital"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}