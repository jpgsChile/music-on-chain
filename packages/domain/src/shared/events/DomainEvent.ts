/**
 * Domain event base — skeleton (no implementation).
 */
export abstract class DomainEvent {
  readonly occurredAt: string = new Date().toISOString();
  abstract readonly name: string;
}
