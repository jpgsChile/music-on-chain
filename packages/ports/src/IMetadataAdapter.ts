/** Publish / resolve asset & ticket metadata URIs (IPFS, HTTPS, …). */
export interface IMetadataAdapter {
  publish?(request: unknown): Promise<{ uri: string }>;
  resolve?(uri: string): Promise<unknown>;
  buildTokenUri?(request: unknown): Promise<string>;
}
