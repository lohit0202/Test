import { NextResponse } from "next/server";
import { getState } from "@/lib/game";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getState());
}
