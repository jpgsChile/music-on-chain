import type { CrowdfundingContribution } from "@/types/ownership";

const STORAGE_KEY = "music_on_chain_crowdfunding";

function load(): CrowdfundingContribution[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(list: CrowdfundingContribution[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function addContribution(record: CrowdfundingContribution) {
  const list = load();
  list.push(record);
  save(list);
}

export function getContributionsByCampaign(artistSlug: string, campaignId: string): CrowdfundingContribution[] {
  return load().filter(
    (c) => c.artist === artistSlug && c.campaignId === campaignId
  );
}
