import { NextResponse } from "next/server";
import { analyzeHealthOverview } from "@/lib/ai/openai";

export async function POST(req: Request) {
  try {
    const { observations } = await req.json();

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

    const result = await analyzeHealthOverview(observations);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Health overview AI error:", error);

    return NextResponse.json(
      { error: "Failed to generate health overview." },
      { status: 500 }
    );
  }
}