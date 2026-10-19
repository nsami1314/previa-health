import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const VALID_SCHEDULE_TYPES = [
  "INTERVAL",
  "DAILY",
  "WEEKLY",
  "BEFORE_MEAL",
  "AFTER_MEAL",
  "CUSTOM",
];

const VALID_OBSERVATION_TYPES = [
  "BLOOD_PRESSURE",
  "HEART_RATE",
  "SPO2",
  "RESPIRATORY_RATE",
  "TEMPERATURE",
  "BLOOD_GLUCOSE",
  "WEIGHT",
  "PAIN",
];

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const careEpisodeId = url.searchParams.get("careEpisodeId");

    let query = supabaseAdmin
      .from("monitoring_schedules")
      .select("*")
      .eq("user_id", userId)
      .order("start_at", { ascending: true });

    if (careEpisodeId) {
      query = query.eq("care_episode_id", careEpisodeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("GET monitoring schedules error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error(
      "GET monitoring schedules unexpected error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to fetch monitoring schedules" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (!body.care_episode_id) {
      return NextResponse.json(
        { error: "care_episode_id is required" },
        { status: 400 }
      );
    }

    if (!VALID_OBSERVATION_TYPES.includes(body.observation_type)) {
      return NextResponse.json(
        { error: "Invalid observation_type" },
        { status: 400 }
      );
    }

    if (!VALID_SCHEDULE_TYPES.includes(body.schedule_type)) {
      return NextResponse.json(
        { error: "Invalid schedule_type" },
        { status: 400 }
      );
    }

    if (
      body.frequency_minutes !== undefined &&
      body.frequency_minutes !== null &&
      (!Number.isInteger(body.frequency_minutes) ||
        body.frequency_minutes <= 0)
    ) {
      return NextResponse.json(
        { error: "frequency_minutes must be a positive integer" },
        { status: 400 }
      );
    }

    // Verify that the episode belongs to this user.
    const { data: episode, error: episodeError } =
      await supabaseAdmin
        .from("care_episodes")
        .select("id")
        .eq("id", body.care_episode_id)
        .eq("user_id", userId)
        .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: "Care episode not found" },
        { status: 404 }
      );
    }

    const payload = {
      user_id: userId,
      care_episode_id: body.care_episode_id,
      observation_type: body.observation_type,
      frequency_minutes:
        body.frequency_minutes ?? null,
      schedule_type: body.schedule_type,
      target_times: Array.isArray(body.target_times)
        ? body.target_times
        : [],
      enabled: body.enabled ?? true,
      start_at:
        body.start_at ??
        new Date().toISOString(),
      end_at: body.end_at ?? null,
      notes: body.notes ?? null,
    };

    const { data, error } = await supabaseAdmin
      .from("monitoring_schedules")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("POST monitoring schedule error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error(
      "POST monitoring schedule unexpected error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to create monitoring schedule" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const scheduleId = url.searchParams.get("scheduleId");

    if (!scheduleId) {
      return NextResponse.json(
        { error: "scheduleId is required" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.observation_type !== undefined) {
      if (
        !VALID_OBSERVATION_TYPES.includes(
          body.observation_type
        )
      ) {
        return NextResponse.json(
          { error: "Invalid observation_type" },
          { status: 400 }
        );
      }

      updateData.observation_type =
        body.observation_type;
    }

    if (body.frequency_minutes !== undefined) {
      if (
        body.frequency_minutes !== null &&
        (!Number.isInteger(body.frequency_minutes) ||
          body.frequency_minutes <= 0)
      ) {
        return NextResponse.json(
          {
            error:
              "frequency_minutes must be a positive integer",
          },
          { status: 400 }
        );
      }

      updateData.frequency_minutes =
        body.frequency_minutes;
    }

    if (body.schedule_type !== undefined) {
      if (
        !VALID_SCHEDULE_TYPES.includes(
          body.schedule_type
        )
      ) {
        return NextResponse.json(
          { error: "Invalid schedule_type" },
          { status: 400 }
        );
      }

      updateData.schedule_type =
        body.schedule_type;
    }

    if (body.target_times !== undefined) {
      updateData.target_times = Array.isArray(
        body.target_times
      )
        ? body.target_times
        : [];
    }

    if (body.enabled !== undefined) {
      updateData.enabled = Boolean(body.enabled);
    }

    if (body.start_at !== undefined) {
      updateData.start_at = body.start_at;
    }

    if (body.end_at !== undefined) {
      updateData.end_at = body.end_at;
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("monitoring_schedules")
      .update(updateData)
      .eq("id", scheduleId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error(
        "PATCH monitoring schedule error:",
        error
      );

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(
      "PATCH monitoring schedule unexpected error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to update monitoring schedule" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const scheduleId = url.searchParams.get("scheduleId");

    if (!scheduleId) {
      return NextResponse.json(
        { error: "scheduleId is required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("monitoring_schedules")
      .delete()
      .eq("id", scheduleId)
      .eq("user_id", userId);

    if (error) {
      console.error(
        "DELETE monitoring schedule error:",
        error
      );

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE monitoring schedule unexpected error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to delete monitoring schedule" },
      { status: 500 }
    );
  }
}