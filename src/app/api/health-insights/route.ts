import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { buildHealthIntelligence } from "@/lib/health-intelligence/engine";
import { loadHealthIntelligenceRecord } from "@/lib/health-intelligence/data";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const record = await loadHealthIntelligenceRecord(userId);
    const intelligence = buildHealthIntelligence(record);

    return NextResponse.json({
      healthIntelligence: intelligence,
    });
  } catch (error) {
    console.error("Health Intelligence API error:", error);

    return NextResponse.json(
      {
        error: "Failed to build Health Intelligence",
      },
      { status: 500 }
    );
  }
}