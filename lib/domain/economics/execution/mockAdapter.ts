import type { ExecutionRequest, ExecutionResult, SettlementExecutionAdapter } from "./types";

export type MockExecutionOutcome = ExecutionResult["status"];

/**
 * In-process adapter. No RPC, no chain, no Privy.
 * A future Base adapter can implement the same interface.
 */
export function createMockSettlementExecutionAdapter(options?: {
  outcome?: MockExecutionOutcome;
  externalRef?: string | ((request: ExecutionRequest) => string);
  metadata?: Record<string, unknown>;
}): SettlementExecutionAdapter {
  const outcome = options?.outcome ?? "CONFIRMED";
  return {
    execute(request) {
      const externalRef =
        typeof options?.externalRef === "function"
          ? options.externalRef(request)
          : options?.externalRef ?? `mock:${request.requestRef}`;
      return {
        status: outcome,
        requestRef: request.requestRef,
        intentRef: request.intentRef,
        occurredAt: request.createdAt,
        externalRef,
        metadata: {
          ...(options?.metadata ?? {}),
          adapter: "mock",
          simulated: true,
          onChain: false,
        },
      };
    },
  };
}
