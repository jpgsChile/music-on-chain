import {
  Account,
  Address,
  authorizeEntry,
  Contract,
  Keypair,
  nativeToScVal,
  Networks,
  rpc,
  scValToNative,
  StrKey,
  TransactionBuilder,
  xdr,
  type Transaction,
} from "@stellar/stellar-sdk";
import { FanEconomyError } from "@/lib/domain/fanEconomy/errors";
import type { ChainSnapshot } from "@/lib/fan-economy/materialization/decision";
import type { ChainReceipt, MaterializationChain } from "@/lib/fan-economy/materialization/service";
import {
  actorHash,
  assetHash,
  assignmentHash,
  campaignHash,
  hex32,
  redemptionHash,
  releaseHash,
  revenueHash,
} from "@/lib/fan-economy/trust/canonical";
import { assertStellarTestnet, assertStellarTestnetRpc } from "@/lib/fan-economy/trust/networkGuard";

const CONTRACT_ERROR: Record<number, string> = {
  1: "ALREADY_INITIALIZED",
  2: "NOT_INITIALIZED",
  3: "AMOUNT_INVALID",
  4: "ASSET_MISMATCH",
  5: "COMMITMENT_LOWERED",
  6: "BELOW_OUTSTANDING",
  7: "ABOVE_COMMITTED",
  8: "CAMPAIGN_MISSING",
  9: "PAYLOAD_CONFLICT",
  10: "GRANT_MISSING",
  11: "INSUFFICIENT_REMAINING",
  12: "REDEMPTION_MISSING",
  13: "NOT_COMMITTED",
  14: "LOCKED",
  15: "CAPABILITY_MISSING",
  16: "NOT_MATERIALIZER",
};

export class SorobanCallError extends Error {
  readonly code: string;
  readonly transactionHash: string | null;

  constructor(code: string, transactionHash: string | null = null) {
    super(code);
    this.name = "SorobanCallError";
    this.code = code;
    this.transactionHash = transactionHash;
  }
}

export function classifySorobanMessage(message: string): string {
  const match = message.match(/Error\(Contract,\s*#(\d+)\)/);
  if (!match) return "RPC_FAILURE";
  return CONTRACT_ERROR[Number(match[1])] ?? "RPC_FAILURE";
}

export function assertContractId(contractId: string): void {
  if (!StrKey.isValidContract(contractId)) throw new FanEconomyError("CONTRACT_ID_INVALID");
}

/** The materializer key never authorizes redeem. Equal keys are rejected. */
export function signerFor(
  operation: "get_redemption" | "lock_redemption" | "redeem",
  keys: { materializer: string; capability: string | null }
): string {
  if (operation === "redeem") {
    if (!keys.capability) throw new FanEconomyError("CAPABILITY_NOT_CONFIGURED");
    if (keys.capability === keys.materializer) throw new FanEconomyError("MATERIALIZER_CANNOT_AUTHORIZE_REDEEM");
    return keys.capability;
  }
  return keys.materializer;
}

export function keypairFromSecret(secret: string, expectedPublicKey: string): Keypair {
  let pair: Keypair;
  try {
    pair = Keypair.fromSecret(secret.trim());
  } catch {
    throw new FanEconomyError("MATERIALIZER_KEY_MISMATCH");
  }
  if (!StrKey.isValidEd25519PublicKey(expectedPublicKey.trim()) || pair.publicKey() !== expectedPublicKey.trim()) {
    throw new FanEconomyError("MATERIALIZER_KEY_MISMATCH");
  }
  return pair;
}

export function bytes32(hex: string): xdr.ScVal {
  const raw = Buffer.from(hex.trim().toLowerCase(), "hex");
  if (raw.length !== 32) throw new FanEconomyError("HASH_LENGTH");
  return nativeToScVal(raw, { type: "bytes" });
}

export function authorizationAddress(entry: xdr.SorobanAuthorizationEntry): string | null {
  const credentials = entry.credentials();
  if (credentials.switch().name !== "sorobanCredentialsAddress") return null;
  return Address.fromScAddress(credentials.address().address()).toString();
}

export function assertAuthorizedSigner(entries: xdr.SorobanAuthorizationEntry[], signer: string): void {
  for (const entry of entries) {
    const address = authorizationAddress(entry);
    if (address && address !== signer) throw new SorobanCallError("AUTHORIZATION_MISMATCH");
  }
}

function hexOf(value: unknown): string {
  if (typeof value === "string" && /^[0-9a-fA-F]{64}$/.test(value)) return value.toLowerCase();
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return Buffer.from(value).toString("hex");
  throw new SorobanCallError("CONTRACT_RESULT");
}

export function decodeRedemption(value: unknown): ChainSnapshot | null {
  if (value == null) return null;
  const row = value as Record<string, unknown>;
  const statusCode = Number(row.status);
  const status = statusCode === 1 ? "committed" : statusCode === 2 ? "locked" : statusCode === 3 ? "reversed" : null;
  if (!status) return null;
  const material = row.materialization_hash ?? row.materializationHash;
  return {
    status,
    grantId: hexOf(row.grant_id ?? row.grantId),
    amount: String(row.amount),
    targetHash: hexOf(row.target_hash ?? row.targetHash),
    distributionHash: hexOf(row.distribution_hash ?? row.distributionHash),
    materializationHash: material == null ? null : hexOf(material),
  };
}

type RpcServer = Pick<rpc.Server, "getAccount" | "simulateTransaction" | "sendTransaction" | "getTransaction">;

export type ProtocolReceipt = { transactionHash: string; ledger: number };

export type CampaignChainState = {
  authorityActor: string;
  assetHash: string;
  scale: string;
  committed: string;
  outstanding: string;
};

export type RewardChainState = {
  campaignId: string;
  actorHash: string;
  authorized: string;
  consumed: string;
  released: string;
};

export type SorobanMaterializationClient = MaterializationChain & {
  commitReserve(input: {
    campaignId: string;
    authorityActorRef: string;
    asset: string;
    scale: number;
    amount: string;
  }): Promise<ProtocolReceipt>;
  authorizeReward(input: {
    assignmentId: string;
    campaignId: string;
    fanActorRef: string;
    amount: string;
  }): Promise<ProtocolReceipt>;
  readCampaign(campaignId: string): Promise<CampaignChainState | null>;
  readReward(assignmentId: string): Promise<RewardChainState | null>;
  readActorCapability(actorRef: string): Promise<string | null>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function pick(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] != null) return row[key];
  }
  return undefined;
}

function asText(value: unknown): string {
  if (typeof value === "bigint" || typeof value === "number" || typeof value === "string") return String(value);
  throw new SorobanCallError("CONTRACT_RESULT");
}

function decodeAddress(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string" && StrKey.isValidEd25519PublicKey(value)) return value;
  return null;
}

export function createSorobanMaterializationClient(options: {
  contractId: string;
  rpcUrl: string;
  network?: "testnet";
  materializer: Keypair;
  capability?: Keypair | null;
  authority?: Keypair | null;
  server?: RpcServer;
  sleep?: (ms: number) => Promise<void>;
}): SorobanMaterializationClient {
  if ((options.network ?? "testnet") !== "testnet") throw new Error("STELLAR_MAINNET_FORBIDDEN");
  assertStellarTestnet("testnet");
  assertStellarTestnetRpc(options.rpcUrl);
  assertContractId(options.contractId);
  const capability = options.capability ?? null;
  const authority = options.authority ?? null;
  if (capability && capability.publicKey() === options.materializer.publicKey()) {
    throw new FanEconomyError("MATERIALIZER_CANNOT_AUTHORIZE_REDEEM");
  }
  if (authority && (authority.publicKey() === options.materializer.publicKey() || authority.publicKey() === capability?.publicKey())) {
    throw new FanEconomyError("MATERIALIZER_CANNOT_AUTHORIZE_REDEEM");
  }
  const server = options.server ?? new rpc.Server(options.rpcUrl, { allowHttp: false });
  const contract = new Contract(options.contractId);
  const sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  async function accountOf(signer: Keypair): Promise<Account> {
    return server.getAccount(signer.publicKey());
  }

  function build(source: Account, method: string, args: xdr.ScVal[]): Transaction {
    return new TransactionBuilder(source, { fee: "10000000", networkPassphrase: Networks.TESTNET })
      .addOperation(contract.call(method, ...args))
      .setTimeout(180)
      .build();
  }

  async function simulate(signer: Keypair, method: string, args: xdr.ScVal[]) {
    const tx = build(await accountOf(signer), method, args);
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) throw new SorobanCallError(classifySorobanMessage(sim.error));
    if (rpc.Api.isSimulationRestore(sim)) throw new SorobanCallError("RESTORE_REQUIRED");
    return { tx, sim };
  }

  async function send(signer: Keypair, method: string, args: xdr.ScVal[]) {
    const simulated = await simulate(signer, method, args);
    const auth = simulated.sim.result?.auth ?? [];
    if (auth.length === 0) throw new SorobanCallError("AUTHORIZATION_MISMATCH");
    assertAuthorizedSigner(auth, signer.publicKey());
    const validUntil = simulated.sim.latestLedger + 120;
    simulated.sim.result = {
      ...simulated.sim.result,
      auth: await Promise.all(auth.map((entry) => authorizeEntry(entry, signer, validUntil, Networks.TESTNET))),
      retval: simulated.sim.result?.retval ?? xdr.ScVal.scvVoid(),
    };
    const assembled = rpc.assembleTransaction(simulated.tx, simulated.sim).build();
    assembled.sign(signer);
    let sent: Awaited<ReturnType<RpcServer["sendTransaction"]>>;
    try {
      sent = await server.sendTransaction(assembled);
    } catch {
      throw new SorobanCallError("RPC_FAILURE");
    }
    if (sent.status === "ERROR" || !sent.hash) throw new SorobanCallError("RPC_FAILURE", sent.hash || null);
    const done = await poll(sent.hash);
    return { transactionHash: sent.hash, ledger: done.ledger, returnValue: done.returnValue };
  }

  async function submit(signer: Keypair, method: string, args: xdr.ScVal[]): Promise<ChainReceipt> {
    const done = await send(signer, method, args);
    const decoded = decodeRedemption(done.returnValue ? scValToNative(done.returnValue) : null);
    if (!decoded) throw new SorobanCallError("CONTRACT_RESULT", done.transactionHash);
    return { transactionHash: done.transactionHash, ledger: done.ledger, redemption: decoded };
  }

  async function poll(hash: string): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const found = await server.getTransaction(hash);
      if (found.status === rpc.Api.GetTransactionStatus.SUCCESS) return found;
      if (found.status === rpc.Api.GetTransactionStatus.FAILED) {
        const detail = `${String(found.resultXdr)} ${found.resultXdr.toXDR("base64")}`;
        throw new SorobanCallError(classifySorobanMessage(detail), hash);
      }
      await sleep(750);
    }
    throw new SorobanCallError("SUBMISSION_TIMEOUT", hash);
  }

  function requireAuthority(): Keypair {
    if (!authority) throw new FanEconomyError("CAPABILITY_NOT_CONFIGURED");
    return authority;
  }

  async function readNative(method: string, arg: xdr.ScVal): Promise<unknown> {
    const simulated = await simulate(options.materializer, method, [arg]);
    const retval = simulated.sim.result?.retval;
    if (!retval) return null;
    return scValToNative(retval);
  }

  function hexOrThrow(value: unknown): string {
    return hexOf(value);
  }

  function decodeCampaign(value: unknown): CampaignChainState | null {
    const row = asRecord(value);
    if (!row) return null;
    const asset = asRecord(pick(row, "asset"));
    if (!asset) return null;
    try {
      return {
        authorityActor: hexOrThrow(pick(row, "authority_actor", "authorityActor")),
        assetHash: hexOrThrow(pick(asset, "code_hash", "codeHash")),
        scale: asText(pick(asset, "scale")),
        committed: asText(pick(row, "committed")),
        outstanding: asText(pick(row, "outstanding")),
      };
    } catch {
      return null;
    }
  }

  function decodeReward(value: unknown): RewardChainState | null {
    const row = asRecord(value);
    if (!row) return null;
    try {
      return {
        campaignId: hexOrThrow(pick(row, "campaign_id", "campaignId")),
        actorHash: hexOrThrow(pick(row, "actor_hash", "actorHash")),
        authorized: asText(pick(row, "authorized")),
        consumed: asText(pick(row, "consumed")),
        released: asText(pick(row, "released")),
      };
    } catch {
      return null;
    }
  }

  return {
    async getRedemption(redemptionId: string) {
      const simulated = await simulate(options.materializer, "get_redemption", [bytes32(hex32(redemptionHash(redemptionId)))]);
      const retval = simulated.sim.result?.retval;
      if (!retval) return null;
      return decodeRedemption(scValToNative(retval));
    },
    lockRedemption(input) {
      signerFor("lock_redemption", { materializer: options.materializer.publicKey(), capability: capability?.publicKey() ?? null });
      return submit(options.materializer, "lock_redemption", [
        bytes32(hex32(redemptionHash(input.redemptionId))),
        bytes32(hex32(revenueHash(input.revenueId))),
        bytes32(input.distributionHash),
      ]);
    },
    redeemControlled: capability
      ? (input) => {
          signerFor("redeem", { materializer: options.materializer.publicKey(), capability: capability.publicKey() });
          return submit(capability, "redeem", [
            bytes32(hex32(redemptionHash(input.redemptionId))),
            bytes32(hex32(assignmentHash(input.assignmentId))),
            nativeToScVal(BigInt(input.amount), { type: "i128" }),
            bytes32(hex32(releaseHash(input.releaseId))),
            bytes32(input.distributionHash),
          ]);
        }
      : undefined,
    async recover(transactionHash: string) {
      const found = await server.getTransaction(transactionHash);
      if (found.status === rpc.Api.GetTransactionStatus.NOT_FOUND) return "pending";
      if (found.status === rpc.Api.GetTransactionStatus.FAILED) return "failed";
      const decoded = decodeRedemption(found.returnValue ? scValToNative(found.returnValue) : null);
      if (!decoded) return "pending";
      return { transactionHash, ledger: found.ledger, redemption: decoded };
    },
    async commitReserve(input) {
      const signer = requireAuthority();
      const done = await send(signer, "commit_reserve", [
        bytes32(hex32(campaignHash(input.campaignId))),
        bytes32(hex32(actorHash(input.authorityActorRef))),
        bytes32(hex32(assetHash(input.asset))),
        nativeToScVal(input.scale, { type: "u32" }),
        nativeToScVal(BigInt(input.amount), { type: "i128" }),
      ]);
      return { transactionHash: done.transactionHash, ledger: done.ledger };
    },
    async authorizeReward(input) {
      const signer = requireAuthority();
      const done = await send(signer, "authorize_reward", [
        bytes32(hex32(assignmentHash(input.assignmentId))),
        bytes32(hex32(campaignHash(input.campaignId))),
        bytes32(hex32(actorHash(input.fanActorRef))),
        nativeToScVal(BigInt(input.amount), { type: "i128" }),
      ]);
      return { transactionHash: done.transactionHash, ledger: done.ledger };
    },
    async readCampaign(campaignId: string) {
      return decodeCampaign(await readNative("get_campaign_state", bytes32(hex32(campaignHash(campaignId)))));
    },
    async readReward(assignmentId: string) {
      return decodeReward(await readNative("get_reward", bytes32(hex32(assignmentHash(assignmentId)))));
    },
    async readActorCapability(actorRef: string) {
      return decodeAddress(await readNative("get_actor_capability", bytes32(hex32(actorHash(actorRef)))));
    },
  };
}
