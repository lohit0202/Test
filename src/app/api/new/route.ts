import { NextResponse } from "next/server";
import { newGame } from "@/lib/game";

export const runtime = "nodejs";

export async function POST() {
  const state = newGame();
  return NextResponse.json(state);
}
