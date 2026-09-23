/**
 * Chain-independent trust execution port.
 * Domain code depends on this interface only. No Soroban types.
 *
 * Amounts are integer minor units. A commitment is not custody of an asset.
 */

export type TrustStatus = "committed" | "locked" | "reversed";

export type CampaignTrustState = {
  committed: string;
  outstanding: string;
  assetHash: string;
  scale: number;
  authorityActor: string;
};

export type RewardTrustState = {
  campaignId: string;
  actorHash: string;
  authorized: string;
  consumed: string;
  released: string;
};

export type RedemptionTrustState = {
  grantId: string;
  amount: string;
  targetHash: string;
  distributionHash: string;
  status: TrustStatus;
  materializationHash: string | null;
};

export type FanEconomyTrustExecution = {
  bindCapability(actorRef: string): Promise<void>;
  commitReserve(input: {
    campaignId: string;
    authorityActorRef: string;
    asset: string;
    scale: number;
    amount: string;
  }): Promise<CampaignTrustState>;
  authorizeReward(input: {
    assignmentId: string;
    campaignId: string;
    authorityActorRef: string;
    fanActorRef: string;
    amount: string;
  }): Promise<RewardTrustState>;
  releaseReward(input: {
    assignmentId: string;
    fanActorRef: string;
    commandId: string;
    amount: string;
  }): Promise<RewardTrustState>;
  redeem(input: {
    redemptionId: string;
    assignmentId: string;
    fanActorRef: string;
    amount: string;
    releaseId: string;
    distributionHash: string;
  }): Promise<RedemptionTrustState>;
  lockRedemption(input: {
    redemptionId: string;
    revenueId: string;
    distributionHash: string;
  }): Promise<RedemptionTrustState>;
  reverseRedemption(input: { redemptionId: string }): Promise<RedemptionTrustState>;
  getCampaignState(campaignId: string): Promise<CampaignTrustState | null>;
  getReward(assignmentId: string): Promise<RewardTrustState | null>;
  getRedemption(redemptionId: string): Promise<RedemptionTrustState | null>;
};
