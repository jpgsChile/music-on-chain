/** Persistence port — orders. */
export interface IOrderRepository {
  // TODO: Core Protocol
  save?(order: unknown): Promise<void>;
  findById?(orderId: string): Promise<unknown | null>;
}
