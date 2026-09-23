export class FanEconomyError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "FanEconomyError";
    this.code = code;
  }
}

export function isFanEconomyError(error: unknown): error is FanEconomyError {
  return error instanceof FanEconomyError;
}
