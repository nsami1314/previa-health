import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("care_episodes")
      .select("*")
      .eq("user_id", userId)
      .order("start_at", { ascending: false });

    if (error) {
      console.error("GET care episodes error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("GET care episodes unexpected error:", error);

    return NextResponse.json(
      { error: "Failed to fetch care episodes" },
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

    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const payload = {
      user_id: userId,
      episode_type: body.episode_type ?? "GENERAL_MONITORING",
      title: body.title.trim(),
      reason: body.reason ?? null,
      start_at: body.start_at ?? new Date().toISOString(),
      end_at: body.end_at ?? null,
      monitoring_status: body.monitoring_status ?? "ACTIVE",
      notes: body.notes ?? null,
    };

    const { data, error } = await supabaseAdmin
      .from("care_episodes")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("POST care episode error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST care episode unexpected error:", error);

    return NextResponse.json(
      { error: "Failed to create care episode" },
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
    const episodeId = url.searchParams.get("episodeId");

    if (!episodeId) {
      return NextResponse.json(
        { error: "episodeId is required" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.episode_type !== undefined) {
      updateData.episode_type = body.episode_type;
    }

    if (body.title !== undefined) {
      updateData.title = body.title;
    }

    if (body.reason !== undefined) {
      updateData.reason = body.reason;
    }

    if (body.start_at !== undefined) {
      updateData.start_at = body.start_at;
    }

    if (body.end_at !== undefined) {
      updateData.end_at = body.end_at;
    }

    if (body.monitoring_status !== undefined) {
      updateData.monitoring_status = body.monitoring_status;
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
      .from("care_episodes")
      .update(updateData)
      .eq("id", episodeId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("PATCH care episode error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH care episode unexpected error:", error);

    return NextResponse.json(
      { error: "Failed to update care episode" },
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
    const episodeId = url.searchParams.get("episodeId");

    if (!episodeId) {
      return NextResponse.json(
        { error: "episodeId is required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("care_episodes")
      .delete()
      .eq("id", episodeId)
      .eq("user_id", userId);

    if (error) {
      console.error("DELETE care episode error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE care episode unexpected error:", error);

    return NextResponse.json(
      { error: "Failed to delete care episode" },
      { status: 500 }
    );
  }
}