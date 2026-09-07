/**
 * Core Protocol BAL skeleton. Not the MOC execution adapter.
 *
 * Canonical Base settlement implementation:
 * `lib/domain/economics/execution/base` (`SettlementExecutionAdapter`).
 * Do not duplicate SettlementIntent / ExecutionRequest here.
 */
export class BaseSettlementAdapter {
  readonly chainRef = "base-sepolia" as const;
}
