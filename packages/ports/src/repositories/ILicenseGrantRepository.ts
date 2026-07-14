/** Persistence port — license grants. */
export interface ILicenseGrantRepository {
  // TODO: Core Protocol
  save?(grant: unknown): Promise<void>;
  findActiveByUserAndWork?(userId: string, workId: string): Promise<unknown | null>;
}
