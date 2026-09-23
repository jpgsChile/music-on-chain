import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type {
  CampaignTrustState,
  FanEconomyTrustExecution,
  RedemptionTrustState,
  RewardTrustState,
} from "@/lib/fan-economy/trust/port";

export class TrustCallError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "TrustCallError";
    this.code = code;
  }
}

type Response = { ok: true; data: unknown } | { ok: false; error: string };

/**
 * Speaks to the Soroban test harness, which executes the real contract in `Env`.
 * `mock_all_auths` in that process does not prove authorization. Rust tests do.
 */
export class LocalSorobanTrust implements FanEconomyTrustExecution {
  private pending: Promise<void> = Promise.resolve();
  private buffer = "";
  private waiters: Array<(line: string) => void> = [];

  constructor(private readonly child: ChildProcessWithoutNullStreams) {
    this.child.stdout.setEncoding("utf8");
    this.child.stdout.on("data", (chunk: string) => {
      this.buffer += chunk;
      let newline = this.buffer.indexOf("\n");
      while (newline >= 0) {
        const line = this.buffer.slice(0, newline);
        this.buffer = this.buffer.slice(newline + 1);
        this.waiters.shift()?.(line);
        newline = this.buffer.indexOf("\n");
      }
    });
  }

  private call<T>(request: Record<string, unknown>): Promise<T> {
    const result = this.pending.then(
      () =>
        new Promise<T>((resolve, reject) => {
          this.waiters.push((line) => {
            let parsed: Response;
            try {
              parsed = JSON.parse(line) as Response;
            } catch (error) {
              reject(error);
              return;
            }
            if (!parsed.ok) {
              reject(new TrustCallError(parsed.error));
              return;
            }
            resolve(parsed.data as T);
          });
          this.child.stdin.write(`${JSON.stringify(request)}\n`);
        })
    );
    this.pending = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  bindCapability(actorRef: string) {
    return this.call<void>({ op: "bind", actorRef }).then(() => undefined);
  }

  commitReserve(input: {
    campaignId: string;
    authorityActorRef: string;
    asset: string;
    scale: number;
    amount: string;
  }) {
    return this.call<CampaignTrustState>({ op: "commit", ...input });
  }

  authorizeReward(input: {
    assignmentId: string;
    campaignId: string;
    authorityActorRef: string;
    fanActorRef: string;
    amount: string;
  }) {
    return this.call<RewardTrustState>({ op: "authorize", ...input });
  }

  releaseReward(input: { assignmentId: string; fanActorRef: string; commandId: string; amount: string }) {
    return this.call<RewardTrustState>({ op: "release", ...input });
  }

  redeem(input: {
    redemptionId: string;
    assignmentId: string;
    fanActorRef: string;
    amount: string;
    releaseId: string;
    distributionHash: string;
  }) {
    return this.call<RedemptionTrustState>({ op: "redeem", ...input });
  }

  lockRedemption(input: { redemptionId: string; revenueId: string; distributionHash: string }) {
    return this.call<RedemptionTrustState>({ op: "lock", ...input });
  }

  reverseRedemption(input: { redemptionId: string }) {
    return this.call<RedemptionTrustState>({ op: "reverse", ...input });
  }

  getCampaignState(campaignId: string) {
    return this.call<CampaignTrustState | null>({ op: "getCampaign", campaignId });
  }

  getReward(assignmentId: string) {
    return this.call<RewardTrustState | null>({ op: "getReward", assignmentId });
  }

  getRedemption(redemptionId: string) {
    return this.call<RedemptionTrustState | null>({ op: "getRedemption", redemptionId });
  }

  async reset() {
    await this.call({ op: "reset" });
  }

  async stop() {
    this.child.stdin.end();
    if (this.child.exitCode !== null) return;
    await new Promise<void>((resolve) => this.child.once("exit", () => resolve()));
  }
}

export function harnessBinaryPath(): string {
  return path.join(
    process.cwd(),
    "contracts/soroban/fan-economy-trust/target/debug/fan-economy-trust-harness"
  );
}

export function startLocalTrust(binary = harnessBinaryPath()): LocalSorobanTrust {
  if (!existsSync(binary)) {
    throw new Error(`TRUST_HARNESS_MISSING:${binary}`);
  }
  const child = spawn(binary, [], { stdio: ["pipe", "pipe", "pipe"] });
  return new LocalSorobanTrust(child);
}
