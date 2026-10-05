export type PublicationKind = "pending" | "publishing" | "published" | "error";

export type ProofExperience = "recorded" | "pending" | "publishing" | "verified" | "retryable" | "review";

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

/** UX state for one economic redemption. Conflict is never presented as a simple failure. */
export function proofExperience(proof: PublicationProof | null): ProofExperience {
  if (!proof?.economicRecord) return "recorded";
  if (proof.verification === "conflict" || proof.verification === "inconsistent") return "review";
  if (publicationPresentation(proof) === "published") return "verified";
  if (proof.publicationState === "submitting") return "publishing";
  if (proof.publicationState === "failed" || proof.verification === "failed") return "retryable";
  if (proof.publicationState === "pending") return "pending";
  return "recorded";
}

const TX_HASH = /^[0-9a-f]{64}$/i;
const CONTRACT_ID = /^C[A-Z2-7]{55}$/;

/** Testnet explorer links. Any other network, hash, or contract id yields no URL. */
export function stellarExpertTransactionUrl(network: string | null, transactionHash: string | null): string | null {
  if (network !== "testnet" || !transactionHash || !TX_HASH.test(transactionHash)) return null;
  return `https://stellar.expert/explorer/testnet/tx/${transactionHash.toLowerCase()}`;
}

export function stellarExpertContractUrl(network: string | null, contractId: string | null): string | null {
  if (network !== "testnet" || !contractId || !CONTRACT_ID.test(contractId)) return null;
  return `https://stellar.expert/explorer/testnet/contract/${contractId}`;
}

export function shortenRef(value: string, head: number, tail: number): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}
