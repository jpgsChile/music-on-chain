import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/domain/fanEconomy/display";
import { remainingUnits } from "@/lib/domain/fanEconomy/amounts";
import { getTranslations } from "@/lib/i18n";

describe("fan support economic copy", () => {
  it("keeps the earned reward distinct from the support amount", () => {
    const es = getTranslations("es").studio.fanEconomy;
    const en = getTranslations("en").studio.fanEconomy;
    expect(es.supportedRelease).toBe("Apoyaste este lanzamiento");
    expect(es.supportUsed).toBe("Usaste parte de tu recompensa para apoyar directamente esta música.");
    expect(es.supportAmount).toBe("Apoyo realizado");
    expect(es.supportGenerates).toBe(
      "Tu apoyo ahora genera ingresos para los artistas y colaboradores de este lanzamiento."
    );
    expect(es.available).toBe("Disponible para apoyar música");
    expect(es.yourSupports).toBe("Tus apoyos");
    expect(es.totalSupported).toBe("Total apoyado");
    expect(es.redemptionProofToggle).toBe("Ver registro de este apoyo");
    expect(es.rewardEarned).toBe("¡Recompensa obtenida!");
    expect(en.supportedRelease).toBe("Supported this release");
    expect(en.supportUsed).toBe("You used part of your reward to directly support this music.");
    expect(en.supportAmount).toBe("Support amount");
    expect(en.supportGenerates).toBe(
      "Your support now generates income for the artists and collaborators on this release."
    );
    expect(en.available).toBe("Available to support music");
    expect(en.yourSupports).toBe("Your support");
    expect(en.totalSupported).toBe("Total supported");
    expect(en.redemptionProofToggle).toBe("View this support record");
  });

  it("labels the canonical redemption amount and the remaining purchasing power", () => {
    const redemption = { units: "5000000", scale: 6, asset: "USDC" };
    const remaining = remainingUnits({
      authorizedUnits: 10_000_000n,
      consumedUnits: 5_000_000n,
      releasedUnits: 0n,
    });
    expect(`$${formatMoney(redemption.units, redemption.scale, redemption.asset)}`).toBe("$5 USDC");
    expect(remaining).toBe(5_000_000n);
    expect(`$${formatMoney(remaining.toString(), 6, "USDC")}`).toBe("$5 USDC");
  });
});
