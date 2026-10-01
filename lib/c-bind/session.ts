import { C_BIND_PROFILE } from "./contract";
import { createCBindEngine } from "./engine";
import { isIdentityBindingOccupied } from "./prismaStore";
import { provisionMocActor } from "./store";
import type { CBindStore } from "./store";
import type { AuthSubject, BindingView, CBindProof, CBindResult } from "./types";

/**
 * MOC session composition: Provision Actor (if needed), then Bind.
 * Bind itself never creates an Actor.
 */
export async function provisionThenBind(
  store: CBindStore,
  input: {
    authSubject: AuthSubject;
    proof: CBindProof;
    profileVersion?: string;
  }
): Promise<CBindResult<BindingView>> {
  const engine = createCBindEngine(store);
  const profileVersion = input.profileVersion ?? C_BIND_PROFILE;

  const existing = await store.getByAuthSubject(input.authSubject.issuer, input.authSubject.subject);
  const actorRef = existing ? existing.actorRef : await provisionMocActor(store);

  try {
    return await engine.bind({
      authSubject: input.authSubject,
      actorRef,
      proof: input.proof,
      profileVersion,
    });
  } catch (error) {
    if (!isIdentityBindingOccupied(error)) throw error;
    const winner = await store.getByAuthSubject(input.authSubject.issuer, input.authSubject.subject);
    if (!winner) throw error;
    return engine.bind({
      authSubject: input.authSubject,
      actorRef: winner.actorRef,
      proof: input.proof,
      profileVersion,
    });
  }
}
