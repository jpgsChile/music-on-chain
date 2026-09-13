/**
 * Pilot observability. Domain IDs only — never tokens, keys, or Privy credentials.
 */
export function logDomainEvent(
  event: string,
  fields: Record<string, string | number | boolean | null | undefined>
) {
  const safe = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined && value !== null)
  );
  console.info(`[moc:${event}]`, safe);
}
