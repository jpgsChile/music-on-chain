import { NextRequest, NextResponse } from "next/server";
import { C_BIND_PROFILE } from "@/lib/c-bind/contract";
import { createCBindEngine } from "@/lib/c-bind/engine";
import { createPrismaCBindStore } from "@/lib/c-bind/prismaStore";

export async function GET(request: NextRequest) {
  const actorRef = request.nextUrl.searchParams.get("actorRef") ?? "";
  const profileVersion = request.nextUrl.searchParams.get("profileVersion") ?? C_BIND_PROFILE;

  const store = createPrismaCBindStore();
  const engine = createCBindEngine(store);
  const result = await engine.resolve({ actorRef, profileVersion });

  const status = result.ok ? 200 : result.error === "NOT_FOUND" ? 404 : 400;
  return NextResponse.json(result, { status });
}
