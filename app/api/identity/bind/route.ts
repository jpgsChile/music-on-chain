import { NextRequest, NextResponse } from "next/server";
import { C_BIND_PROFILE } from "@/lib/c-bind/contract";
import { createCBindEngine } from "@/lib/c-bind/engine";
import { createPrismaCBindStore } from "@/lib/c-bind/prismaStore";
import { parseAuthSubject } from "@/lib/c-bind/authSubject";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "INVALID_SUBJECT" }, { status: 400 });
  }

  const subject = parseAuthSubject(body.authSubject);
  if (!subject.ok) {
    return NextResponse.json(subject, { status: 400 });
  }

  const store = createPrismaCBindStore();
  const engine = createCBindEngine(store);
  const result = await engine.bind({
    authSubject: subject.value,
    actorRef: typeof body.actorRef === "string" ? body.actorRef : "",
    proof: body.proof,
    profileVersion: typeof body.profileVersion === "string" ? body.profileVersion : C_BIND_PROFILE,
    purpose: body.purpose,
  });

  const status = result.ok ? 200 : result.error === "CONFLICT" ? 409 : 400;
  return NextResponse.json(result, { status });
}
