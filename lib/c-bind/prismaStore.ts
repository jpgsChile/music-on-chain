import { getPrisma } from "@/lib/db";
import type { PrismaClient } from "@prisma/client";
import type { CBindStore } from "./store";
import type { BindingStatus, StoredBinding } from "./types";

function toStored(row: {
  issuer: string;
  subject: string;
  actorRef: string;
  status: string;
  asOf: Date;
  revokedAt: Date | null;
}): StoredBinding {
  return {
    issuer: row.issuer,
    subject: row.subject,
    actorRef: row.actorRef,
    status: row.status as BindingStatus,
    asOf: row.asOf.toISOString(),
    revokedAt: row.revokedAt?.toISOString(),
  };
}

export function createPrismaCBindStore(client: PrismaClient = getPrisma()): CBindStore {
  return {
    async hasActor(actorRef) {
      const row = await client.actor.findUnique({ where: { actorRef } });
      return row != null;
    },
    async addActor(actorRef) {
      await client.actor.create({ data: { actorRef } });
    },
    async listActors() {
      const rows = await client.actor.findMany({ select: { actorRef: true } });
      return rows.map((row) => row.actorRef);
    },
    async getByAuthSubject(issuer, subject) {
      const row = await client.identityBinding.findUnique({
        where: { issuer_subject: { issuer, subject } },
      });
      return row ? toStored(row) : null;
    },
    async getVigenteByActorRef(actorRef) {
      const row = await client.identityBinding.findFirst({
        where: { actorRef, status: "VIGENTE" },
      });
      return row ? toStored(row) : null;
    },
    async getBindingForActorRef(actorRef) {
      const vigente = await client.identityBinding.findFirst({
        where: { actorRef, status: "VIGENTE" },
      });
      if (vigente) return toStored(vigente);
      const revoked = await client.identityBinding.findFirst({
        where: { actorRef, status: "REVOCADO" },
        orderBy: { asOf: "desc" },
      });
      return revoked ? toStored(revoked) : null;
    },
    async putBinding(binding) {
      await client.identityBinding.upsert({
        where: {
          issuer_subject: { issuer: binding.issuer, subject: binding.subject },
        },
        create: {
          issuer: binding.issuer,
          subject: binding.subject,
          actorRef: binding.actorRef,
          status: binding.status,
          asOf: new Date(binding.asOf),
          revokedAt: binding.revokedAt ? new Date(binding.revokedAt) : null,
        },
        update: {
          actorRef: binding.actorRef,
          status: binding.status,
          asOf: new Date(binding.asOf),
          revokedAt: binding.revokedAt ? new Date(binding.revokedAt) : null,
        },
      });
    },
  };
}
