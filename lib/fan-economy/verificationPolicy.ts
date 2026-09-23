import { FanEconomyError } from "@/lib/domain/fanEconomy/errors";

/**
 * Pilot verification policy, not a domain invariant.
 * CDR-009 leaves the verifier institution open.
 * This slice records Verification only when the Campaign artist acts,
 * and never when the Fan Actor verifies their own assignment.
 * AuthorizeReward stays a separate command.
 */
export const PILOT_VERIFICATION_POLICY_ID = "moc-pilot-verification-v1";

export function assertPilotVerificationAuthority(input: {
  verifierActorRef: string;
  fanActorRef: string;
  campaignArtistActorRef: string;
}): void {
  if (input.verifierActorRef === input.fanActorRef) {
    throw new FanEconomyError("FAN_CANNOT_SELF_VERIFY");
  }
  if (input.verifierActorRef !== input.campaignArtistActorRef) {
    throw new FanEconomyError("VERIFICATION_AUTHORITY_DENIED");
  }
}
