import { FanEconomyError } from "@/lib/domain/fanEconomy/errors";
import {
  materializeRedemption,
  reconcileMaterialization,
  type MaterializationChain,
  type MaterializationProof,
  type ReconciliationDecision,
} from "@/lib/fan-economy/materialization/service";
import { canonicalFanForReader } from "@/lib/fan-economy/materialization/access";
import type { PrismaClient } from "@prisma/client";
import { readAuthorityCapability, readControlledCapability, readSorobanTrustConfig } from "@/lib/fan-economy/trust/rpc";
import { createSorobanMaterializationClient, keypairFromSecret } from "@/lib/fan-economy/trust/sorobanClient";
import { readRedemptionProof } from "@/lib/fan-economy/trust/testnetProof";

export function materializationChain(env: Record<string, string | undefined> = process.env): {
  chain: MaterializationChain;
  network: "testnet";
  contractId: string;
  controlledActorRef: string | null;
  authorityActorRef: string | null;
} | null {
  const secret = env.MOC_MATERIALIZER_SECRET;
  if (!env.STELLAR_NETWORK && !env.STELLAR_RPC_URL && !env.MOC_FAN_ECONOMY_CONTRACT_ID && !env.MOC_MATERIALIZER_PUBLIC_KEY && !secret) {
    return null;
  }
  const config = readSorobanTrustConfig(env);
  if (!secret) throw new FanEconomyError("TRUST_NOT_CONFIGURED");
  const capability = readControlledCapability(env);
  const capabilitySecret = env.MOC_TESTNET_CAPABILITY_SECRET;
  const authority = readAuthorityCapability(env);
  const authoritySecret = env.MOC_TESTNET_AUTHORITY_SECRET;
  return {
    network: "testnet",
    contractId: config.contractId,
    controlledActorRef: capability?.actorRef ?? null,
    authorityActorRef: authority?.actorRef ?? null,
    chain: createSorobanMaterializationClient({
      contractId: config.contractId,
      rpcUrl: config.rpcUrl,
      materializer: keypairFromSecret(secret, config.materializerPublicKey),
      capability: capability && capabilitySecret ? keypairFromSecret(capabilitySecret, capability.publicKey) : null,
      authority: authority && authoritySecret ? keypairFromSecret(authoritySecret, authority.publicKey) : null,
    }),
  };
}

function sorobanExecution(env: Record<string, string | undefined>): boolean {
  return env.MOC_TRUST_EXECUTION?.trim() === "soroban";
}

/** Runs only after canonical Revenue exists. Stellar failure stays inside the evidence row. */
export async function publishIfConfigured(
  input: { redemptionId: string; fanActorRef: string },
  client: PrismaClient,
  env: Record<string, string | undefined> = process.env
): Promise<MaterializationProof | null> {
  if (!sorobanExecution(env)) return null;
  let runtime: ReturnType<typeof materializationChain> = null;
  try {
    runtime = materializationChain(env);
  } catch (error) {
    const code = error instanceof FanEconomyError
      ? error.code
      : error instanceof Error && error.message === "STELLAR_MAINNET_FORBIDDEN"
        ? "STELLAR_MAINNET_FORBIDDEN"
        : "FAILED";
    console.error("[materialization]", code);
    return null;
  }
  if (!runtime) return null;
  try {
    return await materializeRedemption(input, { client, ...runtime });
  } catch (error) {
    const code = error instanceof FanEconomyError ? error.code : "FAILED";
    console.error("[materialization]", code);
    return null;
  }
}

/** Same post-commit pipeline. The session actor is authorized, then the canonical fan is used. */
export async function reconcileForActor(
  input: { actorRef: string; redemptionId: string },
  client: PrismaClient,
  env: Record<string, string | undefined> = process.env
): Promise<{ decision: ReconciliationDecision; proof: MaterializationProof | { published: false; economicRecord: false } }> {
  const fanActorRef = await canonicalFanForReader(client, input.actorRef, input.redemptionId);
  if (!sorobanExecution(env)) {
    return { decision: "NOT_READY", proof: await readRedemptionProof({ redemptionId: input.redemptionId, fanActorRef }, client, env) };
  }
  let runtime: ReturnType<typeof materializationChain> = null;
  try {
    runtime = materializationChain(env);
  } catch (error) {
    const code = error instanceof FanEconomyError ? error.code : "FAILED";
    console.error("[materialization]", code);
    return { decision: "NOT_READY", proof: await readRedemptionProof({ redemptionId: input.redemptionId, fanActorRef }, client, env) };
  }
  if (!runtime) {
    return { decision: "NOT_READY", proof: await readRedemptionProof({ redemptionId: input.redemptionId, fanActorRef }, client, env) };
  }
  return reconcileMaterialization({ redemptionId: input.redemptionId, fanActorRef }, { client, ...runtime });
}
