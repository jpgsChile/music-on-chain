export type SupportMoney = {
  units: string;
  scale: number;
  asset: string;
};

export type SupportHistoryRedemption = {
  redemptionId: string;
  releaseId: string;
  releaseTitle: string | null;
  amount: SupportMoney;
  state: string;
  participants: { name: string | null; shareBps: number }[];
};

export type SupportReleaseGroup = {
  releaseId: string;
  releaseTitle: string | null;
  total: SupportMoney | null;
  rows: SupportHistoryRedemption[];
};

/** Groups canonical redemptions for display. The total is derived and is not a redemption. */
export function groupSupportHistory(redemptions: SupportHistoryRedemption[]): SupportReleaseGroup[] {
  const groups = new Map<string, SupportReleaseGroup>();
  for (const row of redemptions) {
    if (row.state === "reversed") continue;
    const current = groups.get(row.releaseId);
    if (!current) {
      groups.set(row.releaseId, {
        releaseId: row.releaseId,
        releaseTitle: row.releaseTitle,
        total: null,
        rows: [row],
      });
      continue;
    }
    current.rows.push(row);
    if (!current.releaseTitle && row.releaseTitle) current.releaseTitle = row.releaseTitle;
  }
  for (const group of groups.values()) {
    group.total = recordedTotal(group.rows);
  }
  return [...groups.values()];
}

function recordedTotal(rows: SupportHistoryRedemption[]): SupportMoney | null {
  const recorded = rows.filter((row) => row.state === "recorded");
  const first = recorded[0];
  if (!first) return null;
  const { asset, scale } = first.amount;
  if (recorded.some((row) => row.amount.asset !== asset || row.amount.scale !== scale)) return null;
  const units = recorded.reduce((sum, row) => sum + BigInt(row.amount.units), 0n);
  return { units: units.toString(), scale, asset };
}
