import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  createObservation,
  deleteObservation,
  getObservations,
  updateObservation,
} from "@/lib/vitals/data";
import type { ObservationInput } from "@/lib/vitals/types";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);

    const observationType =
      searchParams.get("observationType") || undefined;

    const careEpisodeId =
      searchParams.get("careEpisodeId") || undefined;

    const startAt =
      searchParams.get("startAt") || undefined;

    const endAt =
      searchParams.get("endAt") || undefined;

    const limitParam =
      searchParams.get("limit");

    const parsedLimit = limitParam
      ? Number(limitParam)
      : undefined;

    const limit =
      parsedLimit && Number.isFinite(parsedLimit)
        ? Math.min(Math.max(parsedLimit, 1), 500)
        : undefined;

    const observations = await getObservations(
      supabaseAdmin,
      userId,
      {
        observationType,
        careEpisodeId,
        startAt,
        endAt,
        limit,
      },
    );

    return NextResponse.json({
      success: true,
      observations,
    });
  } catch (error) {
    console.error(
      "Vitals observations GET error:",
      error,
    );

    return NextResponse.json(
      { error: "Failed to load observations" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body =
      (await req.json()) as ObservationInput;

    const observation = await createObservation(
      supabaseAdmin,
      userId,
      body,
    );

    return NextResponse.json(
      {
        success: true,
        observation,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Vitals observations POST error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to create observation";

    return NextResponse.json(
      { error: message },
      { status: 400 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);

    const observationId =
      searchParams.get("observationId");

    if (!observationId) {
      return NextResponse.json(
        { error: "observationId is required" },
        { status: 400 },
      );
    }

    const updates = await req.json();

    const observation =
      await updateObservation(
        supabaseAdmin,
        userId,
        observationId,
        updates,
      );

    return NextResponse.json({
      success: true,
      observation,
    });
  } catch (error) {
    console.error(
      "Vitals observations PATCH error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update observation";

    return NextResponse.json(
      { error: message },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);

    const observationId =
      searchParams.get("observationId");

    if (!observationId) {
      return NextResponse.json(
        { error: "observationId is required" },
        { status: 400 },
      );
    }

    await deleteObservation(
      supabaseAdmin,
      userId,
      observationId,
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Vitals observations DELETE error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete observation";

    return NextResponse.json(
      { error: message },
      { status: 400 },
    );
  }
}