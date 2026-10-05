import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  proofExperience,
  publicationPresentation,
  stellarExpertContractUrl,
  stellarExpertTransactionUrl,
  type PublicationProof,
} from "@/lib/fan-economy/materialization/presentation";
import { getTranslations } from "@/lib/i18n";

const CONTRACT = "CDLQPK73RFCLHZ5FIT3W3UI3SW54PGTYXECFPXXISVFHCFSKZJ72UOYI";
const TX = "fcb8bb94eec5be7e853c2db3d59a83dbca6a5c7e3c22079e2f33dba6fc3c2119";

function proof(partial: Partial<PublicationProof>): PublicationProof {
  return {
    economicRecord: true,
    verification: "pending",
    publicationState: "pending",
    contractStatus: "missing",
    network: "testnet",
    contractId: CONTRACT,
    transactionHash: null,
    ledger: null,
    ...partial,
  };
}

describe("stellar proof experience", () => {
  it("keeps an economic record without evidence as recorded", () => {
    expect(proofExperience(null)).toBe("recorded");
    expect(proofExperience({ ...proof({}), economicRecord: false })).toBe("recorded");
    expect(stellarExpertTransactionUrl("testnet", null)).toBeNull();
  });

  it("maps pending and submitting without inventing a transaction", () => {
    expect(proofExperience(proof({ publicationState: "pending" }))).toBe("pending");
    expect(proofExperience(proof({ publicationState: "submitting", verification: "pending" }))).toBe("publishing");
    expect(publicationPresentation(proof({ publicationState: "submitting" }))).toBe("publishing");
  });

  it("shows verified only for a locked confirmed testnet proof", () => {
    const verified = proof({
      verification: "verified",
      publicationState: "confirmed",
      contractStatus: "locked",
      transactionHash: TX,
      ledger: 5041383,
    });
    expect(proofExperience(verified)).toBe("verified");
    expect(stellarExpertTransactionUrl(verified.network, verified.transactionHash)).toBe(
      `https://stellar.expert/explorer/testnet/tx/${TX}`
    );
    expect(stellarExpertContractUrl(verified.network, verified.contractId)).toBe(
      `https://stellar.expert/explorer/testnet/contract/${CONTRACT}`
    );
  });

  it("keeps a failed publication retryable and the economy visible", () => {
    expect(proofExperience(proof({ publicationState: "failed", verification: "failed" }))).toBe("retryable");
  });

  it("asks for review on a payload conflict instead of a generic failure", () => {
    expect(proofExperience(proof({ verification: "conflict", publicationState: "confirmed" }))).toBe("review");
    expect(proofExperience(proof({ verification: "inconsistent", publicationState: "confirmed" }))).toBe("review");
  });

  it("refuses explorer links that the browser could aim at another network", () => {
    expect(stellarExpertTransactionUrl("mainnet", TX)).toBeNull();
    expect(stellarExpertTransactionUrl("testnet", "not-a-hash")).toBeNull();
    expect(stellarExpertTransactionUrl("testnet", "javascript:alert(1)")).toBeNull();
    expect(stellarExpertContractUrl("testnet", "https://evil.example")).toBeNull();
    expect(stellarExpertContractUrl("public", CONTRACT)).toBeNull();
  });

  it("uses the same proof card for the fan and the artist", () => {
    const fan = readFileSync("components/fan-economy/SupportMusic.tsx", "utf8");
    const artist = readFileSync("app/dashboard/sales/page.tsx", "utf8");
    const card = readFileSync("components/fan-economy/StellarProofCard.tsx", "utf8");
    expect(fan).toContain("<StellarProofCard redemptionId={row.redemptionId} />");
    expect(artist).toContain("<StellarProofCard redemptionId={row.redemptionId} />");
    expect(card).not.toContain("props.network");
    expect(card).not.toContain("props.transactionHash");
    expect(card).not.toContain("props.ledger");
    expect(fan).not.toContain("stellar.expert");
    expect(artist).not.toContain("stellar.expert");
  });

  it("states the trust boundary in both languages and keeps technical copy collapsed by key", () => {
    const es = getTranslations("es").studio.fanEconomy;
    const en = getTranslations("en").studio.fanEconomy;
    expect(es.stellarExplanation).toBe(
      "Music On Chain registra primero el apoyo y su distribución. Stellar verifica criptográficamente la evidencia de esa operación."
    );
    expect(en.stellarExplanation).toBe(
      "Music On Chain first records the support and its revenue distribution. Stellar cryptographically verifies the evidence of that operation."
    );
    expect(es.stellarVerifiedHeadline).toBe("Verificado en Stellar Testnet");
    expect(en.stellarVerifiedHeadline).toBe("Verified on Stellar Testnet");
    expect(es.stellarReview).toBe("Revisión de evidencia requerida");
    expect(en.stellarReview).toBe("Evidence review required");
    expect(es.stellarRetryable).toBe("Apoyo registrado · evidencia pendiente");
    expect(es.technicalDetails).toBe("Detalles técnicos");
    expect(en.technicalDetails).toBe("Technical details");
  });
});
