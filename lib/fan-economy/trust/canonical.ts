import { createHash } from "node:crypto";

/**
 * Canonical identifiers shared with the Soroban trust contract.
 *
 * tagged_sha256(tag, body) = SHA-256(
 *   u32be(tag_utf8_length) || tag_utf8 || body
 * )
 *
 * Field order inside each body is fixed below. No JSON.
 */

export type Hash32 = Buffer;

const TAG = {
  actor: "moc.actor.v1",
  campaign: "moc.campaign.v1",
  assignment: "moc.assignment.v1",
  redemption: "moc.redemption.v1",
  release: "moc.release.v1",
  asset: "moc.asset.v1",
  revenue: "moc.revenue.v1",
  command: "moc.release-command.v1",
  distribution: "moc.distribution.v1",
  materialization: "moc.materialization.v1",
} as const;

export function taggedSha256(tag: string, body: Buffer): Hash32 {
  const tagBytes = Buffer.from(tag, "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(tagBytes.length, 0);
  return createHash("sha256").update(len).update(tagBytes).update(body).digest();
}

export function hashText(tag: string, value: string): Hash32 {
  return taggedSha256(tag, Buffer.from(value, "utf8"));
}

export function actorHash(actorRef: string): Hash32 {
  return hashText(TAG.actor, actorRef);
}

export function campaignHash(campaignId: string): Hash32 {
  return hashText(TAG.campaign, campaignId);
}

export function assignmentHash(assignmentId: string): Hash32 {
  return hashText(TAG.assignment, assignmentId);
}

export function redemptionHash(redemptionId: string): Hash32 {
  return hashText(TAG.redemption, redemptionId);
}

export function releaseHash(releaseId: string): Hash32 {
  return hashText(TAG.release, releaseId);
}

export function assetHash(asset: string): Hash32 {
  return hashText(TAG.asset, asset);
}

export function revenueHash(revenueId: string): Hash32 {
  return hashText(TAG.revenue, revenueId);
}

export function releaseCommandHash(commandId: string): Hash32 {
  return hashText(TAG.command, commandId);
}

export type DistributionEntry = {
  actorRef: string;
  shareBps: number;
};

export function distributionHash(entries: DistributionEntry[]): Hash32 {
  const rows = entries.map((entry) => ({
    hash: actorHash(entry.actorRef),
    shareBps: entry.shareBps,
  }));
  rows.sort((a, b) => Buffer.compare(a.hash, b.hash) || a.shareBps - b.shareBps);
  const body = Buffer.alloc(4 + rows.length * 36);
  body.writeUInt32BE(rows.length, 0);
  rows.forEach((row, index) => {
    const offset = 4 + index * 36;
    row.hash.copy(body, offset);
    body.writeUInt32BE(row.shareBps, offset + 32);
  });
  return taggedSha256(TAG.distribution, body);
}

export function materializationHash(input: {
  redemptionId: string;
  revenueId: string;
  distribution: Hash32;
}): Hash32 {
  const body = Buffer.concat([
    redemptionHash(input.redemptionId),
    revenueHash(input.revenueId),
    input.distribution,
  ]);
  return taggedSha256(TAG.materialization, body);
}

export function hex32(value: Hash32): string {
  return value.toString("hex");
}
