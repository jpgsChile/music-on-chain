import type { PrismaClient } from "@prisma/client";
import { createDomainRight } from "./engine";
import type { DomainRight } from "./types";

export type RightsStore = {
  putRight(right: DomainRight): Promise<void>;
  getRight(rightId: string): Promise<DomainRight | null>;
  listRightsByActor(actorRef: string): Promise<DomainRight[]>;
  listRightsByObject(objectKind: string, objectId: string): Promise<DomainRight[]>;
};

function toRight(row: {
  id: string;
  actorRef: string;
  objectKind: string;
  objectId: string;
  kind: string;
}): DomainRight {
  return {
    rightId: row.id,
    actorRef: row.actorRef,
    objectKind: row.objectKind as DomainRight["objectKind"],
    objectId: row.objectId,
    kind: row.kind,
  };
}

export function createPrismaRightsStore(client: PrismaClient): RightsStore {
  return {
    async putRight(right) {
      const valid = createDomainRight(right);
      await client.domainRight.upsert({
        where: { id: valid.rightId },
        create: {
          id: valid.rightId,
          actorRef: valid.actorRef,
          objectKind: valid.objectKind,
          objectId: valid.objectId,
          kind: valid.kind,
        },
        update: {
          actorRef: valid.actorRef,
          objectKind: valid.objectKind,
          objectId: valid.objectId,
          kind: valid.kind,
        },
      });
    },
    async getRight(rightId) {
      const row = await client.domainRight.findUnique({ where: { id: rightId } });
      return row ? toRight(row) : null;
    },
    async listRightsByActor(actorRef) {
      const rows = await client.domainRight.findMany({ where: { actorRef } });
      return rows.map(toRight);
    },
    async listRightsByObject(objectKind, objectId) {
      const rows = await client.domainRight.findMany({ where: { objectKind, objectId } });
      return rows.map(toRight);
    },
  };
}
