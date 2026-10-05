export type PublicationKind = "pending" | "publishing" | "published" | "error";

export type PublicationProof = {
  economicRecord: boolean;
  verification: "verified" | "pending" | "failed" | "inconsistent" | "conflict";
  publicationState: "pending" | "submitting" | "confirmed" | "failed";
  contractStatus: "committed" | "locked" | "reversed" | "missing";
  network: string | null;
  contractId: string;
  transactionHash: string | null;
  ledger: number | null;
};

/** Published copy is allowed only when a confirmed Testnet transaction and a locked contract agree. */
export function publicationPresentation(proof: PublicationProof | null): PublicationKind {
  if (!proof?.economicRecord) return "pending";
  if (proof.verification === "inconsistent" || proof.verification === "conflict") return "error";
  const proved =
    proof.verification === "verified" &&
    proof.publicationState === "confirmed" &&
    proof.contractStatus === "locked" &&
    proof.network === "testnet" &&
    Boolean(proof.contractId) &&
    Boolean(proof.transactionHash) &&
    proof.ledger != null;
  if (proved) return "published";
  if (proof.publicationState === "submitting") return "publishing";
  if (proof.publicationState === "failed" || proof.verification === "failed") return "error";
  return "pending";
}

export function shortenRef(value: string, head: number, tail: number): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}
