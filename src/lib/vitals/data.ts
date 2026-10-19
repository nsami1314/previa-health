import type { SupabaseClient } from "@supabase/supabase-js";
import { validateObservationByType } from "./validation";

import type {
  CareEpisode,
  CareEpisodeInput,
  CareEvent,
  MonitoringSchedule,
  ObservationInput,
  PatientObservation,
} from "./types";

type VitalsDatabaseClient = SupabaseClient;

function requireUserId(userId: string) {
  if (!userId || !userId.trim()) {
    throw new Error("A valid user ID is required.");
  }

  return userId.trim();
}

function validateObservationInput(input: ObservationInput) {
  if (!input.observation_type) {
    throw new Error("Observation type is required.");
  }

  if (!Number.isFinite(input.value)) {
    throw new Error("Observation value must be a valid number.");
  }

  if (!input.unit?.trim()) {
    throw new Error("Observation unit is required.");
  }

  if (
    input.secondary_value !== undefined &&
    input.secondary_value !== null &&
    !Number.isFinite(input.secondary_value)
  ) {
    throw new Error("Secondary observation value must be a valid number.");
  }
}

/* ============================================================
   CARE EPISODES
   ============================================================ */

export async function getCareEpisodes(
  supabase: VitalsDatabaseClient,
  userId: string,
): Promise<CareEpisode[]> {
  const safeUserId = requireUserId(userId);

  const { data, error } = await supabase
    .from("care_episodes")
    .select("*")
    .eq("user_id", safeUserId)
    .order("start_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load care episodes: ${error.message}`);
  }

  return (data ?? []) as CareEpisode[];
}

export async function getActiveCareEpisode(
  supabase: VitalsDatabaseClient,
  userId: string,
): Promise<CareEpisode | null> {
  const safeUserId = requireUserId(userId);

  const { data, error } = await supabase
    .from("care_episodes")
    .select("*")
    .eq("user_id", safeUserId)
    .eq("monitoring_status", "ACTIVE")
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load active care episode: ${error.message}`);
  }

  return data as CareEpisode | null;
}

export async function getCareEpisode(
  supabase: VitalsDatabaseClient,
  userId: string,
  episodeId: string,
): Promise<CareEpisode | null> {
  const safeUserId = requireUserId(userId);

  if (!episodeId) {
    throw new Error("Care episode ID is required.");
  }

  const { data, error } = await supabase
    .from("care_episodes")
    .select("*")
    .eq("id", episodeId)
    .eq("user_id", safeUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load care episode: ${error.message}`);
  }

  return data as CareEpisode | null;
}

export async function createCareEpisode(
  supabase: VitalsDatabaseClient,
  userId: string,
  input: CareEpisodeInput,
): Promise<CareEpisode> {
  const safeUserId = requireUserId(userId);

  if (!input.title?.trim()) {
    throw new Error("Care episode title is required.");
  }

  const { data, error } = await supabase
    .from("care_episodes")
    .insert({
      user_id: safeUserId,
      title: input.title.trim(),
      episode_type: input.episode_type ?? "GENERAL_MONITORING",
      reason: input.reason?.trim() || null,
      start_at: input.start_at ?? new Date().toISOString(),
      end_at: input.end_at ?? null,
      monitoring_status: input.monitoring_status ?? "ACTIVE",
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create care episode: ${error.message}`);
  }

  return data as CareEpisode;
}

export async function updateCareEpisode(
  supabase: VitalsDatabaseClient,
  userId: string,
  episodeId: string,
  updates: Partial<CareEpisodeInput>,
): Promise<CareEpisode> {
  const safeUserId = requireUserId(userId);

  if (!episodeId) {
    throw new Error("Care episode ID is required.");
  }

  const payload: Record<string, unknown> = {};

  if (updates.title !== undefined) {
    if (!updates.title.trim()) {
      throw new Error("Care episode title cannot be empty.");
    }

    payload.title = updates.title.trim();
  }

  if (updates.episode_type !== undefined) {
    payload.episode_type = updates.episode_type;
  }

  if (updates.reason !== undefined) {
    payload.reason = updates.reason?.trim() || null;
  }

  if (updates.start_at !== undefined) {
    payload.start_at = updates.start_at;
  }

  if (updates.end_at !== undefined) {
    payload.end_at = updates.end_at;
  }

  if (updates.monitoring_status !== undefined) {
    payload.monitoring_status = updates.monitoring_status;
  }

  if (updates.notes !== undefined) {
    payload.notes = updates.notes?.trim() || null;
  }

  const { data, error } = await supabase
    .from("care_episodes")
    .update(payload)
    .eq("id", episodeId)
    .eq("user_id", safeUserId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update care episode: ${error.message}`);
  }

  return data as CareEpisode;
}

export async function deleteCareEpisode(
  supabase: VitalsDatabaseClient,
  userId: string,
  episodeId: string,
): Promise<void> {
  const safeUserId = requireUserId(userId);

  if (!episodeId) {
    throw new Error("Care episode ID is required.");
  }

  const { error } = await supabase
    .from("care_episodes")
    .delete()
    .eq("id", episodeId)
    .eq("user_id", safeUserId);

  if (error) {
    throw new Error(`Failed to delete care episode: ${error.message}`);
  }
}

/* ============================================================
   PATIENT OBSERVATIONS
   ============================================================ */

export async function getObservations(
  supabase: VitalsDatabaseClient,
  userId: string,
  options?: {
    observationType?: string;
    careEpisodeId?: string;
    startAt?: string;
    endAt?: string;
    limit?: number;
  },
): Promise<PatientObservation[]> {
  const safeUserId = requireUserId(userId);

  let query = supabase
    .from("patient_observations")
    .select("*")
    .eq("user_id", safeUserId)
    .order("recorded_at", { ascending: false });

  if (options?.observationType) {
    query = query.eq("observation_type", options.observationType);
  }

  if (options?.careEpisodeId) {
    query = query.eq("care_episode_id", options.careEpisodeId);
  }

  if (options?.startAt) {
    query = query.gte("recorded_at", options.startAt);
  }

  if (options?.endAt) {
    query = query.lte("recorded_at", options.endAt);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load observations: ${error.message}`);
  }

  return (data ?? []) as PatientObservation[];
}

export async function getObservation(
  supabase: VitalsDatabaseClient,
  userId: string,
  observationId: string,
): Promise<PatientObservation | null> {
  const safeUserId = requireUserId(userId);

  if (!observationId) {
    throw new Error("Observation ID is required.");
  }

  const { data, error } = await supabase
    .from("patient_observations")
    .select("*")
    .eq("id", observationId)
    .eq("user_id", safeUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load observation: ${error.message}`);
  }

  return data as PatientObservation | null;
}

export async function createObservation(
  supabase: VitalsDatabaseClient,
  userId: string,
  input: ObservationInput,
): Promise<PatientObservation> {
  const safeUserId = requireUserId(userId);

  validateObservationInput(input);

  const typeValidation = validateObservationByType(input);

if (!typeValidation.valid) {
  throw new Error(typeValidation.error);
}

  const { data, error } = await supabase
    .from("patient_observations")
    .insert({
      user_id: safeUserId,
      care_episode_id: input.care_episode_id ?? null,
      observation_type: input.observation_type,
      value: input.value,
      secondary_value: input.secondary_value ?? null,
      unit: input.unit.trim(),
      recorded_at: input.recorded_at ?? new Date().toISOString(),
      source_type: input.source_type ?? "MANUAL",
      source_device_id: input.source_device_id ?? null,
      source_reference: input.source_reference ?? null,
      recorded_by: input.recorded_by ?? null,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create observation: ${error.message}`);
  }

  return data as PatientObservation;
}

export async function updateObservation(
  supabase: VitalsDatabaseClient,
  userId: string,
  observationId: string,
  updates: Partial<ObservationInput>,
): Promise<PatientObservation> {
  const safeUserId = requireUserId(userId);

  if (!observationId) {
    throw new Error("Observation ID is required.");
  }

  if (
    updates.value !== undefined &&
    !Number.isFinite(updates.value)
  ) {
    throw new Error("Observation value must be a valid number.");
  }

  if (
    updates.secondary_value !== undefined &&
    updates.secondary_value !== null &&
    !Number.isFinite(updates.secondary_value)
  ) {
    throw new Error("Secondary observation value must be a valid number.");
  }

  const payload: Record<string, unknown> = {};

  if (updates.observation_type !== undefined) {
    payload.observation_type = updates.observation_type;
  }

  if (updates.value !== undefined) {
    payload.value = updates.value;
  }

  if (updates.secondary_value !== undefined) {
    payload.secondary_value = updates.secondary_value;
  }

  if (updates.unit !== undefined) {
    payload.unit = updates.unit.trim();
  }

  if (updates.recorded_at !== undefined) {
    payload.recorded_at = updates.recorded_at;
  }

  if (updates.source_type !== undefined) {
    payload.source_type = updates.source_type;
  }

  if (updates.source_device_id !== undefined) {
    payload.source_device_id = updates.source_device_id;
  }

  if (updates.source_reference !== undefined) {
    payload.source_reference = updates.source_reference;
  }

  if (updates.recorded_by !== undefined) {
    payload.recorded_by = updates.recorded_by;
  }

  if (updates.notes !== undefined) {
    payload.notes = updates.notes?.trim() || null;
  }

  if (updates.care_episode_id !== undefined) {
    payload.care_episode_id = updates.care_episode_id;
  }

  const { data, error } = await supabase
    .from("patient_observations")
    .update(payload)
    .eq("id", observationId)
    .eq("user_id", safeUserId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update observation: ${error.message}`);
  }

  return data as PatientObservation;
}

export async function deleteObservation(
  supabase: VitalsDatabaseClient,
  userId: string,
  observationId: string,
): Promise<void> {
  const safeUserId = requireUserId(userId);

  if (!observationId) {
    throw new Error("Observation ID is required.");
  }

  const { error } = await supabase
    .from("patient_observations")
    .delete()
    .eq("id", observationId)
    .eq("user_id", safeUserId);

  if (error) {
    throw new Error(`Failed to delete observation: ${error.message}`);
  }
}

/* ============================================================
   MONITORING SCHEDULES
   ============================================================ */

export async function getMonitoringSchedules(
  supabase: VitalsDatabaseClient,
  userId: string,
  careEpisodeId?: string,
): Promise<MonitoringSchedule[]> {
  const safeUserId = requireUserId(userId);

  let query = supabase
    .from("monitoring_schedules")
    .select("*")
    .eq("user_id", safeUserId)
    .order("created_at", { ascending: false });

  if (careEpisodeId) {
    query = query.eq("care_episode_id", careEpisodeId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load monitoring schedules: ${error.message}`);
  }

  return (data ?? []) as MonitoringSchedule[];
}

/* ============================================================
   CARE EVENTS
   ============================================================ */

export async function getCareEvents(
  supabase: VitalsDatabaseClient,
  userId: string,
  options?: {
    careEpisodeId?: string;
    eventType?: string;
    startAt?: string;
    endAt?: string;
    limit?: number;
  },
): Promise<CareEvent[]> {
  const safeUserId = requireUserId(userId);

  let query = supabase
    .from("care_events")
    .select("*")
    .eq("user_id", safeUserId)
    .order("occurred_at", { ascending: false });

  if (options?.careEpisodeId) {
    query = query.eq("care_episode_id", options.careEpisodeId);
  }

  if (options?.eventType) {
    query = query.eq("event_type", options.eventType);
  }

  if (options?.startAt) {
    query = query.gte("occurred_at", options.startAt);
  }

  if (options?.endAt) {
    query = query.lte("occurred_at", options.endAt);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load care events: ${error.message}`);
  }

  return (data ?? []) as CareEvent[];
}