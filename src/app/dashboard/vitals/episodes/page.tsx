"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type {
  CareEpisode,
  CareEpisodeStatus,
} from "@/lib/vitals/types";

type EpisodeForm = {
  title: string;
  reason: string;
  start_at: string;
  end_at: string;
  notes: string;
};

function getCurrentDateTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);

  return local.toISOString().slice(0, 16);
}

function formatDate(dateString: string | null) {
  if (!dateString) return "—";

  return new Date(dateString).toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateString: string | null) {
  if (!dateString) return "—";

  return new Date(dateString).toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const EMPTY_FORM: EpisodeForm = {
  title: "",
  reason: "",
  start_at: getCurrentDateTime(),
  end_at: "",
  notes: "",
};

export default function CareEpisodesPage() {
  const [episodes, setEpisodes] = useState<CareEpisode[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingEpisodeId, setEditingEpisodeId] =
    useState<string | null>(null);

  const [form, setForm] = useState<EpisodeForm>(EMPTY_FORM);

  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadEpisodes() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/vitals/episodes");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load care episodes."
        );
      }

      setEpisodes(
        Array.isArray(data)
          ? data
          : data.episodes ?? []
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load care episodes."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEpisodes();
  }, []);

  function openCreateForm() {
    setEditingEpisodeId(null);

    setForm({
      ...EMPTY_FORM,
      start_at: getCurrentDateTime(),
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(episode: CareEpisode) {
    setEditingEpisodeId(episode.id);

    const startDate = new Date(episode.start_at);
    const endDate = episode.end_at
      ? new Date(episode.end_at)
      : null;

    const toInputDateTime = (date: Date | null) => {
      if (!date) return "";

      const offset = date.getTimezoneOffset();
      const local = new Date(
        date.getTime() - offset * 60 * 1000
      );

      return local.toISOString().slice(0, 16);
    };

    setForm({
      title: episode.title,
      reason: episode.reason ?? "",
      start_at: toInputDateTime(startDate),
      end_at: toInputDateTime(endDate),
      notes: episode.notes ?? "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingEpisodeId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Please enter a care episode title.");
      return;
    }

    if (!form.start_at) {
      setError("Please select a start date and time.");
      return;
    }

    if (
      form.end_at &&
      new Date(form.end_at).getTime() <
        new Date(form.start_at).getTime()
    ) {
      setError(
        "The end date and time cannot be earlier than the start."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title: form.title.trim(),
        reason: form.reason.trim() || null,
        start_at: new Date(form.start_at).toISOString(),
        end_at: form.end_at
          ? new Date(form.end_at).toISOString()
          : null,
        notes: form.notes.trim() || null,
      };

      const response = await fetch(
        editingEpisodeId
          ? `/api/vitals/episodes?episodeId=${editingEpisodeId}`
          : "/api/vitals/episodes",
        {
          method: editingEpisodeId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Failed to ${
              editingEpisodeId ? "update" : "create"
            } care episode.`
        );
      }

      setSuccess(
        editingEpisodeId
          ? "Care episode updated successfully."
          : "Care episode created successfully."
      );

      setShowForm(false);
      setEditingEpisodeId(null);
      setForm(EMPTY_FORM);

      await loadEpisodes();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save care episode."
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(
    episode: CareEpisode,
    status: CareEpisodeStatus
  ) {
    setError("");
    setSuccess("");

    try {
      setActionId(episode.id);

      const response = await fetch(
        `/api/vitals/episodes?episodeId=${episode.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            monitoring_status: status,
            end_at:
              status === "ACTIVE"
                ? null
                : episode.end_at ||
                  new Date().toISOString(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update episode."
        );
      }

      setSuccess(
        status === "COMPLETED"
          ? "Care episode completed."
          : status === "CANCELLED"
            ? "Care episode cancelled."
            : "Care episode activated."
      );

      await loadEpisodes();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update care episode."
      );
    } finally {
      setActionId(null);
    }
  }

  async function deleteEpisode(episode: CareEpisode) {
    const confirmed = window.confirm(
      `Delete "${episode.title}"?\n\nThis will also remove monitoring schedules linked to this episode.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      setActionId(episode.id);

      const response = await fetch(
        `/api/vitals/episodes?episodeId=${episode.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to delete episode."
        );
      }

      setSuccess("Care episode deleted successfully.");

      await loadEpisodes();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete care episode."
      );
    } finally {
      setActionId(null);
    }
  }

  const activeEpisodes = episodes.filter(
    (episode) => episode.monitoring_status === "ACTIVE"
  );

  const closedEpisodes = episodes.filter(
    (episode) => episode.monitoring_status !== "ACTIVE"
  );

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/vitals"
            className="mb-4 inline-flex items-center text-sm font-medium text-teal-700 hover:text-teal-800"
          >
            ← Back to Vitals & Care
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                Care Episodes
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                Create and manage patient monitoring periods such
                as home recovery, post-operative monitoring,
                chronic care, or hospital observation.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
            >
              + New Care Episode
            </button>
          </div>
        </div>

        {/* Messages */}
        {success && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Quick stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">
              Total Episodes
            </div>

            <div className="mt-2 text-3xl font-bold text-zinc-900">
              {episodes.length}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">
              Active Episodes
            </div>

            <div className="mt-2 text-3xl font-bold text-teal-700">
              {activeEpisodes.length}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">
              Completed / Cancelled
            </div>

            <div className="mt-2 text-3xl font-bold text-zinc-900">
              {
                episodes.filter(
                  (episode) =>
                    episode.monitoring_status !== "ACTIVE"
                ).length
              }
            </div>
          </div>
        </div>

        {/* Create/Edit form */}
        {showForm && (
          <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">
                  {editingEpisodeId
                    ? "Edit Care Episode"
                    : "Create Care Episode"}
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Define the monitoring period. Monitoring
                  schedules will be configured separately.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="text-sm font-medium text-zinc-500 hover:text-zinc-800"
              >
                Cancel
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="title"
                    className="mb-2 block text-sm font-medium text-zinc-700"
                  >
                    Episode Title *
                  </label>

                  <input
                    id="title"
                    type="text"
                    value={form.title}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        title: e.target.value,
                      }))
                    }
                    placeholder="e.g. Post-operative monitoring"
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reason"
                    className="mb-2 block text-sm font-medium text-zinc-700"
                  >
                    Reason
                  </label>

                  <input
                    id="reason"
                    type="text"
                    value={form.reason}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        reason: e.target.value,
                      }))
                    }
                    placeholder="e.g. Recovery after surgery"
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="start_at"
                    className="mb-2 block text-sm font-medium text-zinc-700"
                  >
                    Start Date & Time *
                  </label>

                  <input
                    id="start_at"
                    type="datetime-local"
                    value={form.start_at}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        start_at: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="end_at"
                    className="mb-2 block text-sm font-medium text-zinc-700"
                  >
                    End Date & Time
                  </label>

                  <input
                    id="end_at"
                    type="datetime-local"
                    value={form.end_at}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        end_at: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
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
                    rows={4}
                    value={form.notes}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Optional care or monitoring notes..."
                    className="w-full resize-none rounded-xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingEpisodeId
                      ? "Save Changes"
                      : "Create Episode"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Episode list */}
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-5 py-5 sm:px-6">
            <h2 className="text-lg font-semibold text-zinc-900">
              Monitoring Episodes
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Each episode can later have its own monitoring
              schedule and care workflow.
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Loading care episodes...
            </div>
          ) : episodes.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-lg font-semibold text-zinc-800">
                No care episodes yet
              </div>

              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                Create a care episode to organize vitals,
                monitoring schedules, and care events around a
                specific period of care.
              </p>

              <button
                type="button"
                onClick={openCreateForm}
                className="mt-5 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Create First Episode
              </button>
            </div>
          ) : (
            <div>
              {/* Active care */}
              {activeEpisodes.length > 0 && (
                <div>
                  <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3 sm:px-6">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">
                        Active Care
                      </h3>
                      <span className="text-xs text-zinc-400">
                        {activeEpisodes.length}
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-zinc-100">
                    {activeEpisodes.map((episode) => (
                      <div
                        key={episode.id}
                        className="p-5 transition-colors hover:bg-zinc-50/70 sm:p-6"
                      >
                        <div className="flex flex-col gap-6">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2.5">
                                <h3 className="text-base font-semibold tracking-tight text-zinc-950 sm:text-lg">
                                  {episode.title}
                                </h3>

                                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-emerald-700">
                                  <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  ACTIVE
                                </span>
                              </div>

                              {episode.reason && (
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                                  {episode.reason}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid gap-4 border-y border-zinc-100 py-4 sm:grid-cols-3">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                                Started
                              </div>
                              <div className="mt-1.5 text-sm font-medium text-zinc-800">
                                {formatDateTime(episode.start_at)}
                              </div>
                            </div>

                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                                Ended
                              </div>
                              <div className="mt-1.5 text-sm font-medium text-zinc-800">
                                {formatDateTime(episode.end_at)}
                              </div>
                            </div>

                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                                Created
                              </div>
                              <div className="mt-1.5 text-sm font-medium text-zinc-800">
                                {formatDate(episode.created_at)}
                              </div>
                            </div>
                          </div>

                          {episode.notes && (
                            <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3">
                              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                                Notes
                              </div>
                              <p className="text-sm leading-6 text-zinc-600">
                                {episode.notes}
                              </p>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => openEditForm(episode)} disabled={actionId === episode.id} className="rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50">
                              Edit
                            </button>
                            <button type="button" onClick={() => updateStatus(episode, "COMPLETED")} disabled={actionId === episode.id} className="rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50">
                              Complete
                            </button>
                            <button type="button" onClick={() => updateStatus(episode, "CANCELLED")} disabled={actionId === episode.id} className="rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50">
                              Cancel
                            </button>
                            <button type="button" onClick={() => deleteEpisode(episode)} disabled={actionId === episode.id} className="rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50">
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Episode history */}
              {closedEpisodes.length > 0 && (
                <div className={activeEpisodes.length > 0 ? "border-t border-zinc-200" : ""}>
                  <div className="border-b border-zinc-100 bg-zinc-50/40 px-5 py-3 sm:px-6">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                        Episode History
                      </h3>
                      <span className="text-xs text-zinc-400">
                        {closedEpisodes.length}
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-zinc-100">
                    {closedEpisodes.map((episode) => (
                      <div
                        key={episode.id}
                        className="p-5 transition-colors hover:bg-zinc-50/70 sm:p-6"
                      >
                        <div className="flex flex-col gap-6">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2.5">
                                <h3 className="text-base font-semibold tracking-tight text-zinc-900 sm:text-lg">
                                  {episode.title}
                                </h3>

                                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${episode.monitoring_status === "COMPLETED" ? "border-zinc-200 bg-zinc-50 text-zinc-600" : "border-red-200 bg-red-50 text-red-700"}`}>
                                  <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${episode.monitoring_status === "COMPLETED" ? "bg-zinc-400" : "bg-red-500"}`} />
                                  {episode.monitoring_status}
                                </span>
                              </div>

                              {episode.reason && (
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                                  {episode.reason}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid gap-4 border-y border-zinc-100 py-4 sm:grid-cols-3">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                                Started
                              </div>
                              <div className="mt-1.5 text-sm font-medium text-zinc-800">
                                {formatDateTime(episode.start_at)}
                              </div>
                            </div>

                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                                Ended
                              </div>
                              <div className="mt-1.5 text-sm font-medium text-zinc-800">
                                {formatDateTime(episode.end_at)}
                              </div>
                            </div>

                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                                Created
                              </div>
                              <div className="mt-1.5 text-sm font-medium text-zinc-800">
                                {formatDate(episode.created_at)}
                              </div>
                            </div>
                          </div>

                          {episode.notes && (
                            <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3">
                              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                                Notes
                              </div>
                              <p className="text-sm leading-6 text-zinc-600">
                                {episode.notes}
                              </p>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => openEditForm(episode)} disabled={actionId === episode.id} className="rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50">
                              Edit
                            </button>
                            <button type="button" onClick={() => updateStatus(episode, "ACTIVE")} disabled={actionId === episode.id} className="rounded-lg border border-emerald-200 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50">
                              Activate
                            </button>
                            <button type="button" onClick={() => deleteEpisode(episode)} disabled={actionId === episode.id} className="rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50">
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}