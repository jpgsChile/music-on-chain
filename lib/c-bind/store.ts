import { randomUUID } from "node:crypto";
import { looksLikeEvmAddress } from "./fromPrivy";
import type { StoredBinding } from "./types";

export interface CBindStore {
  hasActor(actorRef: string): Promise<boolean>;
  addActor(actorRef: string): Promise<void>;
  listActors(): Promise<string[]>;
  getByAuthSubject(issuer: string, subject: string): Promise<StoredBinding | null>;
  getVigenteByActorRef(actorRef: string): Promise<StoredBinding | null>;
  getBindingForActorRef(actorRef: string): Promise<StoredBinding | null>;
  putBinding(binding: StoredBinding): Promise<void>;
}

export function createMemoryStore(seed?: {
  actors?: string[];
  bindings?: StoredBinding[];
}): CBindStore {
  const actors = new Set(seed?.actors ?? []);
  const bySubject = new Map<string, StoredBinding>();

  for (const binding of seed?.bindings ?? []) {
    bySubject.set(`${binding.issuer}\u0000${binding.subject}`, { ...binding });
  }

  return {
    async hasActor(actorRef) {
      return actors.has(actorRef);
    },
    async addActor(actorRef) {
      actors.add(actorRef);
    },
    async listActors() {
      return [...actors];
    },
    async getByAuthSubject(issuer, subject) {
      return bySubject.get(`${issuer}\u0000${subject}`) ?? null;
    },
    async getVigenteByActorRef(actorRef) {
      for (const binding of bySubject.values()) {
        if (binding.actorRef === actorRef && binding.status === "VIGENTE") {
          return binding;
        }
      }
      return null;
    },
    async getBindingForActorRef(actorRef) {
      let revoked: StoredBinding | null = null;
      for (const binding of bySubject.values()) {
        if (binding.actorRef !== actorRef) continue;
        if (binding.status === "VIGENTE") return binding;
        revoked = binding;
      }
      return revoked;
    },
    async putBinding(binding) {
      bySubject.set(`${binding.issuer}\u0000${binding.subject}`, { ...binding });
    },
  };
}

/**
 * MOC-local Actor provision. Not Bind.
 * ActorRef is an opaque semantic reference, never a wallet address.
 */
export async function provisionMocActor(store: CBindStore): Promise<string> {
  const actorRef = `moc:actor:${randomUUID()}`;
  if (looksLikeEvmAddress(actorRef)) {
    throw new Error("MOC ActorRef must not be a wallet address");
  }
  await store.addActor(actorRef);
  return actorRef;
}
