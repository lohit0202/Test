import { NextResponse } from "next/server";
import { getState, step } from "@/lib/game";

export const runtime = "nodejs";

const MIN_DURATION_MS = 10_000;

export async function POST() {
  const start = Date.now();
  let response: NextResponse;

  try {
    const side = getState().toMove;
    const requiredKey = side === "w" ? "OPENAI_API_KEY" : "GEMINI_API_KEY";
    if (!process.env[requiredKey]) {
      response = NextResponse.json(
        { error: `Missing ${requiredKey} environment variable.` },
        { status: 500 },
      );
    } else {
      const state = await step();
      response = NextResponse.json(state);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    response = NextResponse.json({ error: message }, { status: 500 });
  }

  const elapsed = Date.now() - start;
  const remaining = Math.max(0, MIN_DURATION_MS - elapsed);
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }

  return response;
}
