import { getPrisma } from "@/lib/db";
import type { PrismaClient } from "@prisma/client";
import type { CBindStore } from "./store";
import type { BindingStatus, StoredBinding } from "./types";

const BINDING_OCCUPIED = "IDENTITY_BINDING_OCCUPIED";

export function isIdentityBindingOccupied(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === BINDING_OCCUPIED
  );
}

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
      const where = {
        issuer_subject: { issuer: binding.issuer, subject: binding.subject },
      };
      const current = await client.identityBinding.findUnique({ where });
      if (
        current &&
        current.actorRef !== binding.actorRef &&
        current.status === "VIGENTE" &&
        binding.status === "VIGENTE"
      ) {
        const occupied = new Error(BINDING_OCCUPIED);
        (occupied as Error & { code: string }).code = BINDING_OCCUPIED;
        throw occupied;
      }

      const data = {
        actorRef: binding.actorRef,
        status: binding.status,
        asOf: new Date(binding.asOf),
        revokedAt: binding.revokedAt ? new Date(binding.revokedAt) : null,
      };

      if (!current) {
        const created = await client.identityBinding.createMany({
          data: [
            {
              issuer: binding.issuer,
              subject: binding.subject,
              ...data,
            },
          ],
          skipDuplicates: true,
        });
        if (created.count === 1) return;
        const winner = await client.identityBinding.findUnique({ where });
        if (
          winner &&
          winner.actorRef !== binding.actorRef &&
          winner.status === "VIGENTE" &&
          binding.status === "VIGENTE"
        ) {
          const occupied = new Error(BINDING_OCCUPIED);
          (occupied as Error & { code: string }).code = BINDING_OCCUPIED;
          throw occupied;
        }
        if (!winner) {
          const missing = new Error(BINDING_OCCUPIED);
          (missing as Error & { code: string }).code = BINDING_OCCUPIED;
          throw missing;
        }
        await client.identityBinding.update({ where: { id: winner.id }, data });
        return;
      }

      await client.identityBinding.update({ where: { id: current.id }, data });
    },
  };
}
