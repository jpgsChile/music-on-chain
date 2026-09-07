import type { RoyaltyEngineSnapshot, RoyaltyParticipant, RoyaltyPaymentEvent } from "./types";

/** Demo split from product brief */
export const DEMO_SPLIT = [
  { role: "artist" as const, percentage: 60, name: "Artista", color: "#00d4ff" },
  { role: "producer" as const, percentage: 20, name: "Productor", color: "#34d399" },
  { role: "composer" as const, percentage: 10, name: "Compositor", color: "#a78bfa" },
  { role: "performer" as const, percentage: 10, name: "Intérprete", color: "#fbbf24" },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(14 - n, 20 + n * 3, 0, 0);
  return d.toISOString();
}

export function buildDemoRoyaltyEngine(): RoyaltyEngineSnapshot {
  const participants: RoyaltyParticipant[] = [
    {
      id: "p-artist",
      name: "Tú",
      role: "artist",
      percentage: 60,
      pendingBalance: 18.0,
      availableBalance: 142.5,
      color: DEMO_SPLIT[0].color,
    },
    {
      id: "p-producer",
      name: "Maya Ruiz",
      role: "producer",
      percentage: 20,
      pendingBalance: 6.0,
      availableBalance: 47.5,
      color: DEMO_SPLIT[1].color,
    },
    {
      id: "p-composer",
      name: "Leo Vargas",
      role: "composer",
      percentage: 10,
      pendingBalance: 3.0,
      availableBalance: 23.75,
      color: DEMO_SPLIT[2].color,
    },
    {
      id: "p-performer",
      name: "Sofía Chen",
      role: "performer",
      percentage: 10,
      pendingBalance: 3.0,
      availableBalance: 23.75,
      color: DEMO_SPLIT[3].color,
    },
  ];

  const mkSplits = (gross: number) =>
    participants.map((p) => ({
      participantId: p.id,
      percentage: p.percentage,
      amount: Number(((gross * p.percentage) / 100).toFixed(2)),
    }));

  const payments: RoyaltyPaymentEvent[] = [
    {
      id: "pay-1",
      at: daysAgo(0),
      workTitle: "Mirrors",
      grossAmount: 10,
      currency: "USDC",
      status: "processing",
      splits: mkSplits(10),
    },
    {
      id: "pay-2",
      at: daysAgo(1),
      workTitle: "Vengeance",
      grossAmount: 20,
      currency: "USDC",
      status: "settled",
      splits: mkSplits(20),
    },
    {
      id: "pay-3",
      at: daysAgo(3),
      workTitle: "Mirrors",
      grossAmount: 10,
      currency: "USDC",
      status: "settled",
      splits: mkSplits(10),
    },
    {
      id: "pay-4",
      at: daysAgo(5),
      workTitle: "Burn Again",
      grossAmount: 15,
      currency: "USDC",
      status: "settled",
      splits: mkSplits(15),
    },
    {
      id: "pay-5",
      at: daysAgo(8),
      workTitle: "Vengeance",
      grossAmount: 20,
      currency: "USDC",
      status: "settled",
      splits: mkSplits(20),
    },
  ];

  const totalPending = participants.reduce((a, p) => a + p.pendingBalance, 0);
  const totalAvailable = participants.reduce((a, p) => a + p.availableBalance, 0);
  const totalDistributed = payments
    .filter((p) => p.status === "settled")
    .reduce((a, p) => a + p.grossAmount, 0);

  return {
    currency: "USDC",
    networkLabel: "Base",
    totalPending,
    totalAvailable,
    totalDistributed,
    participants,
    payments,
    defaultSplit: DEMO_SPLIT,
  };
}
