import { NextResponse } from "next/server";
import crypto from "crypto";

import { analyzeHealthOverview } from "@/lib/ai/openai";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const { observations, userId } = await req.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "User ID is required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(observations)) {
      return NextResponse.json(
        { error: "Observations must be an array." },
        { status: 400 }
      );
    }

    if (observations.length === 0) {
      return NextResponse.json(
        { error: "No observations provided." },
        { status: 400 }
      );
    }

    // Create a stable hash of the observations.
    // Same observations = same hash = reusable AI result.
    const observationsHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(observations))
      .digest("hex");

    // Check database cache first.
    const { data: cachedOverview, error: cacheLookupError } =
      await supabaseAdmin
        .from("health_overview_cache")
        .select("summary, key_changes")
        .eq("user_id", userId)
        .eq("observations_hash", observationsHash)
        .maybeSingle();

    if (cacheLookupError) {
      console.error(
        "Health overview cache lookup failed:",
        cacheLookupError
      );
    }

    // If cached result exists, DO NOT call OpenAI.
    if (cachedOverview) {
      console.log("Health overview cache HIT");

      return NextResponse.json({
        summary: cachedOverview.summary,
        keyChanges: cachedOverview.key_changes,
      });
    }

    console.log("Health overview cache MISS - calling OpenAI");

    // No cached result, so generate a new AI result.
    const result = await analyzeHealthOverview(observations);

    const summary = result?.summary || "";
    const keyChanges = result?.keyChanges || [];

    // Save the AI result for future requests.
    const { error: cacheInsertError } = await supabaseAdmin
      .from("health_overview_cache")
      .insert({
        user_id: userId,
        observations_hash: observationsHash,
        summary,
        key_changes: keyChanges,
      });

    if (cacheInsertError) {
      console.error(
        "Health overview cache insert failed:",
        cacheInsertError
      );
    } else {
      console.log("Health overview result cached successfully");
    }

    return NextResponse.json({
      summary,
      keyChanges,
    });
  } catch (error) {
    console.error("Health overview AI error:", error);

    return NextResponse.json(
      { error: "Failed to generate health overview." },
      { status: 500 }
    );
  }
}