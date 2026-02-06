"use client";

import { useEffect, useState } from "react";
import { getContributionsByWallet } from "@/lib/crowdfunding";
import type { CrowdfundingContribution } from "@/types/ownership";

export function useContributions(wallet: string | undefined) {
  const [contributions, setContributions] = useState<CrowdfundingContribution[]>([]);

  useEffect(() => {
    if (!wallet) {
      setContributions([]);
      return;
    }
    setContributions(getContributionsByWallet(wallet));
  }, [wallet]);

  return contributions;
}
