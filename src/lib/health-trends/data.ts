import { createSupabaseClient } from "@/lib/supabase";
import type { RawHealthObservation } from "./types";

/**
 * Health Trends — Data Access Layer
 *
 * Responsibilities:
 * - Read existing medical observations from Supabase.
 * - Restrict results to the authenticated user.
 * - Retrieve the complete available history rather than only the latest rows.
 * - Return a database-independent RawHealthObservation[] shape.
 *
 * This module does NOT:
 * - call AI
 * - call OpenAI
 * - extract medical information
 * - modify medical data
 * - calculate trends
 * - normalize metric names or units
 *
 * Data flow:
 *
 * Supabase medical_observations
 *             ↓
 *          data.ts
 *             ↓
 * RawHealthObservation[]
 *             ↓
 *     normalization.ts
 */

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const OBSERVATION_PAGE_SIZE = 1000;

/* -------------------------------------------------------------------------- */
/* Query options                                                              */
/* -------------------------------------------------------------------------- */

export interface HealthTrendDataOptions {
  /**
   * Optional beginning of the observation period.
   *
   * ISO date/time string.
   *
   * When omitted, the complete available history is retrieved.
   */
  startDate?: string;

  /**
   * Optional end of the observation period.
   *
   * ISO date/time string.
   */
  endDate?: string;
}

/* -------------------------------------------------------------------------- */
/* Result type                                                                */
/* -------------------------------------------------------------------------- */

export interface HealthTrendDataResult {
  observations: RawHealthObservation[];

  /**
   * Number of database rows returned before any normalization.
   */
  totalFetched: number;
}

/* -------------------------------------------------------------------------- */
/* Internal database row type                                                 */
/* -------------------------------------------------------------------------- */

interface MedicalObservationRow {
  id: string;
  user_id: string;
  medical_report_id: string | null;
  observation_date: string | null;
  test_name: string | null;
  normalized_name: string | null;
  value: number | string | null;
  unit: string | null;
  reference_range: string | null;
  abnormal_flag: string | null;
}

/* -------------------------------------------------------------------------- */
/* Row conversion                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Convert the database row into the domain-level raw observation.
 *
 * Invalid rows are rejected here rather than passed deeper into the
 * intelligence pipeline.
 */
function toRawHealthObservation(
  row: MedicalObservationRow,
): RawHealthObservation | null {
  if (!row.id) {
    return null;
  }

  if (!row.user_id) {
    return null;
  }

  if (!row.observation_date) {
    return null;
  }

  if (!row.test_name && !row.normalized_name) {
    return null;
  }

  if (row.value === null || row.value === undefined) {
    return null;
  }

  const numericValue =
    typeof row.value === "number"
      ? row.value
      : Number(row.value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return {
    id: row.id,

    user_id: row.user_id,

    medical_report_id: row.medical_report_id,

    observation_date: row.observation_date,

    test_name: row.test_name ?? "",

    normalized_name: row.normalized_name,

    value: numericValue,

    unit: row.unit,

    reference_range: row.reference_range,

    abnormal_flag: row.abnormal_flag,
  };
}

/* -------------------------------------------------------------------------- */
/* Main data access function                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Fetch all usable medical observations belonging to one authenticated user.
 *
 * Authentication is performed by the caller and the supplied Clerk token is
 * used to create the existing Supabase client.
 *
 * The query uses the existing medical_observations table populated by the
 * Medical Reports module.
 */
export async function fetchHealthTrendObservations(
  token: string,
  userId: string,
  options: HealthTrendDataOptions = {},
): Promise<HealthTrendDataResult> {
  if (!token) {
    throw new Error("Authentication token is required.");
  }

  if (!userId) {
    throw new Error("User ID is required.");
  }

  const supabase = createSupabaseClient(token);

  const allObservations: RawHealthObservation[] = [];

  let page = 0;

  while (true) {
    const from = page * OBSERVATION_PAGE_SIZE;
    const to = from + OBSERVATION_PAGE_SIZE - 1;

    let query = supabase
      .from("medical_observations")
      .select(
        [
          "id",
          "user_id",
          "medical_report_id",
          "observation_date",
          "test_name",
          "normalized_name",
          "value",
          "unit",
          "reference_range",
          "abnormal_flag",
        ].join(", "),
      )
      .eq("user_id", userId)
      .order("observation_date", {
        ascending: true,
        nullsFirst: false,
      })
      .range(from, to);

    if (options.startDate) {
      query = query.gte(
        "observation_date",
        options.startDate,
      );
    }

    if (options.endDate) {
      query = query.lte(
        "observation_date",
        options.endDate,
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        "Health Trends medical observations error:",
        error,
      );

      throw new Error(
        "Unable to load medical observations for Health Trends.",
      );
    }

    const rows =
    (data as unknown as MedicalObservationRow[] | null) ?? [];

    for (const row of rows) {
      const observation = toRawHealthObservation(row);

      if (observation) {
        allObservations.push(observation);
      }
    }

    /**
     * If fewer than the page size were returned, there are no more rows.
     */
    if (rows.length < OBSERVATION_PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return {
    observations: allObservations,

    totalFetched: allObservations.length,
  };
}

/* -------------------------------------------------------------------------- */
/* Convenience function                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Fetch all available medical observations for a user.
 *
 * This is the normal entry point for the Health Trends module when the full
 * longitudinal history is required.
 */
export async function getAllHealthTrendObservations(
  token: string,
  userId: string,
): Promise<RawHealthObservation[]> {
  const result = await fetchHealthTrendObservations(
    token,
    userId,
  );

  return result.observations;
}

/* -------------------------------------------------------------------------- */
/* Date-scoped convenience function                                           */
/* -------------------------------------------------------------------------- */

/**
 * Fetch medical observations within a specific period.
 *
 * The actual trend engine can use this later for 1M / 3M / 6M / 1Y views
 * without changing the underlying data-access implementation.
 */
export async function getHealthTrendObservationsForPeriod(
  token: string,
  userId: string,
  startDate: string,
  endDate?: string,
): Promise<RawHealthObservation[]> {
  const result = await fetchHealthTrendObservations(
    token,
    userId,
    {
      startDate,
      endDate,
    },
  );

  return result.observations;
}