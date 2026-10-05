import { rpc } from "@stellar/stellar-sdk";
import { parseContractEvent } from "@/lib/fan-economy/events/parse";
import type { ObservedEvent } from "@/lib/fan-economy/events/decide";
import { assertContractId } from "@/lib/fan-economy/trust/sorobanClient";
import { assertStellarTestnetRpc } from "@/lib/fan-economy/trust/networkGuard";

export type EventPageRequest = {
  startLedger?: number;
  endLedger?: number;
  cursor?: string;
  limit: number;
};

export type EventSource = {
  latest(): Promise<{ latestLedger: number; oldestLedger: number }>;
  getEvents(request: EventPageRequest): Promise<{ events: ObservedEvent[]; cursor: string; latestLedger: number }>;
};

/** Read-only Soroban RPC. The contract id comes from server configuration. */
export function createSorobanEventSource(rpcUrl: string, contractId: string): EventSource {
  assertStellarTestnetRpc(rpcUrl);
  assertContractId(contractId);
  const server = new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://127.0.0.1") });
  return {
    async latest() {
      const head = await server.getLatestLedger();
      const probe = await server.getEvents({
        startLedger: head.sequence,
        filters: [{ type: "contract", contractIds: [contractId] }],
        limit: 1,
      });
      return { latestLedger: probe.latestLedger, oldestLedger: probe.oldestLedger };
    },
    async getEvents(request) {
      const page = request.cursor
        ? await server.getEvents({
            cursor: request.cursor,
            filters: [{ type: "contract", contractIds: [contractId] }],
            limit: request.limit,
          })
        : await server.getEvents({
            startLedger: request.startLedger ?? 1,
            // Soroban RPC treats endLedger as an exclusive bound.
            endLedger: request.endLedger == null ? undefined : request.endLedger + 1,
            filters: [{ type: "contract", contractIds: [contractId] }],
            limit: request.limit,
          });
      return {
        events: page.events.map((event) => parseContractEvent(event)),
        cursor: page.cursor,
        latestLedger: page.latestLedger,
      };
    },
  };
}
